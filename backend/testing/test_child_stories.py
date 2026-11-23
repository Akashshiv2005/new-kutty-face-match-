"""
test_child_stories.py — Tests for /api/v1/child-stories endpoints.

Covers:
- GET  /child-stories  (public, with category & search filters)
- POST /child-stories  (validation)
- POST /child-stories/{id}/like
- GET  /child-stories/admin/all  (admin only)
- PATCH /child-stories/admin/{id}
- DELETE /child-stories/admin/{id}
"""
import uuid
import pytest
from fastapi.testclient import TestClient


class TestGetPublicChildStories:
    """GET /api/v1/child-stories"""

    def test_get_stories_returns_200(self, client: TestClient):
        resp = client.get("/api/v1/child-stories")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_get_stories_only_approved_or_featured(self, client: TestClient, child_story_record):
        resp = client.get("/api/v1/child-stories")
        assert resp.status_code == 200
        for s in resp.json():
            assert s["status"] in ("approved", "featured")

    def test_get_stories_includes_approved(self, client: TestClient, child_story_record):
        resp = client.get("/api/v1/child-stories")
        ids = [s["id"] for s in resp.json()]
        assert child_story_record.id in ids

    def test_get_stories_category_filter(self, client: TestClient, child_story_record):
        resp = client.get("/api/v1/child-stories?category=Fantasy")
        assert resp.status_code == 200
        for s in resp.json():
            assert "fantasy" in s["category"].lower()

    def test_get_stories_search_filter(self, client: TestClient, child_story_record):
        resp = client.get("/api/v1/child-stories?search=Riya")
        assert resp.status_code == 200
        ids = [s["id"] for s in resp.json()]
        assert child_story_record.id in ids

    def test_get_stories_search_no_match(self, client: TestClient):
        resp = client.get("/api/v1/child-stories?search=xyznonexistent99")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_get_stories_response_schema(self, client: TestClient, child_story_record):
        resp = client.get("/api/v1/child-stories")
        assert resp.status_code == 200
        required = {"id", "child_name", "standard", "place", "title", "story_text", "category", "status", "likes_count"}
        for story in resp.json():
            for f in required:
                assert f in story, f"Missing field '{f}'"

    def test_get_stories_excludes_pending(self, client: TestClient, db_session):
        """Pending story should NOT appear in public list."""
        from app.models import ChildWrittenStory
        import datetime
        pending = ChildWrittenStory(
            id=str(uuid.uuid4()),
            child_name="Anon",
            standard="5th",
            place="X",
            title="Hidden Pending Story",
            story_text="This should not appear in public",
            status="pending",
            created_at=datetime.datetime.utcnow(),
            updated_at=datetime.datetime.utcnow(),
        )
        db_session.add(pending)
        db_session.commit()
        resp = client.get("/api/v1/child-stories")
        ids = [s["id"] for s in resp.json()]
        assert pending.id not in ids


class TestSubmitChildStory:
    """POST /api/v1/child-stories"""

    def _valid_payload(self, **overrides):
        d = {
            "child_name": "Meera",
            "standard": "3rd Standard",
            "place": "Bangalore",
            "title": "My Adventure",
            "story_text": "Once upon a time there was a little princess who loved adventure and magic castles...",
            "category": "Adventure",
        }
        d.update(overrides)
        return d

    def test_submit_story_success(self, client: TestClient):
        resp = client.post("/api/v1/child-stories", json=self._valid_payload())
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["status"] == "success"
        assert "story" in body
        assert body["story"]["status"] == "pending"

    def test_submit_story_empty_child_name(self, client: TestClient):
        resp = client.post("/api/v1/child-stories", json=self._valid_payload(child_name=""))
        assert resp.status_code == 400
        assert "name" in resp.json()["detail"].lower()

    def test_submit_story_empty_title(self, client: TestClient):
        resp = client.post("/api/v1/child-stories", json=self._valid_payload(title=""))
        assert resp.status_code == 400
        assert "title" in resp.json()["detail"].lower()

    def test_submit_story_too_short(self, client: TestClient):
        """Story text shorter than 20 characters must return 400."""
        resp = client.post("/api/v1/child-stories", json=self._valid_payload(story_text="Too short"))
        assert resp.status_code == 400
        assert "few sentences" in resp.json()["detail"].lower()

    def test_submit_story_missing_required_fields(self, client: TestClient):
        resp = client.post("/api/v1/child-stories", json={"child_name": "Meera"})
        assert resp.status_code == 422

    def test_submit_story_default_category(self, client: TestClient):
        """Category defaults to 'Adventure' if not provided."""
        payload = self._valid_payload()
        payload.pop("category")
        resp = client.post("/api/v1/child-stories", json=payload)
        assert resp.status_code == 200
        assert resp.json()["story"]["category"] == "Adventure"

    def test_submit_story_with_parent_email(self, client: TestClient):
        resp = client.post("/api/v1/child-stories", json=self._valid_payload(
            parent_email="parent@test.com"
        ))
        assert resp.status_code == 200


class TestLikeChildStory:
    """POST /api/v1/child-stories/{id}/like"""

    def test_like_story_success(self, client: TestClient, child_story_record):
        initial_likes = child_story_record.likes_count
        resp = client.post(f"/api/v1/child-stories/{child_story_record.id}/like")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "liked"
        assert body["likes_count"] >= 1

    def test_like_story_not_found(self, client: TestClient):
        resp = client.post(f"/api/v1/child-stories/{uuid.uuid4()}/like")
        assert resp.status_code == 404

    def test_like_increments_count(self, client: TestClient, db_session):
        """Like count must increment each time."""
        from app.models import ChildWrittenStory
        import datetime
        story = ChildWrittenStory(
            id=str(uuid.uuid4()),
            child_name="Counter Kid",
            standard="2nd",
            place="Pune",
            title="Like Me Story",
            story_text="A story with many likes for testing purposes.",
            status="approved",
            likes_count=10,
            created_at=datetime.datetime.utcnow(),
            updated_at=datetime.datetime.utcnow(),
        )
        db_session.add(story)
        db_session.commit()
        resp = client.post(f"/api/v1/child-stories/{story.id}/like")
        assert resp.status_code == 200
        assert resp.json()["likes_count"] == 11


class TestAdminChildStories:
    """Admin endpoints for child stories."""

    def test_admin_all_requires_auth(self, client: TestClient):
        resp = client.get("/api/v1/child-stories/admin/all")
        assert resp.status_code == 401

    def test_admin_all_success(self, client: TestClient, admin_headers, child_story_record):
        resp = client.get("/api/v1/child-stories/admin/all", headers=admin_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_admin_all_filter_pending(self, client: TestClient, admin_headers, db_session):
        from app.models import ChildWrittenStory
        import datetime
        pending = ChildWrittenStory(
            id=str(uuid.uuid4()),
            child_name="Pending Kid",
            standard="1st",
            place="X",
            title="Pending Story Admin",
            story_text="A pending story awaiting admin review for publishing to website.",
            status="pending",
            created_at=datetime.datetime.utcnow(),
            updated_at=datetime.datetime.utcnow(),
        )
        db_session.add(pending)
        db_session.commit()
        resp = client.get("/api/v1/child-stories/admin/all?status=pending", headers=admin_headers)
        assert resp.status_code == 200
        ids = [s["id"] for s in resp.json()]
        assert pending.id in ids

    def test_admin_update_story_status(self, client: TestClient, admin_headers, db_session):
        from app.models import ChildWrittenStory
        import datetime
        s = ChildWrittenStory(
            id=str(uuid.uuid4()),
            child_name="Update Me",
            standard="4th",
            place="X",
            title="Update Status Story",
            story_text="Story content to test admin status update functionality here.",
            status="pending",
            created_at=datetime.datetime.utcnow(),
            updated_at=datetime.datetime.utcnow(),
        )
        db_session.add(s)
        db_session.commit()
        resp = client.patch(
            f"/api/v1/child-stories/admin/{s.id}",
            headers=admin_headers,
            json={"status": "approved"},
        )
        assert resp.status_code == 200
        assert resp.json()["current_status"] == "approved"

    def test_admin_update_not_found(self, client: TestClient, admin_headers):
        resp = client.patch(
            f"/api/v1/child-stories/admin/{uuid.uuid4()}",
            headers=admin_headers,
            json={"status": "featured"},
        )
        assert resp.status_code == 404

    def test_admin_delete_story(self, client: TestClient, admin_headers, db_session):
        from app.models import ChildWrittenStory
        import datetime
        s = ChildWrittenStory(
            id=str(uuid.uuid4()),
            child_name="Delete Me",
            standard="5th",
            place="Y",
            title="Delete Story Admin",
            story_text="This story will be deleted by admin during test execution.",
            status="pending",
            created_at=datetime.datetime.utcnow(),
            updated_at=datetime.datetime.utcnow(),
        )
        db_session.add(s)
        db_session.commit()
        resp = client.delete(f"/api/v1/child-stories/admin/{s.id}", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "deleted"

    def test_admin_delete_not_found(self, client: TestClient, admin_headers):
        resp = client.delete(f"/api/v1/child-stories/admin/{uuid.uuid4()}", headers=admin_headers)
        assert resp.status_code == 404

    def test_admin_delete_requires_auth(self, client: TestClient, child_story_record):
        resp = client.delete(f"/api/v1/child-stories/admin/{child_story_record.id}")
        assert resp.status_code == 401
