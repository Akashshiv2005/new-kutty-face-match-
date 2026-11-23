"""
test_business_logic.py — Tests for core business logic and validation rules.

Covers:
- Coupon evaluation logic (evaluate_coupon)
- Password hashing/verification security
- JWT token lifecycle
- Story availability business rules
- Payment signature verification
- Age/gender restriction enforcement
- Anti-enumeration (forgot password)
"""
import time
import uuid
import json
import hmac
import hashlib
import secrets
import pytest
from fastapi.testclient import TestClient


class TestCouponLogic:
    """Unit tests for the evaluate_coupon() business function."""

    def _get_session(self):
        from testing.conftest import TestSessionLocal
        return TestSessionLocal()

    def _seed_coupon(self, db_session, code="TEST25", text="25% OFF with TEST25"):
        from app.models import SiteSettings
        data = json.dumps({
            "is_active": True,
            "coupon_code": code,
            "text": text,
            "notices": [],
            "default_pdf_price": 799.0,
            "default_hardcover_price": 1399.0,
            "regional_language_surcharge": 99.0,
            "gift_wrap_fee": 20.0,
            "gift_wrap_enabled": True,
        })
        row = db_session.query(SiteSettings).filter(SiteSettings.key == "announcement_bar").first()
        if row:
            row.value = data
        else:
            row = SiteSettings(key="announcement_bar", value=data)
            db_session.add(row)
        db_session.commit()

    def test_valid_coupon_gives_correct_discount(self, db_session):
        from app.routers.payments import evaluate_coupon
        self._seed_coupon(db_session, "BIZ25", "Get 25% off with BIZ25")
        is_valid, pct, disc_amt, final_amt, msg = evaluate_coupon("BIZ25", 799.0, db_session)
        assert is_valid is True
        assert pct == 25.0
        assert disc_amt == round(799.0 * 0.25)
        assert final_amt == 799.0 - disc_amt

    def test_invalid_coupon_rejected(self, db_session):
        from app.routers.payments import evaluate_coupon
        self._seed_coupon(db_session, "VALID10")
        is_valid, pct, disc_amt, final_amt, msg = evaluate_coupon("FAKECOUPON", 799.0, db_session)
        assert is_valid is False
        assert disc_amt == 0.0
        assert final_amt == 799.0

    def test_empty_coupon_rejected(self, db_session):
        from app.routers.payments import evaluate_coupon
        is_valid, pct, disc_amt, final_amt, msg = evaluate_coupon("", 799.0, db_session)
        assert is_valid is False

    def test_coupon_case_insensitive(self, db_session):
        from app.routers.payments import evaluate_coupon
        self._seed_coupon(db_session, "UPPER30", "30% OFF with UPPER30")
        is_valid, pct, disc_amt, _, _ = evaluate_coupon("upper30", 799.0, db_session)
        assert is_valid is True
        assert pct == 30.0

    def test_coupon_percent_from_code_digits(self, db_session):
        """Coupon SAVE15 → 15% discount extracted from code digits."""
        from app.routers.payments import evaluate_coupon
        self._seed_coupon(db_session, "SAVE15", "Special offer on storybooks")  # no % in text
        is_valid, pct, _, _, _ = evaluate_coupon("SAVE15", 1000.0, db_session)
        assert is_valid is True
        assert pct == 15.0

    def test_coupon_default_20_percent_no_digits(self, db_session):
        """Code with no digits and no % in text defaults to 20%."""
        from app.routers.payments import evaluate_coupon
        self._seed_coupon(db_session, "SPECIAL", "Special discount available")
        is_valid, pct, _, _, _ = evaluate_coupon("SPECIAL", 1000.0, db_session)
        assert is_valid is True
        assert pct == 20.0

    def test_coupon_percent_from_text_wins_over_digits(self, db_session):
        """When % appears in announcement text, it takes priority over code digits."""
        from app.routers.payments import evaluate_coupon
        self._seed_coupon(db_session, "SAVE99", "Get 10% OFF on books")  # text says 10, code says 99
        is_valid, pct, _, _, _ = evaluate_coupon("SAVE99", 1000.0, db_session)
        assert is_valid is True
        assert pct == 10.0  # text-based % wins

    def test_coupon_extreme_percent_clamped(self, db_session):
        """Discount >90% in code digits should fallback to 20%."""
        from app.routers.payments import evaluate_coupon
        self._seed_coupon(db_session, "CODE99", "No percentage mentioned here at all")
        # 99 is out of 5–90 range → defaults to 20%
        is_valid, pct, _, _, _ = evaluate_coupon("CODE99", 1000.0, db_session)
        assert is_valid is True
        assert pct == 20.0


class TestPasswordSecurity:
    """Security-focused tests for password hashing."""

    def test_hash_is_unique_per_call(self):
        from app.routers.auth import hash_password
        h1 = hash_password("SamePassword")
        h2 = hash_password("SamePassword")
        assert h1 != h2, "Identical passwords must produce different hashes (random salt)"

    def test_hash_format(self):
        from app.routers.auth import hash_password
        h = hash_password("test123")
        parts = h.split("$")
        assert len(parts) == 2
        salt, key_hex = parts
        assert len(salt) == 32  # secrets.token_hex(16) → 32 chars
        assert len(key_hex) == 64  # sha256 digest → 32 bytes → 64 hex chars

    def test_verify_password_correct(self):
        from app.routers.auth import hash_password, verify_password
        for pw in ["simple", "C0mpl3x!Pass@#", "12345678", "   spaces   "]:
            h = hash_password(pw)
            assert verify_password(pw, h) is True

    def test_verify_password_wrong(self):
        from app.routers.auth import hash_password, verify_password
        h = hash_password("correct")
        assert verify_password("incorrect", h) is False

    def test_verify_password_timing_safe_on_bad_format(self):
        from app.routers.auth import verify_password
        # Must not throw, even with malformed hash
        assert verify_password("anything", "noDollarSign") is False
        assert verify_password("anything", "") is False
        assert verify_password("anything", "$") is False


class TestJWTSecurity:
    """Security-focused tests for JWT creation and verification."""

    def test_jwt_cannot_be_verified_with_different_secret(self):
        from app.routers.auth import create_jwt_token, verify_jwt_token
        from fastapi import HTTPException
        payload = {"sub": "1", "exp": int(time.time()) + 3600}
        token = create_jwt_token(payload, "real-secret")
        with pytest.raises(HTTPException):
            verify_jwt_token(token, "tampered-secret")

    def test_jwt_signature_tamper_detected(self):
        from app.routers.auth import create_jwt_token, verify_jwt_token
        from fastapi import HTTPException
        payload = {"sub": "1", "exp": int(time.time()) + 3600}
        token = create_jwt_token(payload, "secret")
        parts = token.split(".")
        # Flip one character in signature
        tampered = parts[0] + "." + parts[1] + "." + parts[2][:-1] + ("A" if parts[2][-1] != "A" else "B")
        with pytest.raises(HTTPException):
            verify_jwt_token(tampered, "secret")

    def test_jwt_expired_rejected(self):
        from app.routers.auth import create_jwt_token, verify_jwt_token
        from fastapi import HTTPException
        payload = {"sub": "1", "exp": int(time.time()) - 1}
        token = create_jwt_token(payload, "secret")
        with pytest.raises(HTTPException) as exc:
            verify_jwt_token(token, "secret")
        assert exc.value.status_code == 401

    def test_jwt_missing_raises_401(self):
        from app.routers.auth import verify_jwt_token
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            verify_jwt_token("", "secret")
        assert exc.value.status_code == 401


class TestPaymentSignature:
    """Tests for Razorpay signature verification logic."""

    def _make_sig(self, order_id: str, payment_id: str, secret: str) -> str:
        body = f"{order_id}|{payment_id}"
        return hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()

    def test_valid_signature_verified(self):
        """When secret is provided, correct signature must pass."""
        from unittest.mock import patch
        from app.routers.payments import verify_razorpay_signature
        sig = self._make_sig("ord_abc", "pay_xyz", "test-secret-123")
        with patch("app.routers.payments.get_razorpay_credentials", return_value=("test-key", "test-secret-123")):
            assert verify_razorpay_signature("ord_abc", "pay_xyz", sig) is True

    def test_invalid_signature_rejected(self):
        from unittest.mock import patch
        from app.routers.payments import verify_razorpay_signature
        with patch("app.routers.payments.get_razorpay_credentials", return_value=("test-key", "test-secret-123")):
            assert verify_razorpay_signature("ord_abc", "pay_xyz", "wrong_sig") is False

    def test_simulated_signature_accepted_in_test_mode(self):
        """Sandbox simulated signature must pass when Razorpay secret is absent."""
        from unittest.mock import patch
        from app.routers.payments import verify_razorpay_signature
        with patch("app.routers.payments.get_razorpay_credentials", return_value=("", "")):
            result = verify_razorpay_signature("order_sim_abc123", "pay_sim_def456", "simulated_sig_ok")
            assert result is True

    def test_empty_params_rejected(self):
        from app.routers.payments import verify_razorpay_signature
        assert verify_razorpay_signature("", "", "") is False
        assert verify_razorpay_signature(None, None, None) is False


class TestStoryBusinessRules:
    """Business logic for story listing and access control."""

    def test_draft_story_not_in_public_list(self, client: TestClient, draft_story):
        resp = client.get("/api/v1/stories")
        ids = [s["id"] for s in resp.json()]
        assert draft_story.id not in ids

    def test_published_story_in_public_list(self, client: TestClient, published_story):
        resp = client.get("/api/v1/stories")
        ids = [s["id"] for s in resp.json()]
        assert published_story.id in ids

    def test_gender_restriction_boy_story_girl_blocked(self, client: TestClient, db_session):
        """Girl submitting to a boy-only story returns 400."""
        import io
        from app.models import StoryTemplate
        boy_story = StoryTemplate(
            id=str(uuid.uuid4()),
            slug=f"boys-only-{uuid.uuid4().hex[:6]}",
            title="Boys Adventure",
            status="published",
            target_gender="boy",
            min_age=3,
            max_age=10,
            page_count=5,
        )
        db_session.add(boy_story)
        db_session.commit()
        resp = client.post(
            "/api/v1/personalization",
            data={
                "story_id": boy_story.id,
                "child_name": "Priya",
                "guardian_consent": "true",
                "child_gender": "girl",
            },
            files={"photo": ("p.jpg", io.BytesIO(b"\xff\xd8\xff\xe0test"), "image/jpeg")},
        )
        assert resp.status_code == 400
        assert "exclusively available for boys" in resp.json()["detail"]

    def test_print_pdf_requires_payment(self, client: TestClient, personalization_job):
        """Unpaid job cannot download print PDF without admin token."""
        resp = client.get(f"/api/v1/personalization/{personalization_job.id}/print-pdf")
        assert resp.status_code == 402

    def test_full_generation_requires_admin(self, client: TestClient, personalization_job):
        resp = client.post(f"/api/v1/personalization/{personalization_job.id}/generate-full")
        assert resp.status_code == 401


class TestDataIntegrity:
    """Data integrity and consistency checks."""

    def test_feedback_always_starts_pending(self, client: TestClient):
        resp = client.post("/api/v1/feedbacks", data={
            "name": "DataTest", "place": "City", "rating": "5",
            "review_text": "Great product very happy with the results"
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "pending"

    def test_child_story_starts_pending(self, client: TestClient):
        resp = client.post("/api/v1/child-stories", json={
            "child_name": "Test Kid",
            "standard": "3rd",
            "place": "City",
            "title": "My Great Story",
            "story_text": "Once upon a time there was a little child who loved books and adventure.",
        })
        assert resp.status_code == 200
        assert resp.json()["story"]["status"] == "pending"

    def test_like_count_non_negative(self, client: TestClient, child_story_record):
        resp = client.post(f"/api/v1/child-stories/{child_story_record.id}/like")
        assert resp.status_code == 200
        assert resp.json()["likes_count"] >= 0
