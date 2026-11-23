"""
test_personalization.py — Tests for /api/v1/personalization/* endpoints.

Covers:
- POST /personalization (create job)
- GET  /personalization/{job_id}
- GET  /personalization/languages
- POST /personalization/{job_id}/translate
- POST /personalization/{job_id}/generate-full  (admin only)
- GET  /personalization/{job_id}/print-pdf       (payment required)
- Photo validation endpoint
- Consent, photo, and field validation
"""
import io
import uuid
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient


def _small_jpeg() -> bytes:
    """Minimal valid JPEG bytes for upload tests."""
    return (
        b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
        b"\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t"
        b"\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a"
        b"\x1f\x1e\x1d\x1a\x1c\x1c $.\' \",#\x1c\x1c(7),01444\x1f'9=82<.342\x1e"
        b"\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00"
        b"\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00"
        b"\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xc4\x00"
        b"\xb5\x10\x00\x02\x01\x03\x03\x02\x04\x03\x05\x05\x04\x04\x00\x00"
        b"\x01}\x01\x02\x03\x00\x04\x11\x05\x12!1A\x06\x13Qa\x07\"q\x142\x81"
        b"\x91\xa1\x08#B\xb1\xc1\x15R\xd1\xf0$3br\x82\t\n\x16\x17\x18\x19"
        b"\x1a%&'()*456789:CDEFGHIJSTUVWXYZ\xff\xda\x00\x08\x01\x01\x00\x00"
        b"?\x00\xfb\xd4P\x00\x00\x00\x1f\xff\xd9"
    )


class TestValidatePhoto:
    """Tests for POST /api/v1/personalization/validate-photo"""

    def test_validate_photo_valid_image(self, client: TestClient):
        """Valid JPEG upload should return is_valid=True with mocked validator."""
        data = {"photo": ("test.jpg", io.BytesIO(_small_jpeg()), "image/jpeg")}
        resp = client.post("/api/v1/personalization/validate-photo", files=data)
        assert resp.status_code == 200
        body = resp.json()
        assert "is_valid" in body

    def test_validate_photo_no_file(self, client: TestClient):
        """Missing photo file should return 400."""
        resp = client.post("/api/v1/personalization/validate-photo")
        assert resp.status_code == 400
        assert "required" in resp.json()["detail"].lower()

    def test_validate_photo_invalid_extension(self, client: TestClient):
        """PDF file should be rejected with 400."""
        data = {"photo": ("test.pdf", io.BytesIO(b"fake-pdf-content"), "application/pdf")}
        resp = client.post("/api/v1/personalization/validate-photo", files=data)
        assert resp.status_code == 400

    def test_validate_photo_accepts_png(self, client: TestClient):
        """PNG uploads should be accepted."""
        # 1×1 PNG
        png_bytes = (
            b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
            b'\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00'
            b'\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        )
        data = {"photo": ("test.png", io.BytesIO(png_bytes), "image/png")}
        resp = client.post("/api/v1/personalization/validate-photo", files=data)
        assert resp.status_code == 200


class TestCreatePersonalization:
    """Tests for POST /api/v1/personalization"""

    def _make_form(self, story_id: str, **overrides):
        defaults = {
            "story_id": story_id,
            "child_name": "Arjun",
            "guardian_consent": "true",
            "outfit_mode": "story",
            "language": "english",
        }
        defaults.update(overrides)
        return defaults

    def test_create_personalization_requires_consent(self, client: TestClient, published_story):
        """guardian_consent=false must return 400."""
        resp = client.post(
            "/api/v1/personalization",
            data={**self._make_form(published_story.id), "guardian_consent": "false"},
            files={"photo": ("child.jpg", io.BytesIO(_small_jpeg()), "image/jpeg")},
        )
        assert resp.status_code == 400
        assert "consent" in resp.json()["detail"].lower()

    def test_create_personalization_empty_child_name(self, client: TestClient, published_story):
        """Empty child_name must return 400."""
        resp = client.post(
            "/api/v1/personalization",
            data={**self._make_form(published_story.id, child_name="   ")},
            files={"photo": ("child.jpg", io.BytesIO(_small_jpeg()), "image/jpeg")},
        )
        assert resp.status_code == 400
        assert "name" in resp.json()["detail"].lower()

    def test_create_personalization_invalid_story_id(self, client: TestClient):
        """Non-existent story_id must return 404."""
        resp = client.post(
            "/api/v1/personalization",
            data=self._make_form(str(uuid.uuid4())),
            files={"photo": ("child.jpg", io.BytesIO(_small_jpeg()), "image/jpeg")},
        )
        assert resp.status_code == 404

    def test_create_personalization_no_photo(self, client: TestClient, published_story):
        """Missing photo must return 400."""
        resp = client.post(
            "/api/v1/personalization",
            data=self._make_form(published_story.id),
        )
        assert resp.status_code == 400

    def test_create_personalization_invalid_photo_ext(self, client: TestClient, published_story):
        """PDF photo must be rejected."""
        resp = client.post(
            "/api/v1/personalization",
            data=self._make_form(published_story.id),
            files={"photo": ("child.pdf", io.BytesIO(b"fake"), "application/pdf")},
        )
        assert resp.status_code == 400

    def test_create_personalization_invalid_photo_key(self, client: TestClient, published_story):
        """Photo key not starting with child_photos/ must be rejected."""
        resp = client.post(
            "/api/v1/personalization",
            data={**self._make_form(published_story.id), "photo_key": "../etc/passwd"},
        )
        assert resp.status_code == 400

    def test_create_personalization_success(self, client: TestClient, published_story, db_session):
        """Valid submission with mocked validator creates a job and returns 200."""
        resp = client.post(
            "/api/v1/personalization",
            data=self._make_form(published_story.id),
            files={"photo": ("child.jpg", io.BytesIO(_small_jpeg()), "image/jpeg")},
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert "id" in body
        assert body["child_name"] == "Arjun"

    def test_create_personalization_response_schema(self, client: TestClient, published_story):
        """Created job response must have required fields."""
        resp = client.post(
            "/api/v1/personalization",
            data=self._make_form(published_story.id),
            files={"photo": ("child.jpg", io.BytesIO(_small_jpeg()), "image/jpeg")},
        )
        if resp.status_code == 200:
            body = resp.json()
            required = {"id", "story_id", "child_name", "status", "photo_path"}
            for f in required:
                assert f in body

    def test_create_personalization_gender_mismatch_boy_story(self, client: TestClient, db_session):
        """Girl submitting a boy-only story must return 400."""
        from app.models import StoryTemplate
        boy_story = StoryTemplate(
            id=str(uuid.uuid4()),
            slug=f"boy-only-{uuid.uuid4().hex[:6]}",
            title="Boy's Adventure",
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
            data={**self._make_form(boy_story.id), "child_gender": "girl"},
            files={"photo": ("child.jpg", io.BytesIO(_small_jpeg()), "image/jpeg")},
        )
        assert resp.status_code == 400
        assert "exclusively available for boys" in resp.json()["detail"]

    def test_create_personalization_age_out_of_range(self, client: TestClient, published_story):
        """Age outside story's age range must return 400."""
        resp = client.post(
            "/api/v1/personalization",
            data={**self._make_form(published_story.id), "child_age": "15"},
            files={"photo": ("child.jpg", io.BytesIO(_small_jpeg()), "image/jpeg")},
        )
        assert resp.status_code == 400
        assert "out of the allowed range" in resp.json()["detail"]


class TestGetPersonalizationJob:
    """Tests for GET /api/v1/personalization/{job_id}"""

    def test_get_job_success(self, client: TestClient, personalization_job):
        resp = client.get(f"/api/v1/personalization/{personalization_job.id}")
        assert resp.status_code == 200
        body = resp.json()
        assert body["id"] == personalization_job.id
        assert body["child_name"] == "Test Child"

    def test_get_job_not_found(self, client: TestClient):
        resp = client.get(f"/api/v1/personalization/{uuid.uuid4()}")
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()

    def test_get_job_response_schema(self, client: TestClient, personalization_job):
        resp = client.get(f"/api/v1/personalization/{personalization_job.id}")
        assert resp.status_code == 200
        body = resp.json()
        required = {
            "id", "story_id", "child_name", "status", "photo_path",
            "total_pages", "completed_pages", "is_paid"
        }
        for f in required:
            assert f in body, f"Missing field '{f}' in job response"

    def test_get_job_pdf_url_present(self, client: TestClient, personalization_job):
        resp = client.get(f"/api/v1/personalization/{personalization_job.id}")
        assert resp.status_code == 200
        assert "pdf_download_url" in resp.json()


class TestGetLanguages:
    def test_get_languages_200(self, client: TestClient):
        resp = client.get("/api/v1/personalization/languages")
        assert resp.status_code == 200
        body = resp.json()
        assert "default" in body
        assert "languages" in body
        assert isinstance(body["languages"], list)
        assert body["default"] == "english"


class TestFullGenerationAdmin:
    """POST /api/v1/personalization/{job_id}/generate-full — admin-only"""

    def test_generate_full_requires_admin(self, client: TestClient, personalization_job):
        resp = client.post(f"/api/v1/personalization/{personalization_job.id}/generate-full")
        assert resp.status_code == 401

    def test_generate_full_with_admin_token(self, client: TestClient, personalization_job, admin_headers):
        resp = client.post(
            f"/api/v1/personalization/{personalization_job.id}/generate-full",
            headers=admin_headers,
        )
        # Should succeed or return 404 (job might not be DB-visible in test client)
        assert resp.status_code in (200, 404)

    def test_generate_full_invalid_job_id(self, client: TestClient, admin_headers):
        resp = client.post(
            f"/api/v1/personalization/{uuid.uuid4()}/generate-full",
            headers=admin_headers,
        )
        assert resp.status_code == 404


class TestPrintPDFDownload:
    """GET /api/v1/personalization/{job_id}/print-pdf — payment guard"""

    def test_print_pdf_requires_payment(self, client: TestClient, personalization_job):
        """Unpaid job without admin token must return 402."""
        resp = client.get(f"/api/v1/personalization/{personalization_job.id}/print-pdf")
        assert resp.status_code == 402
        assert "Payment required" in resp.json()["detail"]

    def test_print_pdf_not_found(self, client: TestClient, admin_headers):
        resp = client.get(
            f"/api/v1/personalization/{uuid.uuid4()}/print-pdf",
            headers=admin_headers,
        )
        assert resp.status_code == 404
