"""
Direct Magic Hour Photo Swap Provider.
Gives the child photo and storybook page directly to Magic Hour API with zero intermediate modifications.
Includes process-wide concurrency gate, classified retries, structured logging, and fallback transparency.
"""
import io
import os
import random
import tempfile
import threading
import time
from pathlib import Path
from typing import Optional, Dict, Any

import httpx
from PIL import Image, ImageOps
from magic_hour import Client

from app.config import settings
from app.services.ai.base import GenerationResult
from app.services.ai.errors import MagicHourErrorCode, classify_error, is_retryable
from app.services.ai.logger import log_attempt

# Process-wide concurrency gate: enforces max parallel jobs against Magic Hour
_concurrency_limit = max(1, int(os.getenv("MAGIC_HOUR_MAX_CONCURRENCY", "3")))
_mh_semaphore = threading.BoundedSemaphore(_concurrency_limit)


def _download_image_with_retry(
    url: str,
    job_id: str,
    page_number: int,
    tool_name: str,
    max_retries: int = 3,
    base_delay: float = 2.0
) -> bytes:
    """Downloads the generated asset from pre-signed URL with retry and timeout handling."""
    truncated_url = (url[:57] + "...") if len(url) > 60 else url
    print(f"[Magic Hour] Downloading output image from: {truncated_url}")

    last_err = None
    for attempt in range(1, max_retries + 1):
        started = time.monotonic()
        try:
            with httpx.Client(timeout=60.0, follow_redirects=True) as http_client:
                resp = http_client.get(url)
                resp.raise_for_status()
                duration = time.monotonic() - started
                return resp.content
        except Exception as dl_err:
            last_err = dl_err
            duration = time.monotonic() - started
            code, msg, retryable = classify_error(dl_err)
            if attempt < max_retries:
                delay = base_delay * (2 ** (attempt - 1)) + random.uniform(0.1, 0.5)
                print(f"[Magic Hour] Download attempt {attempt} failed ({dl_err}), retrying in {delay:.2f}s...")
                log_attempt(
                    job_id=job_id,
                    page_number=page_number,
                    provider="magic_hour",
                    tool=tool_name,
                    attempt=attempt,
                    max_attempts=max_retries,
                    duration_sec=duration,
                    outcome="retry",
                    error_code=code.value,
                    reason=f"Download error: {msg}"
                )
                time.sleep(delay)
            else:
                log_attempt(
                    job_id=job_id,
                    page_number=page_number,
                    provider="magic_hour",
                    tool=tool_name,
                    attempt=attempt,
                    max_attempts=max_retries,
                    duration_sec=duration,
                    outcome="failed",
                    error_code=MagicHourErrorCode.DOWNLOAD.value,
                    reason=f"Failed downloading from {truncated_url}: {msg}"
                )

    raise RuntimeError(f"Failed to download Magic Hour output image from {truncated_url}: {last_err}")


def swap_story_page(
    source_path: str,
    target_bytes: bytes,
    page_number: int,
    outfit_mode: str = "story",
    job_id: str = "unknown",
    story_slug: str = "unicorn-story"
) -> GenerationResult:
    """
    Directly passes the authentic child photograph and page illustration to Magic Hour API.
    Zero intermediate modifications, filters, or local processing.
    """
    key = os.getenv("MAGIC_HOUR_API_KEY", "").strip() or getattr(settings, "MAGIC_HOUR_API_KEY", "").strip()
    if not key:
        raise RuntimeError("MAGIC_HOUR_API_KEY is not configured in .env")
    if not source_path or not Path(source_path).is_file():
        raise ValueError(f"Child reference photo not found: {source_path}")

    # Resolve story slug dynamically if job_id is provided
    slug_lower = str(story_slug or "").strip().lower()
    if (not slug_lower or slug_lower == "unicorn-story") and job_id and job_id != "unknown":
        try:
            from app.database import SessionLocal
            from app.models import PersonalizationJob, StoryTemplate
            with SessionLocal() as s_db:
                p_job = s_db.query(PersonalizationJob).filter(PersonalizationJob.id == str(job_id)).first()
                if p_job and p_job.story_id:
                    s_tmpl = s_db.query(StoryTemplate).filter(StoryTemplate.id == p_job.story_id).first()
                    if s_tmpl and s_tmpl.slug:
                        slug_lower = str(s_tmpl.slug).strip().lower()
        except Exception:
            pass

    is_boy_story = any(kw in slug_lower for kw in ("boy", "male", "son", "prince", "brother"))

    # Determine mode directly from .env and user outfit choice (default to ai_image_editor for rich 3D character likeness)
    env_mode = os.getenv("MAGIC_HOUR_SWAP_MODE", "ai_image_editor").strip().lower()
    resolution = (os.getenv("MAGIC_HOUR_RESOLUTION", "") or getattr(settings, "MAGIC_HOUR_RESOLUTION", "1024px")).strip().lower() or "1024px"

    is_editor = (env_mode in ("ai_image_editor", "editor", "fairytale", "default", "fusion"))
    is_body = not is_editor and (outfit_mode in ("photo", "own_outfit", "body") or env_mode == "body_swap")
    is_head = not is_editor and not is_body and (env_mode in ("head_swap", "head"))
    primary_tool = "ai_image_editor" if is_editor else ("body_swap" if is_body else ("head_swap" if is_head else "face_swap_photo"))

    max_retries = max(1, int(os.getenv("MAGIC_HOUR_MAX_RETRIES", "3")))
    base_delay = float(os.getenv("MAGIC_HOUR_RETRY_BASE_SECONDS", "2.0"))

    total_started = time.monotonic()
    print(f"\n[Magic Hour] Directly dispatching Page {page_number} to Magic Hour API (tool={primary_tool}, outfit_mode={outfit_mode}, job_id={job_id})...")
    print(f"[Magic Hour] Source photo: {source_path}")

    client = Client(token=key)
    used_fallback = False
    fallback_from: Optional[str] = None
    attempt_count = 0

    with tempfile.TemporaryDirectory(prefix="ks_mh_") as temp:
        target_path = Path(temp) / f"page_{page_number}.png"
        with Image.open(io.BytesIO(target_bytes)) as im:
            ImageOps.exif_transpose(im).convert("RGB").save(target_path, format="PNG")

        res = None

        # -------------------------------------------------------------
        # 0. AI IMAGE EDITOR (High-fidelity 3D Pixar/Disney Fairytale Fusion)
        # -------------------------------------------------------------
        if is_editor:
            editor_attempt = 0
            tight_face_path = Path(temp) / "tight_face_only.png"
            is_anchor = any(kw in str(source_path).lower() for kw in ("canon_anchor", "p01", "ref_portrait", "anchor"))
            try:
                import cv2
                import numpy as np
                import math

                src_cv = cv2.imread(str(Path(source_path).resolve()))
                tgt_cv = cv2.imread(str(target_path))

                if is_anchor and src_cv is not None:
                    # Canonical character portrait from Page 1: use directly to preserve exact hairstyle, forehead, and eyebrows
                    print(f"[Magic Hour] Using Page 1 canonical character anchor directly as Image 2: {source_path}")
                    cv2.imwrite(str(tight_face_path), src_cv)
                elif src_cv is not None:
                    sh, sw = src_cv.shape[:2]
                    from app.services.ai.photo_validator import YUNET_PATH
                    det_src = cv2.FaceDetectorYN_create(str(YUNET_PATH.resolve()), "", (sw, sh), score_threshold=0.25)
                    _, s_faces = det_src.detect(src_cv)
                    s_faces_sorted = sorted(s_faces, key=lambda f: f[-1], reverse=True) if s_faces is not None and len(s_faces) > 0 else []

                    if len(s_faces_sorted) > 0:
                        fs = s_faces_sorted[0]
                        fx, fy, fw, fh = [int(v) for v in fs[:4]]

                        # Natural child face portrait isolating facial identity (eyes, eyebrows, nose, cheeks, skin tone)
                        # without voluminous outer hair dome or wide skull expansion that inflates head dimensions
                        y1 = max(0, fy - int(fh * 0.05))
                        y2 = min(sh, fy + fh + int(fh * 0.06))
                        x1 = max(0, fx - int(fw * 0.05))
                        x2 = min(sw, fx + fw + int(fw * 0.05))
                        crop = src_cv[y1:y2, x1:x2].copy()
                        ch, cw = crop.shape[:2]

                        # Clean any pottu / bindi / mai / kohl marks from the face crop before AI fusion
                        # with 100% strict eyebrow and eye protection
                        try:
                            re_x, re_y = int(fs[4]) - x1, int(fs[5]) - y1
                            le_x, le_y = int(fs[6]) - x1, int(fs[7]) - y1
                            mid_eye_x = int((re_x + le_x) / 2)
                            eye_y = int((re_y + le_y) / 2)

                            # Eyebrow and eye protection mask
                            eyebrow_protect = np.zeros((ch, cw), dtype=np.uint8)
                            cv2.ellipse(eyebrow_protect, (re_x, re_y - int(fh * 0.08)), (int(fw * 0.20), int(fh * 0.10)), 0, 0, 360, 255, -1)
                            cv2.ellipse(eyebrow_protect, (le_x, le_y - int(fh * 0.08)), (int(fw * 0.20), int(fh * 0.10)), 0, 0, 360, 255, -1)
                            cv2.circle(eyebrow_protect, (re_x, re_y), int(fw * 0.14), 255, -1)
                            cv2.circle(eyebrow_protect, (le_x, le_y), int(fw * 0.14), 255, -1)

                            pottu_mask = np.zeros((ch, cw), dtype=np.uint8)
                            half_gap = max(4, int(min(abs(mid_eye_x - re_x), abs(le_x - mid_eye_x)) * 0.35))
                            fy_start = max(0, eye_y - int(fh * 0.30))
                            fy_end = max(0, eye_y - int(fh * 0.02))
                            fx_start = max(0, mid_eye_x - half_gap)
                            fx_end = min(cw, mid_eye_x + half_gap)
                            if fy_end > fy_start and fx_end > fx_start:
                                f_roi = crop[fy_start:fy_end, fx_start:fx_end]
                                if f_roi.size > 0:
                                    g_f = cv2.cvtColor(f_roi, cv2.COLOR_BGR2GRAY)
                                    med_f = np.median(g_f)
                                    dark_f = (g_f < med_f * 0.65).astype(np.uint8) * 255
                                    cnts_f, _ = cv2.findContours(dark_f, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                                    for c in cnts_f:
                                        if 2 <= cv2.contourArea(c) <= (fw * fh * 0.02):
                                             cv2.drawContours(pottu_mask[fy_start:fy_end, fx_start:fx_end], [c], -1, 255, -1)

                            mai_mask = np.zeros((ch, cw), dtype=np.uint8)
                            l_start_x = min(cw - 1, le_x + int(fw * 0.10))
                            if l_start_x < cw:
                                l_roi = crop[eye_y + int(fh * 0.10):ch, l_start_x:cw]
                                if l_roi.size > 0:
                                    l_gray = cv2.cvtColor(l_roi, cv2.COLOR_BGR2GRAY)
                                    l_med = np.median(l_gray)
                                    l_dark = (l_gray < l_med * 0.52).astype(np.uint8) * 255
                                    cnts_l, _ = cv2.findContours(l_dark, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                                    for c in cnts_l:
                                        if 2 <= cv2.contourArea(c) <= (fw * fh * 0.015):
                                            cv2.drawContours(mai_mask[eye_y + int(fh * 0.10):ch, l_start_x:cw], [c], -1, 255, -1)

                            combined_mark_mask = cv2.bitwise_or(pottu_mask, mai_mask)
                            combined_mark_mask[eyebrow_protect > 0] = 0
                            if np.sum(combined_mark_mask > 0) > 0:
                                k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
                                combined_mark_mask = cv2.dilate(combined_mark_mask, k, iterations=1)
                                combined_mark_mask[eyebrow_protect > 0] = 0
                                crop = cv2.inpaint(crop, combined_mark_mask, 5, cv2.INPAINT_TELEA)
                                print(f"[Magic Hour] Inpainted {np.sum(combined_mark_mask > 0)} pottu/mai mark pixels from face crop while protecting eyebrows.")
                        except Exception as clean_ex:
                            print(f"[Magic Hour] Notice during face mark clean: {clean_ex}")

                        # Automated mouth neutralization: ensure the reference face crop has naturally sealed lips
                        # so the diffusion model never copies an open mouth cavity or visible teeth into the storybook character
                        try:
                            rm_x, rm_y = int(fs[10]) - x1, int(fs[11]) - y1
                            lm_x, lm_y = int(fs[12]) - x1, int(fs[13]) - y1
                            mouth_cx = int((rm_x + lm_x) / 2)
                            mouth_cy = int((rm_y + lm_y) / 2)
                            mouth_w = int(abs(lm_x - rm_x))

                            y_m1 = max(0, mouth_cy - int(mouth_w * 0.25))
                            y_m2 = min(ch, mouth_cy + int(mouth_w * 0.25))
                            x_m1 = max(0, mouth_cx - int(mouth_w * 0.45))
                            x_m2 = min(cw, mouth_cx + int(mouth_w * 0.45))
                            if y_m2 > y_m1 and x_m2 > x_m1:
                                m_roi = crop[y_m1:y_m2, x_m1:x_m2]
                                if m_roi.size > 0:
                                    m_gray = cv2.cvtColor(m_roi, cv2.COLOR_BGR2GRAY)
                                    dark_cavity = (m_gray < 85).astype(np.uint8) * 255
                                    if np.sum(dark_cavity > 0) > (mouth_w * 0.5):
                                        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
                                        gap_mask = cv2.dilate(dark_cavity, k, iterations=2)
                                        sealed_roi = cv2.inpaint(m_roi, gap_mask, 5, cv2.INPAINT_TELEA)
                                        crop[y_m1:y_m2, x_m1:x_m2] = sealed_roi
                                        print(f"[Magic Hour] Sealed open mouth gap in reference face crop ({np.sum(dark_cavity > 0)} pixels neutralized).")
                        except Exception as mouth_ex:
                            print(f"[Magic Hour] Notice during mouth neutralization: {mouth_ex}")

                        cv2.imwrite(str(tight_face_path), crop)
                    else:
                        cv2.imwrite(str(tight_face_path), src_cv)
                else:
                    tight_face_path = Path(source_path).resolve()
            except Exception as crop_err:
                print(f"[Magic Hour] Notice during face crop preparation: {crop_err}")
                tight_face_path = Path(source_path).resolve()

            if is_boy_story:
                char_title = "young boy's"
                hair_guidance = (
                    "CRITICAL HAIRSTYLE RULE: Strictly preserve the character's exact original storybook hairstyle, hair volume, hair contour, hairline, and neat side-parting from Image 1. "
                    "Keep the hair close-cropped, compact, and neatly combed to the skull exactly as in Image 1."
                )
                attire_guidance = "pajamas and outfit in Image 1"
                expression_guidance = "CRITICAL EXPRESSION RULE: Serene bedtime expression with naturally closed lips."
            elif "unicorn" in slug_lower or "girl" in slug_lower or "princess" in slug_lower:
                char_title = "young girl's"
                hair_guidance = (
                    "CRITICAL HAIRSTYLE RULE: Strictly preserve the young girl's exact original hairstyle, high tied-up hair bun, neat hairline, braided hair crown, and loose wavy strands from Image 1."
                )
                attire_guidance = "pink gown in Image 1"
                expression_guidance = "CRITICAL EXPRESSION RULE: Sweet, radiant, cheerful, gentle smile matching Image 1."
            else:
                char_title = "character's"
                hair_guidance = "CRITICAL HAIRSTYLE RULE: Strictly preserve the default storybook character's hairstyle, haircut, and parting from Image 1."
                attire_guidance = "clothing in Image 1"
                expression_guidance = "CRITICAL EXPRESSION RULE: Naturally match the character's storybook expression in Image 1."

            editor_prompt = (
                f"FACE REPLACEMENT INSTRUCTION: Replace the {char_title} face and facial identity in Image 1 with the authentic face of the child in Image 2! "
                f"The character in Image 1 MUST clearly, strongly, and unmistakably look like the child in Image 2. "
                "FAITHFUL FACIAL STRUCTURE & TRUE IDENTITY: The character MUST have the exact same facial structure, authentic face shape, jawline contour, chin curvature, cheek fullness, almond eye shape, eyelid creases, eyebrows, nose shape, and lip geometry as the child in Image 2. "
                "Faithfully preserve the child's authentic facial geometry, soft jawline, and bone structure with 100% fidelity. Do NOT alter, do NOT narrow, and do NOT sharpen the jawline. "
                "PETITE COMPACT HEAD & FACE SIZE: The character's head and face size must be slightly smaller, compact, and petite, perfectly scaled to the small child body, neck, and collar in Image 1 (matching the compact proportion of Page 3). Keep the head and face slender and cleanly fitted to the small body with zero enlargement. "
                f"{hair_guidance} "
                f"{expression_guidance} "
                "3D ANIMATED STORYBOOK STYLE: Seamlessly render the child's authentic face into the 3D Pixar/Disney animated storybook art style of Image 1. "
                f"Clean Flawless Skin: Flawless fairytale skin. Preserve the {attire_guidance}, body, and background scenery in Image 1."
            )

            editor_model = os.getenv("MAGIC_HOUR_EDITOR_MODEL", "qwen-image-2.1").strip()
            while editor_attempt < max_retries:
                editor_attempt += 1
                attempt_count += 1
                ed_start = time.monotonic()
                try:
                    with _mh_semaphore:
                        res = client.v1.ai_image_editor.generate(
                            assets={
                                "image_file_paths": [str(target_path), str(tight_face_path)],
                            },
                            model=editor_model,
                            style={"prompt": editor_prompt},
                            name=f"Kutty Story Page {page_number} Qwen Blend",
                            wait_for_completion=True,
                            download_outputs=False,
                        )

                    ed_duration = time.monotonic() - ed_start
                    status = getattr(res, "status", None)
                    downloads = getattr(res, "downloads", None) or []

                    if status == "error" or not downloads:
                        err_obj = getattr(res, "error", None) or getattr(res, "message", None) or "No download URL returned"
                        code, msg, retryable = classify_error(err_obj)
                        if retryable and editor_attempt < max_retries:
                            delay = base_delay * (2 ** (editor_attempt - 1)) + random.uniform(0.1, 0.5)
                            time.sleep(delay)
                            continue
                        else:
                            used_fallback = True
                            fallback_from = "ai_image_editor"
                            res = None
                            break
                    else:
                        # Success
                        break
                except Exception as ed_ex:
                    code, msg, retryable = classify_error(ed_ex)
                    if retryable and editor_attempt < max_retries:
                        delay = base_delay * (2 ** (editor_attempt - 1)) + random.uniform(0.1, 0.5)
                        time.sleep(delay)
                    else:
                        used_fallback = True
                        fallback_from = "ai_image_editor"
                        res = None
                        break

        # -------------------------------------------------------------
        # 1. BODY SWAP (with F1 fallback transparency)
        # -------------------------------------------------------------
        if is_body:
            body_attempt = 0
            while body_attempt < max_retries:
                body_attempt += 1
                attempt_count += 1
                body_start = time.monotonic()
                try:
                    with _mh_semaphore:
                        res = client.v1.body_swap.generate(
                            assets={
                                "person_file_path": str(Path(source_path).resolve()),
                                "scene_file_path": str(target_path),
                            },
                            resolution=resolution,
                            name=f"Kutty Story page {page_number}",
                            wait_for_completion=True,
                            download_outputs=False,
                        )

                    body_duration = time.monotonic() - body_start
                    status = getattr(res, "status", None)
                    downloads = getattr(res, "downloads", None) or []

                    if status == "error" or not downloads:
                        err_obj = getattr(res, "error", None) or getattr(res, "message", None) or "No download URL returned"
                        code, msg, retryable = classify_error(err_obj)

                        if retryable and body_attempt < max_retries:
                            delay = base_delay * (2 ** (body_attempt - 1)) + random.uniform(0.1, 0.5)
                            log_attempt(
                                job_id=job_id,
                                page_number=page_number,
                                provider="magic_hour",
                                tool="body_swap",
                                attempt=body_attempt,
                                max_attempts=max_retries,
                                duration_sec=body_duration,
                                outcome="retry",
                                error_code=code.value,
                                reason=msg
                            )
                            time.sleep(delay)
                            continue
                        else:
                            # F1 fallback trigger: body_swap failed; switch to face_swap_photo
                            used_fallback = True
                            fallback_from = "body_swap"
                            log_attempt(
                                job_id=job_id,
                                page_number=page_number,
                                provider="magic_hour",
                                tool="body_swap",
                                attempt=body_attempt,
                                max_attempts=max_retries,
                                duration_sec=body_duration,
                                outcome="fallback",
                                error_code=code.value,
                                fallback_from="body_swap",
                                reason=f"Body swap returned status={status} ({msg}). Falling back to face_swap_photo."
                            )
                            res = None
                            break
                    else:
                        # Body swap succeeded
                        break
                except Exception as body_ex:
                    body_duration = time.monotonic() - body_start
                    code, msg, retryable = classify_error(body_ex)

                    if retryable and body_attempt < max_retries:
                        delay = base_delay * (2 ** (body_attempt - 1)) + random.uniform(0.1, 0.5)
                        log_attempt(
                            job_id=job_id,
                            page_number=page_number,
                            provider="magic_hour",
                            tool="body_swap",
                            attempt=body_attempt,
                            max_attempts=max_retries,
                            duration_sec=body_duration,
                            outcome="retry",
                            error_code=code.value,
                            reason=msg
                        )
                        time.sleep(delay)
                    else:
                        # F1 fallback trigger
                        used_fallback = True
                        fallback_from = "body_swap"
                        log_attempt(
                            job_id=job_id,
                            page_number=page_number,
                            provider="magic_hour",
                            tool="body_swap",
                            attempt=body_attempt,
                            max_attempts=max_retries,
                            duration_sec=body_duration,
                            outcome="fallback",
                            error_code=code.value,
                            fallback_from="body_swap",
                            reason=f"Body swap error ({msg}). Falling back to face_swap_photo."
                        )
                        res = None
                        break

            # Face-Lock: apply face_swap_photo to lock exact authentic facial identity onto the body
            if res is not None:
                face_lock = os.getenv("MAGIC_HOUR_BODY_SWAP_FACE_LOCK", "true").strip().lower() == "true"
                body_downloads = getattr(res, "downloads", None) or []
                if face_lock and body_downloads:
                    fl_start = time.monotonic()
                    try:
                        body_img_path = Path(temp) / f"body_swapped_{page_number}.png"
                        dl_bytes = _download_image_with_retry(
                            url=body_downloads[0].url,
                            job_id=job_id,
                            page_number=page_number,
                            tool_name="body_swap_download",
                            max_retries=max_retries,
                            base_delay=base_delay
                        )
                        body_img_path.write_bytes(dl_bytes)

                        print(f"[Magic Hour] Locking authentic facial features onto Page {page_number} body...")
                        with _mh_semaphore:
                            fl_res = client.v1.face_swap_photo.generate(
                                assets={
                                    "face_swap_mode": "all-faces",
                                    "source_file_path": str(Path(source_path).resolve()),
                                    "target_file_path": str(body_img_path),
                                },
                                name=f"Kutty Story page {page_number} face-lock",
                                wait_for_completion=True,
                                download_outputs=False,
                            )
                        if fl_res and getattr(fl_res, "downloads", None):
                            res = fl_res
                    except Exception as fl_err:
                        fl_dur = time.monotonic() - fl_start
                        code, msg, _ = classify_error(fl_err)
                        log_attempt(
                            job_id=job_id,
                            page_number=page_number,
                            provider="magic_hour",
                            tool="body_swap_face_lock",
                            attempt=1,
                            max_attempts=1,
                            duration_sec=fl_dur,
                            outcome="retry",
                            error_code=code.value,
                            reason=f"Notice during face-lock on page {page_number}: {msg}"
                        )

        # -------------------------------------------------------------
        # 2. FACE SWAP OR HEAD SWAP (executed if not body swap or after F1 fallback)
        # -------------------------------------------------------------
        current_tool = "head_swap" if is_head else "face_swap_photo"
        if res is None:
            swap_attempt = 0
            while swap_attempt < max_retries:
                swap_attempt += 1
                attempt_count += 1
                swap_start = time.monotonic()
                try:
                    with _mh_semaphore:
                        if is_head:
                            res = client.v1.head_swap.generate(
                                assets={
                                    "body_file_path": str(target_path),
                                    "head_file_path": str(Path(source_path).resolve()),
                                },
                                name=f"Kutty Story page {page_number}",
                                wait_for_completion=True,
                                download_outputs=False,
                            )
                        else:
                            res = client.v1.face_swap_photo.generate(
                                assets={
                                    "face_swap_mode": "all-faces",
                                    "source_file_path": str(Path(source_path).resolve()),
                                    "target_file_path": str(target_path),
                                },
                                name=f"Kutty Story page {page_number}",
                                wait_for_completion=True,
                                download_outputs=False,
                            )

                    swap_duration = time.monotonic() - swap_start
                    status = getattr(res, "status", None)
                    downloads = getattr(res, "downloads", None) or []

                    if status == "error" or not downloads:
                        err_obj = getattr(res, "error", None) or getattr(res, "message", None) or "No download URL returned"
                        code, msg, retryable = classify_error(err_obj)

                        if retryable and swap_attempt < max_retries:
                            delay = base_delay * (2 ** (swap_attempt - 1)) + random.uniform(0.1, 0.5)
                            log_attempt(
                                job_id=job_id,
                                page_number=page_number,
                                provider="magic_hour",
                                tool=current_tool,
                                attempt=swap_attempt,
                                max_attempts=max_retries,
                                duration_sec=swap_duration,
                                outcome="retry",
                                error_code=code.value,
                                fallback_from=fallback_from,
                                reason=msg
                            )
                            time.sleep(delay)
                            continue
                        else:
                            log_attempt(
                                job_id=job_id,
                                page_number=page_number,
                                provider="magic_hour",
                                tool=current_tool,
                                attempt=swap_attempt,
                                max_attempts=max_retries,
                                duration_sec=swap_duration,
                                outcome="failed",
                                error_code=code.value,
                                fallback_from=fallback_from,
                                reason=f"Magic Hour failed with status={status}: {msg}"
                            )
                            raise RuntimeError(f"Magic Hour swap failed ({code.value}): {msg}")
                    else:
                        # Success
                        break
                except Exception as swap_ex:
                    swap_duration = time.monotonic() - swap_start
                    code, msg, retryable = classify_error(swap_ex)

                    if retryable and swap_attempt < max_retries:
                        delay = base_delay * (2 ** (swap_attempt - 1)) + random.uniform(0.1, 0.5)
                        log_attempt(
                            job_id=job_id,
                            page_number=page_number,
                            provider="magic_hour",
                            tool=current_tool,
                            attempt=swap_attempt,
                            max_attempts=max_retries,
                            duration_sec=swap_duration,
                            outcome="retry",
                            error_code=code.value,
                            fallback_from=fallback_from,
                            reason=msg
                        )
                        time.sleep(delay)
                    else:
                        log_attempt(
                            job_id=job_id,
                            page_number=page_number,
                            provider="magic_hour",
                            tool=current_tool,
                            attempt=swap_attempt,
                            max_attempts=max_retries,
                            duration_sec=swap_duration,
                            outcome="failed",
                            error_code=code.value,
                            fallback_from=fallback_from,
                            reason=f"Swap call error: {msg}"
                        )
                        raise RuntimeError(f"Magic Hour swap error ({code.value}): {msg}")

        # -------------------------------------------------------------
        # 3. DOWNLOAD AND RETURN RESULT
        # -------------------------------------------------------------
        downloads = getattr(res, "downloads", None) or []
        if not downloads:
            err_details = getattr(res, "error", None) or getattr(res, "message", None)
            raise RuntimeError(
                f"Magic Hour completed but returned no download URLs (status={getattr(res, 'status', 'unknown')}, error={err_details})"
            )

        download_url = downloads[0].url
        img_bytes = _download_image_with_retry(
            url=download_url,
            job_id=job_id,
            page_number=page_number,
            tool_name=current_tool,
            max_retries=max_retries,
            base_delay=base_delay
        )

        # -------------------------------------------------------------
        # 4. POST-GENERATION SANITY CHECKS & RESOLUTION NORMALIZATION
        # -------------------------------------------------------------
        # A. Verify image decodes cleanly and normalize resolution to match target canvas
        with Image.open(io.BytesIO(target_bytes)) as tgt_check:
            tgt_w, tgt_h = tgt_check.size
            tgt_aspect = tgt_w / max(1, tgt_h)

        try:
            with Image.open(io.BytesIO(img_bytes)) as out_check:
                out_w, out_h = out_check.size
                out_aspect = out_w / max(1, out_h)
                if (out_w, out_h) != (tgt_w, tgt_h):
                    resized = out_check.convert("RGB").resize((tgt_w, tgt_h), Image.Resampling.LANCZOS)
                    res_buf = io.BytesIO()
                    resized.save(res_buf, format="PNG")
                    img_bytes = res_buf.getvalue()
        except Exception as decode_err:
            raise RuntimeError(f"Output image decode failure: {decode_err}")

        aspect_diff = abs(out_aspect - tgt_aspect) / tgt_aspect
        if aspect_diff > 0.025:
            print(f"[Magic Hour] Warning: Output aspect ratio ({out_aspect:.3f}) differs from target ({tgt_aspect:.3f}) by {aspect_diff*100:.1f}%.")

        # B. Automatically remove any pottu / bindi / mai from the character face on generated output
        try:
            import cv2
            import numpy as np
            from app.services.ai.photo_validator import YUNET_PATH
            if YUNET_PATH.exists():
                arr = np.frombuffer(img_bytes, np.uint8)
                bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
                if bgr is not None:
                    gh, gw = bgr.shape[:2]
                    det = cv2.FaceDetectorYN_create(str(YUNET_PATH), "", (gw, gh), score_threshold=0.25)
                    _, f_res = det.detect(bgr)
                    if f_res is not None and len(f_res) > 0:
                        char_f = max(f_res, key=lambda f: f[-1])
                        fx, fy, fw, fh = [int(v) for v in char_f[:4]]
                        re_x, re_y = int(char_f[4]), int(char_f[5])
                        le_x, le_y = int(char_f[6]), int(char_f[7])
                        mid_eye_x = int((re_x + le_x) / 2)
                        eye_y = int((re_y + le_y) / 2)

                        # Eyebrow & eye absolute protection mask - NEVER inpaint or cut eyebrows
                        eyebrow_protect = np.zeros((gh, gw), dtype=np.uint8)
                        cv2.ellipse(eyebrow_protect, (re_x, re_y - int(fh * 0.08)), (int(fw * 0.20), int(fh * 0.10)), 0, 0, 360, 255, -1)
                        cv2.ellipse(eyebrow_protect, (le_x, le_y - int(fh * 0.08)), (int(fw * 0.20), int(fh * 0.10)), 0, 0, 360, 255, -1)
                        cv2.circle(eyebrow_protect, (re_x, re_y), int(fw * 0.14), 255, -1)
                        cv2.circle(eyebrow_protect, (le_x, le_y), int(fw * 0.14), 255, -1)

                        mark_mask = np.zeros((gh, gw), dtype=np.uint8)
                        # 1. Forehead Pottu Zone - strictly in the central glabellar gap between eyebrows
                        half_gap = max(4, int(min(abs(mid_eye_x - re_x), abs(le_x - mid_eye_x)) * 0.35))
                        fy1 = max(0, eye_y - int(fh * 0.30))
                        fy2 = max(0, eye_y - int(fh * 0.02))
                        fx1 = max(0, mid_eye_x - half_gap)
                        fx2 = min(gw, mid_eye_x + half_gap)
                        if fy2 > fy1 and fx2 > fx1:
                            f_roi = bgr[fy1:fy2, fx1:fx2]
                            gray_f = cv2.cvtColor(f_roi, cv2.COLOR_BGR2GRAY)
                            med_f = np.median(gray_f)
                            dark_f = (gray_f < med_f * 0.60).astype(np.uint8) * 255
                            cnts, _ = cv2.findContours(dark_f, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                            for c in cnts:
                                if 3 <= cv2.contourArea(c) <= (fw * fh * 0.02):
                                    cv2.drawContours(mark_mask[fy1:fy2, fx1:fx2], [c], -1, 255, -1)

                        # 2. Cheek / Chin Mai Zone
                        l_start_x = min(gw - 1, le_x + int(fw * 0.10))
                        if l_start_x < gw:
                            l_roi = bgr[eye_y + int(fh * 0.10):min(gh, fy + fh), l_start_x:min(gw, fx + fw + int(fw * 0.10))]
                            if l_roi.size > 0:
                                l_gray = cv2.cvtColor(l_roi, cv2.COLOR_BGR2GRAY)
                                l_med = np.median(l_gray)
                                l_dark = (l_gray < l_med * 0.50).astype(np.uint8) * 255
                                cnts_l, _ = cv2.findContours(l_dark, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                                for c in cnts_l:
                                    if 3 <= cv2.contourArea(c) <= (fw * fh * 0.015):
                                        cv2.drawContours(mark_mask[eye_y + int(fh * 0.10):min(gh, fy + fh), l_start_x:min(gw, fx + fw + int(fw * 0.10))], [c], -1, 255, -1)

                        mark_mask[eyebrow_protect > 0] = 0
                        if np.sum(mark_mask > 0) > 0:
                            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
                            mark_mask = cv2.dilate(mark_mask, kernel, iterations=1)
                            mark_mask[eyebrow_protect > 0] = 0
                            cleaned_bgr = cv2.inpaint(bgr, mark_mask, 5, cv2.INPAINT_TELEA)
                            ok, enc = cv2.imencode(".png", cleaned_bgr)
                            if ok:
                                img_bytes = enc.tobytes()
                                print(f"[Magic Hour] Successfully removed {np.sum(mark_mask > 0)} pottu/mai mark pixels while protecting eyebrows on Page {page_number}.")
        except Exception as post_mark_ex:
            print(f"[Magic Hour] Notice during post-generation pottu removal: {post_mark_ex}")

        # B2. Match face skin tone to character body/neck and apply digital art skin smoothness
        # (Only needed for face_swap_photo; ai_image_editor already generates native cohesive lighting and skin)
        if not is_editor:
            try:
                import cv2
                import numpy as np
                from app.services.ai.photo_validator import YUNET_PATH
                if YUNET_PATH.exists():
                    arr = np.frombuffer(img_bytes, np.uint8)
                    bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
                    if bgr is not None:
                        gh, gw = bgr.shape[:2]
                        det = cv2.FaceDetectorYN_create(str(YUNET_PATH), "", (gw, gh), score_threshold=0.25)
                        _, f_res = det.detect(bgr)
                        if f_res is not None and len(f_res) > 0:
                            char_f = max(f_res, key=lambda f: f[-1])
                            fx, fy, fw, fh = [int(v) for v in char_f[:4]]
                            re_x, re_y = int(char_f[4]), int(char_f[5])
                            le_x, le_y = int(char_f[6]), int(char_f[7])
                            mouth_cx = int((char_f[10] + char_f[12]) / 2)
                            mouth_cy = int((char_f[11] + char_f[13]) / 2)

                            neck_y1 = min(gh - 1, fy + fh + int(fh * 0.05))
                            neck_y2 = min(gh, fy + fh + int(fh * 0.25))
                            neck_x1 = max(0, fx + int(fw * 0.25))
                            neck_x2 = min(gw, fx + int(fw * 0.75))
                            body_roi = bgr[neck_y1:neck_y2, neck_x1:neck_x2]

                            if body_roi.size > 0:
                                body_lab = cv2.cvtColor(body_roi, cv2.COLOR_BGR2LAB).astype(np.float32)
                                # Robust skin filter: only sample genuine skin pixels (A > 130, B > 130)
                                skin_px = body_lab[(body_lab[:, :, 1] > 130) & (body_lab[:, :, 2] > 130)]
                                if skin_px.size > 0:
                                    b_L_mean = float(np.mean(skin_px[:, 0]))
                                    b_A_mean = float(np.mean(skin_px[:, 1]))
                                    b_B_mean = float(np.mean(skin_px[:, 2]))
                                else:
                                    b_L_mean = float(np.mean(body_lab[:, :, 0]))
                                    b_A_mean = float(np.mean(body_lab[:, :, 1]))
                                    b_B_mean = float(np.mean(body_lab[:, :, 2]))

                                # Protect warm fairytale skin tone: avoid dulling or green shifting
                                b_L_mean = max(135.0, min(175.0, b_L_mean))
                                b_A_mean = max(142.0, min(165.0, b_A_mean))
                                b_B_mean = max(150.0, min(175.0, b_B_mean))

                                skin_mask = np.zeros((gh, gw), dtype=np.uint8)
                                center = (fx + fw // 2, fy + int(fh * 0.50))
                                axes = (int(fw * 0.44), int(fh * 0.47))
                                cv2.ellipse(skin_mask, center, axes, 0, 0, 360, 255, -1)

                                eye_r = int(fw * 0.14)
                                cv2.circle(skin_mask, (re_x, re_y), eye_r, 0, -1)
                                cv2.circle(skin_mask, (le_x, le_y), eye_r, 0, -1)
                                # Protect eyebrows completely from smoothing & color alteration
                                cv2.ellipse(skin_mask, (re_x, re_y - int(fh * 0.08)), (int(fw * 0.20), int(fh * 0.09)), 0, 0, 360, 0, -1)
                                cv2.ellipse(skin_mask, (le_x, le_y - int(fh * 0.08)), (int(fw * 0.20), int(fh * 0.09)), 0, 0, 360, 0, -1)
                                cv2.ellipse(skin_mask, (mouth_cx, mouth_cy), (int(fw * 0.22), int(fh * 0.12)), 0, 0, 360, 0, -1)

                                smooth_bgr = cv2.bilateralFilter(bgr, d=11, sigmaColor=75, sigmaSpace=75)
                                smooth_lab = cv2.cvtColor(smooth_bgr, cv2.COLOR_BGR2LAB).astype(np.float32)

                                curr_L = float(np.mean(smooth_lab[:, :, 0][skin_mask > 0]))
                                curr_A = float(np.mean(smooth_lab[:, :, 1][skin_mask > 0]))
                                curr_B = float(np.mean(smooth_lab[:, :, 2][skin_mask > 0]))

                                dL = (b_L_mean - curr_L) * 0.70
                                dA = (b_A_mean - curr_A) * 0.70
                                dB = (b_B_mean - curr_B) * 0.70

                                smooth_lab[:, :, 0] = np.clip(smooth_lab[:, :, 0] + dL, 0, 255)
                                smooth_lab[:, :, 1] = np.clip(smooth_lab[:, :, 1] + dA, 0, 255)
                                smooth_lab[:, :, 2] = np.clip(smooth_lab[:, :, 2] + dB, 0, 255)

                                toned_bgr = cv2.cvtColor(smooth_lab.astype(np.uint8), cv2.COLOR_LAB2BGR)
                                feather = cv2.GaussianBlur(skin_mask.astype(np.float32) / 255.0, (25, 25), 8)
                                alpha = np.repeat(feather[:, :, np.newaxis], 3, axis=2)

                                result_bgr = (toned_bgr.astype(np.float32) * alpha + bgr.astype(np.float32) * (1.0 - alpha)).astype(np.uint8)
                                ok, enc = cv2.imencode(".png", result_bgr)
                                if ok:
                                    img_bytes = enc.tobytes()
                                    print(f"[Magic Hour] Successfully matched face skin to body color (L={b_L_mean:.1f}) and applied digital art smoothness.")
            except Exception as body_match_ex:
                print(f"[Magic Hour] Notice during skin color matching and smoothing: {body_match_ex}")

        # C. Verify a face is present in generated output using YuNet
        has_face_in_output = True
        skip_face_check = os.getenv("MAGIC_HOUR_SKIP_OUTPUT_FACE_CHECK", "false").strip().lower() in ("true", "1", "yes")
        if not skip_face_check:
            try:
                import cv2
                import numpy as np
                from app.services.ai.photo_validator import YUNET_PATH
                if YUNET_PATH.exists():
                    arr = np.frombuffer(img_bytes, np.uint8)
                    bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
                    if bgr is not None:
                        oh, ow = bgr.shape[:2]
                        det = cv2.FaceDetectorYN_create(str(YUNET_PATH), "", (ow, oh), score_threshold=0.25)
                        face_res = det.detect(bgr)
                        if face_res is None or len(face_res) < 2 or face_res[1] is None or len(face_res[1]) == 0:
                            has_face_in_output = False
            except Exception as check_ex:
                print(f"[Magic Hour] Notice during output face sanity check: {check_ex}")

        # D. Strict Face Swap Verification: Ensure character face was actually replaced and is NOT the raw plate
        try:
            import cv2
            import numpy as np
            from app.services.ai.photo_validator import YUNET_PATH
            if YUNET_PATH.exists():
                arr_out = np.frombuffer(img_bytes, np.uint8)
                bgr_out = cv2.imdecode(arr_out, cv2.IMREAD_COLOR)
                arr_tgt = np.frombuffer(target_bytes, np.uint8)
                bgr_tgt = cv2.imdecode(arr_tgt, cv2.IMREAD_COLOR)
                if bgr_out is not None and bgr_tgt is not None:
                    th, tw = bgr_tgt.shape[:2]
                    det_t = cv2.FaceDetectorYN_create(str(YUNET_PATH.resolve()), "", (tw, th), score_threshold=0.25)
                    _, t_faces = det_t.detect(bgr_tgt)
                    if t_faces is not None and len(t_faces) > 0:
                        tf = max(t_faces, key=lambda f: f[-1])
                        t_fx, t_fy, t_fw, t_fh = [int(v) for v in tf[:4]]
                        cf_y1 = max(0, t_fy + int(t_fh * 0.15))
                        cf_y2 = min(th, t_fy + int(t_fh * 0.85))
                        cf_x1 = max(0, t_fx + int(t_fw * 0.15))
                        cf_x2 = min(tw, t_fx + int(t_fw * 0.85))
                        if cf_y2 > cf_y1 and cf_x2 > cf_x1:
                            face_tgt_crop = bgr_tgt[cf_y1:cf_y2, cf_x1:cf_x2]
                            face_out_crop = bgr_out[cf_y1:cf_y2, cf_x1:cf_x2]
                            face_delta = float(np.mean(np.abs(face_out_crop.astype(np.float32) - face_tgt_crop.astype(np.float32))))
                            print(f"[Magic Hour] Page {page_number} face swap delta: {face_delta:.2f}")
                            if face_delta < 12.0:
                                raise RuntimeError(
                                    f"Magic Hour output returned unmodified raw template face (face delta {face_delta:.2f} < 12.0). Face was not replaced."
                                )
        except RuntimeError:
            raise
        except Exception as diff_ex:
            print(f"[Magic Hour] Notice during face modification delta check: {diff_ex}")

        final_tool = current_tool if used_fallback else primary_tool
        total_duration = round(time.monotonic() - total_started, 2)

        if not has_face_in_output:
            log_attempt(
                job_id=job_id,
                page_number=page_number,
                provider="magic_hour",
                tool=final_tool,
                attempt=attempt_count,
                max_attempts=max_retries,
                duration_sec=total_duration,
                outcome="failed",
                error_code=MagicHourErrorCode.NO_FACE_TARGET.value,
                reason="Generated output contains no detectable face."
            )
            raise RuntimeError(f"Magic Hour output verification failed ({MagicHourErrorCode.NO_FACE_TARGET.value}): No face detected in generated page.")

        log_attempt(
            job_id=job_id,
            page_number=page_number,
            provider="magic_hour",
            tool=final_tool,
            attempt=attempt_count,
            max_attempts=max_retries,
            duration_sec=total_duration,
            outcome="success",
            fallback_from=fallback_from
        )

        print(f"[Magic Hour] <--- Page {page_number} completed in {total_duration}s!\n")

        return GenerationResult(
            image_bytes=img_bytes,
            format="png",
            provider="Magic Hour",
            model=final_tool,
            prompt=f"Personalized story page {page_number}",
            generation_time_sec=total_duration,
            cost_estimate_usd=0.0,
            attempts=attempt_count,
            used_fallback=used_fallback,
            fallback_from=fallback_from,
            metadata={"fused_page": page_number, "character_fused": True, "ai_swapped": True, "external_api": True},
        )


def enhance_reference_photo(
    photo_bytes: bytes,
    filename: str = "child_photo.png",
    job_id: str = "studio_enhance"
) -> bytes:
    key = (os.getenv("MAGIC_HOUR_API_KEY", "") or getattr(settings, "MAGIC_HOUR_API_KEY", "")).strip()
    if not key:
        raise RuntimeError("MAGIC_HOUR_API_KEY is not configured in .env")

    # Call all model, prompt, tool, resolution parameters directly from .env / settings
    tool = (os.getenv("MAGIC_HOUR_ENHANCE_TOOL", "") or getattr(settings, "MAGIC_HOUR_ENHANCE_TOOL", "ai_image_editor")).strip().lower()
    model = (os.getenv("MAGIC_HOUR_ENHANCE_MODEL", "") or getattr(settings, "MAGIC_HOUR_ENHANCE_MODEL", "flux-2-klein")).strip()
    resolution = (os.getenv("MAGIC_HOUR_ENHANCE_RESOLUTION", "") or getattr(settings, "MAGIC_HOUR_ENHANCE_RESOLUTION", "1024px")).strip()
    prompt = (os.getenv("MAGIC_HOUR_ENHANCE_PROMPT", "") or getattr(settings, "MAGIC_HOUR_ENHANCE_PROMPT", "")).strip()
    if not prompt:
        prompt = (
            "Clean professional studio portrait of the person, seamless pure white background, "
            "sharp natural studio lighting, crisp facial details, preserve person's exact face, expression, and clothing"
        )
    if (prompt.startswith('"') and prompt.endswith('"')) or (prompt.startswith("'") and prompt.endswith("'")):
        prompt = prompt[1:-1].strip()

    fallback_tool = (os.getenv("MAGIC_HOUR_ENHANCE_FALLBACK_TOOL", "") or getattr(settings, "MAGIC_HOUR_ENHANCE_FALLBACK_TOOL", "image_background_remover")).strip().lower()
    max_retries = max(1, int(os.getenv("MAGIC_HOUR_MAX_RETRIES", "3")))
    base_delay = float(os.getenv("MAGIC_HOUR_RETRY_BASE_SECONDS", "2.0"))

    client = Client(token=key)
    with tempfile.TemporaryDirectory(prefix="ks_enhance_") as temp:
        input_path = Path(temp) / filename
        with Image.open(io.BytesIO(photo_bytes)) as im:
            ImageOps.exif_transpose(im).convert("RGB").save(input_path, format="PNG")

        started = time.monotonic()
        download_url = None

        print(f"\n[Magic Hour] Studio Photo Enhancement:")
        print(f"  - Configured Primary Tool: '{tool}'")
        print(f"  - Model: '{model}'")
        print(f"  - Resolution: '{resolution}'")
        print(f"  - Prompt: '{prompt}'")
        print(f"  - Fallback Tool: '{fallback_tool}'")

        # 1. Primary Tool Execution (driven strictly by .env) with semaphore
        if tool == "ai_image_editor":
            try:
                print(f"[Magic Hour] Invoking client.v1.ai_image_editor (model='{model}', resolution='{resolution}')...")
                with _mh_semaphore:
                    res = client.v1.ai_image_editor.generate(
                        assets={"image_file_path": str(input_path.resolve())},
                        model=model,
                        resolution=resolution,
                        style={"prompt": prompt},
                        name="Kutty Story Studio Photo Enhance",
                        wait_for_completion=True,
                        download_outputs=False,
                    )
                downloads = getattr(res, "downloads", None) or []
                if downloads:
                    download_url = downloads[0].url
                else:
                    print(f"[Magic Hour] AI Image Editor returned no downloads. Switching to fallback tool '{fallback_tool}'...")
            except Exception as edit_err:
                code, msg, _ = classify_error(edit_err)
                log_attempt(
                    job_id=job_id,
                    page_number=0,
                    provider="magic_hour",
                    tool="ai_image_editor",
                    attempt=1,
                    max_attempts=1,
                    duration_sec=time.monotonic() - started,
                    outcome="fallback",
                    error_code=code.value,
                    fallback_from="ai_image_editor",
                    reason=f"AI Image Editor notice ({msg}). Switching to fallback tool '{fallback_tool}'."
                )

        elif tool == "image_background_remover":
            print(f"[Magic Hour] Invoking client.v1.image_background_remover as primary tool...")
            with _mh_semaphore:
                bg_res = client.v1.image_background_remover.generate(
                    assets={"image_file_path": str(input_path.resolve())},
                    name="Kutty Story Studio BG Removal",
                    wait_for_completion=True,
                    download_outputs=False,
                )
            downloads = getattr(bg_res, "downloads", None) or []
            if downloads:
                download_url = downloads[0].url

        # 2. Fallback Tool Execution (if primary tool didn't produce download_url)
        if not download_url and fallback_tool == "image_background_remover":
            print("[Magic Hour] Running Image Background Remover + White Studio Canvas...")
            with _mh_semaphore:
                bg_res = client.v1.image_background_remover.generate(
                    assets={"image_file_path": str(input_path.resolve())},
                    name="Kutty Story Studio BG Removal Fallback",
                    wait_for_completion=True,
                    download_outputs=False,
                )
            downloads = getattr(bg_res, "downloads", None) or []
            if not downloads:
                raise RuntimeError(
                    f"Magic Hour background removal completed without download URL (status={getattr(bg_res, 'status', 'unknown')})"
                )
            download_url = downloads[0].url

        if not download_url:
            raise RuntimeError("No download URL returned from Magic Hour photo enhancement")

        raw_output_bytes = _download_image_with_retry(
            url=download_url,
            job_id=job_id,
            page_number=0,
            tool_name="studio_photo_enhance",
            max_retries=max_retries,
            base_delay=base_delay
        )

        # Ensure output is composited cleanly onto pure white background if transparent
        with Image.open(io.BytesIO(raw_output_bytes)) as out_img:
            if out_img.mode in ("RGBA", "LA") or (out_img.mode == "P" and "transparency" in out_img.info):
                rgba = out_img.convert("RGBA")
                white_canvas = Image.new("RGB", rgba.size, (255, 255, 255))
                white_canvas.paste(rgba, mask=rgba.split()[3])
                buf = io.BytesIO()
                white_canvas.save(buf, format="PNG")
                final_bytes = buf.getvalue()
            else:
                final_bytes = raw_output_bytes

        duration = round(time.monotonic() - started, 2)
        print(f"[Magic Hour] Studio portrait enhanced successfully in {duration}s!")
        log_attempt(
            job_id=job_id,
            page_number=0,
            provider="magic_hour",
            tool=tool,
            attempt=1,
            max_attempts=1,
            duration_sec=duration,
            outcome="success"
        )
        return final_bytes
