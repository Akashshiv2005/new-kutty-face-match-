import io
import os
import tempfile
import uuid
from pathlib import Path
from typing import Optional
from PIL import Image, ImageOps, ImageDraw, ImageFilter

from app.config import settings
from app.services.storage import storage

class CharacterConsistencyEngine:
    """
    Manages the Character Reference Package and facial normalization.
    """

    @staticmethod
    def normalize_child_reference(image_path: str, output_path: Optional[str] = None) -> str:
        """
        Normalize parent-authorized photograph:
        - Auto-orient based on EXIF
        - Crop to square face/bust focus
        - Resize to 512x512
        - Normalize RGB colors
        Fetches image directly from MinIO if not locally cached,
        and saves output in temp processing cache without touching local storage folder.
        """
        img_bytes = None
        if os.path.exists(image_path):
            with open(image_path, "rb") as f:
                img_bytes = f.read()
        else:
            try:
                img_bytes = storage.get_bytes(image_path)
            except Exception as e:
                raise FileNotFoundError(f"Reference image not found in MinIO storage: {image_path} ({e})")

        filename = Path(image_path).name
        stem = Path(filename).stem
        unique_id = uuid.uuid4().hex[:8]
        dest = output_path or str(Path(tempfile.gettempdir()) / f"norm_{unique_id}_{stem}.jpg")

        with Image.open(io.BytesIO(img_bytes)) as img:
            img = ImageOps.exif_transpose(img)
            img = img.convert("RGB")

            # For Magic Hour: apply padded face crop (if face detected) and save with clean .jpg
            provider = (os.getenv("FACE_SWAP_PROVIDER", "") or getattr(settings, "FACE_SWAP_PROVIDER", "")).strip().lower()
            if provider == "magic_hour":
                w, h = img.size
                crop_box = None
                try:
                    import cv2
                    import numpy as np
                    from app.services.ai.photo_validator import YUNET_PATH
                    if YUNET_PATH.exists():
                        img_cv = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
                        det = cv2.FaceDetectorYN_create(str(YUNET_PATH), "", (w, h), score_threshold=0.30)
                        res = det.detect(img_cv)
                        if res is not None and len(res) > 1 and res[1] is not None and len(res[1]) > 0:
                            faces = sorted(res[1], key=lambda f: f[2] * f[3], reverse=True)
                            f = faces[0]
                            fx, fy, fw, fh = int(f[0]), int(f[1]), int(f[2]), int(f[3])
                            # If face occupies less than 55% of photo width, apply padded head/shoulders crop
                            if fw < w * 0.55:
                                pad_x = int(fw * 0.65)
                                pad_y_top = int(fh * 0.70)
                                pad_y_bottom = int(fh * 0.90)  # include neck and shoulders
                                x1 = max(0, fx - pad_x)
                                y1 = max(0, fy - pad_y_top)
                                x2 = min(w, fx + fw + pad_x)
                                y2 = min(h, fy + fh + pad_y_bottom)
                                if (x2 - x1) >= 256 and (y2 - y1) >= 256:
                                    crop_box = (x1, y1, x2, y2)
                except Exception as detect_err:
                    print(f"[ConsistencyEngine] Notice during YuNet face crop: {detect_err}")

                final_img = img.crop(crop_box) if crop_box else img

                # Clean any forehead pottu/bindi or cheek/chin mai mark from reference image
                try:
                    import cv2
                    import numpy as np
                    from app.services.ai.photo_validator import YUNET_PATH
                    if YUNET_PATH.exists():
                        ref_cv = cv2.cvtColor(np.array(final_img), cv2.COLOR_RGB2BGR)
                        rh, rw = ref_cv.shape[:2]
                        r_det = cv2.FaceDetectorYN_create(str(YUNET_PATH), "", (rw, rh), score_threshold=0.30)
                        _, r_faces = r_det.detect(ref_cv)
                        if r_faces is not None and len(r_faces) > 0:
                            rf = max(r_faces, key=lambda f: f[2] * f[3])
                            r_fx, r_fy, r_fw, r_fh = [int(v) for v in rf[:4]]
                            r_re_x, r_re_y = int(rf[4]), int(rf[5])
                            r_le_x, r_le_y = int(rf[6]), int(rf[7])
                            r_mid_x = int((r_re_x + r_le_x) / 2)
                            r_eye_y = int((r_re_y + r_le_y) / 2)

                            # Explicit eyebrow & eye protection mask - NEVER inpaint or cut eyebrows
                            eyebrow_protect = np.zeros((rh, rw), dtype=np.uint8)
                            cv2.ellipse(eyebrow_protect, (r_re_x, r_re_y - int(r_fh * 0.08)), (int(r_fw * 0.20), int(r_fh * 0.10)), 0, 0, 360, 255, -1)
                            cv2.ellipse(eyebrow_protect, (r_le_x, r_le_y - int(r_fh * 0.08)), (int(r_fw * 0.20), int(r_fh * 0.10)), 0, 0, 360, 255, -1)
                            cv2.circle(eyebrow_protect, (r_re_x, r_re_y), int(r_fw * 0.14), 255, -1)
                            cv2.circle(eyebrow_protect, (r_le_x, r_le_y), int(r_fw * 0.14), 255, -1)

                            p_mask = np.zeros((rh, rw), dtype=np.uint8)
                            # 1. Forehead Pottu Zone - strictly in the central glabellar gap between eyebrows
                            half_gap = max(4, int(min(abs(r_mid_x - r_re_x), abs(r_le_x - r_mid_x)) * 0.35))
                            r_fy1 = max(0, r_eye_y - int(r_fh * 0.30))
                            r_fy2 = max(0, r_eye_y - int(r_fh * 0.02))
                            r_fx1 = max(0, r_mid_x - half_gap)
                            r_fx2 = min(rw, r_mid_x + half_gap)
                            if r_fy2 > r_fy1 and r_fx2 > r_fx1:
                                r_roi = ref_cv[r_fy1:r_fy2, r_fx1:r_fx2]
                                r_gray = cv2.cvtColor(r_roi, cv2.COLOR_BGR2GRAY)
                                r_med = np.median(r_gray)
                                r_dark = (r_gray < r_med * 0.65).astype(np.uint8) * 255
                                r_cnts, _ = cv2.findContours(r_dark, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                                for c in r_cnts:
                                    if 2 <= cv2.contourArea(c) <= (r_fw * r_fh * 0.02):
                                        cv2.drawContours(p_mask[r_fy1:r_fy2, r_fx1:r_fx2], [c], -1, 255, -1)

                            # 2. Cheek Mai Zone (drishti mark)
                            l_start_x = min(rw - 1, r_le_x + int(r_fw * 0.10))
                            if l_start_x < rw:
                                chk_roi = ref_cv[r_eye_y + int(r_fh * 0.10):min(rh, r_fy + r_fh), l_start_x:min(rw, r_fx + r_fw + int(r_fw * 0.10))]
                                if chk_roi.size > 0:
                                    c_gray = cv2.cvtColor(chk_roi, cv2.COLOR_BGR2GRAY)
                                    c_med = np.median(c_gray)
                                    c_dark = (c_gray < c_med * 0.52).astype(np.uint8) * 255
                                    c_cnts, _ = cv2.findContours(c_dark, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                                    for c in c_cnts:
                                        if 2 <= cv2.contourArea(c) <= (r_fw * r_fh * 0.015):
                                            cv2.drawContours(p_mask[r_eye_y + int(r_fh * 0.10):min(rh, r_fy + r_fh), l_start_x:min(rw, r_fx + r_fw + int(r_fw * 0.10))], [c], -1, 255, -1)

                            p_mask[eyebrow_protect > 0] = 0
                            if np.sum(p_mask > 0) > 0:
                                k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
                                p_mask = cv2.dilate(p_mask, k, iterations=1)
                                p_mask[eyebrow_protect > 0] = 0
                                ref_cv = cv2.inpaint(ref_cv, p_mask, 5, cv2.INPAINT_TELEA)
                                final_img = Image.fromarray(cv2.cvtColor(ref_cv, cv2.COLOR_BGR2RGB))
                                print(f"[ConsistencyEngine] Inpainted {np.sum(p_mask > 0)} pottu/mai mark pixels while protecting eyebrows 100%.")
                except Exception as clean_ref_ex:
                    print(f"[ConsistencyEngine] Notice during pottu cleaning on reference: {clean_ref_ex}")

                final_img.save(dest, format="JPEG", quality=98)
                print(f"[ConsistencyEngine] Saved Magic Hour reference ({final_img.size[0]}x{final_img.size[1]}) to: {dest}")
                return dest
            
            # Center square crop
            w, h = img.size
            min_dim = min(w, h)
            left = (w - min_dim) // 2
            top = (h - min_dim) // 4  # bias slightly toward upper third for headshots
            if top + min_dim > h:
                top = (h - min_dim) // 2
            right = left + min_dim
            bottom = top + min_dim

            cropped = img.crop((left, top, right, bottom))
            resized = cropped.resize((512, 512), Image.Resampling.LANCZOS)

            # Composite over plain solid studio backdrop (#FAF7F2 Warm Ivory)
            # Isolates child portrait and eliminates peripheral room/outdoor clutter for character consistency
            studio_bg = Image.new("RGB", (512, 512), (250, 247, 242))
            mask = Image.new("L", (512, 512), 0)
            draw = ImageDraw.Draw(mask)
            draw.ellipse((40, 25, 472, 490), fill=255)
            feathered_mask = mask.filter(ImageFilter.GaussianBlur(radius=28))

            composite = Image.composite(resized, studio_bg, feathered_mask)
            composite.save(dest, format="JPEG", quality=94)

        return dest

consistency_engine = CharacterConsistencyEngine()
