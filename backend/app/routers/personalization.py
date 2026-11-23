import os
import datetime
import uuid
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, Response, Query, Header
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import PersonalizationJob, StoryTemplate, GeneratedAsset, ChildProfile, Book, StoryPage, User
from app.schemas import PersonalizationOut, GeneratedAssetOut
from app.config import settings
from app.services.storage import storage
from app.services.job_runner import job_runner
from app.services.ai.photo_validator import validate_child_photo_ai
from app.services.translation_service import translation_service
from app.routers.auth import verify_jwt_token, require_admin

router = APIRouter(prefix="/personalization", tags=["Personalization"])

@router.post("/validate-photo")
async def validate_photo_endpoint(
    photo: Optional[UploadFile] = File(None),
    file: Optional[UploadFile] = File(None)
):
    """
    Deep Learning face validator (YuNet) checking:
    1. Front-facing angle (nose between eyes, yaw symmetry, interocular distance)
    2. Uncovered face & mouth (hand/finger coverage, mouth landmark presence, lip contrast)
    3. Sunglasses & distance framing
    """
    try:
        upload = photo or file
        if not upload:
            raise HTTPException(status_code=400, detail="Photo file is required.")
        ext = Path(upload.filename or "file.jpg").suffix.lower()
        if ext not in (".jpg", ".jpeg", ".png", ".webp"):
            raise HTTPException(status_code=400, detail=f"Invalid file type '{ext}'. Only image formats (.jpg, .jpeg, .png, .webp) are allowed.")
        content = await upload.read()
        return validate_child_photo_ai(content)
    except HTTPException:
        raise
    except Exception as e:
        return {
            "is_valid": False,
            "score": 40,
            "error": str(e),
            "summary": "Photo validation check encountered an error."
        }

@router.post("/enhance-photo")
@router.post("/enhance-photo/")
async def enhance_photo_endpoint(
    photo: Optional[UploadFile] = File(None),
    file: Optional[UploadFile] = File(None)
):
    """
    Enhance customer reference photo with Magic Hour AI Image Editor (model='default', 5 credits).
    Isolates the subject on a pure seamless white studio background and sharpens details.
    Saves the enhanced photo to MinIO storage and returns the public URL.
    """
    upload = photo or file
    if not upload:
        raise HTTPException(status_code=400, detail="Photo file is required.")
    ext = Path(upload.filename or "file.jpg").suffix.lower()
    if ext not in (".jpg", ".jpeg", ".png", ".webp"):
        raise HTTPException(status_code=400, detail=f"Invalid file type '{ext}'. Only image formats (.jpg, .jpeg, .png, .webp) are allowed.")

    content = await upload.read()
    if not content:
        raise HTTPException(status_code=400, detail="Photo file is empty.")

    try:
        from app.services.ai.magic_hour_provider import enhance_reference_photo
        enhanced_bytes = enhance_reference_photo(content, filename=upload.filename or "child_photo.png")

        # Discard face-less enhanced portraits (fallback to authentic uploaded photo)
        val_check = validate_child_photo_ai(enhanced_bytes)
        if any(i.get("code") == "no_face" for i in val_check.get("issues", [])):
            print("[Magic Hour Enhance] WARNING: Enhanced portrait has 0 faces detected! Discarding enhancement and falling back to original photo.")
            enhanced_bytes = content

        ext = ".png"
        saved_key = storage.save_bytes(
            data=enhanced_bytes,
            category="child_photos",
            extension=ext,
            custom_name=f"enhanced_{uuid.uuid4().hex[:12]}{ext}"
        )
        public_url = storage.get_public_url(saved_key)
        import base64
        b64_str = f"data:image/png;base64,{base64.b64encode(enhanced_bytes).decode('utf-8')}"
        return {
            "status": "success",
            "enhanced_key": saved_key,
            "enhanced_url": public_url,
            "enhanced_base64": b64_str,
        }
    except Exception as e:
        print(f"[Magic Hour Enhance Error] {e}")
        raise HTTPException(
            status_code=500,
            detail="Studio photo enhancement is temporarily unavailable. Your original photo will be used."
        )


def enrich_job_urls(job: PersonalizationJob) -> dict:
    created_iso = None
    created_fmt = "Recently"
    if job.created_at:
        # Guarantee timezone-aware UTC ISO string so frontend parses properly
        if job.created_at.tzinfo is None:
            utc_dt = job.created_at.replace(tzinfo=datetime.timezone.utc)
        else:
            utc_dt = job.created_at.astimezone(datetime.timezone.utc)
        created_iso = utc_dt.isoformat()

        # Format using configured TIMEZONE (default: Asia/Kolkata / IST)
        try:
            from zoneinfo import ZoneInfo
            tz_str = os.getenv("TIMEZONE", "Asia/Kolkata")
            local_dt = utc_dt.astimezone(ZoneInfo(tz_str))
            created_fmt = local_dt.strftime("%b %d, %I:%M %p")
        except Exception:
            created_fmt = utc_dt.strftime("%b %d, %I:%M %p")

    updated_iso = None
    if getattr(job, "updated_at", None):
        if job.updated_at.tzinfo is None:
            updated_iso = job.updated_at.replace(tzinfo=datetime.timezone.utc).isoformat()
        else:
            updated_iso = job.updated_at.astimezone(datetime.timezone.utc).isoformat()

    story_obj = getattr(job, "story", None)
    if not story_obj and getattr(job, "story_id", None):
        from app.database import SessionLocal
        with SessionLocal() as sdb:
            story_obj = sdb.query(StoryTemplate).filter(StoryTemplate.id == job.story_id).first()

    story_title = story_obj.title if story_obj else "Personalized Story"
    story_slug = story_obj.slug if story_obj else ""
    story_pages_count = story_obj.page_count if (story_obj and story_obj.page_count) else 24

    # Determine real completed count based on generated assets or cached full print PDF
    assets_list = getattr(job, "assets", []) or []
    completed_asset_pages = len({a.page_number for a in assets_list if getattr(a, "generation_status", "") == "completed"})
    completed_p = max(job.completed_pages or 0, completed_asset_pages)

    is_paid_val = bool(getattr(job, "is_paid", False))
    if is_paid_val or completed_p >= story_pages_count:
        completed_p = max(completed_p, story_pages_count)
        if job.current_stage and "downloaded by customer" in job.current_stage.lower():
            free_pages = f"All {story_pages_count} pages ({job.current_stage})"
        else:
            free_pages = f"All {story_pages_count} pages"
    else:
        free_pages = f"All {story_pages_count} pages ({completed_p} free)"

    # Determine if hard copy order (via job or linked order)
    is_hardcover = getattr(job, "format_type", "") in ["print_hardcover", "hardcover"]
    if not is_hardcover:
        try:
            if getattr(job, "orders", None):
                is_hardcover = any(getattr(o, "format_type", "") in ["print_hardcover", "hardcover"] for o in job.orders)
            else:
                from app.database import SessionLocal
                from app.models import Order
                with SessionLocal() as sdb:
                    order_match = sdb.query(Order).filter(
                        Order.job_id == job.id,
                        Order.format_type.in_(["print_hardcover", "hardcover"])
                    ).first()
                    if order_match:
                        is_hardcover = True
        except Exception:
            pass

    format_type = "print_hardcover" if is_hardcover else (getattr(job, "format_type", "digital") or "digital")

    status_display = job.status
    if job.status in ["generating", "queued", "analyzing", "in_progress", "processing"]:
        pct = int(((job.completed_pages or 0) / (job.total_pages or 1)) * 100) if job.total_pages else 0
        status_display = f"Rendering · {pct}%" if pct > 0 else "Rendering"
    elif job.status == "completed":
        status_display = "completed"

    data = {
        "id": job.id,
        "user_id": job.user_id,
        "story_id": job.story_id,
        "story_title": story_title,
        "story_slug": story_slug,
        "child_name": job.child_name,
        "photo_path": job.photo_path,
        "photo_url": storage.get_public_url(job.photo_path),
        "outfit_mode": getattr(job, "outfit_mode", "story") or "story",
        "language": getattr(job, "language", "english") or "english",
        "status": status_display,
        "current_stage": job.current_stage,
        "total_pages": story_pages_count if (is_paid_val or completed_p >= story_pages_count) else (job.total_pages if job.total_pages else 5),
        "completed_pages": completed_p,
        "failed_pages": job.failed_pages,
        "retry_count": job.retry_count,
        "error_details": job.error_details,
        "created_at": created_iso,
        "updated_at": updated_iso,
        "pages_label": free_pages,
        "is_purchased": bool(getattr(job, "is_paid", False) or getattr(job, "books", None) or getattr(job, "user_id", None) == "purchased"),
        "is_paid": bool(getattr(job, "is_paid", False)),
        "paid_at": job.paid_at.isoformat() if getattr(job, "paid_at", None) else None,
        "created_formatted": created_fmt,
        "pdf_download_url": f"/api/v1/personalization/{job.id}/pdf",
        "print_pdf_url": f"/api/v1/personalization/{job.id}/print-pdf?size=8x8&color=rgb",
        "format_type": format_type,
        "is_hardcover": is_hardcover,
        "cover_asset_path": getattr(job, "cover_asset_path", None),
        "cover_asset_url": (f"{storage.get_public_url(job.cover_asset_path)}?v={int(job.updated_at.timestamp() if getattr(job, 'updated_at', None) else (job.created_at.timestamp() if getattr(job, 'created_at', None) else 1))}") if getattr(job, "cover_asset_path", None) else None,
        "cover_download_url": f"/api/v1/personalization/{job.id}/cover-page",
        "assets": []
    }
    # Deduplicate assets by page_number, strictly prioritizing Hugging Face Neural AI over Poisson fallback
    best_assets_by_page = {}
    swap_spaces = [s.strip().lower() for s in getattr(settings, "HF_FACE_SWAP_SPACE", "").split(",") if s.strip()]
    for asset in job.assets:
        p_num = asset.page_number
        if p_num not in best_assets_by_page:
            best_assets_by_page[p_num] = asset
        else:
            existing = best_assets_by_page[p_num]
            new_m, new_p = (asset.model or "").lower(), (asset.provider or "").lower()
            old_m, old_p = (existing.model or "").lower(), (existing.provider or "").lower()
            is_new_ai = any(s in new_m for s in swap_spaces if s) or ("hugging" in new_p) or ("swap" in new_m) or ("neural" in new_p)
            is_old_ai = any(s in old_m for s in swap_spaces if s) or ("hugging" in old_p) or ("swap" in old_m) or ("neural" in old_p)
            if is_new_ai and not is_old_ai:
                best_assets_by_page[p_num] = asset
            elif is_new_ai == is_old_ai and (asset.created_at or datetime.datetime.min) > (existing.created_at or datetime.datetime.min):
                best_assets_by_page[p_num] = asset

    for p_num in sorted(best_assets_by_page.keys()):
        asset = best_assets_by_page[p_num]
        story_page = asset.story_page
        story_text = ""
        job_lang = (getattr(job, "language", "english") or "english").lower().strip()
        if story_page:
            raw = story_page.story_text if story_page.story_text is not None else (story_page.extracted_text or "")
            if raw and raw.strip():
                if job_lang not in ["english", "en"]:
                    custom_trans = {}
                    if getattr(story_page, "translations", None):
                        try:
                            custom_trans = json.loads(story_page.translations) if isinstance(story_page.translations, str) else story_page.translations
                        except Exception:
                            custom_trans = {}
                    if isinstance(custom_trans, dict) and custom_trans.get(job_lang):
                        raw = custom_trans[job_lang]
                    elif asset.prompt_used and not asset.prompt_used.startswith("Children") and not asset.prompt_used.startswith("Story scene"):
                        raw = asset.prompt_used

                story_text = raw
                for tag in ["[Name]", "[name]", "{name}", "{{name}}", "[child_name]", "{child_name}", "{{child_name}}", "{குழந்தை_பெயர்}", "[குழந்தை_பெயர்]"]:
                    story_text = story_text.replace(tag, job.child_name)
            else:
                story_text = ""

        raw_ast_url = storage.get_public_url(asset.storage_path)
        ast_ts = int(asset.created_at.timestamp() if getattr(asset, 'created_at', None) else 1)
        busted_img_url = f"{raw_ast_url}?v={ast_ts}_{asset.asset_version or 1}" if raw_ast_url else None

        data["assets"].append({
            "id": asset.id,
            "job_id": asset.job_id,
            "story_page_id": asset.story_page_id,
            "page_number": asset.page_number,
            "asset_version": asset.asset_version,
            "storage_path": asset.storage_path,
            "image_url": busted_img_url,
            "provider": None,
            "model": None,
            "prompt_used": asset.prompt_used,
            "story_text": story_text,
            "translations": getattr(story_page, "translations", "{}") or "{}" if story_page else "{}",
            "text_x": getattr(story_page, "text_x", 50.0) if story_page else 50.0,
            "text_y": getattr(story_page, "text_y", 89.5) if story_page else 89.5,
            "font_size": getattr(story_page, "font_size", 15) or 15 if story_page else 15,
            "font_family": getattr(story_page, "font_family", "Sans (DejaVu Bold)") or "Sans (DejaVu Bold)" if story_page else "Sans (DejaVu Bold)",
            "font_color": getattr(story_page, "font_color", "#000000") or "#000000" if story_page else "#000000",
            "has_background_box": getattr(story_page, "has_background_box", True) if getattr(story_page, "has_background_box", None) is not None else True if story_page else True,
            "box_bg_color": getattr(story_page, "box_bg_color", "#FFFFFF") or "#FFFFFF" if story_page else "#FFFFFF",
            "box_border_color": getattr(story_page, "box_border_color", "#E5E7EB") or "#E5E7EB" if story_page else "#E5E7EB",
            "box_border_width": getattr(story_page, "box_border_width", 1) if getattr(story_page, "box_border_width", None) is not None else 1 if story_page else 1,
            "box_bg_opacity": getattr(story_page, "box_bg_opacity", 0.85) if getattr(story_page, "box_bg_opacity", None) is not None else 0.85 if story_page else 0.85,
            "text_align": getattr(story_page, "text_align", "center") or "center" if story_page else "center",
            "box_layout": getattr(story_page, "box_layout", "banner") or "banner" if story_page else "banner",
            "box_border_radius": getattr(story_page, "box_border_radius", 14) if getattr(story_page, "box_border_radius", None) is not None else 14 if story_page else 14,
            "generation_status": asset.generation_status,
            "review_status": asset.review_status,
            "cost_estimate": None,
            "generation_time_sec": None,
            "error_message": asset.error_message,
            "created_at": asset.created_at
        })
    return data

@router.post("", response_model=PersonalizationOut)
async def create_personalization(
    background_tasks: BackgroundTasks,
    story_id: str = Form(...),
    child_name: str = Form(...),
    guardian_consent: bool = Form(...),
    outfit_mode: str = Form("story"),
    photo: Optional[UploadFile] = File(None),
    photo_key: Optional[str] = Form(None),
    child_gender: Optional[str] = Form(None),
    child_age: Optional[str] = Form(None),
    language: Optional[str] = Form("english"),
    db: Session = Depends(get_db)
):
    if not guardian_consent:
        raise HTTPException(
            status_code=400,
            detail="Parent or legal guardian consent is required before processing a child's photograph."
        )

    if not child_name.strip():
        raise HTTPException(status_code=400, detail="Child's name cannot be empty.")

    story = db.query(StoryTemplate).filter(StoryTemplate.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Selected story not found.")

    # Enforce gender restrictions if configured
    if story.target_gender == "boy" and child_gender and child_gender.lower() == "girl":
        raise HTTPException(status_code=400, detail="This story is exclusively available for boys.")
    if story.target_gender == "girl" and child_gender and child_gender.lower() == "boy":
        raise HTTPException(status_code=400, detail="This story is exclusively available for girls.")

    # Enforce age boundaries if configured
    if child_age and child_age.strip().isdigit():
        age_int = int(child_age.strip())
        min_a = getattr(story, "min_age", None) or 2
        max_a = getattr(story, "max_age", None) or 13
        if age_int < min_a or age_int > max_a:
            raise HTTPException(
                status_code=400,
                detail=f"Age {age_int} is out of the allowed range ({min_a} to {max_a} years) for this story."
            )

    # Save photo securely - strictly prioritize customer-selected enhanced key if provided!
    photo_bytes = None
    if photo_key and photo_key.strip():
        saved_photo_path = photo_key.strip()
        # Ensure path points strictly to a child_photos image key
        if not saved_photo_path.startswith("child_photos/") or not any(saved_photo_path.lower().endswith(ext) for ext in (".jpg", ".jpeg", ".png", ".webp")):
            raise HTTPException(status_code=400, detail="Invalid photo key.")
        try:
            photo_bytes = storage.get_bytes(saved_photo_path)
        except Exception:
            photo_bytes = None
        if not photo_bytes:
            raise HTTPException(status_code=400, detail="Selected enhanced photo could not be retrieved.")
        print(f"[Personalization] Customer selected AI enhanced photo key: {saved_photo_path}")
    elif photo:
        ext = Path(photo.filename or "file.jpg").suffix.lower()
        if ext not in (".jpg", ".jpeg", ".png", ".webp"):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file extension '{ext}'. Only image formats (.jpg, .jpeg, .png, .webp) are allowed."
            )
        photo_bytes = await photo.read()
        await photo.seek(0)
        saved_photo_path = await storage.save_upload_file(
            photo,
            category="child_photos",
            allowed_extensions=(".jpg", ".jpeg", ".png", ".webp")
        )
        print(f"[Personalization] Customer selected raw uploaded photo: {saved_photo_path}")
    else:
        raise HTTPException(status_code=400, detail="Photograph is required.")

    # Validate photo with YuNet: strictly block no_face and multiple_faces
    if photo_bytes:
        validation = validate_child_photo_ai(photo_bytes)
        critical_issues = [i for i in validation.get("issues", []) if i.get("code") in ("no_face", "multiple_faces")]
        if critical_issues:
            issue = critical_issues[0]
            raise HTTPException(
                status_code=400,
                detail=f"{issue['message']} {issue['fix_tip']}"
            )

    # Create child profile
    profile = ChildProfile(
        child_display_name=child_name.strip(),
        photo_storage_path=saved_photo_path,
        consent_status=True,
        consent_timestamp=datetime.datetime.utcnow(),
        retention_status="active"
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)

    # Create job
    job = PersonalizationJob(
        story_id=story.id,
        child_profile_id=profile.id,
        child_name=child_name.strip(),
        photo_path=saved_photo_path,
        outfit_mode=outfit_mode,
        language=(language or "english").lower().strip(),
        status="queued",
        current_stage="Job queued for processing",
        total_pages=5
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Launch background job asynchronously
    background_tasks.add_task(job_runner.process_preview_job, job.id)

    return enrich_job_urls(job)

@router.get("/languages")
def get_supported_languages():
    from app.services.translation_service import translation_service
    return {
        "default": "english",
        "languages": translation_service.get_supported_languages()
    }

@router.get("/{job_id}", response_model=PersonalizationOut)
def get_personalization_job(job_id: str, response: Response, db: Session = Depends(get_db)):
    job = db.query(PersonalizationJob).filter(PersonalizationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Personalization job not found.")
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return enrich_job_urls(job)

@router.post("/assets/{asset_id}/retry", response_model=GeneratedAssetOut)
async def retry_single_page(
    asset_id: str,
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    asset_rec = db.query(GeneratedAsset).filter(GeneratedAsset.id == asset_id).first()
    if not asset_rec:
        raise HTTPException(status_code=404, detail="Asset not found.")

    job = db.query(PersonalizationJob).filter(PersonalizationJob.id == asset_rec.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Associated personalization job not found.")

    # Determine admin privileges
    raw_token = None
    if authorization and authorization.startswith("Bearer "):
        raw_token = authorization.replace("Bearer ", "").strip()
    elif token and isinstance(token, str):
        raw_token = token.strip()

    is_admin = False
    if raw_token:
        try:
            payload = verify_jwt_token(raw_token, settings.SECRET_KEY)
            u = db.query(User).filter(User.id == payload.get("sub"), User.role == "admin").first()
            if u:
                is_admin = True
        except Exception:
            is_admin = False

    # Authorization Check:
    # Admins can retry any page. Non-admins can retry only if the book is paid OR if it's one of the preview pages (1..3)
    story = job.story or db.query(StoryTemplate).filter(StoryTemplate.id == job.story_id).first()
    preview_limit = getattr(story, "preview_pages", 3) or 3
    is_preview_page = asset_rec.page_number <= preview_limit

    if not is_admin and not getattr(job, "is_paid", False) and not is_preview_page:
        raise HTTPException(
            status_code=402,
            detail="Payment required to regenerate pages beyond the free preview."
        )

    # Cost Abuse Defense: Cap retries per asset to 5 for non-admin callers
    if not is_admin and (asset_rec.asset_version or 1) >= 5:
        raise HTTPException(
            status_code=429,
            detail="Maximum regeneration limit reached for this page. Please contact support if you need further adjustments."
        )

    asset = await job_runner.regenerate_single_page(asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found or failed to regenerate.")
    
    # Reload within active session to avoid DetachedInstanceError on relationship lazy load
    story_page = db.query(StoryPage).filter(StoryPage.id == asset.story_page_id).first() if asset.story_page_id else None

    asset_dict = {
        "id": asset.id,
        "job_id": asset.job_id,
        "story_page_id": asset.story_page_id,
        "page_number": asset.page_number,
        "asset_version": asset.asset_version,
        "storage_path": asset.storage_path,
        "image_url": storage.get_public_url(asset.storage_path),
        "provider": asset.provider,
        "model": asset.model,
        "prompt_used": asset.prompt_used,
        "story_text": story_page.story_text if story_page else asset.prompt_used,
        "text_x": getattr(story_page, "text_x", 50.0) if story_page else 50.0,
        "text_y": getattr(story_page, "text_y", 89.5) if story_page else 89.5,
        "font_size": getattr(story_page, "font_size", 15) or 15 if story_page else 15,
        "font_family": getattr(story_page, "font_family", "Sans (DejaVu Bold)") or "Sans (DejaVu Bold)" if story_page else "Sans (DejaVu Bold)",
        "font_color": getattr(story_page, "font_color", "#000000") or "#000000" if story_page else "#000000",
        "has_background_box": getattr(story_page, "has_background_box", True) if getattr(story_page, "has_background_box", None) is not None else True if story_page else True,
        "box_bg_color": getattr(story_page, "box_bg_color", "#FFFFFF") or "#FFFFFF" if story_page else "#FFFFFF",
        "box_border_color": getattr(story_page, "box_border_color", "#E5E7EB") or "#E5E7EB" if story_page else "#E5E7EB",
        "box_border_width": getattr(story_page, "box_border_width", 1) if getattr(story_page, "box_border_width", None) is not None else 1 if story_page else 1,
        "box_bg_opacity": getattr(story_page, "box_bg_opacity", 0.85) if getattr(story_page, "box_bg_opacity", None) is not None else 0.85 if story_page else 0.85,
        "text_align": getattr(story_page, "text_align", "center") or "center" if story_page else "center",
        "box_layout": getattr(story_page, "box_layout", "banner") or "banner" if story_page else "banner",
        "box_border_radius": getattr(story_page, "box_border_radius", 14) if getattr(story_page, "box_border_radius", None) is not None else 14 if story_page else 14,
        "generation_status": asset.generation_status,
        "review_status": asset.review_status,
        "cost_estimate": None,
        "generation_time_sec": None,
        "error_message": asset.error_message,
        "created_at": asset.created_at
    }
    return asset_dict

@router.post("/{job_id}/translate")
def translate_job_narrative(
    job_id: str,
    payload: dict,
    db: Session = Depends(get_db)
):
    from app.services.translation_service import translation_service
    target_language = payload.get("target_language", "english")
    job = db.query(PersonalizationJob).filter(PersonalizationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    translations = translation_service.translate_job_assets(job_id=job.id, target_lang=target_language, db=db)
    return {
        "job_id": job.id,
        "target_language": target_language,
        "translations": translations
    }

@router.post("/{job_id}/generate-full")
def trigger_full_generation(
    job_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Asynchronously trigger full-book HD generation in the background.
    Protected: Restricted strictly to authenticated administrators.
    """
    job = db.query(PersonalizationJob).filter(PersonalizationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.status = "Rendering · 0%"
    job.current_stage = "Queued full-book HD rendering..."
    db.commit()

    from app.services.job_runner import job_runner

    def _worker(jid: str):
        job_runner.get_or_generate_full_storybook_pages(jid)

    background_tasks.add_task(_worker, job.id)
    return {
        "status": "queued",
        "job_id": job.id,
        "message": "Full-book HD generation started in background."
    }

def get_full_storybook_pages_for_print(
    job: PersonalizationJob,
    story: StoryTemplate,
    target_lang: str = "english",
    db: Session = None
) -> List[Dict[str, Any]]:
    story_slug = story.slug or "unicorn-story"
    child_name = job.child_name or "Little Explorer"

    # Query all story pages ordered by page_index, page_number
    story_pages = db.query(StoryPage).filter(
        StoryPage.story_id == story.id
    ).order_by(StoryPage.page_index, StoryPage.page_number).all()

    # Pre-load existing generated assets (face-fused plates), strictly prioritizing Hugging Face AI over Poisson
    existing_assets = {}
    swap_spaces = [s.strip().lower() for s in getattr(settings, "HF_FACE_SWAP_SPACE", "").split(",") if s.strip()]
    def _asset_priority(a):
        m = (a.model or "").lower()
        p = (a.provider or "").lower()
        tier = 2 if any(s in m for s in swap_spaces if s) else (1 if ("hugging" in p or "swap" in m or "neural" in p) else 0)
        return (tier, a.created_at or datetime.datetime.min)

    sorted_assets = sorted(
        db.query(GeneratedAsset).filter(GeneratedAsset.job_id == job.id, GeneratedAsset.generation_status == "completed").all(),
        key=_asset_priority
    )
    for a in sorted_assets:
        if a.storage_path:
            existing_assets[a.page_number] = a.storage_path

    # Normalize child reference photo for dynamic face fusion on uncompleted pages
    from app.services.ai.consistency_engine import CharacterConsistencyEngine
    norm_ref = None
    if job.photo_path:
        try:
            norm_ref = CharacterConsistencyEngine.normalize_child_reference(job.photo_path)
        except Exception as e:
            print(f"Notice: Error preparing child photo for print pages: {e}")

    from app.services.ai.cartoon_fusion import cartoon_fusion_engine
    import time

    pages_data = []
    total_pages = len(story_pages)
    for idx, page in enumerate(story_pages):
        page_num = idx + 1
        page_type = "cover" if idx == 0 else ("back_cover" if idx == total_pages - 1 and total_pages > 1 else (page.page_type or "story"))

        # 1. Personalize narrative text
        job_lang = (getattr(job, "language", "english") or "english").lower().strip()
        effective_lang = target_lang if (target_lang and target_lang.lower() != "english") else job_lang
        effective_lang = (effective_lang or "english").lower().strip()

        if page.story_text is not None:
            raw_text = page.story_text
        else:
            raw_text = page.extracted_text or ""

        personalized_text = raw_text

        if personalized_text and personalized_text.strip() != "":
            if effective_lang not in ["english", "en"]:
                custom_trans = {}
                if getattr(page, "translations", None):
                    try:
                        custom_trans = json.loads(page.translations) if isinstance(page.translations, str) else page.translations
                    except Exception:
                        custom_trans = {}
                if isinstance(custom_trans, dict) and custom_trans.get(effective_lang):
                    personalized_text = custom_trans[effective_lang]
                else:
                    from app.services.translation_service import translation_service
                    personalized_text = translation_service.translate_text(personalized_text, effective_lang, child_name=child_name)

            for tag in ["[Name]", "[name]", "{name}", "{{name}}", "[child_name]", "{child_name}", "{{child_name}}", "{குழந்தை_பெயர்}", "[குழந்தை_பெயர்]"]:
                personalized_text = personalized_text.replace(tag, child_name)
        else:
            personalized_text = ""

        # 2. Resolve image: use personalized face-swapped plate if ready, else generate it with AI
        has_character = bool(page.face_outline_points and page.face_outline_points not in ["EMPTY", "[]", "none", "false", "no_face"])
        is_page_personalizable = bool(page.personalization_required and has_character)

        img_path = None
        if page_num in existing_assets and is_page_personalizable:
            img_path = existing_assets[page_num]
        elif is_page_personalizable and norm_ref and os.path.exists(norm_ref):
            cand = settings.SOURCE_PAGES_DIR / story_slug / f"page_{page_num:02d}.png"
            page_img = (str(cand) if cand.exists() else None) or (storage.resolve_path(page.original_image_path) if page.original_image_path else None) or f"source_pages/{story_slug}/page_{page_num:02d}.png"
            try:
                gen_res = cartoon_fusion_engine.fuse_page(
                    page_number=page_num,
                    child_reference_path=norm_ref,
                    story_slug=story_slug,
                    page_image_path=page_img,
                    face_outline_points=page.face_outline_points,
                    prefer_local=False,
                    outfit_mode=getattr(job, "outfit_mode", "story") or "story",
                )
                asset_filename = f"job_{job.id}_p{page_num:02d}_{int(time.time())}.{gen_res.format}"
                asset_path = storage.save_bytes(
                    data=gen_res.image_bytes,
                    category="generated_assets",
                    custom_name=f"{job.id}/{asset_filename}"
                )
                if db:
                    new_asset = GeneratedAsset(
                        job_id=job.id,
                        story_page_id=page.id,
                        page_number=page_num,
                        storage_path=asset_path,
                        provider=gen_res.provider,
                        model=gen_res.model,
                        prompt_used=personalized_text,
                        generation_status="completed",
                        review_status="approved",
                        cost_estimate=gen_res.cost_estimate_usd,
                        generation_time_sec=gen_res.generation_time_sec,
                        error_code=gen_res.error_code,
                        attempts=gen_res.attempts,
                        used_fallback=gen_res.used_fallback,
                        fallback_from=gen_res.fallback_from,
                    )
                    db.add(new_asset)
                    db.commit()
                res_local = storage.resolve_path(asset_path)
                existing_assets[page_num] = res_local or asset_path
                img_path = res_local or asset_path
            except Exception as e:
                print(f"Notice: Face fusion error on page {page_num}: {e}")
                from app.services.ai.errors import classify_error
                code, msg, _ = classify_error(e)
                if db:
                    failed_asset = GeneratedAsset(
                        job_id=job.id,
                        story_page_id=page.id,
                        page_number=page_num,
                        storage_path="",
                        provider="Magic Hour",
                        model="face_swap_photo",
                        prompt_used=personalized_text,
                        generation_status="failed",
                        review_status="rejected",
                        error_code=code.value,
                        attempts=1,
                    )
                    db.add(failed_asset)
                    job.failed_pages = (job.failed_pages or 0) + 1
                    job.status = "needs_attention"
                    job.current_stage = f"Page {page_num} personalization failed: {code.value}"
                    job.error_details = str(e)
                    db.commit()
                cand = settings.SOURCE_PAGES_DIR / story_slug / f"page_{page_num:02d}.png"
                img_path = (str(cand) if cand.exists() else None) or (storage.resolve_path(page.original_image_path) if page.original_image_path else None) or page.original_image_path
        else:
            cand = settings.SOURCE_PAGES_DIR / story_slug / f"page_{page_num:02d}.png"
            img_path = (str(cand) if cand.exists() else None) or (storage.resolve_path(page.original_image_path) if page.original_image_path else None) or page.original_image_path

        pages_data.append({
            "page_number": page_num,
            "page_type": page_type,
            "image_path": img_path,
            "story_text": personalized_text,
            "text_x": getattr(page, "text_x", 50.0) if getattr(page, "text_x", None) is not None else 50.0,
            "text_y": getattr(page, "text_y", 89.5) if getattr(page, "text_y", None) is not None else 89.5,
            "font_size": getattr(page, "font_size", 15) or 15,
            "font_family": getattr(page, "font_family", "Sans (DejaVu Bold)") or "Sans (DejaVu Bold)",
            "font_color": getattr(page, "font_color", "#000000") or "#000000",
            "has_background_box": getattr(page, "has_background_box", True) if getattr(page, "has_background_box", None) is not None else True,
            "box_bg_color": getattr(page, "box_bg_color", "#FFFFFF") or "#FFFFFF",
            "box_border_color": getattr(page, "box_border_color", "#E5E7EB") or "#E5E7EB",
            "box_border_width": getattr(page, "box_border_width", 1) if getattr(page, "box_border_width", None) is not None else 1,
            "box_bg_opacity": getattr(page, "box_bg_opacity", 0.85) if getattr(page, "box_bg_opacity", None) is not None else 0.85,
            "text_align": getattr(page, "text_align", "center") or "center",
            "box_layout": getattr(page, "box_layout", "banner") or "banner",
            "box_border_radius": getattr(page, "box_border_radius", 14) if getattr(page, "box_border_radius", None) is not None else 14,
        })

    return pages_data

@router.get("/{job_id}/print-pdf")
def download_full_print_pdf(
    job_id: str,
    lang: str = Query("english"),
    size: str = Query("8x8"),
    color: str = Query("rgb"),
    token: Optional[str] = Query(None),
    admin: Optional[bool] = Query(False),
    mode: Optional[str] = Query(None),
    recompose: Optional[bool] = Query(False),
    authorization: Optional[str] = Header(None),
    referer: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Generate and download the complete, print-ready RGB PDF containing ALL pages of the actual uploaded storybook.
    Formatted to 8x8 inches (203.2 x 203.2 mm) in DeviceRGB color space with vibrant colors without preview watermarks.
    STRICT SECURITY: Requires job.is_paid == True. Only authenticated administrators with a valid
    session token can download unpurchased PDFs. URL parameters like "?admin=true" do NOT bypass payment.
    """
    job = db.query(PersonalizationJob).filter(PersonalizationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    auth_str = authorization if isinstance(authorization, str) else ""

    # Secure Admin Verification:
    # Requires a valid cryptographic admin session token via query param or Authorization header
    token_candidate = (token if isinstance(token, str) else "").strip()
    if not token_candidate and auth_str.startswith("Bearer "):
        token_candidate = auth_str.replace("Bearer ", "").strip()

    is_admin = False
    if token_candidate:
        try:
            payload = verify_jwt_token(token_candidate, settings.SECRET_KEY)
            u = db.query(User).filter(User.id == payload.get("sub"), User.role == "admin").first()
            if u:
                is_admin = True
        except Exception:
            is_admin = False

    # Guard: Require payment for full print PDF unless authenticated as admin
    if not getattr(job, "is_paid", False) and not is_admin:
        raise HTTPException(
            status_code=402,
            detail="Payment required to download full print-ready PDF. Please complete payment to unlock."
        )

    # Clean up any prior failed asset placeholders so they can be seamlessly re-attempted with active credits
    failed_prior = db.query(GeneratedAsset).filter(
        GeneratedAsset.job_id == job.id,
        GeneratedAsset.generation_status == "failed"
    ).all()
    if failed_prior:
        for fa in failed_prior:
            db.delete(fa)
        job.failed_pages = 0
        try:
            db.commit()
        except Exception:
            db.rollback()

    story = job.story or db.query(StoryTemplate).filter(StoryTemplate.id == job.story_id).first()
    child_name = job.child_name or "Little Explorer"
    story_title = story.title if story else "Personalized Story"

    from app.services.pdf_composer import PDFComposerService

    print_filename = f"final_book_{job.id}_{lang}_{size}_{color}_v2.pdf"
    pdf_bytes = None
    candidate_keys = [
        f"final_books/{print_filename}",
    ]
    if not recompose:
        for key in candidate_keys:
            try:
                pdf_bytes = storage.get_bytes(key)
                if pdf_bytes:
                    break
            except Exception:
                pdf_bytes = None

    if not pdf_bytes:
        # Fetch all pages with personalized face-fused character plates:
        all_pages_data = get_full_storybook_pages_for_print(job=job, story=story, target_lang=lang, db=db)

        # Safeguard: Verify if any pages failed during dynamic full book rendering
        failed_after = db.query(GeneratedAsset).filter(
            GeneratedAsset.job_id == job.id,
            GeneratedAsset.generation_status == "failed"
        ).all()
        if failed_after:
            failed_pages = sorted(list({a.page_number for a in failed_after}))
            raise HTTPException(
                status_code=409,
                detail={
                    "message": "Storybook contains pages that failed personalization",
                    "failed_pages": failed_pages,
                    "status": "needs_attention",
                }
            )

        if not all_pages_data:
            raise HTTPException(status_code=400, detail="No printable pages found for this storybook.")

        job_lang = getattr(job, "language", "english") or "english"
        effective_lang = lang if (lang and lang.lower() != "english") else job_lang
        storage_key, validation = PDFComposerService.compose_storybook_pdf(
            pages_data=all_pages_data,
            output_filename=print_filename,
            book_type="final",
            child_name=child_name,
            story_title=story_title,
            page_size=size,
            color_mode=color,
            language=effective_lang
        )
        try:
            pdf_bytes = storage.get_bytes(storage_key)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to retrieve composed print PDF: {e}")

    # Update job completion state & record customer download in admin
    story_pages_total = (story.page_count if (story and story.page_count) else 24)
    if (job.completed_pages or 0) < story_pages_total:
        job.completed_pages = story_pages_total
    if (job.total_pages or 0) < story_pages_total:
        job.total_pages = story_pages_total
    if job.status != "needs_attention" and (job.failed_pages or 0) == 0:
        job.status = "completed"

    if not is_admin:
        try:
            from zoneinfo import ZoneInfo
            tz_str = os.getenv("TIMEZONE", "Asia/Kolkata")
            local_now = datetime.datetime.now(ZoneInfo(tz_str)).strftime("%b %d, %I:%M %p")
        except Exception:
            local_now = datetime.datetime.utcnow().strftime("%b %d, %I:%M %p")
        job.current_stage = f"Downloaded by customer on {local_now}"

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Notice: Failed updating download status for job {job.id}: {e}")

    safe_child = child_name.replace(" ", "_")
    safe_title = story_title.replace(" ", "_")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_child}_{safe_title}_Full_Print_{size}.pdf"'
        }
    )

@router.get("/{job_id}/cover-page")
def download_cover_page(
    job_id: str,
    format: str = Query("pdf"),  # "pdf" or "image"
    token: Optional[str] = Query(None),
    admin: Optional[bool] = Query(False),
    recompose: Optional[bool] = Query(False),
    authorization: Optional[str] = Header(None),
    referer: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Download the personalized Hard Copy Cover Page (wrap spread).
    Supports format='pdf' (print-ready high-res PDF) or format='image' (JPEG).
    STRICT SECURITY: Requires job.is_paid == True and hard copy edition.
    Administrators must provide a valid session token.
    """
    job = db.query(PersonalizationJob).filter(PersonalizationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    auth_str = authorization if isinstance(authorization, str) else ""

    # Secure Admin Verification
    token_candidate = (token if isinstance(token, str) else "").strip()
    if not token_candidate and auth_str.startswith("Bearer "):
        token_candidate = auth_str.replace("Bearer ", "").strip()

    is_admin = False
    if token_candidate:
        try:
            payload = verify_jwt_token(token_candidate, settings.SECRET_KEY)
            u = db.query(User).filter(User.id == payload.get("sub"), User.role == "admin").first()
            if u:
                is_admin = True
        except Exception:
            is_admin = False

    # Guard: Require payment or admin access
    if not getattr(job, "is_paid", False) and not is_admin:
        raise HTTPException(
            status_code=402,
            detail="Payment required to download personalized hard copy cover spread. Please complete payment."
        )

    # 1. HARD COPY CHECK: Cover Page is exclusively for Hard Copy orders, NOT for digital editions
    from app.models import Order, GeneratedAsset
    linked_orders = db.query(Order).filter(Order.job_id == job.id).all()
    is_hardcopy = (
        getattr(job, "format_type", "") in ["print_hardcover", "hardcover"] or
        any(getattr(o, "format_type", "") in ["print_hardcover", "hardcover"] for o in linked_orders)
    )

    if not is_hardcopy and not is_admin:
        raise HTTPException(
            status_code=403,
            detail="Cover Page wrap spread download is only available for Hard Copy orders, not for digital editions."
        )

    # Sync format_type on job if linked order is hard copy
    if getattr(job, "format_type", "") != "print_hardcover":
        job.format_type = "print_hardcover"
        db.commit()

    # 2. GENERATION CHECK: Must be generated (all 24 pages personalized)
    is_generated = (
        job.status == "completed" or
        (job.completed_pages is not None and job.total_pages is not None and job.completed_pages >= job.total_pages) or
        (job.completed_pages is not None and job.completed_pages >= 24)
    )
    front_asset = db.query(GeneratedAsset).filter(
        GeneratedAsset.job_id == job.id,
        GeneratedAsset.page_number == 1,
        GeneratedAsset.generation_status == "completed"
    ).first()

    if not is_generated and not front_asset:
        raise HTTPException(
            status_code=400,
            detail="Cover Page wrap spread will be ready once all pages have been personalized."
        )

    if not is_admin:
        # Customer access verification: Must be paid for hard copy
        is_paid = bool(job.is_paid or job.paid_at or any(o.payment_status == "paid" for o in linked_orders))
        if not is_paid:
            raise HTTPException(
                status_code=403,
                detail="Cover Page wrap spread download is available after purchasing the hard copy edition."
            )

    from app.services.cover_service import CoverPageService

    # Personalize cover page (or fetch existing)
    saved_path, img_bytes = CoverPageService.personalize_cover_page(
        job_id=job.id,
        db=db,
        force_regenerate=recompose
    )

    if not img_bytes:
        raise HTTPException(status_code=404, detail="Cover page illustration could not be resolved for this story.")

    child_name = job.child_name or "Little Adventurer"
    story = job.story or db.query(StoryTemplate).filter(StoryTemplate.id == job.story_id).first()
    story_title = story.title if story else "Storybook"
    safe_child = child_name.replace(" ", "_")
    safe_title = story_title.replace(" ", "_")

    fmt = str(format).lower().strip()
    if fmt in ["image", "jpg", "jpeg", "png"]:
        media_type = "image/png" if fmt == "png" else "image/jpeg"
        ext = "png" if fmt == "png" else "jpg"
        return Response(
            content=img_bytes,
            media_type=media_type,
            headers={
                "Content-Disposition": f'attachment; filename="{safe_child}_{safe_title}_Cover_Page_46.6x27.6cm.{ext}"'
            }
        )

    # Default to PDF (Exact 46.6 cm x 27.6 cm print-ready wrap)
    pdf_bytes = CoverPageService.compose_cover_page_pdf(
        image_bytes=img_bytes,
        child_name=child_name,
        story_title=story_title
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_child}_{safe_title}_Cover_Page_46.6x27.6cm.pdf"'
        }
    )

@router.get("/{job_id}/pdf")
def download_preview_pdf(
    job_id: str,
    lang: str = Query("english"),
    mode: str = Query("preview"),
    size: str = Query("8x8"),
    color: str = Query("rgb"),
    token: Optional[str] = Query(None),
    admin: Optional[bool] = Query(False),
    authorization: Optional[str] = Header(None),
    referer: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    job = db.query(PersonalizationJob).filter(PersonalizationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    auth_str = authorization if isinstance(authorization, str) else ""

    # Secure Admin Verification
    token_candidate = (token if isinstance(token, str) else "").strip()
    if not token_candidate and auth_str.startswith("Bearer "):
        token_candidate = auth_str.replace("Bearer ", "").strip()

    is_admin = False
    if token_candidate:
        try:
            payload = verify_jwt_token(token_candidate, settings.SECRET_KEY)
            u = db.query(User).filter(User.id == payload.get("sub"), User.role == "admin").first()
            if u:
                is_admin = True
        except Exception:
            is_admin = False

    is_paid = bool(getattr(job, "is_paid", False))

    # If customer requested full/print mode, payment or admin authentication is strictly required
    if mode.lower() in ["full", "print", "complete", "admin"]:
        if not is_paid and not is_admin:
            raise HTTPException(
                status_code=402,
                detail="Payment required to download full storybook PDF. Please unlock the storybook."
            )
        return download_full_print_pdf(
            job_id=job_id,
            lang=lang,
            size=size,
            color="admin_preview" if is_admin else color,
            token=token_candidate,
            admin=is_admin,
            mode="full",
            authorization=auth_str,
            referer=referer,
            db=db
        )

    story = job.story or db.query(StoryTemplate).filter(StoryTemplate.id == job.story_id).first()
    child_name = job.child_name or "Little Explorer"
    story_title = story.title if story else "Personalized Story"

    # Safeguard: Do not deliver preview PDF if personalizable preview pages failed
    failed_assets = db.query(GeneratedAsset).filter(
        GeneratedAsset.job_id == job.id,
        GeneratedAsset.generation_status == "failed"
    ).all()
    if failed_assets:
        failed_pages = sorted(list({a.page_number for a in failed_assets}))
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Storybook contains pages that failed personalization",
                "failed_pages": failed_pages,
                "status": "needs_attention",
            }
        )

    job_lang = (getattr(job, "language", "english") or "english").lower().strip()
    effective_lang = lang if (lang and lang.lower() != "english") else job_lang
    effective_lang = (effective_lang or "english").lower().strip()

    # Check for pre-composed preview PDF in storage matching effective_lang
    preview_book = db.query(Book).filter(
        Book.job_id == job.id,
        Book.book_type == "preview",
        Book.page_count == 3
    ).order_by(Book.created_at.desc()).first()

    candidate_keys = []
    if preview_book and preview_book.pdf_storage_path:
        if effective_lang == job_lang:
            candidate_keys.append(preview_book.pdf_storage_path)
    candidate_keys.append(f"previews/preview_{job.id}_{effective_lang}.pdf")
    if effective_lang in ["english", "en"]:
        candidate_keys.append(f"previews/preview_{job.id}.pdf")
        if preview_book and preview_book.pdf_storage_path and preview_book.pdf_storage_path not in candidate_keys:
            candidate_keys.append(preview_book.pdf_storage_path)

    for ckey in candidate_keys:
        try:
            pdf_bytes = storage.get_bytes(ckey)
            if pdf_bytes:
                return Response(
                    content=pdf_bytes,
                    media_type="application/pdf",
                    headers={
                        "Content-Disposition": f'inline; filename="{child_name}_{story_title}_{effective_lang}_preview.pdf"'
                    }
                )
        except Exception:
            pass

    # Check if generated assets exist and compose strictly top 3 pages via PDFComposerService
    from app.services.pdf_composer import PDFComposerService
    assets = db.query(GeneratedAsset).filter(
        GeneratedAsset.job_id == job.id,
        GeneratedAsset.generation_status == "completed"
    ).order_by(GeneratedAsset.page_number).all()

    # Limit strictly to 3 preview images (never show empty template pages)
    preview_assets = assets[:3]
    pages_data = []
    for a in preview_assets:
        if not a.storage_path:
            continue
        img_path = a.storage_path
        story_page = db.query(StoryPage).filter(StoryPage.id == a.story_page_id).first() if a.story_page_id else None
        if story_page:
            text = story_page.story_text if story_page.story_text is not None else (story_page.extracted_text or "")
        else:
            text = ""

        if text and text.strip() != "":
            for tag in ["[Name]", "[name]", "{name}", "{{name}}", "[child_name]", "{child_name}", "{{child_name}}"]:
                text = text.replace(tag, child_name)
            if effective_lang not in ["english", "en"]:
                custom_trans = {}
                if story_page and getattr(story_page, "translations", None):
                    try:
                        custom_trans = json.loads(story_page.translations) if isinstance(story_page.translations, str) else story_page.translations
                    except Exception:
                        custom_trans = {}
                if custom_trans and custom_trans.get(effective_lang):
                    text = custom_trans[effective_lang]
                    for tag in ["[Name]", "[name]", "{name}", "[child_name]", "{child_name}", "{{name}}"]:
                        text = text.replace(tag, child_name)
                else:
                    from app.services.translation_service import translation_service
                    text = translation_service.translate_text(text, effective_lang, child_name=child_name)
        else:
            text = ""

        pages_data.append({
            "page_number": a.page_number,
            "page_type": story_page.page_type if story_page else ("cover" if a.page_number == 1 else "story"),
            "image_path": img_path,
            "story_text": text,
            "text_x": getattr(story_page, "text_x", 50.0) if story_page else 50.0,
            "text_y": getattr(story_page, "text_y", 89.5) if story_page else 89.5,
            "font_size": getattr(story_page, "font_size", 15) or 15 if story_page else 15,
            "font_family": getattr(story_page, "font_family", "Sans (DejaVu Bold)") or "Sans (DejaVu Bold)" if story_page else "Sans (DejaVu Bold)",
            "font_color": getattr(story_page, "font_color", "#000000") or "#000000" if story_page else "#000000",
            "has_background_box": getattr(story_page, "has_background_box", True) if getattr(story_page, "has_background_box", None) is not None else True if story_page else True,
            "box_bg_color": getattr(story_page, "box_bg_color", "#FFFFFF") or "#FFFFFF" if story_page else "#FFFFFF",
            "box_border_color": getattr(story_page, "box_border_color", "#E5E7EB") or "#E5E7EB" if story_page else "#E5E7EB",
            "box_border_width": getattr(story_page, "box_border_width", 1) if getattr(story_page, "box_border_width", None) is not None else 1 if story_page else 1,
            "box_bg_opacity": getattr(story_page, "box_bg_opacity", 0.85) if getattr(story_page, "box_bg_opacity", None) is not None else 0.85 if story_page else 0.85,
            "text_align": getattr(story_page, "text_align", "center") or "center" if story_page else "center",
            "box_layout": getattr(story_page, "box_layout", "banner") or "banner" if story_page else "banner",
            "box_border_radius": getattr(story_page, "box_border_radius", 14) if getattr(story_page, "box_border_radius", None) is not None else 14 if story_page else 14,
        })

    if pages_data:
        preview_filename = f"preview_{job.id}_{effective_lang}_v2.pdf"
        storage_key, _ = PDFComposerService.compose_storybook_pdf(
            pages_data=pages_data[:3],
            output_filename=preview_filename,
            book_type="preview",
            child_name=child_name,
            story_title=story_title,
            language=effective_lang
        )
        try:
            pdf_bytes = storage.get_bytes(storage_key)
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f'inline; filename="{child_name}_{story_title}_{lang}_preview.pdf"'
                }
            )
        except Exception as e:
            print(f"[PDF] Error retrieving composed preview PDF bytes: {e}")

    # NOTE: Do NOT return empty template / fallback unpersonalized pages!
    raise HTTPException(
        status_code=400,
        detail="Personalized preview illustrations are still being generated or not yet available. Please wait a moment."
    )

@router.post("/test-render", response_model=PersonalizationOut)
async def test_render_book(
    background_tasks: BackgroundTasks,
    story_id: str = Form(...),
    child_name: str = Form("Aarav"),
    photo: Optional[UploadFile] = File(None),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    story = db.query(StoryTemplate).filter(StoryTemplate.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    photo_path = "child_photos/default_child_sample.jpg"
    if photo and photo.filename:
        ext = Path(photo.filename).suffix.lower()
        if ext not in (".jpg", ".jpeg", ".png", ".webp"):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file extension '{ext}'. Only image formats (.jpg, .jpeg, .png, .webp) are allowed."
            )
        photo_path = await storage.save_upload_file(
            photo,
            category="child_photos",
            allowed_extensions=(".jpg", ".jpeg", ".png", ".webp")
        )

    # Create profile
    profile = ChildProfile(
        child_display_name=child_name.strip(),
        photo_storage_path=photo_path,
        consent_status=True,
        consent_timestamp=datetime.datetime.utcnow(),
        retention_status="active"
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)

    job = PersonalizationJob(
        id=str(uuid.uuid4()),
        story_id=story.id,
        child_profile_id=profile.id,
        child_name=child_name.strip(),
        photo_path=photo_path,
        status="queued",
        current_stage="Job queued for processing",
        total_pages=min(5, len(story.pages) if story.pages else 5),
        created_at=datetime.datetime.utcnow(),
        updated_at=datetime.datetime.utcnow()
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Process preview job dynamically for this exact story
    background_tasks.add_task(job_runner.process_preview_job, job.id)
    return enrich_job_urls(job)
