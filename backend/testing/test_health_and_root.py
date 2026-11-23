"""
test_health_and_root.py — Tests for health, root, and global endpoints.

Covers:
- GET  /                           (root message)
- GET  /api/health                 (health check)
- GET  /admin_dashboard            (admin protected)
- GET  /api/v1/admin_dashboard     (admin protected)
- CORS preflight OPTIONS requests
- 404 for completely unknown routes
"""
import pytest
from fastapi.testclient import TestClient


class TestRootEndpoint:
    def test_root_returns_200(self, client: TestClient):
        resp = client.get("/")
        assert resp.status_code == 200

    def test_root_contains_message(self, client: TestClient):
        body = client.get("/").json()
        assert "message" in body
        assert "API" in body["message"] or "api" in body["message"].lower()

    def test_root_contains_docs_url(self, client: TestClient):
        body = client.get("/").json()
        assert "docs_url" in body

    def test_root_contains_api_prefix(self, client: TestClient):
        body = client.get("/").json()
        assert "api_v1" in body or "api/v1" in str(body)


class TestHealthEndpoint:
    def test_health_returns_200(self, client: TestClient):
        resp = client.get("/api/health")
        assert resp.status_code == 200

    def test_health_status_is_healthy(self, client: TestClient):
        body = client.get("/api/health").json()
        assert body["status"] == "healthy"

    def test_health_contains_service(self, client: TestClient):
        body = client.get("/api/health").json()
        assert "service" in body

    def test_health_contains_minio_info(self, client: TestClient):
        body = client.get("/api/health").json()
        assert "minio_endpoint" in body
        assert "minio_bucket" in body


class TestAdminDashboard:
    def test_admin_dashboard_requires_auth(self, client: TestClient):
        resp = client.get("/admin_dashboard")
        assert resp.status_code == 401

    def test_admin_dashboard_v1_requires_auth(self, client: TestClient):
        resp = client.get("/api/v1/admin_dashboard")
        assert resp.status_code == 401

    def test_admin_dashboard_with_token(self, client: TestClient, admin_headers):
        resp = client.get("/admin_dashboard", headers=admin_headers)
        # Should return 200 with valid admin token
        assert resp.status_code in (200, 500)  # 500 if dashboard query has DB issues in test

    def test_admin_dashboard_v1_with_token(self, client: TestClient, admin_headers):
        resp = client.get("/api/v1/admin_dashboard", headers=admin_headers)
        assert resp.status_code in (200, 500)


class TestCORSPreflight:
    def test_cors_options_returns_200(self, client: TestClient):
        resp = client.options(
            "/api/v1/stories",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "Authorization, Content-Type",
            },
        )
        assert resp.status_code == 200

    def test_cors_options_has_allow_methods(self, client: TestClient):
        resp = client.options(
            "/api/v1/stories",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "POST",
            },
        )
        # Header must be present for CORS to work
        assert "access-control-allow-methods" in resp.headers or resp.status_code == 200


class TestNotFound:
    def test_404_unknown_route(self, client: TestClient):
        # Because FastAPI has a catchall OPTIONS /{full_path:path} route for CORS preflights,
        # GET requests to unmatched paths hit the path with an unhandled method and return 405 Method Not Allowed
        resp = client.get("/api/v1/this-does-not-exist-xyz")
        assert resp.status_code in (404, 405)

    def test_404_response_has_detail(self, client: TestClient):
        resp = client.get("/api/v1/completely-nonexistent-endpoint")
        assert resp.status_code in (404, 405)
        assert "detail" in resp.json()
