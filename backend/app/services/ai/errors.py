"""
Error classification and retry helpers for Magic Hour AI integrations.
"""
from enum import Enum
from typing import Tuple, Any, Optional
import httpx


class MagicHourErrorCode(str, Enum):
    AUTH = "AUTH"
    CREDITS = "CREDITS"
    RATE_LIMIT = "RATE_LIMIT"
    CONCURRENCY = "CONCURRENCY"
    NO_FACE_SOURCE = "NO_FACE_SOURCE"
    NO_FACE_TARGET = "NO_FACE_TARGET"
    TIMEOUT = "TIMEOUT"
    DOWNLOAD = "DOWNLOAD"
    MISSING_INPUT = "MISSING_INPUT"
    UNKNOWN = "UNKNOWN"


RETRYABLE_ERROR_CODES = {
    MagicHourErrorCode.RATE_LIMIT,
    MagicHourErrorCode.CONCURRENCY,
    MagicHourErrorCode.TIMEOUT,
    MagicHourErrorCode.DOWNLOAD,
}


def is_retryable(error_code: str) -> bool:
    """Returns True if the given error code is transient and safe to retry."""
    return error_code in RETRYABLE_ERROR_CODES or error_code in {c.value for c in RETRYABLE_ERROR_CODES}


def classify_error(err: Any) -> Tuple[MagicHourErrorCode, str, bool]:
    """
    Classifies any exception, HTTP response, or Magic Hour API response
    into a standardized (error_code, error_message, is_retryable) tuple.
    """
    if err is None:
        return MagicHourErrorCode.UNKNOWN, "Unknown error", False

    # 1. Check Magic Hour API response object (e.g. res with status='error')
    status = getattr(err, "status", None)
    error_obj = getattr(err, "error", None)
    message_attr = getattr(err, "message", None)
    err_str = str(error_obj or message_attr or err)
    err_lower = err_str.lower()

    # If it's a Magic Hour SDK response with error object
    if error_obj is not None or status == "error":
        code_attr = getattr(error_obj, "code", None) if hasattr(error_obj, "code") else None
        if code_attr:
            code_lower = str(code_attr).lower()
            if "credit" in code_lower or "balance" in code_lower:
                return MagicHourErrorCode.CREDITS, err_str, False
            if "auth" in code_lower or "token" in code_lower:
                return MagicHourErrorCode.AUTH, err_str, False
            if "rate" in code_lower or "429" in code_lower:
                return MagicHourErrorCode.RATE_LIMIT, err_str, True
            if "concurrency" in code_lower or "limit" in code_lower:
                return MagicHourErrorCode.CONCURRENCY, err_str, True

    # 2. Check HTTP status codes (from httpx or ApiError)
    status_code = getattr(err, "status_code", None)
    if status_code is None and hasattr(err, "response"):
        status_code = getattr(err.response, "status_code", None)

    if status_code == 401 or status_code == 403:
        return MagicHourErrorCode.AUTH, f"HTTP {status_code}: Authentication or permission failed ({err_str})", False
    if status_code == 402:
        return MagicHourErrorCode.CREDITS, f"HTTP 402: Insufficient Magic Hour credits ({err_str})", False
    if status_code == 429:
        return MagicHourErrorCode.RATE_LIMIT, f"HTTP 429: Magic Hour rate limit reached ({err_str})", True
    if status_code and 500 <= status_code < 600:
        return MagicHourErrorCode.CONCURRENCY if "concurrency" in err_lower else MagicHourErrorCode.TIMEOUT, f"HTTP {status_code}: Magic Hour server error ({err_str})", True

    # 3. String keyword matching across exception text
    if "api_key" in err_lower or "unauthorized" in err_lower or "bearer" in err_lower or "auth" in err_lower:
        return MagicHourErrorCode.AUTH, err_str, False

    if "credit" in err_lower or "balance" in err_lower or "payment" in err_lower:
        return MagicHourErrorCode.CREDITS, err_str, False

    if "rate limit" in err_lower or "too many requests" in err_lower:
        return MagicHourErrorCode.RATE_LIMIT, err_str, True

    if "concurrency" in err_lower or "parallel" in err_lower or "busy" in err_lower:
        return MagicHourErrorCode.CONCURRENCY, err_str, True

    if "no face detected in source" in err_lower or "source face" in err_lower:
        return MagicHourErrorCode.NO_FACE_SOURCE, err_str, False

    if "no face detected" in err_lower or "face not found" in err_lower or "no_face" in err_lower:
        # Check if specified source vs target
        if "source" in err_lower:
            return MagicHourErrorCode.NO_FACE_SOURCE, err_str, False
        return MagicHourErrorCode.NO_FACE_TARGET, err_str, False

    if isinstance(err, (httpx.TimeoutException, TimeoutError)) or "timeout" in err_lower or "timed out" in err_lower:
        return MagicHourErrorCode.TIMEOUT, f"Request timed out: {err_str}", True

    if "download" in err_lower or "s3" in err_lower or "presigned" in err_lower or "failed to download" in err_lower:
        return MagicHourErrorCode.DOWNLOAD, f"Asset download error: {err_str}", True

    if isinstance(err, (FileNotFoundError, ValueError)) or "not found" in err_lower or "missing" in err_lower:
        return MagicHourErrorCode.MISSING_INPUT, err_str, False

    if isinstance(err, httpx.NetworkError) or "connection" in err_lower or "getaddrinfo" in err_lower or "dns" in err_lower:
        return MagicHourErrorCode.TIMEOUT, f"Network connection error: {err_str}", True

    return MagicHourErrorCode.UNKNOWN, err_str, False

