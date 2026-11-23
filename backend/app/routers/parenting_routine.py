import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from app.database import get_db
from app.models import SiteSettings, User
from app.routers.auth import require_admin

router = APIRouter(tags=["Parenting Routine"])

class RoutineStage(BaseModel):
    id: str
    time: str
    start_hour: float  # e.g. 6.5 for 6:30 AM (0-24)
    end_hour: float    # e.g. 7.0 for 7:00 AM (0-24)
    activity: str
    parenting_idea: str
    category: str      # 'morning' | 'day' | 'evening' | 'night'
    icon: str
    character: str     # 'boy' | 'girl'

DEFAULT_ROUTINE: List[dict] = [
    {
        "id": "stage-1",
        "time": "6:30 – 7:00 AM",
        "start_hour": 6.5,
        "end_hour": 7.0,
        "activity": "Wake Up & Smile",
        "parenting_idea": "Hugs, gratitude and brushing teeth.",
        "category": "morning",
        "icon": "Sun",
        "character": "boy"
    },
    {
        "id": "stage-2",
        "time": "7:00 – 8:00 AM",
        "start_hour": 7.0,
        "end_hour": 8.0,
        "activity": "Healthy Morning",
        "parenting_idea": "Breakfast and getting ready.",
        "category": "morning",
        "icon": "Coffee",
        "character": "boy"
    },
    {
        "id": "stage-3",
        "time": "8:00 AM – 2:00 PM",
        "start_hour": 8.0,
        "end_hour": 14.0,
        "activity": "School & Learning",
        "parenting_idea": "Lessons, lunch and friendships.",
        "category": "day",
        "icon": "Backpack",
        "character": "boy"
    },
    {
        "id": "stage-4",
        "time": "2:00 – 3:00 PM",
        "start_hour": 14.0,
        "end_hour": 15.0,
        "activity": "Lunch & Relaxation",
        "parenting_idea": "Food, connection and quiet time.",
        "category": "day",
        "icon": "Utensils",
        "character": "boy"
    },
    {
        "id": "stage-5",
        "time": "3:00 – 4:00 PM",
        "start_hour": 15.0,
        "end_hour": 16.0,
        "activity": "Creative Time",
        "parenting_idea": "Art, puzzles and imaginative play.",
        "category": "day",
        "icon": "Palette",
        "character": "boy"
    },
    {
        "id": "stage-6",
        "time": "4:00 – 5:30 PM",
        "start_hour": 16.0,
        "end_hour": 17.5,
        "activity": "Outdoor Play",
        "parenting_idea": "Movement and active games.",
        "category": "evening",
        "icon": "Trees",
        "character": "girl"
    },
    {
        "id": "stage-7",
        "time": "5:30 – 6:30 PM",
        "start_hour": 17.5,
        "end_hour": 18.5,
        "activity": "Homework & Reading",
        "parenting_idea": "Learning with gentle support.",
        "category": "evening",
        "icon": "BookOpen",
        "character": "girl"
    },
    {
        "id": "stage-8",
        "time": "6:30 – 7:30 PM",
        "start_hour": 18.5,
        "end_hour": 19.5,
        "activity": "Family & Dinner",
        "parenting_idea": "Conversation and shared meals.",
        "category": "evening",
        "icon": "HeartHandshake",
        "character": "girl"
    },
    {
        "id": "stage-9",
        "time": "7:30 – 8:00 PM",
        "start_hour": 19.5,
        "end_hour": 20.0,
        "activity": "Bedtime Preparation",
        "parenting_idea": "Wash, brush teeth and wind down.",
        "category": "night",
        "icon": "Sparkles",
        "character": "girl"
    },
    {
        "id": "stage-10",
        "time": "8:00 – 8:30 PM",
        "start_hour": 20.0,
        "end_hour": 20.5,
        "activity": "KuttyStory Magic",
        "parenting_idea": "Read together and imagine.",
        "category": "night",
        "icon": "BookMarked",
        "character": "girl"
    },
    {
        "id": "stage-11",
        "time": "8:30 PM – 6:30 AM",
        "start_hour": 20.5,
        "end_hour": 30.5, # Overnights
        "activity": "Sweet Dreams",
        "parenting_idea": "10 hours of sleep.",
        "category": "night",
        "icon": "Moon",
        "character": "boy"
    },
]

SETTINGS_KEY = "parenting_routine_stages"

@router.get("/parenting-routine", response_model=List[dict])
@router.get("/api/parenting-routine", response_model=List[dict])
def get_parenting_routine(db: Session = Depends(get_db)):
    """Public endpoint to fetch the active parenting routine stages."""
    try:
        row = db.query(SiteSettings).filter(SiteSettings.key == SETTINGS_KEY).first()
        if not row or not row.value:
            return DEFAULT_ROUTINE
        items = json.loads(row.value)
        return items if isinstance(items, list) and len(items) > 0 else DEFAULT_ROUTINE
    except Exception as e:
        print(f"Error fetching parenting routine: {e}")
        return DEFAULT_ROUTINE

class RoutinePayload(BaseModel):
    stages: List[RoutineStage]

@router.put("/admin/parenting-routine")
@router.put("/api/admin/parenting-routine")
def update_parenting_routine(
    payload: RoutinePayload,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin endpoint to update the parenting routine stages."""
    try:
        row = db.query(SiteSettings).filter(SiteSettings.key == SETTINGS_KEY).first()
        serialized = json.dumps([s.dict() for s in payload.stages])
        if not row:
            row = SiteSettings(key=SETTINGS_KEY, value=serialized)
            db.add(row)
        else:
            row.value = serialized
        db.commit()
        return {"status": "ok", "message": "Parenting routine updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/admin/parenting-routine/reset-defaults")
@router.post("/api/admin/parenting-routine/reset-defaults")
def reset_parenting_routine(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin endpoint to reset to factory default routine stages."""
    try:
        row = db.query(SiteSettings).filter(SiteSettings.key == SETTINGS_KEY).first()
        serialized = json.dumps(DEFAULT_ROUTINE)
        if not row:
            row = SiteSettings(key=SETTINGS_KEY, value=serialized)
            db.add(row)
        else:
            row.value = serialized
        db.commit()
        return {"status": "ok", "message": "Reset to default routine stages"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

