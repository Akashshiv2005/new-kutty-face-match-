"""
Cover Page Service for Kutty Story Hardcover Keepsake Editions.
Handles:
1. Cover page character face detection (multiple faces on wrap spread)
2. Personalization / face-swapping for hard copy cover pages
3. Composing print-ready wrap cover PDFs
"""

import io
import os
import json
import time
import math
from pathlib import Path
from typing import Optional, Tuple, List, Dict, Any
from PIL import Image
import numpy as np

from app.config import settings
from app.services.storage import storage
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm, mm, inch


class CoverPageService:
    # ── BOOK COVER PAGE: EXACT USER SPECIFICATIONS ──
    # Total Trim Cover Size: 46.0 cm (W) × 27.0 cm (H)
    # 1. Front Cover: 22.7 cm (W) × 27.0 cm (H)
    # 2. Back Cover:  22.7 cm (W) × 27.0 cm (H)
    # 3. Center Spine: 0.6 cm (W) × 27.0 cm (H)
    # Bleed Settings: 3 mm (0.3 cm) on all four outer sides
    # Final Artwork Size (including bleed): 46.6 cm (W) × 27.6 cm (H)

    BLEED_CM = 0.3          # 3 mm bleed
    FRONT_W_CM = 22.7       # 22.7 cm
    BACK_W_CM = 22.7        # 22.7 cm
    SPINE_W_CM = 0.6        # 0.6 cm
    COVER_H_CM = 27.0       # 27.0 cm

    TOTAL_TRIM_W_CM = 46.0  # 22.7 + 0.6 + 22.7 = 46.0 cm
    TOTAL_TRIM_H_CM = 27.0  # 27.0 cm

    TOTAL_ARTWORK_W_CM = 46.6  # 46.0 + 2 * 0.3 = 46.6 cm
    TOTAL_ARTWORK_H_CM = 27.6  # 27.0 + 2 * 0.3 = 27.6 cm

    # High-Resolution Print DPI (300 DPI)
    DPI = 300
    PPCM = DPI / 2.54       # ~118.1102 pixels/cm

    ARTWORK_W_PX = int(round(TOTAL_ARTWORK_W_CM * PPCM))  # 5504 px
    ARTWORK_H_PX = int(round(TOTAL_ARTWORK_H_CM * PPCM))  # 3260 px
    BLEED_PX = int(round(BLEED_CM * PPCM))                # 35 px
    COVER_W_PX = int(round(FRONT_W_CM * PPCM))            # 2681 px
    SPINE_W_PX = ARTWORK_W_PX - (2 * BLEED_PX) - (2 * COVER_W_PX)  # 72 px

    @staticmethod
    def detect_cover_page_faces(img_source: Any) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Detects all primary character faces on a cover spread (front and back cover characters).
        Returns:
            points_json: JSON string of polygon points for visualization
            anchors: list of anchor dicts with cx, cy, w, h
        """
        try:
            import cv2
            yunet_path = Path(__file__).parent / "ai" / "face_detection_yunet.onnx"
            if not yunet_path.exists():
                return "", []

            if isinstance(img_source, bytes):
                nparr = np.frombuffer(img_source, np.uint8)
                img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            else:
                src_str = str(img_source)
                if os.path.exists(src_str):
                    img_bgr = cv2.imread(src_str)
                else:
                    try:
                        raw_b = storage.get_bytes(src_str)
                        nparr = np.frombuffer(raw_b, np.uint8)
                        img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                    except Exception:
                        img_bgr = None

            if img_bgr is None:
                return "", []

            h, w = img_bgr.shape[:2]
            det = cv2.FaceDetectorYN_create(str(yunet_path), "", (w, h), score_threshold=0.20)
            res = det.detect(img_bgr)
            
            anchors = []
            all_polygon_points = []

            if res[1] is not None and len(res[1]) > 0:
                for f in res[1]:
                    bx, by, bw, bh = [int(v) for v in f[:4]]
                    score = float(f[14]) if len(f) > 14 else 0
                    area = bw * bh
                    
                    # Filter: Face must be meaningful character face (> 0.4% image area, score > 0.35)
                    if area > (w * h * 0.004) and score > 0.35:
                        cx = bx + bw // 2
                        cy = by + bh // 2
                        anchors.append({
                            "cx": cx,
                            "cy": cy,
                            "w": bw,
                            "h": bh,
                            "score": score,
                            "angle": 0,
                            "tone": "natural_warm"
                        })

                        # 16-point outline polygon (normalized 0..100)
                        rx = (bw / 2.0) * 1.08
                        ry = (bh / 2.0) * 1.15
                        pts = []
                        for i in range(16):
                            angle = (2 * math.pi * i) / 16
                            px = round(((cx + rx * math.cos(angle)) / w) * 100.0, 2)
                            py = round(((cy + ry * math.sin(angle)) / h) * 100.0, 2)
                            pts.append([px, py])
                        pts.append(pts[0])
                        all_polygon_points.append(pts)

            # Sort anchors left-to-right (Back Cover character first, then Front Cover character)
            anchors.sort(key=lambda a: a["cx"])
            points_json = json.dumps(all_polygon_points) if all_polygon_points else ""
            return points_json, anchors

        except Exception as e:
            print(f"[CoverPageService] Face detection notice: {e}")
            return "", []

    @classmethod
    def compose_hardcover_wrap_spread(
        cls,
        job_id: str,
        db: Any
    ) -> Optional[bytes]:
        """
        Assembles the complete Hardcover Cover Wrap Spread according to exact specifications:
        - Total Trim Size: 46.0 cm (W) × 27.0 cm (H)
        - Front Cover: 22.7 cm (W) × 27.0 cm (H) (Left side)
        - Center Spine: 0.6 cm (W) × 27.0 cm (H) (with vertical title)
        - Back Cover:  22.7 cm (W) × 27.0 cm (H) (Right side)
        - Bleed: 3 mm (0.3 cm) on all four outer sides
        - Final Artwork Size: 46.6 cm (W) × 27.6 cm (H) (5504 × 3260 px @ 300 DPI)
        """
        from app.models import PersonalizationJob, StoryTemplate, StoryPage, GeneratedAsset
        from PIL import Image, ImageDraw, ImageFont

        job = db.query(PersonalizationJob).filter(PersonalizationJob.id == job_id).first()
        if not job:
            return None
        story = job.story or db.query(StoryTemplate).filter(StoryTemplate.id == job.story_id).first()
        if not story:
            return None

        # ── 1. Resolve Front Cover (Page 1) ──
        # Priority: Personalized GeneratedAsset for page 1 > StoryPage 1 original art > Source pages
        front_asset = (
            db.query(GeneratedAsset)
            .filter(
                GeneratedAsset.job_id == job.id,
                GeneratedAsset.page_number == 1,
                GeneratedAsset.generation_status == "completed"
            )
            .order_by(GeneratedAsset.asset_version.desc())
            .first()
        )
        front_bytes = None
        if front_asset and front_asset.storage_path:
            try:
                front_bytes = storage.get_bytes(front_asset.storage_path)
            except Exception:
                front_bytes = None

        if not front_bytes:
            p1 = db.query(StoryPage).filter(StoryPage.story_id == story.id, StoryPage.page_number == 1).first()
            if p1 and p1.original_image_path:
                try:
                    front_bytes = storage.get_bytes(p1.original_image_path)
                except Exception:
                    pass
            if not front_bytes:
                try:
                    front_bytes = storage.get_bytes(f"source_pages/{story.slug}/page_01.png")
                except Exception:
                    pass

        # ── 2. Resolve Back Cover (Ending Page) ──
        ending_page = (
            db.query(StoryPage)
            .filter(StoryPage.story_id == story.id, StoryPage.page_type == "ending")
            .first()
        )
        if not ending_page:
            ending_page = (
                db.query(StoryPage)
                .filter(StoryPage.story_id == story.id)
                .order_by(StoryPage.page_number.desc())
                .first()
            )

        back_bytes = None
        if ending_page:
            back_asset = (
                db.query(GeneratedAsset)
                .filter(
                    GeneratedAsset.job_id == job.id,
                    GeneratedAsset.page_number == ending_page.page_number,
                    GeneratedAsset.generation_status == "completed"
                )
                .order_by(GeneratedAsset.asset_version.desc())
                .first()
            )
            if back_asset and back_asset.storage_path:
                try:
                    back_bytes = storage.get_bytes(back_asset.storage_path)
                except Exception:
                    back_bytes = None

            if not back_bytes and ending_page.original_image_path:
                try:
                    back_bytes = storage.get_bytes(ending_page.original_image_path)
                except Exception:
                    pass

        if not back_bytes and story:
            try:
                last_num = ending_page.page_number if ending_page else 24
                back_bytes = storage.get_bytes(f"source_pages/{story.slug}/page_{last_num:02d}.png")
            except Exception:
                pass

        if not front_bytes:
            return None
        if not back_bytes:
            back_bytes = front_bytes

        # ── 3. Dimensions & Canvas Setup ──
        artwork_w = cls.ARTWORK_W_PX    # 5504
        artwork_h = cls.ARTWORK_H_PX    # 3260
        bleed_px = cls.BLEED_PX         # 35
        cover_w_px = cls.COVER_W_PX     # 2681
        spine_w_px = cls.SPINE_W_PX     # 72

        spread = Image.new("RGB", (artwork_w, artwork_h), color=(20, 24, 45))

        def fit_cover(raw_b: bytes, target_w: int, target_h: int) -> Image.Image:
            im = Image.open(io.BytesIO(raw_b)).convert("RGB")
            scale = max(target_w / max(1, im.width), target_h / max(1, im.height))
            new_w = int(round(im.width * scale))
            new_h = int(round(im.height * scale))
            resized = im.resize((new_w, new_h), Image.Resampling.LANCZOS)
            left = (new_w - target_w) // 2
            top = (new_h - target_h) // 2
            return resized.crop((left, top, left + target_w, top + target_h))

        # ── 4. Paste Front Cover (Left: 0 to 2716 px) ──
        front_w_total = bleed_px + cover_w_px
        fitted_front = fit_cover(front_bytes, front_w_total, artwork_h)
        spread.paste(fitted_front, (0, 0))

        # ── 5. Paste Back Cover (Right: 2788 to 5504 px) ──
        back_x = bleed_px + cover_w_px + spine_w_px
        back_w_total = artwork_w - back_x
        fitted_back = fit_cover(back_bytes, back_w_total, artwork_h)
        spread.paste(fitted_back, (back_x, 0))

        # ── 6. Assemble Center Spine (2716 to 2788 px, width 72 px = 0.6 cm) ──
        spine_x1 = front_w_total
        spine_x2 = back_x
        sdraw = ImageDraw.Draw(spread)

        # Harmonious spine tone sampled from adjacent cover boundaries
        try:
            edge_front = fitted_front.crop((front_w_total - 2, 0, front_w_total, artwork_h)).resize((1, 1)).getpixel((0, 0))
            edge_back = fitted_back.crop((0, 0, 2, artwork_h)).resize((1, 1)).getpixel((0, 0))
            avg_spine_color = (
                int((edge_front[0] + edge_back[0]) / 2 * 0.75),
                int((edge_front[1] + edge_back[1]) / 2 * 0.75),
                int((edge_front[2] + edge_back[2]) / 2 * 0.75),
            )
        except Exception:
            avg_spine_color = (22, 28, 54)

        sdraw.rectangle([spine_x1, 0, spine_x2, artwork_h], fill=avg_spine_color)

        # Realistic 3D book hinge crease lines
        sdraw.line([(spine_x1, 0), (spine_x1, artwork_h)], fill=(10, 14, 28), width=3)
        sdraw.line([(spine_x1 + 3, 0), (spine_x1 + 3, artwork_h)], fill=(255, 255, 255), width=1)
        sdraw.line([(spine_x2, 0), (spine_x2, artwork_h)], fill=(10, 14, 28), width=3)
        sdraw.line([(spine_x2 - 3, 0), (spine_x2 - 3, artwork_h)], fill=(255, 255, 255), width=1)

        # Vertical Spine Title
        spine_text = (story.title or "KUTTY STORY").upper()
        strip_h = spine_w_px - 14  # ~58px
        strip_w = artwork_h - 400
        strip = Image.new("RGBA", (strip_w, strip_h), (0, 0, 0, 0))
        tdraw = ImageDraw.Draw(strip)

        # Cross-platform font selection
        font = None
        for font_cand in [
            "C:/Windows/Fonts/georgiab.ttf",
            "C:/Windows/Fonts/arialbd.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
        ]:
            if os.path.exists(font_cand):
                try:
                    font = ImageFont.truetype(font_cand, 36)
                    break
                except Exception:
                    pass
        if not font:
            font = ImageFont.load_default()

        bbox = tdraw.textbbox((0, 0), spine_text, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        tx = (strip_w - tw) // 2
        ty = (strip_h - th) // 2 - 2

        # Shadow + crisp white text
        tdraw.text((tx + 2, ty + 2), spine_text, fill=(0, 0, 0, 200), font=font)
        tdraw.text((tx, ty), spine_text, fill=(255, 255, 255, 255), font=font)

        # Rotate 90° clockwise (reading down spine)
        rotated_text = strip.rotate(270, expand=True)
        rx = spine_x1 + (spine_w_px - rotated_text.width) // 2
        ry = (artwork_h - rotated_text.height) // 2
        spread.paste(rotated_text, (rx, ry), rotated_text)

        # Decorative Kutty Story emblem at base of spine
        emblem_y = artwork_h - bleed_px - 120
        emblem_r = 18
        sdraw.ellipse(
            [spine_x1 + (spine_w_px // 2) - emblem_r, emblem_y - emblem_r,
             spine_x1 + (spine_w_px // 2) + emblem_r, emblem_y + emblem_r],
            fill=(255, 255, 255, 230),
            outline=(200, 180, 150),
            width=1
        )
        sdraw.text((spine_x1 + (spine_w_px // 2) - 8, emblem_y - 12), "★", fill=(168, 83, 65), font=font)

        # ── 7. Kutty Story Logo Badge on Back Cover (Right side) ──
        logo_path = Path(__file__).parent.parent.parent / "frontend" / "public" / "logo.png"
        if not logo_path.exists():
            logo_path = Path("frontend/public/logo.png")
        if logo_path.exists():
            try:
                logo_img = Image.open(str(logo_path)).convert("RGBA")
                badge_w = 420
                badge_h = 240
                badge = Image.new("RGBA", (badge_w, badge_h), (0, 0, 0, 0))
                bdraw = ImageDraw.Draw(badge)
                bdraw.rounded_rectangle([0, 0, badge_w, badge_h], radius=28, fill=(255, 255, 255, 245), outline=(230, 222, 212), width=2)

                logo_resized = logo_img.resize((150, 150), Image.Resampling.LANCZOS)
                badge.paste(logo_resized, ((badge_w - 150) // 2, 16), logo_resized)

                url_font = None
                for url_cand in ["C:/Windows/Fonts/arialbd.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]:
                    if os.path.exists(url_cand):
                        try:
                            url_font = ImageFont.truetype(url_cand, 24)
                            break
                        except Exception:
                            pass
                if url_font:
                    ubox = bdraw.textbbox((0, 0), "kuttystory.co.in", font=url_font)
                    bdraw.text(((badge_w - (ubox[2] - ubox[0])) // 2, 185), "kuttystory.co.in", fill=(75, 65, 72), font=url_font)

                # Safe placement on back cover (right side: bottom-left of back cover, safe from outer bleed)
                badge_x = back_x + 120
                badge_y = artwork_h - bleed_px - badge_h - 120
                spread.paste(badge, (badge_x, badge_y), badge)
            except Exception as e:
                print(f"[CoverPageService] Notice adding logo badge: {e}")

        # ── 8. Output High-Res Print-Ready JPEG ──
        out_buf = io.BytesIO()
        spread.save(out_buf, format="JPEG", quality=95, optimize=True)
        return out_buf.getvalue()

    @classmethod
    def personalize_cover_page(
        cls,
        job_id: str,
        db: Any,
        force_regenerate: bool = False
    ) -> Tuple[Optional[str], Optional[bytes]]:
        """
        Personalizes or assembles the wrap-around hard copy cover page (46.6 cm × 27.6 cm):
        - When personalized front and back covers exist, attaches center spine in exact dimensions.
        - Persists result into MinIO storage and updates job.cover_asset_path.
        """
        from app.models import PersonalizationJob, StoryTemplate

        job = db.query(PersonalizationJob).filter(PersonalizationJob.id == job_id).first()
        if not job:
            return None, None

        story = job.story or db.query(StoryTemplate).filter(StoryTemplate.id == job.story_id).first()
        if not story:
            return None, None

        # 1. Return cached personalized cover wrap if already generated with v2 layout
        if not force_regenerate and getattr(job, "cover_asset_path", None) and "_v2_" in job.cover_asset_path:
            try:
                cached_bytes = storage.get_bytes(job.cover_asset_path)
                if cached_bytes and len(cached_bytes) > 50000:
                    im = Image.open(io.BytesIO(cached_bytes))
                    aspect = im.width / max(1, im.height)
                    # 46.6 / 27.6 = 1.688
                    if 1.60 <= aspect <= 1.75:
                        return job.cover_asset_path, cached_bytes
            except Exception:
                pass

        # 2. Compose the print-ready wrap spread from front & back covers + spine
        spread_bytes = cls.compose_hardcover_wrap_spread(job_id=job.id, db=db)
        if not spread_bytes:
            return None, None

        # 3. Persist to MinIO storage (v2 layout: Front Cover left, Spine center, Back Cover right)
        saved_key = f"generated_assets/{job.id}/cover_wrap_v2_46.6x27.6cm_{int(time.time())}.jpg"
        saved_path = storage.save_bytes(
            data=spread_bytes,
            category="generated_assets",
            custom_name=f"{job.id}/cover_wrap_v2_46.6x27.6cm_{int(time.time())}.jpg"
        )

        job.cover_asset_path = saved_path
        db.commit()
        db.refresh(job)

        return saved_path, spread_bytes

    @staticmethod
    def compose_cover_page_pdf(
        image_bytes: bytes,
        child_name: str = "Little Adventurer",
        story_title: str = "Personalized Storybook"
    ) -> bytes:
        """
        Composes an exact 46.6 cm (W) × 27.6 cm (H) print-ready Cover Wrap PDF.
        Includes 3 mm bleed on all four sides with 46 cm × 27 cm trim box.
        """
        import tempfile

        # EXACT USER SPECIFICATION: 46.6 cm x 27.6 cm
        target_width = 46.6 * cm   # 1320.945 points
        target_height = 27.6 * cm  # 782.362 points

        pdf_buffer = io.BytesIO()
        c = canvas.Canvas(pdf_buffer, pagesize=(target_width, target_height))
        c.setTitle(f"{story_title} - Hardcover Cover Wrap ({child_name})")
        c.setAuthor("Kutty Story (kuttystory.co.in)")
        c.setSubject("Print-ready Hardcover Cover Wrap Spread 46.6cm x 27.6cm (Trim: 46x27cm, Bleed: 3mm)")

        # Create temporary file for ReportLab drawImage
        tmp = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
        tmp_path = tmp.name
        try:
            tmp.write(image_bytes)
            tmp.close()
            c.drawImage(tmp_path, 0, 0, width=target_width, height=target_height)
            c.showPage()
            c.save()
        finally:
            if os.path.exists(tmp_path):
                try:
                    os.unlink(tmp_path)
                except Exception:
                    pass

        return pdf_buffer.getvalue()

