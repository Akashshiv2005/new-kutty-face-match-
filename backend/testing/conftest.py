"""
conftest.py — Centralized Pytest fixtures for Kutty Story Backend test suite.

Uses an in-memory SQLite database (never touches production/dev PostgreSQL).
Mocks MinIO storage, email service, job runner, AI providers, and Razorpay
so the full HTTP layer is exercised without any external dependencies.
"""
import os
import sys
import time
import uuid
import hashlib
import secrets
import json
from pathlib import Path
from typing import Generator
from unittest.mock import MagicMock, patch, AsyncMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

# ── Inject test environment BEFORE importing anything from app ──────────────
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_kutty.db")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-pytest-only-not-production")
os.environ.setdefault("MINIO_ENDPOINT", "127.0.0.1:9000")
os.environ.setdefault("MINIO_ACCESS_KEY", "testkey")
os.environ.setdefault("MINIO_SECRET_KEY", "testsecret")
os.environ.setdefault("MINIO_BUCKET", "kuttystory-test")
os.environ.setdefault("RAZORPAY_KEY_ID", "")
os.environ.setdefault("RAZORPAY_KEY_SECRET", "")
os.environ.setdefault("RAZORPAY_WEBHOOK_SECRET", "test-webhook-secret-for-pytest")
os.environ.setdefault("SMTP_HOST", "localhost")
os.environ.setdefault("SMTP_USER", "test@test.com")
os.environ.setdefault("SMTP_PASSWORD", "testpass")
os.environ.setdefault("ACTIVE_IMAGE_PROVIDER", "mock")
os.environ.setdefault("FACE_SWAP_PROVIDER", "local")

# Put backend on PYTHONPATH
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

# ── Patch MinIO storage before it is imported anywhere ─────────────────────
_storage_mock = MagicMock()
_storage_mock.get_public_url.return_value = "http://localhost:9000/kuttystory-test/mock-file.png"
_storage_mock.save_bytes.return_value = "generated_assets/test-asset.png"
_storage_mock.save_upload_file = AsyncMock(return_value="child_photos/test-photo.jpg")
_storage_mock.get_bytes.return_value = b"fake-image-bytes"
_storage_mock.resolve_path.return_value = None
_storage_mock.sync_local_to_minio.return_value = None
_storage_mock.migrate_database_to_minio_keys.return_value = None
_storage_mock.delete_file.return_value = None

# Storage module-level patches applied during client fixture startup


# ── Import app modules after env is configured ──────────────────────────────
import app.models
from app.database import Base, get_db
from app.config import settings

# ── In-memory SQLite test engine ─────────────────────────────────────────────
TEST_DB_URL = "sqlite:///./test_kutty_pytest.db"

test_engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)

TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db() -> Generator[Session, None, None]:
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Helper: hash a password the same way auth.py does ───────────────────────
def _hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"{salt}${key.hex()}"


# ── Helper: create a valid JWT for tests ────────────────────────────────────
def _make_jwt(user_id: str, role: str = "admin", secret: str = None) -> str:
    import base64, hmac as _hmac, hashlib as _hash
    if secret is None:
        secret = settings.SECRET_KEY

    def b64url(data: bytes) -> str:
        return base64.urlsafe_b64encode(data).decode().rstrip("=")

    now = int(time.time())
    header = b64url(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload_data = {
        "sub": user_id,
        "name": "Test Admin",
        "email": "admin@test.com",
        "role": role,
        "iat": now,
        "exp": now + 3600,
        "jti": secrets.token_hex(8),
    }
    payload = b64url(json.dumps(payload_data).encode())
    signing_input = f"{header}.{payload}".encode()
    sig = _hmac.new(secret.encode(), signing_input, _hash.sha256).digest()
    return f"{header}.{payload}.{b64url(sig)}"


# ── Pytest fixtures ──────────────────────────────────────────────────────────

@pytest.fixture(scope="session", autouse=True)
def create_test_db():
    """Create all tables once per test session using the SQLite test DB."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)
    # Cleanup leftover DB file
    db_file = Path("test_kutty_pytest.db")
    if db_file.exists():
        try:
            db_file.unlink()
        except Exception:
            pass


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """Fresh database session per test."""
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="session")
def mock_storage():
    return _storage_mock


@pytest.fixture(scope="session")
def client(create_test_db) -> Generator[TestClient, None, None]:
    """
    Session-scoped FastAPI TestClient with:
    - SQLite test database (not PostgreSQL)
    - Mocked MinIO storage
    - Mocked job runner (no background AI processing)
    - Mocked email service
    """
    patches = []
    try:
        # ── Patch storage ──────────────────────────────────────────────────
        patches.append(patch("app.services.storage.storage", _storage_mock))

        # ── Patch job runner ───────────────────────────────────────────────
        _job_runner_mock = MagicMock()
        _job_runner_mock.process_preview_job = MagicMock(return_value=None)
        _job_runner_mock.regenerate_single_page = AsyncMock(return_value=None)
        _job_runner_mock.get_or_generate_full_storybook_pages = MagicMock(return_value=None)
        _job_runner_mock.recover_stuck_jobs.return_value = 0
        patches.append(patch("app.services.job_runner.job_runner", _job_runner_mock))

        # ── Patch MinIO sync at startup ────────────────────────────────────
        patches.append(patch("app.services.storage.StorageManager.sync_local_to_minio", return_value=None))

        # ── Patch email service ────────────────────────────────────────────
        _email_mock = MagicMock()
        _email_mock.send_password_reset_email.return_value = {
            "smtp_sent": True, "message": "Email sent"
        }
        patches.append(patch("app.services.email_service.EmailService.send_password_reset_email",
                             _email_mock.send_password_reset_email))

        # ── Patch photo validator ──────────────────────────────────────────
        patches.append(patch(
            "app.services.ai.photo_validator.validate_child_photo_ai",
            return_value={"is_valid": True, "score": 95, "issues": [], "summary": "Valid photo"}
        ))

        # ── Patch PDF importer at startup ──────────────────────────────────
        patches.append(patch(
            "app.services.pdf_importer.PDFImporterService.import_story_from_pdf",
            return_value=None
        ))

        # Start all patches
        for p in patches:
            p.start()

        # ── Import & configure app ─────────────────────────────────────────
        from app.main import app
        from app.database import get_db

        app.dependency_overrides[get_db] = override_get_db

        with TestClient(app, raise_server_exceptions=False) as c:
            yield c

    finally:
        for p in patches:
            try:
                p.stop()
            except Exception:
                pass


@pytest.fixture
def admin_user(db_session: Session):
    """Create a fresh admin user in the test DB."""
    from app.models import User
    admin_id = str(uuid.uuid4())
    u = User(
        id=admin_id,
        name="testadmin",
        email=f"testadmin_{admin_id[:8]}@test.com",
        hashed_password=_hash_password("Admin@12345"),
        role="admin",
    )
    db_session.add(u)
    db_session.commit()
    db_session.refresh(u)
    return u


@pytest.fixture
def admin_token(admin_user) -> str:
    """Generate a valid admin JWT for the test admin user."""
    return _make_jwt(admin_user.id, role="admin")


@pytest.fixture
def admin_headers(admin_token) -> dict:
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def published_story(db_session: Session):
    """Create a published story template in the test DB."""
    from app.models import StoryTemplate, StoryPage
    story_id = str(uuid.uuid4())
    story = StoryTemplate(
        id=story_id,
        slug=f"test-story-{story_id[:8]}",
        title="Test Unicorn Story",
        description="A test personalized story.",
        category="Fairytale & Adventure",
        age_range="3-8 years",
        status="published",
        page_count=5,
        price_digital=799.0,
        price_print=1399.0,
        currency="INR",
        target_gender="both",
        min_age=3,
        max_age=8,
    )
    db_session.add(story)
    db_session.flush()

    # Add story pages
    for i in range(5):
        page = StoryPage(
            id=str(uuid.uuid4()),
            story_id=story_id,
            page_index=i,
            page_number=i + 1,
            page_type="cover" if i == 0 else "story",
            story_text=f"Page {i+1} text with [Name] the hero.",
            original_image_path=f"source_pages/test/page_{i+1:02d}.png",
            personalization_required=True,
            face_outline_points="[[100,100],[200,100],[200,200],[100,200]]",
        )
        db_session.add(page)

    db_session.commit()
    db_session.refresh(story)
    return story


@pytest.fixture
def draft_story(db_session: Session):
    """Create a draft (not published) story template."""
    from app.models import StoryTemplate
    story_id = str(uuid.uuid4())
    story = StoryTemplate(
        id=story_id,
        slug=f"draft-story-{story_id[:8]}",
        title="Draft Story",
        description="Not published.",
        status="draft",
        page_count=3,
        price_digital=799.0,
        price_print=1399.0,
        currency="INR",
    )
    db_session.add(story)
    db_session.commit()
    db_session.refresh(story)
    return story


@pytest.fixture
def personalization_job(db_session: Session, published_story):
    """Create a completed personalization job in the test DB."""
    from app.models import PersonalizationJob, ChildProfile
    profile_id = str(uuid.uuid4())
    profile = ChildProfile(
        id=profile_id,
        child_display_name="Test Child",
        photo_storage_path="child_photos/test-photo.jpg",
        consent_status=True,
        retention_status="active",
    )
    db_session.add(profile)
    db_session.flush()

    job_id = str(uuid.uuid4())
    job = PersonalizationJob(
        id=job_id,
        story_id=published_story.id,
        child_profile_id=profile_id,
        child_name="Test Child",
        photo_path="child_photos/test-photo.jpg",
        status="completed",
        current_stage="Completed",
        total_pages=5,
        completed_pages=5,
        failed_pages=0,
        outfit_mode="story",
        language="english",
        is_paid=False,
    )
    db_session.add(job)
    db_session.commit()
    db_session.refresh(job)
    return job


@pytest.fixture
def paid_job(db_session: Session, published_story):
    """Create a paid personalization job."""
    from app.models import PersonalizationJob, ChildProfile
    import datetime
    profile = ChildProfile(
        id=str(uuid.uuid4()),
        child_display_name="Paid Child",
        photo_storage_path="child_photos/paid-photo.jpg",
        consent_status=True,
        retention_status="active",
    )
    db_session.add(profile)
    db_session.flush()

    job = PersonalizationJob(
        id=str(uuid.uuid4()),
        story_id=published_story.id,
        child_profile_id=profile.id,
        child_name="Paid Child",
        photo_path="child_photos/paid-photo.jpg",
        status="completed",
        current_stage="Completed",
        total_pages=5,
        completed_pages=5,
        failed_pages=0,
        is_paid=True,
        paid_at=datetime.datetime.utcnow(),
        format_type="digital",
    )
    db_session.add(job)
    db_session.commit()
    db_session.refresh(job)
    return job


@pytest.fixture
def feedback_record(db_session: Session):
    """Create a pending feedback record."""
    from app.models import Feedback
    import datetime
    fb = Feedback(
        id=str(uuid.uuid4()),
        name="Test User",
        place="Chennai",
        rating=5,
        review_text="Wonderful story!",
        status="pending",
        created_at=datetime.datetime.utcnow(),
        updated_at=datetime.datetime.utcnow(),
    )
    db_session.add(fb)
    db_session.commit()
    db_session.refresh(fb)
    return fb


@pytest.fixture
def approved_feedback(db_session: Session):
    """Create an approved feedback record."""
    from app.models import Feedback
    import datetime
    fb = Feedback(
        id=str(uuid.uuid4()),
        name="Happy Parent",
        place="Coimbatore",
        rating=4,
        review_text="Kids loved it!",
        status="approved",
        created_at=datetime.datetime.utcnow(),
        updated_at=datetime.datetime.utcnow(),
    )
    db_session.add(fb)
    db_session.commit()
    db_session.refresh(fb)
    return fb


@pytest.fixture
def child_story_record(db_session: Session):
    """Create an approved child-written story."""
    from app.models import ChildWrittenStory
    import datetime
    story = ChildWrittenStory(
        id=str(uuid.uuid4()),
        child_name="Riya",
        standard="4th Standard",
        place="Mumbai",
        title="The Brave Dragon",
        story_text="Once upon a time there was a dragon who was afraid of fire...",
        category="Fantasy & Magic",
        cover_color="#8B3DFF",
        status="approved",
        likes_count=5,
        created_at=datetime.datetime.utcnow(),
        updated_at=datetime.datetime.utcnow(),
    )
    db_session.add(story)
    db_session.commit()
    db_session.refresh(story)
    return story
