"""
Structured logger for Magic Hour AI integrations.
Writes to stdout and a rotating file at backend/logs/magic_hour.log.
"""
import os
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Optional

_LOGGER_NAME = "magic_hour_integration"
_logger: Optional[logging.Logger] = None


def get_magic_hour_logger() -> logging.Logger:
    global _logger
    if _logger is not None:
        return _logger

    logger = logging.getLogger(_LOGGER_NAME)
    logger.setLevel(logging.INFO)
    logger.propagate = False

    if not logger.handlers:
        formatter = logging.Formatter(
            "%(asctime)s [%(levelname)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )

        # 1. Console stream handler
        stream_handler = logging.StreamHandler()
        stream_handler.setFormatter(formatter)
        logger.addHandler(stream_handler)

        # 2. Rotating file handler (backend/logs/magic_hour.log)
        try:
            log_dir = Path(__file__).resolve().parent.parent.parent.parent / "logs"
            log_dir.mkdir(parents=True, exist_ok=True)
            log_file = log_dir / "magic_hour.log"
            file_handler = RotatingFileHandler(
                str(log_file),
                maxBytes=10 * 1024 * 1024,  # 10 MB
                backupCount=5,
                encoding="utf-8"
            )
            file_handler.setFormatter(formatter)
            logger.addHandler(file_handler)
        except Exception as e:
            logger.warning(f"Could not initialize rotating log file: {e}")

    _logger = logger
    return _logger


def log_attempt(
    job_id: str,
    page_number: int,
    provider: str,
    tool: str,
    attempt: int,
    max_attempts: int,
    duration_sec: float,
    outcome: str,  # success | retry | fallback | failed
    error_code: Optional[str] = None,
    fallback_from: Optional[str] = None,
    reason: Optional[str] = None,
):
    """
    Emits a structured key=value log line.
    Never logs raw image bytes, keys, or long signed URLs.
    """
    logger = get_magic_hour_logger()
    clean_reason = ""
    if reason:
        # Sanitize and truncate reason
        clean_reason = str(reason).replace("\n", " ").replace('"', "'")
        if len(clean_reason) > 120:
            clean_reason = clean_reason[:117] + "..."

    parts = [
        f"job_id={job_id or 'none'}",
        f"page={page_number}",
        f"provider={provider}",
        f"tool={tool}",
        f"attempt={attempt}/{max_attempts}",
        f"duration_sec={duration_sec:.2f}",
        f"outcome={outcome}",
    ]
    if error_code:
        parts.append(f"error_code={error_code}")
    if fallback_from:
        parts.append(f"fallback_from={fallback_from}")
    if clean_reason:
        parts.append(f'reason="{clean_reason}"')

    msg = " ".join(parts)
    if outcome == "success":
        logger.info(msg)
    elif outcome in ("retry", "fallback"):
        logger.warning(msg)
    else:  # failed
        logger.error(msg)

