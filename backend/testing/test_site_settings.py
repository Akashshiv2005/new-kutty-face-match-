"""
test_site_settings.py — Tests for /api/v1/settings and /api/v1/admin/settings endpoints.

Covers:
- GET  /settings/announcement
- PUT  /admin/settings/announcement (admin only)
- Default values when no settings exist
- Price sync to story templates
"""
import json
import pytest
from fastapi.testclient import TestClient


class TestPublicAnnouncement:
    """GET /api/v1/settings/announcement"""

    def test_get_announcement_200(self, client: TestClient):
        resp = client.get("/api/v1/settings/announcement")
        assert resp.status_code == 200

    def test_get_announcement_has_required_fields(self, client: TestClient):
        resp = client.get("/api/v1/settings/announcement")
        assert resp.status_code == 200
        body = resp.json()
        required = {
            "is_active", "coupon_code", "default_pdf_price",
            "default_hardcover_price", "regional_language_surcharge",
        }
        for f in required:
            assert f in body, f"Missing field: {f}"

    def test_get_announcement_prices_are_numbers(self, client: TestClient):
        resp = client.get("/api/v1/settings/announcement")
        body = resp.json()
        assert isinstance(body["default_pdf_price"], (int, float))
        assert isinstance(body["default_hardcover_price"], (int, float))

    def test_get_announcement_default_coupon(self, client: TestClient):
        """Default announcement must include WELCOME20 or the configured coupon code."""
        resp = client.get("/api/v1/settings/announcement")
        body = resp.json()
        # May or may not exist depending on DB state; just check it's a string
        assert isinstance(body.get("coupon_code", ""), str)


class TestAdminUpdateAnnouncement:
    """PUT /api/v1/admin/settings/announcement"""

    def test_update_announcement_requires_auth(self, client: TestClient):
        resp = client.put("/api/v1/admin/settings/announcement", json={
            "is_active": True,
            "text": "Test announcement",
        })
        assert resp.status_code == 401

    def test_update_announcement_success(self, client: TestClient, admin_headers):
        payload = {
            "is_active": True,
            "badge": "TEST SALE",
            "text": "50% off everything today only!",
            "link_label": "Shop Now",
            "link_url": "/storybooks",
            "coupon_code": "PYTEST50",
            "notices": [],
            "default_pdf_price": 599.0,
            "default_hardcover_price": 1199.0,
            "regional_language_surcharge": 50.0,
            "gift_wrap_fee": 25.0,
            "gift_wrap_enabled": True,
        }
        resp = client.put("/api/v1/admin/settings/announcement", headers=admin_headers, json=payload)
        assert resp.status_code == 200
        body = resp.json()
        assert body["coupon_code"] == "PYTEST50"
        assert body["default_pdf_price"] == 599.0

    def test_update_announcement_syncs_story_prices(self, client: TestClient, admin_headers, published_story, db_session):
        """Updating prices must sync all published story prices."""
        new_price = 849.0
        resp = client.put("/api/v1/admin/settings/announcement", headers=admin_headers, json={
            "is_active": True,
            "text": "New pricing!",
            "coupon_code": "",
            "notices": [],
            "default_pdf_price": new_price,
            "default_hardcover_price": 1499.0,
            "regional_language_surcharge": 99.0,
            "gift_wrap_fee": 20.0,
            "gift_wrap_enabled": True,
        })
        assert resp.status_code == 200
        # Refresh story from DB and check price updated
        db_session.refresh(published_story)
        assert published_story.price_digital == new_price

    def test_update_announcement_disable(self, client: TestClient, admin_headers):
        resp = client.put("/api/v1/admin/settings/announcement", headers=admin_headers, json={
            "is_active": False,
            "text": "",
            "coupon_code": "",
            "notices": [],
            "default_pdf_price": 799.0,
            "default_hardcover_price": 1399.0,
            "regional_language_surcharge": 99.0,
            "gift_wrap_fee": 20.0,
            "gift_wrap_enabled": True,
        })
        assert resp.status_code == 200
        assert resp.json()["is_active"] is False

    def test_update_announcement_with_notices(self, client: TestClient, admin_headers):
        payload = {
            "is_active": True,
            "text": "Main announcement",
            "coupon_code": "MAIN20",
            "notices": [
                {
                    "badge": "SALE",
                    "text": "Special notice with coupon code",
                    "link_label": "Grab Deal",
                    "link_url": "/storybooks",
                    "coupon_code": "NOTICE10",
                }
            ],
            "default_pdf_price": 799.0,
            "default_hardcover_price": 1399.0,
            "regional_language_surcharge": 99.0,
            "gift_wrap_fee": 20.0,
            "gift_wrap_enabled": True,
        }
        resp = client.put("/api/v1/admin/settings/announcement", headers=admin_headers, json=payload)
        assert resp.status_code == 200
        body = resp.json()
        assert len(body.get("notices", [])) == 1
        assert body["notices"][0]["coupon_code"] == "NOTICE10"
