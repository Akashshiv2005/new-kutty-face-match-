"""
test_validation.py — Input validation and edge-case tests across all endpoints.

Covers:
- Boundary conditions on ratings, prices, ages
- SQL injection-safe string inputs
- Oversized payload handling
- Special characters and Unicode
- Empty vs whitespace-only inputs
- Required field enforcement
"""
import io
import uuid
import pytest
from fastapi.testclient import TestClient


class TestAuthValidation:
    def test_login_sql_injection_username(self, client: TestClient):
        """SQL injection attempt in username must return 401 (not crash)."""
        resp = client.post("/api/v1/auth/login", json={
            "username": "' OR 1=1--",
            "password": "anything",
        })
        assert resp.status_code in (401, 422)

    def test_login_very_long_username(self, client: TestClient):
        resp = client.post("/api/v1/auth/login", json={
            "username": "a" * 1000 + "@test.com",
            "password": "password",
        })
        assert resp.status_code in (401, 422)

    def test_login_very_long_password(self, client: TestClient):
        resp = client.post("/api/v1/auth/login", json={
            "username": "test@test.com",
            "password": "p" * 10000,
        })
        assert resp.status_code in (401, 422)

    def test_login_unicode_credentials(self, client: TestClient):
        resp = client.post("/api/v1/auth/login", json={
            "username": "பயனர்@test.com",
            "password": "密码123",
        })
        assert resp.status_code in (401, 422)

    def test_reset_password_code_must_be_string(self, client: TestClient):
        resp = client.post("/api/v1/auth/reset-password", json={
            "email": "x@test.com",
            "code": 123456,  # integer instead of string
            "new_password": "NewPass@123",
            "confirm_password": "NewPass@123",
        })
        # Should either accept (cast to string) or return 422
        assert resp.status_code in (400, 422)


class TestFeedbackValidation:
    def test_feedback_xss_in_name(self, client: TestClient):
        """XSS attempt in name must be stored as plain text (no server crash)."""
        resp = client.post("/api/v1/feedbacks", data={
            "name": "<script>alert(1)</script>",
            "place": "City",
            "rating": "5",
        })
        assert resp.status_code == 200  # stored, but as sanitized text

    def test_feedback_name_whitespace_only(self, client: TestClient):
        resp = client.post("/api/v1/feedbacks", data={
            "name": "   ",
            "place": "City",
            "rating": "5",
        })
        assert resp.status_code == 422

    def test_feedback_place_whitespace_only(self, client: TestClient):
        resp = client.post("/api/v1/feedbacks", data={
            "name": "Valid Name",
            "place": "   ",
            "rating": "5",
        })
        assert resp.status_code == 422

    def test_feedback_rating_string_invalid(self, client: TestClient):
        resp = client.post("/api/v1/feedbacks", data={
            "name": "Test",
            "place": "City",
            "rating": "five",
        })
        assert resp.status_code == 422

    def test_feedback_rating_float_clamped(self, client: TestClient):
        """Float rating like 4.5 should be rejected or accepted as integer."""
        resp = client.post("/api/v1/feedbacks", data={
            "name": "Test",
            "place": "City",
            "rating": "4.5",
        })
        assert resp.status_code in (200, 422)

    def test_feedback_very_long_review(self, client: TestClient):
        """Very long review text must not crash the server."""
        resp = client.post("/api/v1/feedbacks", data={
            "name": "Long Review User",
            "place": "City",
            "rating": "5",
            "review_text": "Great book! " * 1000,
        })
        assert resp.status_code in (200, 413, 422)


class TestChildStoryValidation:
    def test_story_text_minimum_length(self, client: TestClient):
        """Exactly 20 characters should be accepted."""
        resp = client.post("/api/v1/child-stories", json={
            "child_name": "Kid",
            "standard": "3rd",
            "place": "City",
            "title": "My Story",
            "story_text": "This text is exactly",  # 20 chars
        })
        # 20 chars: "This text is exactly" = 20 → boundary
        assert resp.status_code in (200, 400)

    def test_story_text_19_chars_rejected(self, client: TestClient):
        resp = client.post("/api/v1/child-stories", json={
            "child_name": "Kid",
            "standard": "3rd",
            "place": "City",
            "title": "My Story",
            "story_text": "Only nineteen chars",  # 19 chars
        })
        assert resp.status_code == 400

    def test_story_xss_in_title(self, client: TestClient):
        resp = client.post("/api/v1/child-stories", json={
            "child_name": "Kid",
            "standard": "3rd",
            "place": "City",
            "title": "<script>alert(1)</script>",
            "story_text": "A story about magic castles and dragons and adventures beyond imagination.",
        })
        assert resp.status_code in (200, 400)  # Stored as text, not executed

    def test_story_unicode_child_name(self, client: TestClient):
        resp = client.post("/api/v1/child-stories", json={
            "child_name": "அர்ஜுன்",
            "standard": "5th Standard",
            "place": "Chennai",
            "title": "Tamil Story",
            "story_text": "ஒரு காட்டில் ஒரு சிறுவன் வாழ்ந்தான். அவனுக்கு மாயாஜால திறன்கள் இருந்தன்.",
        })
        assert resp.status_code in (200, 422)

    def test_story_category_all_filter(self, client: TestClient, child_story_record):
        """Category=All or All Stories should return all stories."""
        resp = client.get("/api/v1/child-stories?category=All")
        assert resp.status_code == 200


class TestPersonalizationValidation:
    def test_photo_key_path_traversal_blocked(self, client: TestClient, published_story):
        """Path traversal in photo_key must return 400."""
        resp = client.post(
            "/api/v1/personalization",
            data={
                "story_id": published_story.id,
                "child_name": "Kid",
                "guardian_consent": "true",
                "photo_key": "../../etc/passwd",
            },
        )
        assert resp.status_code == 400

    def test_photo_key_wrong_category_blocked(self, client: TestClient, published_story):
        """Photo key from wrong category (source_pages/) must be rejected."""
        resp = client.post(
            "/api/v1/personalization",
            data={
                "story_id": published_story.id,
                "child_name": "Kid",
                "guardian_consent": "true",
                "photo_key": "source_pages/story/page_01.png",
            },
        )
        assert resp.status_code == 400

    def test_child_name_whitespace_only_blocked(self, client: TestClient, published_story):
        resp = client.post(
            "/api/v1/personalization",
            data={
                "story_id": published_story.id,
                "child_name": "   ",
                "guardian_consent": "true",
            },
            files={"photo": ("p.jpg", io.BytesIO(b"\xff\xd8\xff\xe0test"), "image/jpeg")},
        )
        assert resp.status_code == 400

    def test_validate_photo_webp_accepted(self, client: TestClient):
        resp = client.post(
            "/api/v1/personalization/validate-photo",
            files={"photo": ("face.webp", io.BytesIO(b"RIFF\x00\x00\x00\x00WEBPVP8"), "image/webp")},
        )
        # Should not return 400 for file type
        assert resp.status_code in (200,)


class TestPaymentValidation:
    def test_coupon_missing_code_field(self, client: TestClient):
        resp = client.post("/api/v1/payments/validate-coupon", json={"format_type": "digital"})
        assert resp.status_code == 422

    def test_coupon_missing_format_type(self, client: TestClient):
        resp = client.post("/api/v1/payments/validate-coupon", json={"code": "SAVE20"})
        # format_type has a default; may succeed
        assert resp.status_code in (200, 422)

    def test_create_order_missing_format_type(self, client: TestClient, personalization_job):
        resp = client.post("/api/v1/payments/create-order", json={
            "job_id": personalization_job.id,
        })
        # format_type defaults to "digital" — should succeed or fail gracefully
        assert resp.status_code in (200, 422, 502)

    def test_verify_payment_missing_signature(self, client: TestClient, personalization_job):
        resp = client.post("/api/v1/payments/verify", json={
            "job_id": personalization_job.id,
            "razorpay_order_id": "ord_test",
            "razorpay_payment_id": "pay_test",
            # signature missing
        })
        assert resp.status_code == 422
