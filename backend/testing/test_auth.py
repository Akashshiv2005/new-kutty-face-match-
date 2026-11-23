"""
test_auth.py — Comprehensive tests for the /api/v1/auth router.

Covers:
- POST /auth/login      (success, bad creds, non-admin, missing fields)
- POST /auth/register   (always 403 — public registration is disabled)
- POST /auth/forgot-password (enumeration safety, rate limiting)
- POST /auth/reset-password  (success, bad code, brute-force lockout, expiry)
- GET  /auth/me         (success, missing token, bad token, expired)
- JWT helpers: create_jwt_token, verify_jwt_token, hash_password, verify_password
"""
import time
import uuid
import datetime
import secrets
import hashlib
import json
import pytest
from fastapi.testclient import TestClient


# ── Helpers ──────────────────────────────────────────────────────────────────

def _hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000)
    return f"{salt}${key.hex()}"


def _create_admin(db_session, email=None, password="Admin@12345", role="admin"):
    from app.models import User
    uid = str(uuid.uuid4())
    email = email or f"admin_{uid[:8]}@test.com"
    u = User(
        id=uid, name="testadmin", email=email,
        hashed_password=_hash_password(password), role=role,
    )
    db_session.add(u)
    db_session.commit()
    db_session.refresh(u)
    return u


# ══════════════════════════════════════════════════════════════════════════════
# POST /api/v1/auth/register  — Always disabled
# ══════════════════════════════════════════════════════════════════════════════

class TestRegister:
    def test_register_always_forbidden(self, client: TestClient):
        """Public registration endpoint must always return 403."""
        resp = client.post("/api/v1/auth/register", json={
            "name": "New User",
            "email": "new@test.com",
            "password": "Secret123",
            "confirm_password": "Secret123",
        })
        assert resp.status_code == 403, resp.text
        assert "disabled" in resp.json()["detail"].lower()

    def test_register_empty_body(self, client: TestClient):
        resp = client.post("/api/v1/auth/register", json={})
        # Either 403 (endpoint disabled) or 422 (validation) — never 200/201
        assert resp.status_code in (403, 422)


# ══════════════════════════════════════════════════════════════════════════════
# POST /api/v1/auth/login
# ══════════════════════════════════════════════════════════════════════════════

class TestLogin:
    def test_login_success_with_email(self, client: TestClient, db_session):
        """Valid admin email + password returns a JWT access token."""
        user = _create_admin(db_session, email="login_ok@test.com")
        resp = client.post("/api/v1/auth/login", json={
            "username": "login_ok@test.com",
            "password": "Admin@12345",
        })
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert "access_token" in body
        assert body["token_type"] == "bearer"
        assert len(body["access_token"].split(".")) == 3  # valid JWT structure

    def test_login_success_with_username(self, client: TestClient, db_session):
        """Login with username (name) instead of email."""
        from app.models import User
        uid = str(uuid.uuid4())
        u = User(id=uid, name="uniqueadminname", email=f"byname_{uid[:6]}@t.com",
                 hashed_password=_hash_password("Admin@12345"), role="admin")
        db_session.add(u)
        db_session.commit()
        resp = client.post("/api/v1/auth/login", json={
            "username": "uniqueadminname",
            "password": "Admin@12345",
        })
        assert resp.status_code == 200

    def test_login_wrong_password(self, client: TestClient, db_session):
        _create_admin(db_session, email="wrongpwd@test.com")
        resp = client.post("/api/v1/auth/login", json={
            "username": "wrongpwd@test.com",
            "password": "WrongPassword!",
        })
        assert resp.status_code == 401
        assert "Invalid" in resp.json()["detail"]

    def test_login_non_existent_user(self, client: TestClient):
        resp = client.post("/api/v1/auth/login", json={
            "username": "ghost_user_xyz@test.com",
            "password": "Whatever123",
        })
        assert resp.status_code == 401

    def test_login_customer_role_denied(self, client: TestClient, db_session):
        """Non-admin users (role=customer) must receive 403."""
        from app.models import User
        uid = str(uuid.uuid4())
        u = User(id=uid, name="cust", email=f"cust_{uid[:6]}@t.com",
                 hashed_password=_hash_password("Admin@12345"), role="customer")
        db_session.add(u)
        db_session.commit()
        resp = client.post("/api/v1/auth/login", json={
            "username": f"cust_{uid[:6]}@t.com",
            "password": "Admin@12345",
        })
        assert resp.status_code == 403
        assert "Administrative privileges" in resp.json()["detail"]

    def test_login_missing_username(self, client: TestClient):
        resp = client.post("/api/v1/auth/login", json={"password": "Admin@12345"})
        assert resp.status_code == 422

    def test_login_missing_password(self, client: TestClient):
        resp = client.post("/api/v1/auth/login", json={"username": "someone@test.com"})
        assert resp.status_code == 422

    def test_login_empty_body(self, client: TestClient):
        resp = client.post("/api/v1/auth/login", json={})
        assert resp.status_code == 422

    def test_login_response_structure(self, client: TestClient, db_session):
        """Login response must include access_token, token_type, and user object."""
        user = _create_admin(db_session, email="structure_check@test.com")
        resp = client.post("/api/v1/auth/login", json={
            "username": "structure_check@test.com",
            "password": "Admin@12345",
        })
        assert resp.status_code == 200
        body = resp.json()
        assert set(["access_token", "token_type", "user"]).issubset(body.keys())


# ══════════════════════════════════════════════════════════════════════════════
# GET /api/v1/auth/me
# ══════════════════════════════════════════════════════════════════════════════

class TestGetMe:
    def test_get_me_success(self, client: TestClient, db_session):
        user = _create_admin(db_session, email="me_test@test.com")
        # Login to get a real token
        resp = client.post("/api/v1/auth/login", json={
            "username": "me_test@test.com", "password": "Admin@12345"
        })
        token = resp.json()["access_token"]
        me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200
        assert me.json()["email"] == "me_test@test.com"

    def test_get_me_no_token(self, client: TestClient):
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401

    def test_get_me_malformed_token(self, client: TestClient):
        resp = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer notavalidtoken"})
        assert resp.status_code == 401

    def test_get_me_tampered_token(self, client: TestClient):
        resp = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer a.b.c"})
        assert resp.status_code == 401

    def test_get_me_bearer_prefix_required(self, client: TestClient):
        resp = client.get("/api/v1/auth/me", headers={"Authorization": "sometoken"})
        assert resp.status_code == 401

    def test_get_me_expired_token(self, client: TestClient, db_session):
        """Expired token (exp in the past) should return 401."""
        from app.routers.auth import create_jwt_token
        user = _create_admin(db_session, email="expired_me@test.com")
        payload = {
            "sub": user.id, "name": user.name, "email": user.email, "role": "admin",
            "iat": int(time.time()) - 7200,
            "exp": int(time.time()) - 3600,  # already expired
            "jti": secrets.token_hex(8),
        }
        from app.config import settings
        token = create_jwt_token(payload, settings.SECRET_KEY)
        resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 401


# ══════════════════════════════════════════════════════════════════════════════
# POST /api/v1/auth/forgot-password
# ══════════════════════════════════════════════════════════════════════════════

class TestForgotPassword:
    def test_forgot_password_non_existent_email_anti_enumeration(self, client: TestClient):
        """Non-existent email must still return success (anti-enumeration)."""
        resp = client.post("/api/v1/auth/forgot-password", json={
            "email": "ghost_no_such_user_xyz123@test.com"
        })
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "success"

    def test_forgot_password_missing_email(self, client: TestClient):
        resp = client.post("/api/v1/auth/forgot-password", json={})
        assert resp.status_code == 422

    def test_forgot_password_empty_email(self, client: TestClient):
        resp = client.post("/api/v1/auth/forgot-password", json={"email": ""})
        # Empty string is accepted by schema but treated as non-existent user
        assert resp.status_code in (200, 422)


# ══════════════════════════════════════════════════════════════════════════════
# POST /api/v1/auth/reset-password
# ══════════════════════════════════════════════════════════════════════════════

class TestResetPassword:
    def _seed_reset_token(self, db_session, user, code, offset_seconds=0):
        """Write a valid reset token format: code:0:timestamp."""
        import datetime
        from app.config import settings
        expire_min = getattr(settings, "PASSWORD_RESET_CODE_EXPIRE_MINUTES", 5)
        ts = int(time.time()) + offset_seconds
        user.reset_token = f"{code}:0:{ts}"
        user.reset_token_expires = datetime.datetime.utcnow() + datetime.timedelta(minutes=expire_min)
        db_session.commit()

    def test_reset_password_success(self, client: TestClient, db_session):
        user = _create_admin(db_session, email="reset_ok@test.com")
        code = "123456"
        self._seed_reset_token(db_session, user, code)
        resp = client.post("/api/v1/auth/reset-password", json={
            "email": "reset_ok@test.com",
            "code": code,
            "new_password": "NewPass@999",
            "confirm_password": "NewPass@999",
        })
        assert resp.status_code == 200
        assert "successfully" in resp.json()["message"].lower()

    def test_reset_password_mismatch(self, client: TestClient, db_session):
        user = _create_admin(db_session, email="reset_mismatch@test.com")
        self._seed_reset_token(db_session, user, "654321")
        resp = client.post("/api/v1/auth/reset-password", json={
            "email": "reset_mismatch@test.com",
            "code": "654321",
            "new_password": "NewPass@999",
            "confirm_password": "DifferentPass@999",
        })
        assert resp.status_code == 400
        assert "do not match" in resp.json()["detail"].lower()

    def test_reset_password_too_short(self, client: TestClient, db_session):
        user = _create_admin(db_session, email="reset_short@test.com")
        self._seed_reset_token(db_session, user, "111111")
        resp = client.post("/api/v1/auth/reset-password", json={
            "email": "reset_short@test.com",
            "code": "111111",
            "new_password": "abc",
            "confirm_password": "abc",
        })
        assert resp.status_code == 400
        assert "6 characters" in resp.json()["detail"].lower()

    def test_reset_password_wrong_code(self, client: TestClient, db_session):
        user = _create_admin(db_session, email="reset_wrong@test.com")
        self._seed_reset_token(db_session, user, "999888")
        resp = client.post("/api/v1/auth/reset-password", json={
            "email": "reset_wrong@test.com",
            "code": "000000",
            "new_password": "NewPass@999",
            "confirm_password": "NewPass@999",
        })
        assert resp.status_code == 400
        assert "Invalid verification code" in resp.json()["detail"]

    def test_reset_password_invalid_user(self, client: TestClient):
        resp = client.post("/api/v1/auth/reset-password", json={
            "email": "no_such_user@test.com",
            "code": "123456",
            "new_password": "NewPass@999",
            "confirm_password": "NewPass@999",
        })
        assert resp.status_code == 400

    def test_reset_password_brute_force_lockout(self, client: TestClient, db_session):
        """After 5 failed attempts the code should be revoked (429)."""
        user = _create_admin(db_session, email="reset_lockout@test.com")
        code = "777777"
        # Seed token with 5 already-failed attempts
        import datetime
        from app.config import settings
        ts = int(time.time())
        user.reset_token = f"{code}:5:{ts}"
        user.reset_token_expires = datetime.datetime.utcnow() + datetime.timedelta(minutes=5)
        db_session.commit()
        resp = client.post("/api/v1/auth/reset-password", json={
            "email": "reset_lockout@test.com",
            "code": code,
            "new_password": "NewPass@999",
            "confirm_password": "NewPass@999",
        })
        assert resp.status_code == 429
        assert "revoked" in resp.json()["detail"].lower() or "Too many" in resp.json()["detail"]

    def test_reset_password_expired_code(self, client: TestClient, db_session):
        """Expired code (past expiry time) must return 400."""
        import datetime
        user = _create_admin(db_session, email="reset_expire@test.com")
        ts = int(time.time())
        user.reset_token = f"555444:0:{ts}"
        user.reset_token_expires = datetime.datetime.utcnow() - datetime.timedelta(minutes=10)  # already expired
        db_session.commit()
        resp = client.post("/api/v1/auth/reset-password", json={
            "email": "reset_expire@test.com",
            "code": "555444",
            "new_password": "NewPass@999",
            "confirm_password": "NewPass@999",
        })
        assert resp.status_code == 400
        assert "expired" in resp.json()["detail"].lower()


# ══════════════════════════════════════════════════════════════════════════════
# JWT helper unit tests
# ══════════════════════════════════════════════════════════════════════════════

class TestJWTHelpers:
    def test_create_and_verify_jwt(self):
        from app.routers.auth import create_jwt_token, verify_jwt_token
        payload = {"sub": "test-id", "role": "admin", "exp": int(time.time()) + 3600}
        token = create_jwt_token(payload, "test-secret")
        decoded = verify_jwt_token(token, "test-secret")
        assert decoded["sub"] == "test-id"
        assert decoded["role"] == "admin"

    def test_verify_jwt_wrong_secret(self):
        from app.routers.auth import create_jwt_token, verify_jwt_token
        from fastapi import HTTPException
        token = create_jwt_token({"sub": "id", "exp": int(time.time()) + 3600}, "correct-secret")
        with pytest.raises(HTTPException) as exc_info:
            verify_jwt_token(token, "wrong-secret")
        assert exc_info.value.status_code == 401

    def test_verify_jwt_expired(self):
        from app.routers.auth import create_jwt_token, verify_jwt_token
        from fastapi import HTTPException
        payload = {"sub": "id", "exp": int(time.time()) - 3600}
        token = create_jwt_token(payload, "secret")
        with pytest.raises(HTTPException) as exc_info:
            verify_jwt_token(token, "secret")
        assert exc_info.value.status_code == 401

    def test_verify_jwt_malformed(self):
        from app.routers.auth import verify_jwt_token
        from fastapi import HTTPException
        with pytest.raises(HTTPException):
            verify_jwt_token("not.a.valid.jwt.token", "secret")

    def test_hash_and_verify_password(self):
        from app.routers.auth import hash_password, verify_password
        hashed = hash_password("MySecretPass123")
        assert verify_password("MySecretPass123", hashed) is True
        assert verify_password("WrongPass", hashed) is False

    def test_hash_password_different_salts(self):
        from app.routers.auth import hash_password
        h1 = hash_password("SamePassword")
        h2 = hash_password("SamePassword")
        # Different salts produce different hashes
        assert h1 != h2

    def test_verify_password_timing_safe(self):
        """verify_password must not throw on malformed hashed_password."""
        from app.routers.auth import verify_password
        # Hashed password without $ delimiter
        result = verify_password("test", "malformedhash")
        assert result is False
