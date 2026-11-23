from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import StoryTemplate, StoryPage
from app.schemas import StoryTemplateOut, StoryPageOut
from app.services.storage import storage
from app.routers.site_settings import _get_announcement_dict

router = APIRouter(prefix="/stories", tags=["Stories"])

def enrich_story_urls(story: StoryTemplate, default_pdf_override: float = None, default_hardcover_override: float = None) -> dict:
    cover_url = storage.get_public_url(story.cover_image_path)
    if not cover_url and story.pages:
        for page in sorted(story.pages, key=lambda p: p.page_index):
            if page.original_image_path:
                cand = storage.get_public_url(page.original_image_path)
                if cand:
                    cover_url = cand
                    break

    effective_digital_price = story.price_digital if story.price_digital is not None else (default_pdf_override or 799.0)
    effective_print_price = story.price_print if story.price_print is not None else (default_hardcover_override or 1399.0)

    data = {
        "id": story.id,
        "slug": story.slug,
        "title": story.title,
        "description": story.description,
        "category": story.category,
        "age_range": story.age_range,
        "language": story.language,
        "price_digital": effective_digital_price,
        "price_print": effective_print_price,
        "currency": story.currency,
        "status": story.status,
        "page_count": story.page_count,
        "cover_image_path": story.cover_image_path,
        "cover_image_url": cover_url,
        "hardcover_cover_image_path": getattr(story, "hardcover_cover_image_path", None),
        "hardcover_cover_image_url": storage.get_public_url(getattr(story, "hardcover_cover_image_path", None)) if getattr(story, "hardcover_cover_image_path", None) else None,
        "hardcover_cover_face_points": getattr(story, "hardcover_cover_face_points", "") or "",
        "target_gender": getattr(story, "target_gender", "both") or "both",
        "min_age": getattr(story, "min_age", 2) or 2,
        "max_age": getattr(story, "max_age", 13) or 13,
        "highlight": getattr(story, "highlight", None),
        "in_hero_carousel": bool(getattr(story, "in_hero_carousel", False)),
        "created_at": story.created_at,
        "updated_at": story.updated_at,
        "pages": []
    }
    for page in sorted(story.pages, key=lambda p: p.page_index):
        data["pages"].append({
            "id": page.id,
            "story_id": page.story_id,
            "page_index": page.page_index,
            "page_number": page.page_number,
            "page_type": page.page_type,
            "story_text": page.story_text,
            "translations": getattr(page, "translations", "{}") or "{}",
            "extracted_text": page.extracted_text,
            "scene_description": page.scene_description,
            "character_guidance": page.character_guidance,
            "prompt_template": page.prompt_template,
            "personalization_required": page.personalization_required,
            "allow_illustration_generation": page.allow_illustration_generation,
            "original_image_path": page.original_image_path,
            "original_image_url": storage.get_public_url(page.original_image_path),
            "face_outline_points": getattr(page, "face_outline_points", "") or "",
            "text_x": getattr(page, "text_x", 50.0) if getattr(page, "text_x", None) is not None else 50.0,
            "text_y": getattr(page, "text_y", 89.5) if getattr(page, "text_y", None) is not None else 89.5,
            "font_size": getattr(page, "font_size", 15) or 15,
            "font_family": getattr(page, "font_family", "Sans (DejaVu Bold)") or "Sans (DejaVu Bold)",
            "font_color": getattr(page, "font_color", "#000000") or "#000000",
            "letter_spacing": getattr(page, "letter_spacing", 0) or 0,
            "stroke_color": getattr(page, "stroke_color", "#FFFFFF") or "#FFFFFF",
            "stroke_width": getattr(page, "stroke_width", 0) if getattr(page, "stroke_width", None) is not None else 0,
            "has_shadow": getattr(page, "has_shadow", False) if getattr(page, "has_shadow", None) is not None else False,
            "soft_line_break": getattr(page, "soft_line_break", True) if getattr(page, "soft_line_break", None) is not None else True,
            "has_background_box": getattr(page, "has_background_box", True) if getattr(page, "has_background_box", None) is not None else True,
            "box_layout": getattr(page, "box_layout", "banner") or "banner",
            "box_bg_color": getattr(page, "box_bg_color", "#FAF4E6") or "#FAF4E6",
            "box_border_color": getattr(page, "box_border_color", "#E8DEC8") or "#E8DEC8",
            "box_border_width": getattr(page, "box_border_width", 1) if getattr(page, "box_border_width", None) is not None else 1,
            "box_border_radius": getattr(page, "box_border_radius", 16) if getattr(page, "box_border_radius", None) is not None else 16,
            "box_bg_opacity": getattr(page, "box_bg_opacity", 0.90) if getattr(page, "box_bg_opacity", None) is not None else 0.90,
            "text_align": getattr(page, "text_align", "center") or "center",
            "warp_style": getattr(page, "warp_style", "None") or "None",
            "gender_variant": getattr(page, "gender_variant", "boy") or "boy",
        })
    return data

@router.get("", response_model=List[StoryTemplateOut])
def list_stories(db: Session = Depends(get_db)):
    announcement = _get_announcement_dict(db)
    default_pdf = float(announcement.get("default_pdf_price") or 799.0)
    default_hardcover = float(announcement.get("default_hardcover_price") or 1399.0)
    stories = (
        db.query(StoryTemplate)
        .filter(StoryTemplate.status == "published")
        .order_by(StoryTemplate.created_at.desc())
        .all()
    )
    return [enrich_story_urls(s, default_pdf_override=default_pdf, default_hardcover_override=default_hardcover) for s in stories]

@router.get("/{slug_or_id}", response_model=StoryTemplateOut)
def get_story(slug_or_id: str, db: Session = Depends(get_db)):
    story = db.query(StoryTemplate).filter(
        (StoryTemplate.slug == slug_or_id) | (StoryTemplate.id == slug_or_id)
    ).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    announcement = _get_announcement_dict(db)
    default_pdf = float(announcement.get("default_pdf_price") or 799.0)
    default_hardcover = float(announcement.get("default_hardcover_price") or 1399.0)
    return enrich_story_urls(story, default_pdf_override=default_pdf, default_hardcover_override=default_hardcover)
