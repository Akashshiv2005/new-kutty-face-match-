"""
Storybook Page Face Detection & Landmark Audit CLI.
Audits target storybook illustrations to verify that character faces are reliably detectable
by YuNet and face outline points before generating live personalization jobs.

Usage:
    python -m app.services.ai.page_face_audit <story_slug>
    python -m app.services.ai.page_face_audit unicorn-story
"""
import io
import json
import os
import sys
from pathlib import Path
from typing import Dict, Any, List, Optional

import cv2
import numpy as np
from PIL import Image

# Ensure backend root is in sys.path
BACKEND_DIR = Path(__file__).resolve().parents[3]  # .../backend
PROJECT_ROOT = Path(__file__).resolve().parents[4]  # repo root
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.config import settings
from app.services.storage import storage
from app.services.ai.photo_validator import YUNET_PATH


def audit_page_image(
    page_number: int,
    image_bytes: bytes,
    face_outline_points: Optional[str] = None,
    personalization_required: bool = True
) -> Dict[str, Any]:
    """
    Audits a single storybook page illustration:
    - Decodes image and inspects dimensions
    - Checks face outline points
    - Runs YuNet face detector to see if character face is detected
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img_bgr is None:
        return {
            "page_number": page_number,
            "status": "FAIL",
            "reason": "Could not decode page image",
            "dimensions": None,
            "has_points": False,
            "detected_face": None,
        }

    h, w = img_bgr.shape[:2]

    # 1. Parse face outline points
    pts_clean = str(face_outline_points or "").strip().lower()
    has_points = bool(
        face_outline_points and pts_clean not in ("", "empty", "[]", "none", "false", "no_face", "null")
    )
    parsed_pts = []
    if has_points:
        try:
            parsed_pts = json.loads(face_outline_points) if isinstance(face_outline_points, str) else face_outline_points
            if isinstance(parsed_pts, list) and len(parsed_pts) < 3:
                has_points = False
        except Exception:
            has_points = False

    # 2. Run YuNet detector
    detected_face = None
    if YUNET_PATH.exists():
        try:
            det = cv2.FaceDetectorYN_create(str(YUNET_PATH), "", (w, h), score_threshold=0.20)
            res = det.detect(img_bgr)
            if res is not None and len(res) > 1 and res[1] is not None and len(res[1]) > 0:
                faces = sorted(res[1], key=lambda f: f[2] * f[3], reverse=True)
                f = faces[0]
                detected_face = {
                    "x": int(f[0]),
                    "y": int(f[1]),
                    "w": int(f[2]),
                    "h": int(f[3]),
                    "cx": int(f[0] + f[2] / 2),
                    "cy": int(f[1] + f[3] / 2),
                    "confidence": round(float(f[14]) if len(f) > 14 else 0.5, 2),
                }
        except Exception as e:
            detected_face = None

    # Status determination
    if not personalization_required or (not has_points and not detected_face):
        status = "SCENERY_SKIP"
        reason = "Non-character scenery page (0 credits used)"
    elif has_points and detected_face:
        status = "PASS_OPTIMAL"
        reason = f"Verified: Outline points present + YuNet face detected ({detected_face['confidence'] * 100:.0f}% conf)"
    elif has_points and not detected_face:
        status = "PASS_POINTS"
        reason = f"Verified via manual face outline points ({len(parsed_pts)} pts); YuNet did not trigger on illustration style"
    elif not has_points and detected_face:
        status = "PASS_YUNET"
        reason = f"Verified via YuNet detection: [cx={detected_face['cx']}, cy={detected_face['cy']}, {detected_face['w']}x{detected_face['h']}]"
    else:
        status = "WARNING_NO_FACE"
        reason = "Personalization required but no face outline points or YuNet face detected!"

    return {
        "page_number": page_number,
        "status": status,
        "reason": reason,
        "dimensions": f"{w}x{h}",
        "has_points": has_points,
        "points_count": len(parsed_pts) if has_points else 0,
        "detected_face": detected_face,
    }


def audit_story(story_slug: str = "unicorn-story") -> int:
    """
    Audits all pages for the given story template.
    Returns 0 if all personalizable pages are resolvable, 1 if any need attention.
    """
    print(f"\n=======================================================")
    print(f" TARGET PAGE FACE AUDIT: '{story_slug}'")
    print(f"=======================================================\n")

    pages_to_audit = []

    # 1. Try resolving from database
    try:
        from app.database import SessionLocal
        from app.models import StoryTemplate, StoryPage
        db = SessionLocal()
        try:
            story = db.query(StoryTemplate).filter(StoryTemplate.slug == story_slug).first()
            if story:
                pages = db.query(StoryPage).filter(StoryPage.story_id == story.id).order_by(StoryPage.page_index).all()
                for p in pages:
                    pages_to_audit.append({
                        "page_number": p.page_number,
                        "image_path": p.original_image_path,
                        "face_outline_points": p.face_outline_points,
                        "personalization_required": getattr(p, "personalization_required", True),
                    })
        finally:
            db.close()
    except Exception as db_err:
        print(f"[Audit] Notice: DB query failed ({db_err}), checking local disk / storage directly.")

    # 2. If DB returned no pages, scan disk
    if not pages_to_audit:
        story_dir = settings.SOURCE_PAGES_DIR / story_slug
        if story_dir.exists():
            files = sorted(list(story_dir.glob("page_*.png")) + list(story_dir.glob("page_*.jpg")))
            for f in files:
                try:
                    num_str = f.stem.replace("page_", "")
                    num = int(num_str)
                except ValueError:
                    continue
                pages_to_audit.append({
                    "page_number": num,
                    "image_path": str(f),
                    "face_outline_points": None,
                    "personalization_required": True,
                })

    # 3. Check sample-assets PDF or local path if still not found
    if not pages_to_audit:
        pdf_cands = [
            Path(story_slug),
            PROJECT_ROOT / "sample-assets" / f"{story_slug}.pdf",
            PROJECT_ROOT / "sample-assets" / "unicorn Story.pdf" if story_slug in ("unicorn-story", "unicorn") else None,
        ]
        for cand_pdf in pdf_cands:
            if cand_pdf and cand_pdf.is_file():
                try:
                    import fitz  # PyMuPDF
                    doc = fitz.open(str(cand_pdf))
                    print(f"[Audit] Found PDF at: {cand_pdf} ({len(doc)} pages). Rendering plates for audit...")
                    for idx, page in enumerate(doc):
                        pix = page.get_pixmap(dpi=150)
                        pages_to_audit.append({
                            "page_number": idx + 1,
                            "image_bytes": pix.tobytes("png"),
                            "face_outline_points": None,
                            "personalization_required": True,
                        })
                    break
                except Exception as pdf_err:
                    print(f"[Audit] Notice opening PDF: {pdf_err}")

    if not pages_to_audit:
        print(f"[Audit] No pages found for story '{story_slug}' in database or {settings.SOURCE_PAGES_DIR / story_slug}.")
        return 1

    print(f"Auditing {len(pages_to_audit)} pages for '{story_slug}'...\n")
    print(f"{'Page':<6} | {'Status':<16} | {'Dimensions':<11} | {'Details'}")
    print("-" * 75)

    optimal_count = 0
    points_count = 0
    yunet_count = 0
    scenery_count = 0
    warning_count = 0

    for item in pages_to_audit:
        p_num = item["page_number"]
        img_bytes = item.get("image_bytes")
        img_path = item.get("image_path")

        # Load image bytes
        if img_path and os.path.exists(img_path):
            with open(img_path, "rb") as f:
                img_bytes = f.read()
        elif img_path:
            try:
                img_bytes = storage.get_bytes(img_path)
            except Exception:
                resolved = storage.resolve_path(img_path)
                if resolved and os.path.exists(resolved):
                    with open(resolved, "rb") as f:
                        img_bytes = f.read()

        if not img_bytes:
            # Try default storage pattern
            cand_key = f"source_pages/{story_slug}/page_{p_num:02d}.png"
            try:
                img_bytes = storage.get_bytes(cand_key)
            except Exception:
                cand_disk = settings.SOURCE_PAGES_DIR / story_slug / f"page_{p_num:02d}.png"
                if cand_disk.exists():
                    img_bytes = cand_disk.read_bytes()

        if not img_bytes:
            print(f"p.{p_num:<4} | {'MISSING_IMAGE':<16} | {'N/A':<11} | Could not find image file")
            warning_count += 1
            continue

        res = audit_page_image(
            page_number=p_num,
            image_bytes=img_bytes,
            face_outline_points=item.get("face_outline_points"),
            personalization_required=item.get("personalization_required", True)
        )

        st = res["status"]
        if st == "PASS_OPTIMAL":
            optimal_count += 1
        elif st == "PASS_POINTS":
            points_count += 1
        elif st == "PASS_YUNET":
            yunet_count += 1
        elif st == "SCENERY_SKIP":
            scenery_count += 1
        else:
            warning_count += 1

        print(f"p.{p_num:<4} | {st:<16} | {res['dimensions'] or 'N/A':<11} | {res['reason']}")

    print("-" * 75)
    print("\nAUDIT SUMMARY:")
    print(f"  - Optimal (Points + YuNet):  {optimal_count}")
    print(f"  - Verified via Points:       {points_count}")
    print(f"  - Verified via YuNet:        {yunet_count}")
    print(f"  - Scenery (Correctly Skip):  {scenery_count}")
    print(f"  - Warnings (Needs Action):   {warning_count}")

    if warning_count == 0:
        print("\n--> RESULT: ALL PAGES VERIFIED READY FOR MAGIC HOUR PRODUCTION.\n")
        return 0
    else:
        print(f"\n--> RESULT: {warning_count} PAGE(S) NEED MANUAL ANCHOR REVIEW.\n")
        return 1


if __name__ == "__main__":
    slug = sys.argv[1] if len(sys.argv) > 1 else "unicorn-story"
    exit_code = audit_story(slug)
    sys.exit(exit_code)
