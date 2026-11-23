import json
import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from app.database import get_db
from app.models import SiteSettings, StoryTemplate, User
from app.routers.auth import require_admin

router = APIRouter(tags=["Kutty's Story"])

# Default initial cartoon kid feedback stories — all referencing REAL books in this store
DEFAULT_KUTTYS_STORIES = [
    {
        "id": "ks-dino-aarav",
        "child_name": "Aarav S.",
        "child_age": "5 ¾ yrs",
        "child_title": "Chief T-Rex Whisperer 🦖",
        "city": "Chennai",
        "storybook_title": "Dinosaur",
        "storybook_slug": "dinosaur",
        "kid_quote": "Mommy that's literally ME on page 4 riding the big friendly dino for realsies!! I told my preschool teacher Miss Priya that I don't need nap time anymore because real dinosaur tamers stay awake to protect the playground. 1000000/10 stars, way better than broccoli!",
        "parent_note": "Mom note: He made us read it 14 times on day one and insisted on sleeping with his toy binoculars.",
        "avatar_preset": "cartoon_dino_boy",
        "avatar_url": "",
        "stars": 5,
        "rating_label": "1,000,000 / 10 ⭐",
        "badge": "🦖 Dino Tamer Certified",
        "accent_color": "#2E7D32",
        "is_active": True,
        "display_order": 1,
        "likes_count": 142
    },
    {
        "id": "ks-unicorn-ananya",
        "child_name": "Ananya M.",
        "child_age": "6 yrs",
        "child_title": "Queen of Sparkles & Rainbows 🦄",
        "city": "Bengaluru",
        "storybook_title": "The Girl and the Magical Unicorn",
        "storybook_slug": "unicorn-story",
        "kid_quote": "Wait wait wait... HOW did the magic horse know my real name?! My brother said it's computer magic but I know the unicorn secretly flew to Bengaluru at night and whispered to the book printer. I'm keeping this book forever until I'm eighty-hundred years old!",
        "parent_note": "Dad note: She gasped so loud when she saw her own face inside the unicorn garden! Pure magic.",
        "avatar_preset": "cartoon_unicorn_girl",
        "avatar_url": "",
        "stars": 5,
        "rating_label": "Infinity Stars ⭐✨",
        "badge": "🦄 Unicorn Royalty",
        "accent_color": "#8E24AA",
        "is_active": True,
        "display_order": 2,
        "likes_count": 189
    },
    {
        "id": "ks-moon-kabir",
        "child_name": "Kabir R.",
        "child_age": "4 ½ yrs",
        "child_title": "Moonbeam Astronaut Commander 🌙",
        "city": "Mumbai",
        "storybook_title": "The Moon Story",
        "storybook_slug": "the-moon-story",
        "kid_quote": "I sleep hugging this book super tight every single night so the closet monster knows I live on the moon now and I have a moon laser. Closet monster is super scared of the moon laser, hmph! Also the moon is made of cheese which I confirmed with my Papa.",
        "parent_note": "Mom note: Bedtime battles are officially over! He sprints to bed just to hold his book.",
        "avatar_preset": "cartoon_astronaut_boy",
        "avatar_url": "",
        "stars": 5,
        "rating_label": "Super Duper 5 ⭐",
        "badge": "🌙 Moonbeam Commander",
        "accent_color": "#1565C0",
        "is_active": True,
        "display_order": 3,
        "likes_count": 126
    },
    {
        "id": "ks-baker-meera",
        "child_name": "Meera K.",
        "child_age": "5 yrs",
        "child_title": "Master Cupcake Scientist 🧁",
        "city": "Kochi",
        "storybook_title": "Baking Story",
        "storybook_slug": "baking-story",
        "kid_quote": "The cartoon girl has my exact curly hair and my exact chocolate-eating smile!! I made Mommy make real cookies just like on page 12. Warning: book does not taste like real cookie (I licked page 7 to test it).",
        "parent_note": "Mom note: Yes, she really did lick page 7 to check if the frosting was real! We love this book so much.",
        "avatar_preset": "cartoon_baker_girl",
        "avatar_url": "",
        "stars": 5,
        "rating_label": "Yummy / 10 🧁",
        "badge": "🧁 Frosting Inspector",
        "accent_color": "#D81B60",
        "is_active": True,
        "display_order": 4,
        "likes_count": 164
    },
    {
        "id": "ks-doctor-vihaan",
        "child_name": "Vihaan D.",
        "child_age": "7 yrs",
        "child_title": "World's Smallest Real Doctor 🩺",
        "city": "Hyderabad",
        "storybook_title": "Doctor Story",
        "storybook_slug": "doctor-story",
        "kid_quote": "I am the doctor in this book so now I give health advice to the family. I told Thatha his back pain is because he doesn't eat enough biscuits, which is 100% medically correct. My diagnosis is very good. 5000000000 stars from Dr. Vihaan.",
        "parent_note": "Dad note: He now carries a toy stethoscope everywhere and insists on 'checking' everyone. Worth every rupee!",
        "avatar_preset": "cartoon_hero_boy",
        "avatar_url": "",
        "stars": 5,
        "rating_label": "5,000,000,000 ⭐",
        "badge": "🩺 Certified Tiny Doctor",
        "accent_color": "#E65100",
        "is_active": True,
        "display_order": 5,
        "likes_count": 210
    },
    {
        "id": "ks-nature-tara",
        "child_name": "Tara & Diya",
        "child_age": "4 & 6 yrs",
        "child_title": "Forest Ranger Sisters 🌿",
        "city": "Pune",
        "storybook_title": "Nature Explorer",
        "storybook_slug": "nature-explorer",
        "kid_quote": "We found the hidden butterfly on page 8 before even Daddy found it! Diya said she saw it first but actually I saw it first so I am the lead explorer and she is my helper assistant. We give this book infinity billion gazillion stars!",
        "parent_note": "Mom note: The sisterly bonding while pointing out every animal in the book was genuinely heartwarming. Best gift ever.",
        "avatar_preset": "cartoon_detective_girls",
        "avatar_url": "",
        "stars": 5,
        "rating_label": "Infinity Billion ⭐",
        "badge": "🌿 Chief Nature Rangers",
        "accent_color": "#00838F",
        "is_active": True,
        "display_order": 6,
        "likes_count": 178
    }
]

class KuttysStoryModel(BaseModel):
    id: Optional[str] = None
    child_name: str
    child_age: str
    child_title: Optional[str] = "Storybook Hero ✨"
    city: Optional[str] = ""
    storybook_title: Optional[str] = "My Personalized Story"
    storybook_slug: Optional[str] = ""
    kid_quote: str
    parent_note: Optional[str] = ""
    avatar_preset: Optional[str] = "cartoon_dino_boy"
    avatar_url: Optional[str] = ""
    stars: Optional[int] = 5
    rating_label: Optional[str] = "1,000,000 / 10 ⭐"
    badge: Optional[str] = "✨ Little Hero"
    accent_color: Optional[str] = "#C98A84"
    is_active: Optional[bool] = True
    display_order: Optional[int] = 0
    likes_count: Optional[int] = 0

def _load_stories_from_db(db: Session) -> List[dict]:
    row = db.query(SiteSettings).filter(SiteSettings.key == "kuttys_stories").first()
    if not row or not row.value:
        # Seed defaults
        initial_json = json.dumps(DEFAULT_KUTTYS_STORIES)
        if not row:
            row = SiteSettings(key="kuttys_stories", value=initial_json)
            db.add(row)
        else:
            row.value = initial_json
        db.commit()
        return list(DEFAULT_KUTTYS_STORIES)
    try:
        data = json.loads(row.value)
        if isinstance(data, list):
            return data
        return list(DEFAULT_KUTTYS_STORIES)
    except Exception:
        return list(DEFAULT_KUTTYS_STORIES)

def _save_stories_to_db(db: Session, stories: List[dict]):
    row = db.query(SiteSettings).filter(SiteSettings.key == "kuttys_stories").first()
    json_str = json.dumps(stories)
    if not row:
        row = SiteSettings(key="kuttys_stories", value=json_str)
        db.add(row)
    else:
        row.value = json_str
        row.updated_at = datetime.datetime.utcnow()
    db.commit()

@router.get("/kuttys-stories")
def get_public_kuttys_stories(db: Session = Depends(get_db)):
    """Public endpoint to fetch all active Kutty's stories for storefront."""
    stories = _load_stories_from_db(db)
    active = [s for s in stories if s.get("is_active", True)]
    active.sort(key=lambda x: x.get("display_order", 0))
    return active

@router.post("/kuttys-stories/{story_id}/like")
def like_kuttys_story(story_id: str, db: Session = Depends(get_db)):
    """Increment love / like reaction for a child's story."""
    stories = _load_stories_from_db(db)
    found = False
    for s in stories:
        if s.get("id") == story_id:
            s["likes_count"] = (s.get("likes_count") or 0) + 1
            found = True
            break
    if found:
        _save_stories_to_db(db, stories)
        return {"status": "ok", "message": "Heart added!"}
    raise HTTPException(status_code=404, detail="Story not found")

@router.get("/admin/kuttys-stories")
def get_admin_kuttys_stories(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Admin endpoint to fetch all Kutty's stories including drafts/hidden."""
    stories = _load_stories_from_db(db)
    stories.sort(key=lambda x: x.get("display_order", 0))
    return stories

@router.post("/admin/kuttys-stories")
def create_kuttys_story(story: KuttysStoryModel, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Admin endpoint to add a new child feedback story."""
    stories = _load_stories_from_db(db)
    new_data = story.model_dump()
    if not new_data.get("id"):
        new_data["id"] = f"ks-{uuid.uuid4().hex[:8]}"
    if not new_data.get("display_order"):
        new_data["display_order"] = len(stories) + 1
    if new_data.get("likes_count") is None:
        new_data["likes_count"] = 50
    stories.append(new_data)
    _save_stories_to_db(db, stories)
    return new_data

@router.put("/admin/kuttys-stories/{story_id}")
def update_kuttys_story(story_id: str, story: KuttysStoryModel, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Admin endpoint to update a child feedback story."""
    stories = _load_stories_from_db(db)
    updated_item = None
    for i, s in enumerate(stories):
        if s.get("id") == story_id:
            data = story.model_dump()
            data["id"] = story_id
            stories[i] = data
            updated_item = data
            break
    if not updated_item:
        raise HTTPException(status_code=404, detail="Story not found")
    _save_stories_to_db(db, stories)
    return updated_item

@router.delete("/admin/kuttys-stories/{story_id}")
def delete_kuttys_story(story_id: str, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Admin endpoint to delete a child feedback story."""
    stories = _load_stories_from_db(db)
    initial_len = len(stories)
    stories = [s for s in stories if s.get("id") != story_id]
    if len(stories) == initial_len:
        raise HTTPException(status_code=404, detail="Story not found")
    _save_stories_to_db(db, stories)
    return {"status": "success", "message": "Story deleted"}

@router.post("/admin/kuttys-stories/reset-defaults")
def reset_kuttys_stories_to_defaults(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Admin endpoint to restore factory default Kutty's stories."""
    _save_stories_to_db(db, list(DEFAULT_KUTTYS_STORIES))
    return {"status": "success", "message": "Restored default stories", "stories": DEFAULT_KUTTYS_STORIES}

@router.get("/admin/kuttys-stories-books")
def list_available_books(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Admin helper: returns all published storybooks (title + slug) so the admin modal can show a real dropdown."""
    books = db.query(StoryTemplate.title, StoryTemplate.slug, StoryTemplate.category).filter(
        StoryTemplate.status.in_(["published", "live", "active"])
    ).order_by(StoryTemplate.title).all()
    if not books:
        # Fallback: return all books regardless of status
        books = db.query(StoryTemplate.title, StoryTemplate.slug, StoryTemplate.category).order_by(StoryTemplate.title).all()
    return [{"title": b.title, "slug": b.slug, "category": b.category} for b in books]

