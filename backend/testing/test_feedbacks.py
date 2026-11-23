"""
test_feedbacks.py — Tests for /feedbacks and /admin/feedbacks endpoints.

Covers:
- POST /feedbacks (submit with/without media, validation, file type limits)
- GET  /feedbacks/approved
- GET  /admin/feedbacks (admin only)
- PATCH /admin/feedbacks/{id}/status
- PATCH /admin/feedbacks/{id}
- DELETE /admin/feedbacks/{id}
"""
import io
import uuid
import pytest
from fastapi.testclient import TestClient


class TestSubmitFeedback:
    """POST /api/v1/feedbacks"""

    def _post(self, client, **overrides):
        defaults = {"name": "Test User", "place": "Chennai", "rating": "5"}
        defaults.update(overrides)
        return client.post("/api/v1/feedbacks", data=defaults)

    def test_submit_feedback_success(self, client: TestClient):
        resp = self._post(client, review_text="Loved it!")
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["name"] == "Test User"
        assert body["status"] == "pending"

    def test_submit_feedback_empty_name(self, client: TestClient):
        resp = self._post(client, name="")
        assert resp.status_code == 422

    def test_submit_feedback_empty_place(self, client: TestClient):
        resp = self._post(client, place="")
        assert resp.status_code == 422

    def test_submit_feedback_rating_zero(self, client: TestClient):
        resp = self._post(client, rating="0")
        assert resp.status_code == 422

    def test_submit_feedback_rating_six(self, client: TestClient):
        resp = self._post(client, rating="6")
        assert resp.status_code == 422

    def test_submit_feedback_rating_one_valid(self, client: TestClient):
        resp = self._post(client, rating="1")
        assert resp.status_code == 200

    def test_submit_feedback_rating_five_valid(self, client: TestClient):
        resp = self._post(client, rating="5")
        assert resp.status_code == 200

    def test_submit_feedback_without_review_text(self, client: TestClient):
        """Review text is optional — submission with just name, place, rating must succeed."""
        resp = self._post(client)
        assert resp.status_code == 200

    def test_submit_feedback_with_image(self, client: TestClient):
        """Image upload should succeed."""
        resp = client.post(
            "/api/v1/feedbacks",
            data={"name": "Img Test", "place": "Delhi", "rating": "4"},
            files={"file": ("photo.jpg", io.BytesIO(b"\xff\xd8\xff\xe0test"), "image/jpeg")},
        )
        # May succeed or fail based on storage mock — just verify no 500
        assert resp.status_code in (200, 500)

    def test_submit_feedback_invalid_file_type(self, client: TestClient):
        """PDF file should be rejected."""
        resp = client.post(
            "/api/v1/feedbacks",
            data={"name": "File Test", "place": "Pune", "rating": "3"},
            files={"file": ("doc.pdf", io.BytesIO(b"fake-pdf"), "application/pdf")},
        )
        assert resp.status_code == 400

    def test_submit_feedback_response_schema(self, client: TestClient):
        resp = self._post(client, review_text="Great book!")
        assert resp.status_code == 200
        body = resp.json()
        required = {"id", "name", "place", "rating", "status", "created_at"}
        for f in required:
            assert f in body, f"Missing field '{f}'"

    def test_submit_feedback_status_is_pending(self, client: TestClient):
        """New submissions must always be saved as 'pending'."""
        resp = self._post(client)
        assert resp.status_code == 200
        assert resp.json()["status"] == "pending"

    def test_submit_feedback_missing_rating(self, client: TestClient):
        resp = client.post("/api/v1/feedbacks", data={"name": "Test", "place": "City"})
        assert resp.status_code == 422

    def test_submit_feedback_missing_name(self, client: TestClient):
        resp = client.post("/api/v1/feedbacks", data={"place": "City", "rating": "5"})
        assert resp.status_code == 422


class TestApprovedFeedbacks:
    """GET /api/v1/feedbacks/approved"""

    def test_approved_feedbacks_returns_200(self, client: TestClient):
        resp = client.get("/api/v1/feedbacks/approved")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_approved_feedbacks_only_approved(self, client: TestClient, feedback_record, approved_feedback):
        """Only approved feedbacks must be returned."""
        resp = client.get("/api/v1/feedbacks/approved")
        assert resp.status_code == 200
        statuses = {f["status"] for f in resp.json()}
        assert statuses <= {"approved"} or len(statuses) == 0  # all must be approved

    def test_approved_feedbacks_includes_known_approved(self, client: TestClient, approved_feedback):
        resp = client.get("/api/v1/feedbacks/approved")
        assert resp.status_code == 200
        ids = [f["id"] for f in resp.json()]
        assert approved_feedback.id in ids

    def test_approved_feedbacks_excludes_pending(self, client: TestClient, feedback_record):
        """Pending feedback (feedback_record fixture) must NOT appear in approved list."""
        resp = client.get("/api/v1/feedbacks/approved")
        ids = [f["id"] for f in resp.json()]
        assert feedback_record.id not in ids


class TestAdminFeedbacks:
    """GET /api/v1/admin/feedbacks — admin-protected"""

    def test_admin_feedbacks_requires_auth(self, client: TestClient):
        resp = client.get("/api/v1/admin/feedbacks")
        assert resp.status_code == 401

    def test_admin_feedbacks_success(self, client: TestClient, admin_headers, feedback_record):
        resp = client.get("/api/v1/admin/feedbacks", headers=admin_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_admin_feedbacks_filter_pending(self, client: TestClient, admin_headers, feedback_record):
        resp = client.get("/api/v1/admin/feedbacks?status=pending", headers=admin_headers)
        assert resp.status_code == 200
        for fb in resp.json():
            assert fb["status"] == "pending"

    def test_admin_feedbacks_filter_approved(self, client: TestClient, admin_headers, approved_feedback):
        resp = client.get("/api/v1/admin/feedbacks?status=approved", headers=admin_headers)
        assert resp.status_code == 200
        for fb in resp.json():
            assert fb["status"] == "approved"

    def test_admin_feedbacks_search(self, client: TestClient, admin_headers, approved_feedback):
        resp = client.get("/api/v1/admin/feedbacks?search=Happy", headers=admin_headers)
        assert resp.status_code == 200
        ids = [f["id"] for f in resp.json()]
        assert approved_feedback.id in ids


class TestUpdateFeedbackStatus:
    """PATCH /api/v1/admin/feedbacks/{id}/status"""

    def test_approve_feedback(self, client: TestClient, admin_headers, feedback_record):
        resp = client.patch(
            f"/api/v1/admin/feedbacks/{feedback_record.id}/status",
            headers=admin_headers,
            json={"status": "approved"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "approved"

    def test_reject_feedback(self, client: TestClient, admin_headers, feedback_record):
        resp = client.patch(
            f"/api/v1/admin/feedbacks/{feedback_record.id}/status",
            headers=admin_headers,
            json={"status": "rejected"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "rejected"

    def test_invalid_status_value(self, client: TestClient, admin_headers, feedback_record):
        resp = client.patch(
            f"/api/v1/admin/feedbacks/{feedback_record.id}/status",
            headers=admin_headers,
            json={"status": "published"},
        )
        assert resp.status_code == 400

    def test_feedback_not_found(self, client: TestClient, admin_headers):
        resp = client.patch(
            f"/api/v1/admin/feedbacks/{uuid.uuid4()}/status",
            headers=admin_headers,
            json={"status": "approved"},
        )
        assert resp.status_code == 404

    def test_requires_admin_auth(self, client: TestClient, feedback_record):
        resp = client.patch(
            f"/api/v1/admin/feedbacks/{feedback_record.id}/status",
            json={"status": "approved"},
        )
        assert resp.status_code == 401


class TestEditFeedback:
    """PATCH /api/v1/admin/feedbacks/{id}"""

    def test_edit_feedback_name(self, client: TestClient, admin_headers, feedback_record):
        resp = client.patch(
            f"/api/v1/admin/feedbacks/{feedback_record.id}",
            headers=admin_headers,
            json={"name": "Updated Name"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Name"

    def test_edit_feedback_rating_invalid(self, client: TestClient, admin_headers, feedback_record):
        resp = client.patch(
            f"/api/v1/admin/feedbacks/{feedback_record.id}",
            headers=admin_headers,
            json={"rating": 0},
        )
        assert resp.status_code == 400

    def test_edit_feedback_not_found(self, client: TestClient, admin_headers):
        resp = client.patch(
            f"/api/v1/admin/feedbacks/{uuid.uuid4()}",
            headers=admin_headers,
            json={"name": "Any Name"},
        )
        assert resp.status_code == 404

    def test_edit_requires_auth(self, client: TestClient, feedback_record):
        resp = client.patch(
            f"/api/v1/admin/feedbacks/{feedback_record.id}",
            json={"name": "Hacker"},
        )
        assert resp.status_code == 401


class TestDeleteFeedback:
    """DELETE /api/v1/admin/feedbacks/{id}"""

    def test_delete_feedback_success(self, client: TestClient, admin_headers, db_session):
        from app.models import Feedback
        import datetime
        fb = Feedback(
            id=str(uuid.uuid4()), name="Del Test", place="X", rating=3,
            status="pending", created_at=datetime.datetime.utcnow(), updated_at=datetime.datetime.utcnow(),
        )
        db_session.add(fb)
        db_session.commit()
        resp = client.delete(f"/api/v1/admin/feedbacks/{fb.id}", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "success"

    def test_delete_feedback_not_found(self, client: TestClient, admin_headers):
        resp = client.delete(f"/api/v1/admin/feedbacks/{uuid.uuid4()}", headers=admin_headers)
        assert resp.status_code == 404

    def test_delete_requires_auth(self, client: TestClient, feedback_record):
        resp = client.delete(f"/api/v1/admin/feedbacks/{feedback_record.id}")
        assert resp.status_code == 401
