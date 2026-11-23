"""
test_stories.py — Tests for GET /api/v1/stories and GET /api/v1/stories/{slug_or_id}

Covers:
- List published stories (empty + with data)
- Get story by slug
- Get story by ID
- 404 for non-existent story
- Draft stories not visible in public list
- Response schema validation
"""
import uuid
import pytest
from fastapi.testclient import TestClient


class TestListStories:
    def test_list_stories_returns_200(self, client: TestClient):
        """GET /api/v1/stories must return 200 with a list."""
        resp = client.get("/api/v1/stories")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_list_stories_only_published(self, client: TestClient, db_session):
        """Only published stories should appear in the public list."""
        from app.models import StoryTemplate
        # Create a draft story
        draft = StoryTemplate(
            id=str(uuid.uuid4()),
            slug=f"hidden-draft-{uuid.uuid4().hex[:6]}",
            title="Hidden Draft",
            status="draft",
            page_count=5,
        )
        db_session.add(draft)
        db_session.commit()

        resp = client.get("/api/v1/stories")
        assert resp.status_code == 200
        slugs = [s["slug"] for s in resp.json()]
        assert draft.slug not in slugs

    def test_list_stories_with_published(self, client: TestClient, published_story):
        """Published story should appear in the public listing."""
        resp = client.get("/api/v1/stories")
        assert resp.status_code == 200
        ids = [s["id"] for s in resp.json()]
        assert published_story.id in ids

    def test_list_stories_response_schema(self, client: TestClient, published_story):
        """Each story in the list must have required fields."""
        resp = client.get("/api/v1/stories")
        assert resp.status_code == 200
        required_fields = {"id", "slug", "title", "status", "price_digital", "price_print", "currency"}
        for story in resp.json():
            for field in required_fields:
                assert field in story, f"Missing field '{field}' in story listing"

    def test_list_stories_empty(self, client: TestClient):
        """API should return an empty list (not error) when no stories exist."""
        resp = client.get("/api/v1/stories")
        assert resp.status_code == 200
        # May or may not be empty depending on fixture state — just ensure it's a list
        assert isinstance(resp.json(), list)


class TestGetStory:
    def test_get_story_by_slug(self, client: TestClient, published_story):
        """GET /api/v1/stories/{slug} should return the story."""
        resp = client.get(f"/api/v1/stories/{published_story.slug}")
        assert resp.status_code == 200
        body = resp.json()
        assert body["slug"] == published_story.slug
        assert body["id"] == published_story.id

    def test_get_story_by_id(self, client: TestClient, published_story):
        """GET /api/v1/stories/{id} should also work."""
        resp = client.get(f"/api/v1/stories/{published_story.id}")
        assert resp.status_code == 200
        assert resp.json()["id"] == published_story.id

    def test_get_story_not_found(self, client: TestClient):
        """Non-existent slug/id must return 404."""
        resp = client.get("/api/v1/stories/nonexistent-slug-xyz123")
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()

    def test_get_story_response_has_pages(self, client: TestClient, published_story):
        """Story response must include pages array."""
        resp = client.get(f"/api/v1/stories/{published_story.slug}")
        assert resp.status_code == 200
        body = resp.json()
        assert "pages" in body
        assert isinstance(body["pages"], list)
        assert len(body["pages"]) > 0

    def test_get_story_page_fields(self, client: TestClient, published_story):
        """Each page must contain required fields."""
        resp = client.get(f"/api/v1/stories/{published_story.slug}")
        assert resp.status_code == 200
        pages = resp.json().get("pages", [])
        required = {"id", "story_id", "page_index", "page_number", "page_type"}
        for page in pages:
            for field in required:
                assert field in page, f"Missing page field '{field}'"

    def test_get_story_prices_are_floats(self, client: TestClient, published_story):
        """Price fields must be numeric."""
        resp = client.get(f"/api/v1/stories/{published_story.slug}")
        assert resp.status_code == 200
        body = resp.json()
        assert isinstance(body["price_digital"], (int, float))
        assert isinstance(body["price_print"], (int, float))

    def test_get_story_invalid_id_format(self, client: TestClient):
        """Random invalid ID should return 404 gracefully."""
        resp = client.get("/api/v1/stories/!!invalid@@id##")
        assert resp.status_code in (404, 422)

    def test_get_story_cover_image_url_field_present(self, client: TestClient, published_story):
        """cover_image_url field should be present (may be None when MinIO is mocked)."""
        resp = client.get(f"/api/v1/stories/{published_story.slug}")
        assert resp.status_code == 200
        body = resp.json()
        assert "cover_image_url" in body

    def test_get_story_gender_fields(self, client: TestClient, published_story):
        """target_gender, min_age, max_age must be in the response."""
        resp = client.get(f"/api/v1/stories/{published_story.slug}")
        assert resp.status_code == 200
        body = resp.json()
        assert "target_gender" in body
        assert "min_age" in body
        assert "max_age" in body
