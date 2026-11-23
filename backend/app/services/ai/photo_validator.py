import io
import cv2
import numpy as np
from PIL import Image
from pathlib import Path
from typing import Dict, Any, List

# Explicit Decompression Bomb defense: Cap uncompressed pixels to 25 Megapixels (~5000x5000)
Image.MAX_IMAGE_PIXELS = 25_000_000

YUNET_PATH = Path(__file__).parent / "face_detection_yunet.onnx"


def validate_child_photo_ai(img_bytes: bytes) -> Dict[str, Any]:
    """
    Validates a child photograph using OpenCV Deep Learning YuNet detector:
    - 1. Face count check: single face required (0 -> no_face, >1 -> multiple_faces)
    - 2. Resolution check: minimum 512x512 recommended
    - 3. Face size ratio check: face width should be >= 15% of image width
    - 4. Blur check: Laplacian variance analysis
    - 5. Lighting / brightness check: detects underexposed (<40) or overexposed (>225) images
    - 6. Clear front-facing angle: checks nose position between eyes, interocular distance, yaw symmetry
    - 7. Uncovered face & mouth: detects obstructions, hands/fingers covering lower face
    - 8. Sunglasses / eyewear detection

    Returns a backwards-compatible dict including:
    - `passed`: bool (True if all critical checks pass)
    - `issues`: List[Dict[str, str]] with keys {"code", "message", "fix_tip"}
    - `is_valid`: bool (matches `passed`)
    - `score`: int (0-100)
    - `checks`, `summary`, `recommendations`, `diagnostics`, `dimensions`
    """
    issues: List[Dict[str, str]] = []

    # Immediate guard against empty input buffer (prevents OpenCV imdecode assertion crash)
    if not img_bytes or len(img_bytes) == 0:
        issues.append({
            "code": "empty_file",
            "message": "Uploaded photo file is empty (0 bytes).",
            "fix_tip": "Please upload a valid JPG or PNG image file."
        })
        return {
            "passed": False,
            "issues": issues,
            "is_valid": False,
            "score": 0,
            "summary": "Uploaded photo file is empty.",
            "recommendations": ["Upload a valid image file (JPG or PNG)."],
            "checks": []
        }

    # 0. Decompression bomb and dimension header check
    try:
        with Image.open(io.BytesIO(img_bytes)) as pil_img:
            pw, ph = pil_img.size
            if pw * ph > Image.MAX_IMAGE_PIXELS:
                raise Image.DecompressionBombError(f"Image dimensions {pw}x{ph} exceed {Image.MAX_IMAGE_PIXELS} pixels.")
    except Exception as bomb_err:
        if isinstance(bomb_err, Image.DecompressionBombError) or "DecompressionBomb" in str(type(bomb_err)):
            issues.append({
                "code": "image_too_large",
                "message": "Image resolution exceeds safety limits (25 Megapixels).",
                "fix_tip": "Please upload a standard photo smaller than 5000x5000 pixels."
            })
            return {
                "passed": False,
                "issues": issues,
                "is_valid": False,
                "score": 0,
                "summary": "Image resolution exceeds safety limits (25 Megapixels).",
                "recommendations": ["Upload a standard photo smaller than 25 Megapixels."],
                "checks": []
            }

    try:
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR) if nparr is not None and len(nparr) > 0 else None
    except Exception:
        img = None

    if img is None:
        issues.append({
            "code": "invalid_format",
            "message": "Could not decode uploaded image format.",
            "fix_tip": "Please upload a valid JPG or PNG image file."
        })
        return {
            "passed": False,
            "issues": issues,
            "is_valid": False,
            "score": 0,
            "summary": "Could not decode uploaded image format.",
            "recommendations": ["Upload a valid image file (JPG or PNG)."],
            "checks": []
        }

    h, w = img.shape[:2]

    # Check minimum resolution (512px)
    if min(w, h) < 512:
        issues.append({
            "code": "low_resolution",
            "message": f"Image resolution is too low ({w}x{h}). Minimum recommended is 512x512.",
            "fix_tip": "Please upload a higher-resolution photograph for crisp print quality."
        })

    # Blur check (Laplacian variance)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    is_blurry = laplacian_var < 35.0
    if is_blurry:
        issues.append({
            "code": "blurry",
            "message": f"Photo appears blurry or out of focus (sharpness score: {laplacian_var:.1f}).",
            "fix_tip": "Please upload a sharp, in-focus photograph."
        })

    # Overall brightness check
    mean_brightness = float(np.mean(gray))
    is_too_dark = mean_brightness < 40.0
    is_too_bright = mean_brightness > 225.0
    if is_too_dark:
        issues.append({
            "code": "too_dark",
            "message": f"Photo is too dark (brightness: {mean_brightness:.1f}/255).",
            "fix_tip": "Please take a photo in a well-lit room or near a window."
        })
    elif is_too_bright:
        issues.append({
            "code": "too_bright",
            "message": f"Photo is overexposed (brightness: {mean_brightness:.1f}/255).",
            "fix_tip": "Please avoid direct bright camera flash or harsh backlighting."
        })

    # Initialize YuNet detector
    if not YUNET_PATH.exists():
        # Fallback if model missing on disk
        passed = (len([i for i in issues if i["code"] in ("invalid_format", "low_resolution")]) == 0)
        return {
            "passed": passed,
            "issues": issues,
            "is_valid": passed,
            "score": 85 if passed else 45,
            "summary": "Photo accepted (detector model offline).",
            "recommendations": [i["fix_tip"] for i in issues],
            "checks": []
        }

    det = cv2.FaceDetectorYN_create(str(YUNET_PATH), "", (w, h), score_threshold=0.30)
    res = det.detect(img)

    raw_faces = res[1] if (res is not None and len(res) > 1 and res[1] is not None) else []
    face_count = len(raw_faces)

    # 1. NO FACE CHECK
    if face_count == 0:
        issues.insert(0, {
            "code": "no_face",
            "message": "No human face detected in the photo.",
            "fix_tip": "Please upload a clear, front-facing portrait of your child."
        })
        return {
            "passed": False,
            "issues": issues,
            "is_valid": False,
            "score": 15,
            "face_count": 0,
            "is_front_facing": False,
            "has_uncovered_mouth": False,
            "has_sunglasses": False,
            "is_far_away": True,
            "summary": "No face detected in the photo. Please upload a clear front-facing portrait of your child.",
            "recommendations": [
                "Ensure your child is looking directly at the camera at eye level.",
                "Avoid photos where the face is turned away or heavily shadowed."
            ],
            "checks": [
                {
                    "id": "face_count",
                    "title": "Single Face Detected",
                    "description": "No human face could be identified in the image.",
                    "status": "fail",
                    "tipRef": "Tip 1: Clear front-facing photo"
                },
                {
                    "id": "front_facing",
                    "title": "Clear Front-Facing Portrait",
                    "description": "No front-facing face could be identified.",
                    "status": "fail",
                    "tipRef": "Tip 1: Clear front-facing photo"
                }
            ]
        }

    # Filter substantial faces (ignore tiny background artifacts)
    substantial_faces = [
        f for f in raw_faces
        if (f[2] * f[3]) >= (0.015 * w * h) and (len(f) <= 14 or f[14] >= 0.40)
    ]

    # 2. MULTIPLE FACES CHECK
    if len(substantial_faces) > 1:
        issues.insert(0, {
            "code": "multiple_faces",
            "message": f"Multiple faces detected ({len(substantial_faces)} faces found).",
            "fix_tip": "Please upload a photo with only one child in the frame."
        })

    # Select the largest face by bounding box area
    faces_sorted = sorted(raw_faces, key=lambda f: f[2] * f[3], reverse=True)
    f = faces_sorted[0]
    bx, by, bw, bh = [int(v) for v in f[:4]]
    conf = float(f[14]) if len(f) > 14 else 0.5

    # Refine blur and brightness specifically on the face crop
    face_crop_gray = gray[max(0, by):min(h, by + bh), max(0, bx):min(w, bx + bw)]
    if face_crop_gray.size > 0:
        face_lap = float(cv2.Laplacian(face_crop_gray, cv2.CV_64F).var())
        face_bright = float(np.mean(face_crop_gray))
        if face_bright < 35.0 and not is_too_dark:
            issues.append({
                "code": "too_dark",
                "message": f"Child's face is heavily shadowed (face brightness: {face_bright:.1f}/255).",
                "fix_tip": "Please upload a photo with even lighting on the face."
            })

    # 3. FACE WIDTH RATIO CHECK (< 15% of image width)
    face_width_ratio = bw / max(1, w)
    is_face_too_small = face_width_ratio < 0.15
    if is_face_too_small:
        issues.append({
            "code": "face_too_small",
            "message": f"Face is too small in the frame ({face_width_ratio*100:.1f}% of image width, min 15%).",
            "fix_tip": "Please crop closer to your child's head and shoulders."
        })

    re_x, re_y = float(f[4]), float(f[5])
    le_x, le_y = float(f[6]), float(f[7])
    nose_x, nose_y = float(f[8]), float(f[9])
    rm_x, rm_y = float(f[10]), float(f[11])
    lm_x, lm_y = float(f[12]), float(f[13])

    eye_dist = np.hypot(re_x - le_x, re_y - le_y)
    eye_dist_ratio = eye_dist / max(1, bw)

    # 4. FRONT-FACING EVALUATION (Yaw / Profile / Steep Angle)
    min_eye_x = min(re_x, le_x)
    max_eye_x = max(re_x, le_x)
    is_nose_between = (min_eye_x - 6 <= nose_x <= max_eye_x + 6)

    d_re = abs(nose_x - re_x)
    d_le = abs(nose_x - le_x)
    yaw_symmetry = min(d_re, d_le) / max(0.1, max(d_re, d_le))

    is_side_profile = (not is_nose_between) or (eye_dist_ratio < 0.25) or (yaw_symmetry < 0.48)
    if is_side_profile:
        issues.append({
            "code": "steep_angle",
            "message": "Child's face is turned sideways or at a steep profile angle.",
            "fix_tip": "Please upload a photo where your child faces the camera directly at eye level."
        })
    is_front_facing = not is_side_profile

    # 5. COVERED MOUTH & HAND/FINGER OBSTRUCTION EVALUATION
    mouth_dist = np.hypot(rm_x - lm_x, rm_y - lm_y)
    mouth_dist_ratio = mouth_dist / max(1, bw)
    mouth_cx = int((rm_x + lm_x) / 2)
    mouth_cy = int((rm_y + lm_y) / 2)

    m_h = int(bh * 0.28)
    m_w = int(bw * 0.45)
    my1 = max(0, mouth_cy - m_h // 2)
    my2 = min(h, mouth_cy + m_h // 2)
    mx1 = max(0, mouth_cx - m_w // 2)
    mx2 = min(w, mouth_cx + m_w // 2)

    mouth_covered = False
    mouth_cover_reason = ""

    if mouth_dist_ratio < 0.17:
        mouth_covered = True
        mouth_cover_reason = "Mouth appears covered or obstructed by hand/object."

    if my2 > my1 and mx2 > mx1:
        mouth_crop = img[my1:my2, mx1:mx2]
        b_c, g_c, r_c = cv2.split(mouth_crop.astype(float))
        strong_lip_pixels = np.sum((r_c - g_c > 22) & (r_c - b_c > 18) & (r_c > 75))
        total_m_pixels = mouth_crop.shape[0] * mouth_crop.shape[1]
        lip_ratio = strong_lip_pixels / max(1, total_m_pixels)

        gray_m = cv2.cvtColor(mouth_crop, cv2.COLOR_BGR2GRAY)
        sobel_v = cv2.Sobel(gray_m, cv2.CV_64F, 1, 0, ksize=3)
        v_edge_energy = float(np.mean(np.abs(sobel_v)))

        if lip_ratio < 0.035 and (v_edge_energy > 20.0 or is_side_profile):
            mouth_covered = True
            mouth_cover_reason = "Hand or fingers detected covering mouth/cheek."
        elif lip_ratio < 0.020:
            mouth_covered = True
            mouth_cover_reason = "Mouth appears covered or obstructed."

    if mouth_covered:
        issues.append({
            "code": "mouth_covered",
            "message": mouth_cover_reason or "Mouth or lower face appears covered or obstructed.",
            "fix_tip": "Please upload a photo with an uncovered, clear smile or natural expression."
        })
    has_uncovered_mouth = not mouth_covered

    # 6. SUNGLASSES EVALUATION
    ey1 = max(0, int(min(re_y, le_y) - bh * 0.12))
    ey2 = min(h, int(max(re_y, le_y) + bh * 0.12))
    ex1 = max(0, int(min(re_x, le_x) - bw * 0.12))
    ex2 = min(w, int(max(re_x, le_x) + bw * 0.12))

    has_sunglasses = False
    if ey2 > ey1 and ex2 > ex1:
        eye_crop = img[ey1:ey2, ex1:ex2]
        b_e, g_e, r_e = cv2.split(eye_crop.astype(float))
        total_eye_px = eye_crop.shape[0] * eye_crop.shape[1]

        green_tint = np.sum((g_e > r_e + 8) & (g_e > 65))
        blue_tint = np.sum((b_e > r_e + 12) & (b_e > 65))
        dark_lens = np.sum((r_e < 40) & (g_e < 40) & (b_e < 40))

        if (green_tint / total_eye_px > 0.06) or (blue_tint / total_eye_px > 0.07) or (dark_lens / total_eye_px > 0.35):
            has_sunglasses = True
            issues.append({
                "code": "sunglasses",
                "message": "Sunglasses or tinted eyewear detected covering child's eyes.",
                "fix_tip": "Please upload a photo showing your child's natural eyes without sunglasses."
            })

    # 7. DISTANCE & FRAMING
    face_area = bw * bh
    total_area = w * h
    face_coverage = face_area / max(1, total_area)
    is_far_away = face_coverage < 0.06 or bw < 80 or bh < 90

    # Overall scoring and validation result
    score = 98
    recommendations: List[str] = [i["fix_tip"] for i in issues]

    if is_side_profile:
        score -= 35
    if mouth_covered:
        score -= 30
    if has_sunglasses:
        score -= 35
    if is_far_away:
        score -= 25
    if len(substantial_faces) > 1:
        score -= 40
    if is_blurry:
        score -= 25
    if is_too_dark or is_too_bright:
        score -= 20

    score = max(15, min(99, score))

    # Blocking issues that prevent generation
    critical_codes = {"no_face", "multiple_faces"}
    has_critical_issue = any(i["code"] in critical_codes for i in issues)

    # Valid if no critical issues and front-facing with uncovered face
    is_valid = (not has_critical_issue) and is_front_facing and has_uncovered_mouth and (not has_sunglasses)

    checks = [
        {
            "id": "face_count",
            "title": "Single Child Face",
            "description": f"Found {len(substantial_faces)} faces." if len(substantial_faces) > 1 else "Single child face confirmed.",
            "status": "fail" if len(substantial_faces) > 1 else "pass",
            "tipRef": "Tip 1: One child only"
        },
        {
            "id": "front_facing",
            "title": "Front-Facing Portrait",
            "description": "Child appears turned away or in side profile." if is_side_profile else "Front-facing portrait angle confirmed.",
            "status": "fail" if is_side_profile else "pass",
            "tipRef": "Tip 1: Clear front-facing photo"
        },
        {
            "id": "uncovered_face",
            "title": "Uncovered Face & Mouth",
            "description": mouth_cover_reason if mouth_covered else "No obstructions or covered areas detected on face.",
            "status": "fail" if mouth_covered else "pass",
            "tipRef": "Tip 2: No eating or covered face"
        },
        {
            "id": "no_accessories",
            "title": "No Heavy Accessories",
            "description": "Sunglasses or tinted glasses detected covering eyes." if has_sunglasses else "No sunglasses or eye obstructions detected.",
            "status": "fail" if has_sunglasses else "pass",
            "tipRef": "Tip 3: No accessories"
        },
        {
            "id": "distance_framing",
            "title": "Close-Up Framing",
            "description": "Child appears too far away in the background." if (is_far_away or is_face_too_small) else "Close-up head and shoulders framing confirmed.",
            "status": "fail" if (is_far_away or is_face_too_small) else "pass",
            "tipRef": "Tip 4: No far away or side angle"
        }
    ]

    summary = (
        "Photo verified! Meets all portrait guidelines and ready for storybook generation."
        if is_valid
        else "Photo needs attention: " + "; ".join(recommendations[:2])
    )

    return {
        "passed": is_valid,
        "issues": issues,
        "is_valid": is_valid,
        "score": score,
        "face_count": len(substantial_faces),
        "dimensions": {"width": w, "height": h},
        "checks": checks,
        "summary": summary,
        "recommendations": recommendations,
        "diagnostics": {
            "has_sunglasses": has_sunglasses,
            "has_covered_mouth": mouth_covered,
            "is_side_angle": is_side_profile,
            "is_far_away": is_far_away,
            "is_face_too_small": is_face_too_small,
            "laplacian_var": round(laplacian_var, 1),
            "mean_brightness": round(mean_brightness, 1),
            "eye_dist_ratio": round(eye_dist_ratio, 3),
            "is_nose_between_eyes": is_nose_between,
            "yaw_symmetry": round(yaw_symmetry, 3),
            "mouth_dist_ratio": round(mouth_dist_ratio, 3),
            "face_width_ratio": round(face_width_ratio, 3),
        }
    }
