import re
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.services.storage import storage
from app.database import get_db
from app.config import settings
from app.models import Feedback, User, PersonalizationJob
from app.routers.auth import verify_jwt_token

router = APIRouter(prefix="/storage", tags=["Storage"])

@router.get("/{category}/{filename:path}")
async def serve_file(
    category: str,
    filename: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Serve storage files securely directly from MinIO object storage.
    Streams media content (PNG, JPEG, WebP, PDF, MP4) with proper caching.
    Enforces authorization check for pending feedback media and final print PDFs.
    """
    # Security check for final_books (full print PDFs)
    if category == "final_books":
        auth_header = request.headers.get("Authorization", "")
        token_candidate = request.query_params.get("token", "")
        if not token_candidate and auth_header.startswith("Bearer "):
            token_candidate = auth_header.replace("Bearer ", "").strip()
        
        is_admin = False
        if token_candidate:
            try:
                payload = verify_jwt_token(token_candidate, settings.SECRET_KEY)
                u = db.query(User).filter(User.id == payload.get("sub"), User.role == "admin").first()
                if u:
                    is_admin = True
            except Exception:
                is_admin = False

        if not is_admin:
            # Check if this file belongs to a paid personalization job
            uuid_match = re.search(r"[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}", filename, re.IGNORECASE)
            if uuid_match:
                job_id = uuid_match.group(0)
                job = db.query(PersonalizationJob).filter(PersonalizationJob.id == job_id).first()
                if not job or not getattr(job, "is_paid", False):
                    raise HTTPException(
                        status_code=402,
                        detail="Payment required to access completed storybook PDF."
                    )
            else:
                raise HTTPException(
                    status_code=402,
                    detail="Payment verification required to access full print book."
                )

    # Security check for feedback_media
    if category == "feedback_media":
        matched_feedback = db.query(Feedback).filter(
            Feedback.media_url.like(f"%{filename}%")
        ).first()
        if matched_feedback and matched_feedback.status != "approved":
            auth_header = request.headers.get("Authorization", "")
            is_admin = False
            if auth_header and auth_header.startswith("Bearer "):
                try:
                    payload = verify_jwt_token(auth_header.replace("Bearer ", "").strip(), settings.SECRET_KEY)
                    u = db.query(User).filter(User.id == payload.get("sub"), User.role == "admin").first()
                    is_admin = bool(u)
                except Exception:
                    is_admin = False
            if not is_admin:
                raise HTTPException(
                    status_code=403,
                    detail="This media is awaiting admin approval before public access."
                )

    try:
        stream, media_type, content_length = storage.get_object_stream(category, filename)

        def iterfile():
            try:
                for chunk in stream.stream(32768):
                    yield chunk
            finally:
                stream.close()
                stream.release_conn()

        headers = {
            "Content-Length": str(content_length),
            "Cache-Control": "public, max-age=86400",
            "Accept-Ranges": "bytes",
        }

        return StreamingResponse(
            iterfile(),
            media_type=media_type,
            headers=headers
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"File not found in storage: {str(e)}")
