import os
import re
import time
import hmac
import hashlib
import json
import uuid
import datetime
import secrets
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query, Request, Header, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from dotenv import load_dotenv
from app.database import get_db
from app.config import settings, BACKEND_DIR
from app.models import PersonalizationJob, StoryTemplate, Order, PaymentTransaction, Book, User
from app.routers.auth import require_admin
from app.routers.site_settings import _get_announcement_dict
from app.schemas import (
    CreatePaymentOrderRequest,
    CreatePaymentOrderResponse,
    VerifyPaymentRequest,
    VerifyPaymentResponse,
    PaymentTransactionOut,
    ValidateCouponRequest,
    ValidateCouponResponse,
)
from app.services.job_runner import job_runner

try:
    import razorpay
except ImportError:
    razorpay = None

router = APIRouter(prefix="/payments", tags=["Payments"])

def get_razorpay_credentials():
    try:
        load_dotenv(BACKEND_DIR / ".env", override=True)
    except Exception:
        pass
    key = os.getenv("RAZORPAY_KEY_ID") or getattr(settings, "RAZORPAY_KEY_ID", "") or ""
    secret = os.getenv("RAZORPAY_KEY_SECRET") or getattr(settings, "RAZORPAY_KEY_SECRET", "") or ""
    return key.strip(), secret.strip()

def get_razorpay_client():
    if not razorpay:
        return None
    key, secret = get_razorpay_credentials()
    if not key or not secret:
        return None
    try:
        return razorpay.Client(auth=(key, secret))
    except Exception as e:
        print(f"Warning initializing Razorpay client: {e}")
        return None


@router.get("/config")
def get_payment_config():
    """Return public Razorpay key ID for checkout initialization."""
    key, _ = get_razorpay_credentials()
    return {
        "razorpay_key": key,
        "currency": "INR"
    }


def evaluate_coupon(code: str, base_amount: float, db: Session):
    """
    Strictly validate a promo/coupon code against SiteSettings announcement bar
    and extra notices configured in the Admin Dashboard.
    Only exact offer codes configured in Admin are allowed to pass.
    Returns: (is_valid, discount_percent, discount_amount, discounted_amount, message)
    """
    if not code or not str(code).strip():
        return False, 0.0, 0.0, base_amount, "Please enter a coupon code."

    clean_code = str(code).strip().upper()
    announcement = _get_announcement_dict(db)

    # Collect ONLY active offer codes configured in Admin SiteSettings
    valid_codes = set()
    primary_code = (announcement.get("coupon_code") or "").strip().upper()
    if primary_code:
        valid_codes.add(primary_code)

    for n in announcement.get("notices") or []:
        nc = (n.get("coupon_code") or "").strip().upper()
        if nc:
            valid_codes.add(nc)

    # STRICT EXACT MATCH ONLY:
    if clean_code not in valid_codes:
        return False, 0.0, 0.0, base_amount, f"Coupon code '{code.strip()}' is invalid or expired."

    # Determine discount percentage:
    # 1. First check if announcement text or notice text explicitly specifies a percentage (e.g. "20% OFF", "15% off")
    discount_percent = 20.0
    matched_text = ""
    if primary_code == clean_code:
        matched_text = announcement.get("text") or ""
    else:
        for n in announcement.get("notices") or []:
            if (n.get("coupon_code") or "").strip().upper() == clean_code:
                matched_text = n.get("text") or ""
                break

    text_percent_match = re.search(r"(\d+)\s*%", matched_text)
    if text_percent_match:
        val = int(text_percent_match.group(1))
        if 5 <= val <= 90:
            discount_percent = float(val)
    else:
        # 2. Otherwise check if digits in the code specify a standard percentage (e.g. "SAVE25", "FLAT30", "KUTTY50")
        digits_match = re.search(r"(\d+)", clean_code)
        if digits_match:
            val = int(digits_match.group(1))
            if 5 <= val <= 90:
                discount_percent = float(val)
            else:
                discount_percent = 20.0
        else:
            discount_percent = 20.0

    discount_amount = round(base_amount * (discount_percent / 100.0))
    discounted_amount = max(0.0, round(base_amount - discount_amount))
    message = f"Coupon {clean_code} applied! {int(discount_percent)}% discount (-₹{int(discount_amount)})"

    return True, discount_percent, discount_amount, discounted_amount, message


@router.post("/validate-coupon", response_model=ValidateCouponResponse)
def validate_coupon_endpoint(
    payload: ValidateCouponRequest,
    db: Session = Depends(get_db)
):
    """
    Validate customer coupon code before checkout and return calculated savings.
    """
    announcement = _get_announcement_dict(db)
    def_pdf = float(announcement.get("default_pdf_price") or 799.0)
    def_print = float(announcement.get("default_hardcover_price") or 1399.0)
    base_amount = def_print if payload.format_type == "print_hardcover" else def_pdf
    is_valid, discount_percent, discount_amount, discounted_amount, message = evaluate_coupon(
        payload.code, base_amount, db
    )
    return {
        "valid": is_valid,
        "code": payload.code.strip().upper(),
        "discount_percent": discount_percent,
        "original_amount": base_amount,
        "discount_amount": discount_amount,
        "discounted_amount": discounted_amount,
        "message": message
    }


@router.get("/validate-coupon/{code}", response_model=ValidateCouponResponse)
def validate_coupon_get(
    code: str,
    format_type: str = "digital",
    db: Session = Depends(get_db)
):
    """
    Quick GET validation of coupon code.
    """
    announcement = _get_announcement_dict(db)
    def_pdf = float(announcement.get("default_pdf_price") or 799.0)
    def_print = float(announcement.get("default_hardcover_price") or 1399.0)
    base_amount = def_print if format_type == "print_hardcover" else def_pdf
    is_valid, discount_percent, discount_amount, discounted_amount, message = evaluate_coupon(
        code, base_amount, db
    )
    return {
        "valid": is_valid,
        "code": code.strip().upper(),
        "discount_percent": discount_percent,
        "original_amount": base_amount,
        "discount_amount": discount_amount,
        "discounted_amount": discounted_amount,
        "message": message
    }


@router.post("/create-order", response_model=CreatePaymentOrderResponse)
def create_payment_order(
    payload: CreatePaymentOrderRequest,
    db: Session = Depends(get_db)
):
    """
    Create a Razorpay order for unlocking storybook generation & PDF download.
    Supports 'digital' (instant PDF) or 'print_hardcover' (printed heirloom book + digital).
    Applies active coupon codes (e.g. WELCOME20), regional language surcharge,
    and optional gift wrapping fee configured in SiteSettings.
    """
    job = db.query(PersonalizationJob).filter(PersonalizationJob.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Personalization job not found")

    story = job.story or db.query(StoryTemplate).filter(StoryTemplate.id == job.story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story template not found")

    # Fetch global pricing and surcharge settings from SiteSettings (Offers & Banner section)
    announcement = _get_announcement_dict(db)
    default_pdf_price = float(announcement.get("default_pdf_price") or 799.0)
    default_hardcover_price = float(announcement.get("default_hardcover_price") or 1399.0)
    regional_surcharge = float(announcement.get("regional_language_surcharge") or 0.0)
    gift_wrap_fee_config = float(announcement.get("gift_wrap_fee") or 0.0)
    gift_wrap_enabled = bool(announcement.get("gift_wrap_enabled", True))

    # Determine base pricing based on format
    format_type = payload.format_type or "digital"
    if format_type == "print_hardcover":
        base_price = float(story.price_print or default_hardcover_price)
    else:
        base_price = float(story.price_digital or default_pdf_price)

    # 1. Regional Language Surcharge: English is standard rate; any other language incurs surcharge
    user_lang = (payload.language or getattr(job, "language", "") or "english").lower().strip()
    is_regional = user_lang != "english" and user_lang != ""
    lang_fee = regional_surcharge if is_regional else 0.0

    # 2. Hardcopy Gift Wrapping Fee: Only applies to print_hardcover if customer requested it
    wrap_fee = gift_wrap_fee_config if (format_type == "print_hardcover" and payload.is_gift_wrap and gift_wrap_enabled) else 0.0

    subtotal_before_discount = base_price + lang_fee + wrap_fee
    amount_in_rupees = subtotal_before_discount
    discount_amount = 0.0
    applied_coupon = None

    # Apply promo / coupon discount on subtotal if supplied
    if payload.coupon_code and payload.coupon_code.strip():
        is_valid, _, disc_amt, final_amt, _ = evaluate_coupon(payload.coupon_code, subtotal_before_discount, db)
        if is_valid:
            amount_in_rupees = final_amt
            discount_amount = disc_amt
            applied_coupon = payload.coupon_code.strip().upper()

    amount_in_paise = int(round(amount_in_rupees * 100))
    currency = story.currency or "INR"

    razorpay_order_id = None
    client = get_razorpay_client()

    if client:
        try:
            order_data = {
                "amount": amount_in_paise,
                "currency": currency,
                "receipt": f"rcpt_{job.id[:8]}_{int(datetime.datetime.utcnow().timestamp())}",
                "notes": {
                    "job_id": job.id,
                    "format_type": format_type,
                    "child_name": job.child_name,
                    "story_title": story.title,
                    "language": user_lang,
                    "language_surcharge": str(lang_fee),
                    "is_gift_wrap": str(bool(wrap_fee > 0)),
                    "gift_wrap_fee": str(wrap_fee),
                    "coupon_code": applied_coupon or "",
                    "discount_amount": str(discount_amount)
                }
            }
            rp_order = client.order.create(data=order_data)
            razorpay_order_id = rp_order.get("id")
            print(f"Razorpay live order created successfully: {razorpay_order_id} for job {job.id} (amount: ₹{amount_in_rupees})")
        except Exception as e:
            print(f"Razorpay live order creation error: {e}")
            _, secret = get_razorpay_credentials()
            if secret:
                raise HTTPException(
                    status_code=502,
                    detail=f"Payment gateway error while creating Razorpay order: {str(e)}"
                )

    # Sandbox fallback ONLY if credentials are not configured and running in local development
    if not razorpay_order_id:
        _, secret = get_razorpay_credentials()
        app_env = os.getenv("APP_ENV", "production").lower()
        if app_env in ["dev", "development", "local", "test"] and not secret:
            razorpay_order_id = f"order_sim_{uuid.uuid4().hex[:14]}"
        else:
            raise HTTPException(
                status_code=502,
                detail="Razorpay payment gateway order initialization failed. Please check credentials."
            )

    # Log initial PaymentTransaction
    cust_name = payload.customer_name
    if not cust_name and payload.shipping_address:
        cust_name = payload.shipping_address.get("full_name")
    if not cust_name:
        cust_name = f"{job.child_name}'s Parent"

    cust_email = payload.customer_email
    if not cust_email and payload.shipping_address:
        cust_email = payload.shipping_address.get("email")

    transaction = PaymentTransaction(
        job_id=job.id,
        razorpay_order_id=razorpay_order_id,
        amount=amount_in_rupees,
        currency=currency,
        status="created",
        customer_name=cust_name,
        customer_email=cust_email,
        format_type=format_type
    )
    db.add(transaction)
    db.commit()

    key, _ = get_razorpay_credentials()
    return {
        "razorpay_order_id": razorpay_order_id,
        "amount": amount_in_paise,
        "currency": currency,
        "razorpay_key": key,
        "amount_display": amount_in_rupees,
        "format_type": format_type,
        "story_title": story.title,
        "child_name": job.child_name,
        "discount_amount": discount_amount,
        "coupon_code": applied_coupon,
        "original_amount": subtotal_before_discount,
        "language_surcharge": lang_fee,
        "gift_wrap_fee": wrap_fee,
        "is_gift_wrap": bool(wrap_fee > 0),
    }


def verify_razorpay_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """
    Verify Razorpay payment signature using HMAC SHA256.
    In live production, strictly validates the cryptographic HMAC SHA256 signature using the secret key.
    Simulation is strictly rejected when Razorpay credentials are configured.
    """
    if not order_id or not payment_id or not signature:
        return False

    key, secret = get_razorpay_credentials()

    # When Razorpay credentials are configured (Live/Test):
    if secret:
        try:
            body = f"{order_id}|{payment_id}"
            expected_sig = hmac.new(
                secret.encode("utf-8"),
                body.encode("utf-8"),
                hashlib.sha256
            ).hexdigest()
            return hmac.compare_digest(expected_sig, signature)
        except Exception as e:
            print(f"Error during signature verification: {e}")
            return False

    # Sandbox / Local developer mock ONLY when Razorpay secret is completely absent in .env
    app_env = os.getenv("APP_ENV", "production").lower()
    if app_env in ["dev", "development", "local", "test"]:
        if signature.startswith("simulated_sig_") or order_id.startswith("order_sim_"):
            return True

    return False


@router.post("/verify", response_model=VerifyPaymentResponse)
def verify_payment(
    payload: VerifyPaymentRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Verify payment signature, unlock full personalized storybook,
    record order, and log payment transaction.
    STAGES 3 & 4: Idempotent order processing and server-authoritative product format verification.
    """
    job = db.query(PersonalizationJob).filter(PersonalizationJob.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Personalization job not found")

    story = job.story or db.query(StoryTemplate).filter(StoryTemplate.id == job.story_id).first()

    # 1. Idempotency Check: Prevent duplicate order processing if already verified
    existing_order = db.query(Order).filter(
        (Order.razorpay_payment_id == payload.razorpay_payment_id) |
        (Order.razorpay_order_id == payload.razorpay_order_id)
    ).first()

    if existing_order:
        print(f"[PaymentVerify] Payment {payload.razorpay_payment_id} already processed under order {existing_order.order_number}.")
        job.is_paid = True
        db.commit()
        return {
            "success": True,
            "order_number": existing_order.order_number,
            "order_id": existing_order.id,
            "job_id": job.id,
            "format_type": existing_order.format_type,
            "amount": existing_order.amount,
            "status": existing_order.status,
            "message": "Payment verified successfully. Full storybook unlocked!"
        }

    # 2. Look up the server-side initialized PaymentTransaction
    txn = db.query(PaymentTransaction).filter(
        PaymentTransaction.razorpay_order_id == payload.razorpay_order_id
    ).first()

    if not txn:
        txn = db.query(PaymentTransaction).filter(
            PaymentTransaction.job_id == job.id
        ).order_by(PaymentTransaction.created_at.desc()).first()

    # STAGE 4: Anti-Tampering - Enforce trusted server-side product format
    # The client cannot pay for digital (₹799) and spoof format_type='print_hardcover'
    format_type = txn.format_type if (txn and txn.format_type) else (payload.format_type or "digital")

    announcement = _get_announcement_dict(db)
    def_pdf = float(announcement.get("default_pdf_price") or 799.0)
    def_print = float(announcement.get("default_hardcover_price") or 1399.0)

    amount_in_rupees = float(
        (story.price_print if format_type == "print_hardcover" else story.price_digital) or
        (def_print if format_type == "print_hardcover" else def_pdf)
    )

    if txn and txn.amount and txn.amount > 0:
        amount_in_rupees = float(txn.amount)

    # 3. Cryptographic HMAC-SHA256 signature verification
    is_valid = verify_razorpay_signature(
        order_id=payload.razorpay_order_id,
        payment_id=payload.razorpay_payment_id,
        signature=payload.razorpay_signature
    )

    if not is_valid:
        if txn:
            txn.status = "failed"
            txn.error_description = "Signature verification failed"
            db.commit()
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    # 4. Direct server-to-server Razorpay API Verification
    client = get_razorpay_client()
    if client and not payload.razorpay_order_id.startswith("order_sim_"):
        try:
            rp_payment = client.payment.fetch(payload.razorpay_payment_id)
            # A. Verify currency is INR
            if rp_payment.get("currency", "").upper() != "INR":
                raise HTTPException(status_code=400, detail="Invalid payment currency. Expected INR.")
            # B. Verify payment belongs to this Razorpay order
            p_order_id = rp_payment.get("order_id")
            if p_order_id and p_order_id != payload.razorpay_order_id:
                raise HTTPException(status_code=400, detail="Payment does not match the initialized order ID.")
            # C. Verify payment status is captured or authorized
            p_status = rp_payment.get("status", "").lower()
            if p_status not in ("captured", "authorized"):
                raise HTTPException(status_code=400, detail=f"Payment status is '{p_status}'. Expected 'captured'.")
            # D. Verify captured amount against expected server amount
            expected_paise = int(round(amount_in_rupees * 100))
            captured_paise = int(rp_payment.get("amount", 0))
            if expected_paise > 0 and captured_paise < expected_paise:
                raise HTTPException(
                    status_code=400,
                    detail=f"Captured amount (₹{captured_paise/100:.2f}) does not match required amount (₹{amount_in_rupees:.2f})."
                )
        except HTTPException:
            raise
        except Exception as fetch_err:
            print(f"Notice during Razorpay payment fetch validation: {fetch_err}")

    # 5. Customer Name / Email resolution
    cust_name = payload.customer_name
    if not cust_name and payload.shipping_address:
        cust_name = payload.shipping_address.get("full_name")
    if not cust_name:
        cust_name = f"{job.child_name}'s Family"

    cust_email = payload.customer_email
    if not cust_email and payload.shipping_address:
        cust_email = payload.shipping_address.get("email")

    if not txn:
        txn = PaymentTransaction(
            job_id=job.id,
            razorpay_order_id=payload.razorpay_order_id,
            amount=amount_in_rupees,
            currency="INR",
            format_type=format_type
        )
        db.add(txn)

    txn.status = "captured"
    txn.razorpay_payment_id = payload.razorpay_payment_id
    txn.method = "razorpay_checkout"
    txn.customer_name = cust_name
    txn.customer_email = cust_email

    job.is_paid = True
    job.paid_at = datetime.datetime.utcnow()
    job.format_type = format_type

    # 6. Atomic Order Creation with Concurrency Safety
    order_number = f"ORD-{datetime.datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
    shipping_json = None
    if payload.shipping_address:
        s_addr = dict(payload.shipping_address)
        if payload.is_gift_wrap:
            s_addr["gift_wrap"] = True
        shipping_json = json.dumps(s_addr)

    order_status = "Paid" if format_type == "digital" else "In Production"

    order = Order(
        order_number=order_number,
        job_id=job.id,
        customer_name=cust_name,
        customer_email=cust_email,
        format_type=format_type,
        amount=amount_in_rupees,
        currency="INR",
        status=order_status,
        payment_status="paid",
        payment_intent_id=payload.razorpay_payment_id,
        razorpay_order_id=payload.razorpay_order_id,
        razorpay_payment_id=payload.razorpay_payment_id,
        shipping_address=shipping_json
    )
    db.add(order)

    try:
        db.commit()
        db.refresh(order)
        txn.order_id = order.id
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = db.query(Order).filter(
            (Order.razorpay_payment_id == payload.razorpay_payment_id) |
            (Order.razorpay_order_id == payload.razorpay_order_id)
        ).first()
        if existing:
            order = existing
        else:
            raise

    # 7. Trigger background generation strictly once
    def _worker(jid: str, is_hardcover: bool):
        try:
            print(f"Triggering post-payment full generation for job {jid}")
            job_runner.get_or_generate_full_storybook_pages(jid)
            if is_hardcover:
                try:
                    from app.database import SessionLocal
                    from app.services.cover_service import CoverPageService
                    with SessionLocal() as db_cov:
                        CoverPageService.personalize_cover_page(jid, db_cov)
                except Exception as e_cov:
                    print(f"Notice during background cover personalization: {e_cov}")
        except Exception as err:
            print(f"Notice during post-payment generation: {err}")

    # Only queue background rendering if job is not already completed or generating
    if job.status not in ("completed", "generating", "assembling_preview"):
        background_tasks.add_task(_worker, job.id, bool(format_type == "print_hardcover"))

    return {
        "success": True,
        "order_number": order.order_number,
        "order_id": order.id,
        "job_id": job.id,
        "format_type": format_type,
        "amount": order.amount,
        "status": order.status,
        "message": "Payment verified successfully. Full storybook unlocked!"
    }


@router.post("/webhook")
async def razorpay_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_razorpay_signature: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Razorpay Webhook handler.
    STAGE 2: Strict fail-closed signature verification, replay protection, and duplicate event protection.
    """
    raw_body = await request.body()
    if not raw_body:
        raise HTTPException(status_code=400, detail="Empty webhook payload")

    # STAGE 2: Webhook secret is strictly mandatory
    webhook_secret = (
        os.getenv("RAZORPAY_WEBHOOK_SECRET") or
        getattr(settings, "RAZORPAY_WEBHOOK_SECRET", "")
    ).strip()

    if not webhook_secret:
        print("[Razorpay Webhook] ERROR: RAZORPAY_WEBHOOK_SECRET is not configured on the server.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Razorpay webhook secret is not configured on server."
        )

    sig_to_verify = (
        x_razorpay_signature if isinstance(x_razorpay_signature, str) and x_razorpay_signature.strip()
        else request.headers.get("x-razorpay-signature")
    )

    if not sig_to_verify:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing X-Razorpay-Signature header."
        )

    expected_sig = hmac.new(
        webhook_secret.encode("utf-8"),
        raw_body,
        hashlib.sha256
    ).hexdigest()

    if not secrets.compare_digest(expected_sig, sig_to_verify):
        print(f"[Razorpay Webhook] Invalid signature received: {sig_to_verify}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook signature."
        )

    try:
        data = json.loads(raw_body.decode("utf-8"))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON payload: {e}")

    # Replay protection: Check event timestamp
    event_created = data.get("created_at")
    if event_created and isinstance(event_created, (int, float)):
        if (time.time() - float(event_created)) > 86400:
            print("[Razorpay Webhook] Stale webhook event (older than 24h). Ignoring.")
            return {"status": "ok", "message": "Ignored stale event."}

    event = data.get("event")
    print(f"[Razorpay Webhook] Received verified event: {event}")

    # Handle payment.captured or order.paid
    if event in ("payment.captured", "order.paid"):
        payload_data = data.get("payload", {})
        payment_entity = payload_data.get("payment", {}).get("entity", {})
        order_entity = payload_data.get("order", {}).get("entity", {})

        rp_order_id = payment_entity.get("order_id") or order_entity.get("id")
        rp_payment_id = payment_entity.get("id")

        if not rp_order_id and not rp_payment_id:
            return {"status": "ok", "message": "Missing payment or order ID in webhook payload"}

        # Validate currency
        p_currency = payment_entity.get("currency")
        if p_currency and p_currency.upper() != "INR":
            print(f"[Razorpay Webhook] Invalid currency '{p_currency}'. Expected INR.")
            return {"status": "error", "message": "Invalid currency"}

        # Resolve job_id from payment/order notes
        notes = payment_entity.get("notes") or order_entity.get("notes") or {}
        job_id = notes.get("job_id")

        job = None
        if job_id:
            job = db.query(PersonalizationJob).filter(PersonalizationJob.id == job_id).first()

        # If job not found in notes, search by transaction with this razorpay_order_id
        if not job and rp_order_id:
            txn_match = db.query(PaymentTransaction).filter(
                PaymentTransaction.razorpay_order_id == rp_order_id
            ).first()
            if txn_match and txn_match.job:
                job = txn_match.job
                job_id = job.id

        if not job:
            print(f"[Razorpay Webhook] Notice: No job matched for order {rp_order_id}")
            return {"status": "ok", "message": "No matching job found, transaction noted"}

        # Idempotency check: If an Order already exists or job is already paid, acknowledge immediately
        existing_order = db.query(Order).filter(
            (Order.razorpay_payment_id == rp_payment_id) |
            (Order.razorpay_order_id == rp_order_id)
        ).first()

        if existing_order or job.is_paid:
            print(f"[Razorpay Webhook] Payment {rp_payment_id} / Job {job.id} already processed. Acknowledging event.")
            return {"status": "ok", "message": "Already processed"}

        # Find or update PaymentTransaction
        txn = db.query(PaymentTransaction).filter(
            (PaymentTransaction.razorpay_order_id == rp_order_id) |
            (PaymentTransaction.job_id == job.id)
        ).first()

        format_type = txn.format_type if (txn and txn.format_type) else (notes.get("format_type") or "digital")
        amount_in_rupees = float(payment_entity.get("amount", 0)) / 100.0 if payment_entity.get("amount") else (txn.amount if txn else 799.0)

        # Mark job as paid
        job.is_paid = True
        job.paid_at = datetime.datetime.utcnow()
        job.format_type = format_type

        if not txn:
            txn = PaymentTransaction(
                job_id=job.id,
                razorpay_order_id=rp_order_id,
                razorpay_payment_id=rp_payment_id,
                amount=amount_in_rupees,
                currency="INR",
                status="captured",
                method="razorpay_webhook",
                format_type=format_type
            )
            db.add(txn)
        else:
            txn.status = "captured"
            if rp_payment_id:
                txn.razorpay_payment_id = rp_payment_id
            txn.method = "razorpay_webhook"

        # Atomic Order Insertion
        order_number = f"ORD-{datetime.datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
        order_status = "Paid" if format_type == "digital" else "In Production"
        cust_name = notes.get("customer_name") or f"{job.child_name}'s Family"
        cust_email = notes.get("customer_email") or getattr(txn, "customer_email", None)

        order = Order(
            order_number=order_number,
            job_id=job.id,
            customer_name=cust_name,
            customer_email=cust_email,
            format_type=format_type,
            amount=amount_in_rupees,
            currency="INR",
            status=order_status,
            payment_status="paid",
            payment_intent_id=rp_payment_id,
            razorpay_order_id=rp_order_id,
            razorpay_payment_id=rp_payment_id,
        )
        db.add(order)

        try:
            db.commit()
            db.refresh(order)
            txn.order_id = order.id
            db.commit()
        except IntegrityError:
            db.rollback()
            existing_order = db.query(Order).filter(
                (Order.razorpay_payment_id == rp_payment_id) |
                (Order.razorpay_order_id == rp_order_id)
            ).first()
            if existing_order:
                return {"status": "ok", "message": "Already processed under concurrent thread"}
            raise

        # Trigger background generation strictly once
        def _worker(jid: str, is_hardcover: bool):
            try:
                print(f"[Razorpay Webhook] Triggering post-payment full generation for job {jid}")
                job_runner.get_or_generate_full_storybook_pages(jid)
                if is_hardcover:
                    try:
                        from app.database import SessionLocal
                        from app.services.cover_service import CoverPageService
                        with SessionLocal() as db_cov:
                            CoverPageService.personalize_cover_page(jid, db_cov)
                    except Exception as e_cov:
                        print(f"Notice during webhook background cover personalization: {e_cov}")
            except Exception as err:
                print(f"Notice during webhook post-payment generation: {err}")

        if job.status not in ("completed", "generating", "assembling_preview"):
            background_tasks.add_task(_worker, job.id, bool(format_type == "print_hardcover"))

        return {
            "status": "ok",
            "message": f"Payment captured successfully for job {job.id}",
            "order_number": order.order_number
        }

    return {"status": "ok", "message": f"Event {event} acknowledged"}


@router.get("/transactions", response_model=List[PaymentTransactionOut])
def list_payment_transactions(
    limit: int = Query(50),
    offset: int = Query(0),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    List all payment gateway transactions for the Admin dashboard.
    """
    txns = db.query(PaymentTransaction).order_by(
        PaymentTransaction.created_at.desc()
    ).offset(offset).limit(limit).all()

    results = []
    for t in txns:
        story_title = None
        child_name = None
        order_number = None

        if t.job:
            child_name = t.job.child_name
            if t.job.story:
                story_title = t.job.story.title

        if t.order:
            order_number = t.order.order_number

        results.append({
            "id": t.id,
            "order_id": t.order_id,
            "job_id": t.job_id,
            "razorpay_order_id": t.razorpay_order_id,
            "razorpay_payment_id": t.razorpay_payment_id,
            "amount": t.amount,
            "currency": t.currency,
            "status": t.status,
            "method": t.method,
            "customer_name": t.customer_name,
            "customer_email": t.customer_email,
            "format_type": t.format_type,
            "story_title": story_title,
            "child_name": child_name,
            "order_number": order_number,
            "error_description": t.error_description,
            "created_at": t.created_at
        })

    return results
