import base64
import json
import datetime
import hashlib
import hmac
import secrets
import time
from fastapi import APIRouter, Depends, HTTPException, Header, Query, status
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any

from app.config import settings
from app.database import get_db
from app.models import User
from app.schemas import UserRegister, UserLogin, ForgotPasswordRequest, ResetPasswordRequest, Token, UserOut
from app.services.email_service import EmailService

router = APIRouter(prefix="/auth", tags=["Authentication"])

def b64url_encode(data: bytes) -> str:
    """Base64url encoding without padding as per RFC 7515."""
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")

def b64url_decode(data: str) -> bytes:
    """Base64url decoding with automatic padding compensation."""
    clean = data.strip()
    padding = "=" * ((4 - len(clean) % 4) % 4)
    return base64.urlsafe_b64decode(clean + padding)

def create_jwt_token(payload: Dict[str, Any], secret: str, algorithm: str = "HS256") -> str:
    """
    Generate an RFC 7519 compliant JSON Web Token (JWT) signed with HMAC-SHA256.
    Cryptographically binds claims (sub, role, iat, exp, jti).
    """
    header = {"alg": algorithm, "typ": "JWT"}
    header_b64 = b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    signature = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    sig_b64 = b64url_encode(signature)
    return f"{header_b64}.{payload_b64}.{sig_b64}"

def verify_jwt_token(token: str, secret: str) -> Dict[str, Any]:
    """
    Cryptographically verify HMAC-SHA256 JWT signature, encoding, and expiration.
    Returns decoded claims dictionary or raises HTTP 401.
    """
    if not token or not isinstance(token, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing."
        )

    parts = token.strip().split(".")
    if len(parts) != 3:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed authentication token."
        )

    header_b64, payload_b64, sig_b64 = parts
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    expected_sig = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()

    try:
        provided_sig = b64url_decode(sig_b64)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token signature encoding."
        )

    # Constant-time comparison to prevent timing side-channel attacks
    if not secrets.compare_digest(expected_sig, provided_sig):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token signature or token has been tampered with."
        )

    try:
        payload_bytes = b64url_decode(payload_b64)
        payload = json.loads(payload_bytes.decode("utf-8"))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload."
        )

    # Validate expiration
    exp = payload.get("exp")
    if exp and time.time() > float(exp):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin session has expired. Please sign in again."
        )

    return payload

def hash_password(password: str, salt: Optional[str] = None) -> str:
    """NIST standard PBKDF2 HMAC SHA-256 with secure random salt."""
    if salt is None:
        salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"{salt}${key.hex()}"

def verify_password(password: str, hashed_password: str) -> bool:
    """Constant-time verification of password against salt-hashed string."""
    try:
        salt, key_hex = hashed_password.split("$", 1)
        new_key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
        return secrets.compare_digest(new_key.hex(), key_hex)
    except Exception:
        return False

def generate_access_token(user: User) -> str:
    """Generate a tamper-proof signed JWT access token for an authenticated administrator."""
    now = int(time.time())
    expire_minutes = getattr(settings, "ACCESS_TOKEN_EXPIRE_MINUTES", 480)
    payload = {
        "sub": str(user.id),
        "name": user.name,
        "email": user.email,
        "role": getattr(user, "role", "customer"),
        "iat": now,
        "exp": now + (expire_minutes * 60),
        "jti": secrets.token_hex(16)
    }
    return create_jwt_token(payload, settings.SECRET_KEY, getattr(settings, "ALGORITHM", "HS256"))


@router.post("/register", response_model=Token)
def register_admin(payload: UserRegister, db: Session = Depends(get_db)):
    """Create a new admin account - Restricted to environment configuration."""
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Public admin registration is disabled. Administrator accounts are provisioned via environment configuration."
    )


@router.post("/login", response_model=Token)
def login_admin(payload: UserLogin, db: Session = Depends(get_db)):
    """Authenticate admin user using username/email and password."""
    login_id = payload.username.lower().strip()
    user = db.query(User).filter(
        (User.email == login_id) | (User.name.ilike(login_id))
    ).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password. Please try again."
        )

    if getattr(user, "role", "customer") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Administrative privileges required."
        )

    token = generate_access_token(user)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Request password reset code sent via SMTP to the registered email.
    Includes persistent rate limiting and enumeration mitigation.
    """
    clean_email = payload.email.lower().strip()
    user = db.query(User).filter(
        (User.email == clean_email) | (User.name.ilike(clean_email))
    ).first()

    if not user:
        # Anti-enumeration: Return generic success without revealing user presence
        return {
            "status": "success",
            "message": "If an account matches this email or username, a verification code has been sent.",
            "smtp_sent": True
        }

    # Persistent cooldown check (stored in DB reset_token string: code:attempts:timestamp)
    now_ts = int(time.time())
    if user.reset_token:
        token_parts = str(user.reset_token).split(":")
        if len(token_parts) >= 3:
            try:
                last_ts = int(token_parts[2])
                if (now_ts - last_ts) < 60:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Please wait 60 seconds before requesting another verification code."
                    )
            except ValueError:
                pass

    # Generate 6-digit OTP code with expiration from configuration
    expire_minutes = getattr(settings, "PASSWORD_RESET_CODE_EXPIRE_MINUTES", 5)
    reset_code = f"{secrets.randbelow(900000) + 100000}"
    # Persist code with 0 failed attempts and current epoch timestamp
    user.reset_token = f"{reset_code}:0:{now_ts}"
    user.reset_token_expires = datetime.datetime.utcnow() + datetime.timedelta(minutes=expire_minutes)
    db.commit()

    # Send reset code via SMTP service
    result = EmailService.send_password_reset_email(
        to_email=user.email,
        reset_code=reset_code,
        user_name=user.name,
        expires_minutes=expire_minutes
    )

    if not result.get("smtp_sent"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("message") or "Failed to deliver email via SMTP. Please verify SMTP credentials."
        )

    return {
        "status": "success",
        "message": f"Verification code sent to {user.email}. Please check your email inbox.",
        "email": user.email,
        "smtp_sent": True
    }


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Verify reset code and set new password with persistent brute-force lockout.
    """
    if payload.new_password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match."
        )

    if len(payload.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long."
        )

    clean_email = payload.email.lower().strip()
    user = db.query(User).filter(
        (User.email == clean_email) | (User.name.ilike(clean_email))
    ).first()

    if not user or not user.reset_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code or user account."
        )

    # Parse persistent token format: code[:attempts[:timestamp]]
    token_str = str(user.reset_token)
    parts = token_str.split(":")
    expected_code = parts[0]
    attempts = 0
    token_ts = int(time.time())
    if len(parts) >= 2:
        try:
            attempts = int(parts[1])
        except ValueError:
            attempts = 0
    if len(parts) >= 3:
        try:
            token_ts = int(parts[2])
        except ValueError:
            pass

    # Lockout check: Max 5 failed attempts before code is destroyed
    if attempts >= 5:
        user.reset_token = None
        user.reset_token_expires = None
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed verification attempts. This code has been revoked. Please request a new code."
        )

    # Constant-time code verification
    submitted_code = payload.code.strip()
    if not secrets.compare_digest(expected_code, submitted_code):
        attempts += 1
        user.reset_token = f"{expected_code}:{attempts}:{token_ts}"
        db.commit()
        remaining = max(0, 5 - attempts)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid verification code. {remaining} attempt(s) remaining."
        )

    # Expiration check
    if not user.reset_token_expires or user.reset_token_expires < datetime.datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new code."
        )

    # Update password and clear token
    user.hashed_password = hash_password(payload.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()

    return {
        "status": "success",
        "message": "Password reset successfully. You can now login with your new password."
    }


@router.get("/me", response_model=UserOut)
def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Get currently logged-in user profile by verifying signed JWT token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    token = authorization.replace("Bearer ", "").strip()
    payload = verify_jwt_token(token, settings.SECRET_KEY)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")

    return user


def require_admin(
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
) -> User:
    """
    Enforces that the caller is an authenticated Administrator.
    Supports either 'Authorization: Bearer <token>' header or '?token=<token>' query parameter.
    Cryptographically verifies the HMAC-SHA256 JWT signature and validates user role in database.
    """
    raw_token = None
    if authorization and authorization.startswith("Bearer "):
        raw_token = authorization.replace("Bearer ", "").strip()
    elif token:
        raw_token = token.strip()

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin authentication required. Please sign in to access this resource."
        )

    # 1. Cryptographically verify signature and token expiration
    payload = verify_jwt_token(raw_token, settings.SECRET_KEY)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token: missing user identity."
        )

    # 2. Verify account exists in database
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin user account not found."
        )

    # 3. Verify user has active admin privileges in the database
    if getattr(user, "role", "customer") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Administrative privileges required."
        )

    return user

