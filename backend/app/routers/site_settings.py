import json
import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from app.database import get_db
from app.models import SiteSettings, StoryTemplate, User
from app.routers.auth import require_admin

router = APIRouter(tags=["Site Settings"])

class NoticeItem(BaseModel):
    id: Optional[str] = None
    badge: Optional[str] = "SPECIAL NOTICE"
    text: str = ""
    link_label: Optional[str] = "Claim Offer"
    link_url: Optional[str] = "/storybooks"
    coupon_code: Optional[str] = ""

DEFAULT_ANNOUNCEMENT = {
    "is_active": True,
    "badge": "WELCOME OFFER",
    "text": "Get 20% off your child's first personalized storybook with code WELCOME20",
    "link_label": "Claim Offer",
    "link_url": "/storybooks",
    "coupon_code": "WELCOME20",
    "notices": [],
    "default_pdf_price": 799.0,
    "default_hardcover_price": 1399.0,
    "regional_language_surcharge": 99.0,
    "gift_wrap_fee": 20.0,
    "gift_wrap_enabled": True,
}

class AnnouncementPayload(BaseModel):
    is_active: bool = True
    badge: Optional[str] = "WELCOME OFFER"
    text: str = "Get 20% off your child's first personalized storybook with code WELCOME20"
    link_label: Optional[str] = "Claim Offer"
    link_url: Optional[str] = "/storybooks"
    coupon_code: Optional[str] = "WELCOME20"
    notices: Optional[List[NoticeItem]] = []
    default_pdf_price: Optional[float] = 799.0
    default_hardcover_price: Optional[float] = 1399.0
    regional_language_surcharge: Optional[float] = 99.0
    gift_wrap_fee: Optional[float] = 20.0
    gift_wrap_enabled: Optional[bool] = True

def _get_announcement_dict(db: Session) -> dict:
    try:
        row = db.query(SiteSettings).filter(SiteSettings.key == "announcement_bar").first()
        if not row:
            return dict(DEFAULT_ANNOUNCEMENT)
        data = json.loads(row.value)
        # Ensure all default keys exist
        merged = dict(DEFAULT_ANNOUNCEMENT)
        merged.update(data)
        return merged
    except Exception:
        return dict(DEFAULT_ANNOUNCEMENT)


@router.get("/settings/announcement")
def get_public_announcement(db: Session = Depends(get_db)):
    """Public endpoint to fetch current announcement bar state for customer website."""
    return _get_announcement_dict(db)


@router.put("/admin/settings/announcement")
def update_admin_announcement(
    payload: AnnouncementPayload,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin endpoint to update announcement bar state, message, and target link."""
    row = db.query(SiteSettings).filter(SiteSettings.key == "announcement_bar").first()
    data_to_store = payload.model_dump()
    json_str = json.dumps(data_to_store)

    if not row:
        row = SiteSettings(key="announcement_bar", value=json_str)
        db.add(row)
    else:
        row.value = json_str
        row.updated_at = datetime.datetime.utcnow()

    # Synchronize digital PDF price across all storybooks if updated
    if payload.default_pdf_price is not None and payload.default_pdf_price > 0:
        db.query(StoryTemplate).update({"price_digital": float(payload.default_pdf_price)})

    # Synchronize hardcover print price across all storybooks if updated
    if payload.default_hardcover_price is not None and payload.default_hardcover_price > 0:
        db.query(StoryTemplate).update({"price_print": float(payload.default_hardcover_price)})

    db.commit()
    db.refresh(row)
    return data_to_store

