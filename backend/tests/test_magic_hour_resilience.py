"""
Unit tests for Magic Hour resilience, error classification, concurrency gating,
retries, fallback transparency, and failure tracking.
"""
import io
import os
import sys
import tempfile
import threading
import time
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

# Ensure backend directory is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.services.ai.errors import (
    MagicHourErrorCode,
    classify_error,
    is_retryable,
)
from app.services.ai.magic_hour_provider import (
    swap_story_page,
    _download_image_with_retry,
    _mh_semaphore,
)
from app.models import GeneratedAsset, PersonalizationJob
from app.routers.personalization import download_preview_pdf, download_full_print_pdf
from app.routers.ai_health import get_magic_hour_health
from app.services.ai.photo_validator import validate_child_photo_ai
from app.services.ai.consistency_engine import CharacterConsistencyEngine
from app.services.ai.page_face_audit import audit_page_image
from PIL import Image
from fastapi import HTTPException


class TestErrorClassifier(unittest.TestCase):
    """Verifies error classification into standardized codes and retryability."""

    def test_auth_error_classification(self):
        err = Exception("Unauthorized: Invalid Bearer api_key token")
        code, msg, retryable = classify_error(err)
        self.assertEqual(code, MagicHourErrorCode.AUTH)
        self.assertFalse(retryable)

    def test_credit_error_classification(self):
        err = Exception("Insufficient credit balance to generate image")
        code, msg, retryable = classify_error(err)
        self.assertEqual(code, MagicHourErrorCode.CREDITS)
        self.assertFalse(retryable)

    def test_rate_limit_classification(self):
        mock_resp = MagicMock(status_code=429)
        err = Exception("Too Many Requests")
        err.response = mock_resp
        code, msg, retryable = classify_error(err)
        self.assertEqual(code, MagicHourErrorCode.RATE_LIMIT)
        self.assertTrue(retryable)

    def test_concurrency_error_classification(self):
        err = Exception("Concurrency limit exceeded. Another job is in progress.")
        code, msg, retryable = classify_error(err)
        self.assertEqual(code, MagicHourErrorCode.CONCURRENCY)
        self.assertTrue(retryable)

    def test_timeout_error_classification(self):
        err = TimeoutError("Connection timed out after 60 seconds")
        code, msg, retryable = classify_error(err)
        self.assertEqual(code, MagicHourErrorCode.TIMEOUT)
        self.assertTrue(retryable)

    def test_download_error_classification(self):
        err = Exception("Failed to download output image from s3 presigned url")
        code, msg, retryable = classify_error(err)
        self.assertEqual(code, MagicHourErrorCode.DOWNLOAD)
        self.assertTrue(retryable)

    def test_no_face_source_classification(self):
        err = Exception("No face detected in source photograph")
        code, msg, retryable = classify_error(err)
        self.assertEqual(code, MagicHourErrorCode.NO_FACE_SOURCE)
        self.assertFalse(retryable)

    def test_no_face_target_classification(self):
        err = Exception("No face detected in target image")
        code, msg, retryable = classify_error(err)
        self.assertEqual(code, MagicHourErrorCode.NO_FACE_TARGET)
        self.assertFalse(retryable)


class TestConcurrencyGate(unittest.TestCase):
    """Verifies that the process-wide concurrency gate limits execution."""

    def test_semaphore_acquisition(self):
        # The semaphore should allow acquisition up to its limit
        acquired = _mh_semaphore.acquire(blocking=False)
        self.assertTrue(acquired)
        _mh_semaphore.release()


class TestRetryAndFallback(unittest.TestCase):
    """Verifies retry loops and F1 fallback transparency with mocked Magic Hour client."""

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.dummy_photo = Path(self.temp_dir.name) / "test_child.png"
        from PIL import Image
        img = Image.new("RGB", (200, 200), color=(255, 0, 0))
        img.save(self.dummy_photo, format="PNG")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        self.valid_png_bytes = buf.getvalue()
        self.target_bytes = self.dummy_photo.read_bytes()

    def tearDown(self):
        self.temp_dir.cleanup()

    @patch.dict(os.environ, {
        "MAGIC_HOUR_API_KEY": "mhk_test_key_12345",
        "MAGIC_HOUR_MAX_RETRIES": "2",
        "MAGIC_HOUR_RETRY_BASE_SECONDS": "0.01",
        "MAGIC_HOUR_SKIP_OUTPUT_FACE_CHECK": "true"
    })
    @patch("app.services.ai.magic_hour_provider._download_image_with_retry")
    @patch("app.services.ai.magic_hour_provider.Client")
    def test_retry_on_transient_error(self, mock_client_cls, mock_download):
        mock_download.return_value = self.valid_png_bytes
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client

        # First attempt times out; second attempt succeeds
        success_res = MagicMock(status="success", downloads=[MagicMock(url="https://s3.magic-hour.com/output.png")])
        mock_client.v1.face_swap_photo.generate.side_effect = [
            TimeoutError("Request timed out"),
            success_res
        ]

        result = swap_story_page(
            source_path=str(self.dummy_photo),
            target_bytes=self.target_bytes,
            page_number=1,
            outfit_mode="story",
            job_id="test_job_retry"
        )

        self.assertEqual(result.image_bytes, self.valid_png_bytes)
        self.assertEqual(result.attempts, 2)
        self.assertFalse(result.used_fallback)

    @patch.dict(os.environ, {
        "MAGIC_HOUR_API_KEY": "mhk_test_key_12345",
        "MAGIC_HOUR_SWAP_MODE": "face_swap",
        "MAGIC_HOUR_MAX_RETRIES": "1",
        "MAGIC_HOUR_RETRY_BASE_SECONDS": "0.01",
        "MAGIC_HOUR_SKIP_OUTPUT_FACE_CHECK": "true"
    })
    @patch("app.services.ai.magic_hour_provider._download_image_with_retry")
    @patch("app.services.ai.magic_hour_provider.Client")
    def test_f1_body_swap_fallback_to_face_swap(self, mock_client_cls, mock_download):
        mock_download.return_value = self.valid_png_bytes
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client

        # body_swap fails with error; face_swap succeeds
        mock_client.v1.body_swap.generate.side_effect = Exception("Body detection model failed")
        mock_client.v1.face_swap_photo.generate.return_value = MagicMock(
            status="success",
            downloads=[MagicMock(url="https://s3.magic-hour.com/fallback_output.png")]
        )

        result = swap_story_page(
            source_path=str(self.dummy_photo),
            target_bytes=self.target_bytes,
            page_number=2,
            outfit_mode="body",
            job_id="test_job_f1"
        )

        self.assertTrue(result.used_fallback)
        self.assertEqual(result.fallback_from, "body_swap")
        self.assertEqual(result.model, "face_swap_photo")

    @patch.dict(os.environ, {
        "MAGIC_HOUR_API_KEY": "mhk_test_key_12345",
        "MAGIC_HOUR_SWAP_MODE": "face_swap",
        "MAGIC_HOUR_MAX_RETRIES": "1",
        "MAGIC_HOUR_RETRY_BASE_SECONDS": "0.01",
        "MAGIC_HOUR_SKIP_OUTPUT_FACE_CHECK": "false"
    })
    @patch("app.services.ai.magic_hour_provider._download_image_with_retry")
    @patch("app.services.ai.magic_hour_provider.Client")
    def test_sanity_check_fails_when_output_has_no_face(self, mock_client_cls, mock_download):
        mock_download.return_value = self.valid_png_bytes
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_client.v1.face_swap_photo.generate.return_value = MagicMock(
            status="success",
            downloads=[MagicMock(url="https://s3.magic-hour.com/solid_color_output.png")]
        )

        with self.assertRaises(RuntimeError) as ctx:
            swap_story_page(
                source_path=str(self.dummy_photo),
                target_bytes=self.target_bytes,
                page_number=1,
                outfit_mode="story",
                job_id="test_sanity_face"
            )

        self.assertIn("NO_FACE_TARGET", str(ctx.exception))


class TestF2FailureTrackingAnd409(unittest.TestCase):
    """Verifies that failed pages prevent silent F2 delivery by returning HTTP 409."""

    def test_preview_pdf_returns_409_on_failed_pages(self):
        mock_db = MagicMock()
        mock_job = MagicMock(id="job_failed_123", story_id="story_1", child_name="Aarav", language="english", is_paid=False)
        mock_db.query.return_value.filter.return_value.first.return_value = mock_job

        # Mock a failed GeneratedAsset record
        failed_asset = MagicMock(page_number=3, generation_status="failed", error_code="NO_FACE_SOURCE")
        mock_db.query.return_value.filter.return_value.all.return_value = [failed_asset]

        with self.assertRaises(HTTPException) as ctx:
            download_preview_pdf(
                job_id="job_failed_123",
                lang="english",
                mode="preview",
                size="8x8",
                color="rgb",
                db=mock_db
            )

        self.assertEqual(ctx.exception.status_code, 409)
        self.assertIn("failed_pages", ctx.exception.detail)
        self.assertEqual(ctx.exception.detail["failed_pages"], [3])

    def test_full_print_pdf_returns_409_on_failed_pages(self):
        mock_db = MagicMock()
        mock_job = MagicMock(id="job_failed_456", story_id="story_1", child_name="Diya", language="english", is_paid=True)
        mock_db.query.return_value.filter.return_value.first.return_value = mock_job

        failed_asset = MagicMock(page_number=5, generation_status="failed", error_code="TIMEOUT")
        mock_db.query.return_value.filter.return_value.all.return_value = [failed_asset]

        with self.assertRaises(HTTPException) as ctx:
            download_full_print_pdf(
                job_id="job_failed_456",
                lang="english",
                size="8x8",
                color="rgb",
                admin=False,
                mode="full",
                db=mock_db
            )

        self.assertEqual(ctx.exception.status_code, 409)
        self.assertIn("failed_pages", ctx.exception.detail)
        self.assertEqual(ctx.exception.detail["failed_pages"], [5])


class TestAIHealthEndpoint(unittest.TestCase):
    """Verifies diagnostics endpoint structure and calculations."""

    @patch.dict(os.environ, {"FACE_SWAP_PROVIDER": "magic_hour", "MAGIC_HOUR_API_KEY": "mhk_live_valid_key"})
    def test_health_endpoint_healthy(self):
        mock_db = MagicMock()
        # Mock last success asset
        mock_asset = MagicMock(created_at=MagicMock(isoformat=lambda: "2026-11-10T12:00:00"))
        mock_db.query.return_value.filter.return_value.order_by.return_value.first.return_value = mock_asset
        # Mock counts
        mock_db.query.return_value.filter.return_value.scalar.side_effect = [15, 0]  # completed=15, fallbacks=0
        mock_db.query.return_value.filter.return_value.group_by.return_value.all.return_value = []

        health_data = get_magic_hour_health(db=mock_db)

        self.assertEqual(health_data["status"], "healthy")
        self.assertTrue(health_data["is_magic_hour_active"])
        self.assertTrue(health_data["key_present"])
        self.assertEqual(health_data["stats_last_24h"]["completed"], 15)
        self.assertEqual(health_data["stats_last_24h"]["failed"], 0)


class TestPhotoValidatorAndSanityChecks(unittest.TestCase):
    """Verifies photo validator, padded face crops, and audit checks."""

    def test_no_face_detection(self):
        # Create a plain solid green image (no human face)
        img = Image.new("RGB", (600, 600), color=(0, 200, 0))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        res = validate_child_photo_ai(buf.getvalue())

        self.assertFalse(res["passed"])
        self.assertFalse(res["is_valid"])
        issue_codes = [i["code"] for i in res["issues"]]
        self.assertIn("no_face", issue_codes)

    def test_low_resolution_detection(self):
        # Create a tiny 200x200 image
        img = Image.new("RGB", (200, 200), color=(128, 128, 128))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        res = validate_child_photo_ai(buf.getvalue())

        issue_codes = [i["code"] for i in res["issues"]]
        self.assertIn("low_resolution", issue_codes)

    def test_dark_photo_detection(self):
        # Create an almost pitch black image
        img = Image.new("RGB", (600, 600), color=(10, 10, 10))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        res = validate_child_photo_ai(buf.getvalue())

        issue_codes = [i["code"] for i in res["issues"]]
        self.assertIn("too_dark", issue_codes)

    def test_consistency_engine_jpeg_extension(self):
        # Test that normalize_child_reference produces a clean .jpg file
        with tempfile.TemporaryDirectory() as td:
            in_file = Path(td) / "child_raw.png"
            img = Image.new("RGB", (600, 600), color=(240, 200, 180))
            img.save(in_file, format="PNG")

            with patch.dict(os.environ, {"FACE_SWAP_PROVIDER": "magic_hour"}):
                out_path = CharacterConsistencyEngine.normalize_child_reference(str(in_file))
                self.assertTrue(out_path.endswith(".jpg"))
                self.assertTrue(Path(out_path).is_file())
                # Verify valid JPEG
                with Image.open(out_path) as check_im:
                    self.assertEqual(check_im.format, "JPEG")

    def test_page_audit_scenery_classification(self):
        # Scenery image with no character face points
        img = Image.new("RGB", (800, 800), color=(100, 150, 200))
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        res = audit_page_image(
            page_number=4,
            image_bytes=buf.getvalue(),
            face_outline_points=None,
            personalization_required=False
        )
        self.assertEqual(res["status"], "SCENERY_SKIP")


if __name__ == "__main__":
    unittest.main()

