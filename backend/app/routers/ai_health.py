"""
Health check and diagnostics endpoint for Magic Hour integration.
"""
import os
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.config import settings
from app.database import get_db
from app.models import GeneratedAsset

router = APIRouter(prefix="/ai-health", tags=["AI Health"])


@router.get("/magic-hour")
def get_magic_hour_health(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Returns diagnostic metrics for Magic Hour face swap operations:
    - Configuration readiness (provider, key presence without leaking secret)
    - Concurrency and retry settings
    - Timestamp of last successful swap
    - Failure count by error_code in the last 24 hours
    """
    provider = (os.getenv("FACE_SWAP_PROVIDER", "") or getattr(settings, "FACE_SWAP_PROVIDER", "local")).strip().lower()
    key = (os.getenv("MAGIC_HOUR_API_KEY", "") or getattr(settings, "MAGIC_HOUR_API_KEY", "")).strip()
    is_key_present = bool(key and not key.startswith("your_"))

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    since_24h = now - timedelta(hours=24)

    # Provider matching expression handling both 'magic_hour' (underscore) and 'magic hour' (space)
    is_magic_hour_expr = or_(
        func.lower(GeneratedAsset.provider).contains("magic_hour"),
        func.lower(GeneratedAsset.provider).contains("magic hour"),
        func.lower(GeneratedAsset.provider).contains("magic")
    )

    # 1. Last successful generation
    last_success_asset = (
        db.query(GeneratedAsset)
        .filter(
            GeneratedAsset.generation_status == "completed",
            is_magic_hour_expr
        )
        .order_by(GeneratedAsset.created_at.desc())
        .first()
    )
    last_success_time: Optional[str] = (
        last_success_asset.created_at.isoformat() if (last_success_asset and last_success_asset.created_at) else None
    )

    # 2. Total completed in last 24h
    completed_count_24h = (
        db.query(func.count(GeneratedAsset.id))
        .filter(
            GeneratedAsset.generation_status == "completed",
            is_magic_hour_expr,
            GeneratedAsset.created_at >= since_24h,
        )
        .scalar()
        or 0
    )

    # 3. Failures in last 24 hours grouped by error_code
    failed_rows = (
        db.query(
            GeneratedAsset.error_code,
            func.count(GeneratedAsset.id).label("count")
        )
        .filter(
            GeneratedAsset.generation_status == "failed",
            GeneratedAsset.created_at >= since_24h,
        )
        .group_by(GeneratedAsset.error_code)
        .all()
    )

    failures_by_code: Dict[str, int] = {}
    total_failures_24h = 0
    for code, count in failed_rows:
        code_str = code or "UNKNOWN"
        failures_by_code[code_str] = count
        total_failures_24h += count

    # 4. Fallback count in last 24 hours
    fallbacks_count_24h = (
        db.query(func.count(GeneratedAsset.id))
        .filter(
            GeneratedAsset.used_fallback == True,  # noqa: E712
            GeneratedAsset.created_at >= since_24h,
        )
        .scalar()
        or 0
    )

    status = "healthy"
    if not is_key_present or provider != "magic_hour":
        status = "degraded" if getattr(settings, "ALLOW_LOCAL_FALLBACK", False) else "unconfigured"
    elif total_failures_24h > 0 and completed_count_24h == 0:
        status = "error"
    elif total_failures_24h > completed_count_24h:
        status = "degraded"

    return {
        "status": status,
        "provider_configured": provider,
        "is_magic_hour_active": (provider == "magic_hour"),
        "key_present": is_key_present,
        "allow_local_fallback": getattr(settings, "ALLOW_LOCAL_FALLBACK", False),
        "concurrency_limit": getattr(settings, "MAGIC_HOUR_MAX_CONCURRENCY", 1),
        "max_retries": getattr(settings, "MAGIC_HOUR_MAX_RETRIES", 3),
        "last_success_time": last_success_time,
        "stats_last_24h": {
            "completed": completed_count_24h,
            "failed": total_failures_24h,
            "fallbacks_used": fallbacks_count_24h,
            "failures_by_error_code": failures_by_code,
        },
    }

