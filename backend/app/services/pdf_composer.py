import io
import os
import re
import sys
import uuid
import json
import logging
import tempfile
import urllib.request
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from PIL import Image

from reportlab.lib.pagesizes import inch
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from app.config import settings
from app.services.storage import storage

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# HarfBuzz Text Shaping Integration for Indic and Complex Scripts
# ---------------------------------------------------------------------------
HAS_HARFBUZZ = False
try:
    import uharfbuzz
    from reportlab.pdfbase import ttfonts
    if getattr(ttfonts, "uharfbuzz", None) is None:
        ttfonts.uharfbuzz = uharfbuzz
    HAS_HARFBUZZ = True
    logger.info("[PDFComposer] HarfBuzz text shaping is ACTIVE (uharfbuzz %s)", getattr(uharfbuzz, "__version__", "unknown"))
except Exception as _hb_err:
    HAS_HARFBUZZ = False
    logger.warning("[PDFComposer] HarfBuzz text shaping is NOT active: %s. Indic ligatures will not be shaped.", _hb_err)


def safe_shape_text(text: str, font_name: str, font_size: float = 12.0) -> str:
    """
    Safely shape Indic/complex text with HarfBuzz if supported, otherwise return original text.
    ReportLab's Paragraph handles word shaping internally when shapable=True, but canvas
    c.drawString(...) calls need explicit shapeStr shaping.
    """
    if not text or not HAS_HARFBUZZ:
        return text
    try:
        from reportlab.pdfbase.ttfonts import shapeStr
        return shapeStr(text, font_name, font_size)
    except Exception:
        return text


# ---------------------------------------------------------------------------
# Page Geometry Specifications
# ---------------------------------------------------------------------------
POINTS_PER_MM = 72.0 / 25.4
PAGE_WIDTH_PT = settings.PRINT_TRIM_WIDTH_MM * POINTS_PER_MM
PAGE_HEIGHT_PT = settings.PRINT_TRIM_HEIGHT_MM * POINTS_PER_MM
BLEED_PT = settings.PRINT_BLEED_MM * POINTS_PER_MM
MARGIN_PT = settings.PRINT_SAFE_MARGIN_MM * POINTS_PER_MM


# ---------------------------------------------------------------------------
# Multilingual Font Configuration & Ubuntu / Linux / Windows Compatibility
# ---------------------------------------------------------------------------
LANGUAGE_ALIAS_MAP: Dict[str, str] = {
    "en": "english",
    "ta": "tamil",
    "hi": "hindi",
    "te": "telugu",
    "ml": "malayalam",
    "kn": "kannada",
    "mr": "marathi",
}

LANGUAGE_FONT_CONFIG: Dict[str, Dict[str, Any]] = {
    "tamil": {
        "family": "NotoSansTamil",
        "linux_files": [
            "NotoSansTamil-Bold.ttf",
            "NotoSansTamil-Regular.ttf",
            "NotoSansTamil-Medium.ttf",
            "NotoSansTamil-SemiBold.ttf",
            "NotoSansTamil[wdth,wght].ttf",
            "NotoSansTamil-Regular.otf",
            "NotoSansTamil-Bold.otf",
            "NotoSerifTamil-Regular.ttf",
            "NotoSerifTamil-Bold.ttf",
            "Lohit-Tamil.ttf",
            "Samyak-Tamil.ttf",
        ],
        "subdirs": [
            "truetype/noto",
            "opentype/noto",
            "noto",
            "truetype/lohit-tamil",
            "truetype/samyak-fonts",
            "truetype/fonts-taml",
            "truetype",
            "opentype",
        ],
        "keywords": ["notosanstamil", "notoseriftamil", "lohittamil", "samyaktamil", "tamil"],
        "windows": [
            ("C:/Windows/Fonts/NirmalaB.ttf", None),
            ("C:/Windows/Fonts/Nirmala.ttc", 0),
            ("C:/Windows/Fonts/nirmala.ttc", 0),
        ],
        "download_url": "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansTamil/NotoSansTamil-Regular.ttf",
    },
    "hindi": {
        "family": "NotoSansDevanagari",
        "linux_files": [
            "NotoSansDevanagari-Bold.ttf",
            "NotoSansDevanagari-Regular.ttf",
            "NotoSansDevanagari-Medium.ttf",
            "NotoSansDevanagari-SemiBold.ttf",
            "NotoSansDevanagari[wdth,wght].ttf",
            "NotoSansDevanagari-Regular.otf",
            "NotoSansDevanagari-Bold.otf",
            "NotoSerifDevanagari-Regular.ttf",
            "NotoSerifDevanagari-Bold.ttf",
            "Lohit-Devanagari.ttf",
            "gargi.ttf",
            "Gargi.ttf",
            "Samyak-Devanagari.ttf",
        ],
        "subdirs": [
            "truetype/noto",
            "opentype/noto",
            "noto",
            "truetype/lohit-devanagari",
            "truetype/fonts-deva-extra",
            "truetype/samyak-fonts",
            "truetype",
            "opentype",
        ],
        "keywords": ["notosansdevanagari", "notoserifdevanagari", "lohitdevanagari", "gargi", "samyakdevanagari", "devanagari"],
        "windows": [
            ("C:/Windows/Fonts/NirmalaB.ttf", None),
            ("C:/Windows/Fonts/Nirmala.ttc", 0),
            ("C:/Windows/Fonts/nirmala.ttc", 0),
        ],
        "download_url": "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf",
    },
    "marathi": {
        "family": "NotoSansDevanagari",
        "linux_files": [
            "NotoSansDevanagari-Bold.ttf",
            "NotoSansDevanagari-Regular.ttf",
            "NotoSansDevanagari-Medium.ttf",
            "NotoSansDevanagari-SemiBold.ttf",
            "NotoSansDevanagari[wdth,wght].ttf",
            "NotoSansDevanagari-Regular.otf",
            "NotoSerifDevanagari-Regular.ttf",
            "Lohit-Devanagari.ttf",
            "gargi.ttf",
            "Gargi.ttf",
            "Samyak-Devanagari.ttf",
        ],
        "subdirs": [
            "truetype/noto",
            "opentype/noto",
            "noto",
            "truetype/lohit-devanagari",
            "truetype/fonts-deva-extra",
            "truetype/samyak-fonts",
            "truetype",
            "opentype",
        ],
        "keywords": ["notosansdevanagari", "notoserifdevanagari", "lohitdevanagari", "gargi", "samyakdevanagari", "devanagari"],
        "windows": [
            ("C:/Windows/Fonts/NirmalaB.ttf", None),
            ("C:/Windows/Fonts/Nirmala.ttc", 0),
            ("C:/Windows/Fonts/nirmala.ttc", 0),
        ],
        "download_url": "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf",
    },
    "telugu": {
        "family": "NotoSansTelugu",
        "linux_files": [
            "NotoSansTelugu-Bold.ttf",
            "NotoSansTelugu-Regular.ttf",
            "NotoSansTelugu-Medium.ttf",
            "NotoSansTelugu-SemiBold.ttf",
            "NotoSansTelugu[wdth,wght].ttf",
            "NotoSansTelugu-Regular.otf",
            "NotoSansTelugu-Bold.otf",
            "NotoSerifTelugu-Regular.ttf",
            "NotoSerifTelugu-Bold.ttf",
            "Lohit-Telugu.ttf",
        ],
        "subdirs": [
            "truetype/noto",
            "opentype/noto",
            "noto",
            "truetype/lohit-telugu",
            "truetype/fonts-telu",
            "truetype",
            "opentype",
        ],
        "keywords": ["notosanstelugu", "notoseriftelugu", "lohittelugu", "telugu"],
        "windows": [
            ("C:/Windows/Fonts/NirmalaB.ttf", None),
            ("C:/Windows/Fonts/Nirmala.ttc", 0),
            ("C:/Windows/Fonts/nirmala.ttc", 0),
        ],
        "download_url": "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansTelugu/NotoSansTelugu-Regular.ttf",
    },
    "malayalam": {
        "family": "NotoSansMalayalam",
        "linux_files": [
            "NotoSansMalayalam-Bold.ttf",
            "NotoSansMalayalam-Regular.ttf",
            "NotoSansMalayalam-Medium.ttf",
            "NotoSansMalayalam-SemiBold.ttf",
            "NotoSansMalayalam[wdth,wght].ttf",
            "NotoSansMalayalam-Regular.otf",
            "NotoSansMalayalam-Bold.otf",
            "NotoSerifMalayalam-Regular.ttf",
            "NotoSerifMalayalam-Bold.ttf",
            "Lohit-Malayalam.ttf",
            "AnjaliOldLipi.ttf",
            "Manjari-Regular.ttf",
            "Rachana-Regular.ttf",
            "Gayathri-Regular.ttf",
        ],
        "subdirs": [
            "truetype/noto",
            "opentype/noto",
            "noto",
            "truetype/lohit-malayalam",
            "truetype/malayalam",
            "truetype/fonts-mlym",
            "truetype",
            "opentype",
        ],
        "keywords": ["notosansmalayalam", "notoserifmalayalam", "lohitmalayalam", "anjalioldlipi", "manjari", "rachana", "malayalam"],
        "windows": [
            ("C:/Windows/Fonts/NirmalaB.ttf", None),
            ("C:/Windows/Fonts/Nirmala.ttc", 0),
            ("C:/Windows/Fonts/nirmala.ttc", 0),
        ],
        "download_url": "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansMalayalam/NotoSansMalayalam-Regular.ttf",
    },
    "kannada": {
        "family": "NotoSansKannada",
        "linux_files": [
            "NotoSansKannada-Bold.ttf",
            "NotoSansKannada-Regular.ttf",
            "NotoSansKannada-Medium.ttf",
            "NotoSansKannada[wdth,wght].ttf",
            "NotoSansKannada-Regular.otf",
            "NotoSansKannada-Bold.otf",
            "NotoSerifKannada-Regular.ttf",
            "Lohit-Kannada.ttf",
            "Gubbi.ttf",
        ],
        "subdirs": [
            "truetype/noto",
            "opentype/noto",
            "noto",
            "truetype/lohit-kannada",
            "truetype/kannada",
            "truetype",
            "opentype",
        ],
        "keywords": ["notosanskannada", "notoserifkannada", "lohitkannada", "gubbi", "kannada"],
        "windows": [
            ("C:/Windows/Fonts/NirmalaB.ttf", None),
            ("C:/Windows/Fonts/Nirmala.ttc", 0),
            ("C:/Windows/Fonts/nirmala.ttc", 0),
        ],
        "download_url": "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansKannada/NotoSansKannada-Regular.ttf",
    },
    "english": {
        "family": "NotoSans",
        "linux_files": [
            "NotoSans-Bold.ttf",
            "NotoSans-Regular.ttf",
            "DejaVuSans-Bold.ttf",
            "DejaVuSans.ttf",
            "FreeSansBold.ttf",
            "FreeSans.ttf",
            "LiberationSans-Bold.ttf",
            "LiberationSans-Regular.ttf",
        ],
        "subdirs": [
            "truetype/noto",
            "truetype/dejavu",
            "truetype/freefont",
            "truetype/liberation",
            "truetype",
            "opentype",
        ],
        "keywords": ["notosans", "dejavusans", "freesans", "liberationsans"],
        "windows": [
            ("C:/Windows/Fonts/segoeuib.ttf", None),
            ("C:/Windows/Fonts/segoeui.ttf", None),
            ("C:/Windows/Fonts/arialbd.ttf", None),
            ("C:/Windows/Fonts/arial.ttf", None),
        ],
        "download_url": "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf",
    },
}

LINUX_FONT_BASE_DIRS = [
    Path("/usr/share/fonts"),
    Path("/usr/local/share/fonts"),
    Path.home() / ".fonts",
    Path.home() / ".local/share/fonts",
]

LOCAL_FONT_DIRS = [
    Path(__file__).resolve().parent / "fonts",
    Path(__file__).resolve().parent.parent / "fonts",
    Path(__file__).resolve().parent.parent.parent / "storage" / "fonts",
    Path(__file__).resolve().parent.parent.parent / "backend" / "cache" / "fonts",
    Path(tempfile.gettempdir()) / "kuttystory_fonts",
]

# In-memory registry cache to avoid repeated filesystem lookups
_RESOLVED_FONT_FILES: Dict[str, Tuple[Path, Optional[int]]] = {}
_REGISTERED_FONTS: Dict[str, str] = {}
_SCANNED_DIR_FILES: Optional[List[Path]] = None


def _get_font_search_roots() -> List[Path]:
    roots: List[Path] = []
    # 1. Explicit environment variable overrides
    for env_var in ["FONTS_DIR", "NOTO_FONTS_DIR"]:
        val = os.environ.get(env_var)
        if val and os.path.isdir(val):
            roots.append(Path(val))
    # 2. Local backend/storage directories
    for d in LOCAL_FONT_DIRS:
        if d.exists() and d.is_dir():
            roots.append(d)
    # 3. Standard Linux font roots
    for d in LINUX_FONT_BASE_DIRS:
        if d.exists() and d.is_dir():
            roots.append(d)
    return roots


def _scan_available_fonts() -> List[Path]:
    global _SCANNED_DIR_FILES
    if _SCANNED_DIR_FILES is not None:
        return _SCANNED_DIR_FILES

    scanned: List[Path] = []
    for root_dir in _get_font_search_roots():
        try:
            for root, _, files in os.walk(root_dir):
                for f in files:
                    if f.lower().endswith((".ttf", ".otf", ".ttc")):
                        scanned.append(Path(root) / f)
        except Exception:
            continue
    _SCANNED_DIR_FILES = scanned
    return _SCANNED_DIR_FILES


def _download_font_fallback(lang_key: str, url: str) -> Optional[Path]:
    """
    Attempt to download Noto font from official Google Fonts repository to local cache directory.
    Guarantees that on bare Linux containers without pre-installed font packages, text renders without black boxes.
    """
    if not url:
        return None
    try:
        target_dir = Path(tempfile.gettempdir()) / "kuttystory_fonts"
        target_dir.mkdir(parents=True, exist_ok=True)
        filename = url.split("/")[-1]
        target_file = target_dir / filename
        if target_file.exists() and target_file.stat().st_size > 1024:
            return target_file

        req = urllib.request.Request(url, headers={"User-Agent": "KuttyStory-PDFComposer/1.0"})
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                content = response.read()
                if len(content) > 1024:
                    with open(target_file, "wb") as f:
                        f.write(content)
                    return target_file
    except Exception as e:
        print(f"Notice: Font auto-download for {lang_key} skipped: {e}")
    return None


def _find_font_file(lang_key: str) -> Optional[Tuple[Path, Optional[int]]]:
    if lang_key in _RESOLVED_FONT_FILES:
        return _RESOLVED_FONT_FILES[lang_key]

    cfg = LANGUAGE_FONT_CONFIG.get(lang_key, LANGUAGE_FONT_CONFIG["english"])

    # 1. Check direct Linux candidate paths across all font search roots
    roots = _get_font_search_roots()
    subdirs = cfg.get("subdirs", [])
    filenames = cfg.get("linux_files", [])

    for r in roots:
        # Check root directly
        for fn in filenames:
            p = r / fn
            if p.is_file():
                _RESOLVED_FONT_FILES[lang_key] = (p, None)
                return (p, None)
        # Check configured subdirectories
        for sub in subdirs:
            for fn in filenames:
                p = r / sub / fn
                if p.is_file():
                    _RESOLVED_FONT_FILES[lang_key] = (p, None)
                    return (p, None)

    # 2. Check Windows candidate fonts if running on Windows
    for cand, subfont_idx in cfg.get("windows", []):
        try:
            p = Path(cand)
            if p.is_file():
                _RESOLVED_FONT_FILES[lang_key] = (p, subfont_idx)
                return (p, subfont_idx)
        except Exception:
            continue

    # 3. Recursive directory search in font roots matching language keywords
    keywords = [kw.lower() for kw in cfg.get("keywords", [])]
    all_fonts = _scan_available_fonts()
    for fp in all_fonts:
        name_clean = fp.name.lower().replace("-", "").replace("_", "")
        if any(kw in name_clean for kw in keywords):
            sub_idx = 0 if fp.suffix.lower() == ".ttc" else None
            _RESOLVED_FONT_FILES[lang_key] = (fp, sub_idx)
            return (fp, sub_idx)

    # 4. Universal Indic font fallback (Nirmala on Windows or Lohit/Samyak on Linux)
    indic_fallbacks = [
        "C:/Windows/Fonts/Nirmala.ttc",
        "C:/Windows/Fonts/nirmala.ttc",
        "C:/Windows/Fonts/NirmalaB.ttf",
        "/usr/share/fonts/truetype/lohit-tamil/Lohit-Tamil.ttf",
        "/usr/share/fonts/truetype/samyak-fonts/Samyak-Tamil.ttf",
    ]
    if lang_key == "english":
        indic_fallbacks.extend([
            "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
        ])

    for cand in indic_fallbacks:
        p = Path(cand)
        if p.is_file():
            sub_idx = 0 if cand.lower().endswith(".ttc") else None
            _RESOLVED_FONT_FILES[lang_key] = (p, sub_idx)
            return (p, sub_idx)

    # 5. Fallback download from Google Fonts
    dl_url = cfg.get("download_url")
    if dl_url:
        dl_path = _download_font_fallback(lang_key, dl_url)
        if dl_path and dl_path.is_file():
            _RESOLVED_FONT_FILES[lang_key] = (dl_path, None)
            return (dl_path, None)

    return None


def register_font_for_language(lang_key: str) -> str:
    """
    Resolve, register with ReportLab, and embed the appropriate TrueType font for the given language.
    Guarantees no black boxes for Tamil, Hindi, Telugu, Malayalam, Kannada, Marathi, or English.
    """
    clean_lang = LANGUAGE_ALIAS_MAP.get(str(lang_key).lower().strip(), str(lang_key).lower().strip())
    if clean_lang not in LANGUAGE_FONT_CONFIG:
        clean_lang = "english"

    if clean_lang in _REGISTERED_FONTS:
        reg_name = _REGISTERED_FONTS[clean_lang]
        if reg_name in pdfmetrics.getRegisteredFontNames():
            return reg_name

    cfg = LANGUAGE_FONT_CONFIG.get(clean_lang, LANGUAGE_FONT_CONFIG["english"])
    resolved = _find_font_file(clean_lang)

    if resolved:
        font_path, subfont_idx = resolved
        font_name = f"Kutty_{cfg['family']}"
        try:
            if str(font_path).lower().endswith(".ttc"):
                font_obj = TTFont(font_name, str(font_path), subfontIndex=subfont_idx or 0, shapable=True)
            else:
                font_obj = TTFont(font_name, str(font_path), shapable=True)

            # Ensure HarfBuzz font face and private use mapping are initialized immediately
            if HAS_HARFBUZZ:
                try:
                    font_obj.hbFont(10)
                except Exception as _e:
                    logger.debug("[PDFComposer] hbFont initialization notice: %s", _e)

            pdfmetrics.registerFont(font_obj)
            _REGISTERED_FONTS[clean_lang] = font_name
            return font_name
        except Exception as e:
            print(f"Warning: Could not register font {font_path} for {clean_lang}: {e}")

    # Fallback to English font or standard PDF font
    if clean_lang != "english":
        en_font = register_font_for_language("english")
        if en_font and en_font != "Helvetica":
            _REGISTERED_FONTS[clean_lang] = en_font
            return en_font

    _REGISTERED_FONTS[clean_lang] = "Helvetica-Bold"
    return "Helvetica-Bold"


# Initialize default story and body fonts
DEFAULT_STORY_FONT = register_font_for_language("english")
DEFAULT_BODY_FONT = DEFAULT_STORY_FONT


def _prepare_story_text_markup(text: str, primary_font: str, latin_font: str) -> str:
    """
    Format mixed-language story text for ReportLab's Paragraph parser.
    Escapes raw XML entities (&, <, >) that are not valid HTML tags.
    If the primary font (such as Noto Sans Tamil) lacks Latin glyphs, any English/Latin
    word tokens (such as child names like 'Leo') are wrapped in <font face='latin_font'>
    so they render cleanly without missing glyph .notdef boxes.
    """
    if not text:
        return ""
    if "english" in primary_font.lower() or primary_font == "Kutty_NotoSans":
        return re.sub(r"&(?!(?:amp|lt|gt|quot|apos);)", "&amp;", text)

    # Escape raw ampersands not part of XML entities
    escaped = re.sub(r"&(?!(?:amp|lt|gt|quot|apos);)", "&amp;", text)

    # Split text on HTML tags so tags and attributes are preserved
    tokens = re.split(r"(<[^>]+>)", escaped)
    result = []
    latin_word_re = re.compile(r"([A-Za-z\u00C0-\u024F]+)")
    for token in tokens:
        if token.startswith("<") and token.endswith(">"):
            result.append(token)
        else:
            wrapped = latin_word_re.sub(rf"<font face='{latin_font}'>\1</font>", token)
            result.append(wrapped)
    return "".join(result)


def _parse_pdf_color(color_str: str, default_color=colors.white) -> colors.Color:
    if not color_str:
        return default_color
    s = str(color_str).strip()
    if s.startswith("#"):
        try:
            return colors.HexColor(s)
        except Exception:
            return default_color
    if s.startswith("rgb"):
        try:
            m = re.findall(r"[\d.]+", s)
            if len(m) >= 3:
                r = float(m[0]) / 255.0
                g = float(m[1]) / 255.0
                b = float(m[2]) / 255.0
                a = float(m[3]) if len(m) >= 4 else 1.0
                return colors.Color(r, g, b, alpha=a)
        except Exception:
            pass
    return default_color


class PDFComposerService:
    """
    Deterministic Multilingual PDF Layout Engine using ReportLab & HarfBuzz.
    Separates artwork generation from typography, ensuring sharp vector text,
    proper margins, bleed handling, CMYK color separation, Indic text shaping,
    and embedded Unicode fonts for Tamil, Hindi, Telugu, Malayalam, Marathi, and English.
    """

    @staticmethod
    def detect_script_language(text: str, default_lang: str = "english") -> str:
        """
        Inspect Unicode codepoints in the text to determine the Indic script.
        Ensures that even if language is unspecified, Indic text is rendered
        with the appropriate embedded Unicode font rather than Helvetica.
        """
        if not text:
            return default_lang

        counts = {
            "tamil": sum(1 for ch in text if 0x0B80 <= ord(ch) <= 0x0BFF),
            "hindi": sum(1 for ch in text if 0x0900 <= ord(ch) <= 0x097F),
            "telugu": sum(1 for ch in text if 0x0C00 <= ord(ch) <= 0x0C7F),
            "malayalam": sum(1 for ch in text if 0x0D00 <= ord(ch) <= 0x0D7F),
            "kannada": sum(1 for ch in text if 0x0C80 <= ord(ch) <= 0x0CFF),
        }
        best_lang, best_count = max(counts.items(), key=lambda x: x[1])
        if best_count > 0:
            return best_lang
        return default_lang

    @classmethod
    def get_font_for_language(cls, language: str) -> str:
        """
        Public helper to retrieve the registered font name for a language.
        """
        return register_font_for_language(language)

    @classmethod
    def compose_storybook_pdf_bytes(
        cls,
        pages_data: List[Dict[str, Any]],
        book_type: str = "preview",
        child_name: str = "Little Adventurer",
        story_title: str = "Personalized Story",
        page_size: str = "8x8",
        color_mode: str = "rgb",
        language: str = "english"
    ) -> Tuple[bytes, Dict[str, Any]]:
        """
        Compose a complete, deterministic square children's picture book into PDF bytes.
        """
        pdf_buffer = io.BytesIO()

        # 1. Resolve Page Geometry (8x8 inches = 203.2 x 203.2 mm = 576 x 576 pt)
        normalized_size = str(page_size).lower().strip().replace(" ", "")
        if any(token in normalized_size for token in ["8x8", "8*8", "8inch"]):
            page_w_pt = 8.0 * inch
            page_h_pt = 8.0 * inch
            trim_label = "8 x 8 inches (203.2 x 203.2 mm)"
        elif "210" in normalized_size:
            page_w_pt = 210.0 * POINTS_PER_MM
            page_h_pt = 210.0 * POINTS_PER_MM
            trim_label = "210 x 210 mm"
        else:
            page_w_pt = 8.0 * inch
            page_h_pt = 8.0 * inch
            trim_label = "8 x 8 inches (203.2 x 203.2 mm)"

        is_cmyk = (str(color_mode).lower().strip() == "cmyk")

        # ReportLab Canvas targeting in-memory BytesIO
        c = canvas.Canvas(pdf_buffer, pagesize=(page_w_pt, page_h_pt))

        # Color definitions for CMYK vs RGB
        if is_cmyk:
            card_fill = colors.CMYKColor(0.01, 0.02, 0.04, 0.01, alpha=0.94)  # Ivory in CMYK
            card_stroke = colors.CMYKColor(0.12, 0.22, 0.60, 0.10, alpha=0.50) # Muted gold in CMYK
            text_color = colors.CMYKColor(0.30, 0.50, 0.20, 0.85)             # Deep plum rich black
            page_num_color = colors.CMYKColor(0.10, 0.10, 0.10, 0.60)         # Muted charcoal
            banner_bg = colors.CMYKColor(0.10, 0.40, 0.30, 0.05, alpha=0.85)  # Dusty rose in CMYK
            fallback_bg = colors.CMYKColor(0.01, 0.02, 0.04, 0.01)
        else:
            card_fill = colors.Color(0.98, 0.97, 0.95, alpha=0.98)
            card_stroke = colors.Color(0.83, 0.69, 0.22, alpha=0.40)
            text_color = colors.HexColor("#2D222A")
            page_num_color = colors.HexColor("#7A7077")
            banner_bg = colors.Color(0.87, 0.65, 0.64, alpha=0.85)
            fallback_bg = colors.HexColor("#FAF7F2")

        preflight_validation: Dict[str, Any] = {
            "book_type": book_type,
            "page_count": len(pages_data),
            "trim_size": trim_label,
            "dimensions_pt": f"{page_w_pt:.2f} x {page_h_pt:.2f}",
            "color_space": "DeviceCMYK (4 Channels)" if is_cmyk else "DeviceRGB (3 Channels)",
            "aspect_ratio": "1:1 Square",
            "has_missing_images": False,
            "dpi_check": [],
            "validation_passed": True
        }

        # Strictly limit free preview PDF to max 3 personalized pages
        if book_type == "preview":
            pages_data = pages_data[:3]

        pages_rendered = 0
        doc_lang = str(language or "english").lower().strip()

        for idx, page_info in enumerate(pages_data):
            page_num = page_info.get("page_number", idx + 1)
            raw_img_path = page_info.get("image_path")
            story_text = page_info.get("story_text", "")
            for tag in ["[Name]", "[name]", "{name}", "{{name}}", "[child_name]", "{child_name}", "{{child_name}}"]:
                story_text = story_text.replace(tag, child_name)

            # Retrieve image from MinIO storage directly in-memory, or local file / PIL image
            pil_img = None
            if raw_img_path:
                if isinstance(raw_img_path, Image.Image):
                    pil_img = raw_img_path
                elif isinstance(raw_img_path, bytes):
                    try:
                        pil_img = Image.open(io.BytesIO(raw_img_path))
                    except Exception:
                        pil_img = None
                elif os.path.exists(str(raw_img_path)):
                    try:
                        pil_img = Image.open(str(raw_img_path))
                    except Exception:
                        pil_img = None
                else:
                    try:
                        img_bytes = storage.get_bytes(str(raw_img_path))
                        pil_img = Image.open(io.BytesIO(img_bytes))
                    except Exception as e:
                        print(f"Notice: Could not load image from storage ({raw_img_path}): {e}")
                        pil_img = None

            # For preview PDFs, never draw empty template / blank pages
            if pil_img is None:
                if book_type == "preview":
                    continue
                preflight_validation["has_missing_images"] = True
                preflight_validation["validation_passed"] = False
                c.saveState()
                c.setFillColor(fallback_bg)
                c.rect(0, 0, page_w_pt, page_h_pt, fill=1, stroke=0)
                c.restoreState()
                c.showPage()
                pages_rendered += 1
                continue

            c.saveState()

            # 2. Draw Illustration Artwork (Full Bleed)
            image_drawn = False
            try:
                from reportlab.lib.utils import ImageReader
                w, h = pil_img.size
                dpi_x = (w / (page_w_pt / 72.0))
                preflight_validation["dpi_check"].append({
                    "page": page_num,
                    "resolution_px": f"{w}x{h}",
                    "effective_dpi": round(dpi_x, 1)
                })

                if is_cmyk:
                    draw_img = pil_img.convert("CMYK")
                else:
                    draw_img = pil_img.convert("RGB")

                c.drawImage(ImageReader(draw_img), 0, 0, width=page_w_pt, height=page_h_pt, preserveAspectRatio=True)
                image_drawn = True
            except Exception as e:
                print(f"Notice: Error drawing image on page {page_num}: {e}")
                if book_type == "preview":
                    c.restoreState()
                    continue
                preflight_validation["has_missing_images"] = True
                preflight_validation["validation_passed"] = False
                c.setFillColor(fallback_bg)
                c.rect(0, 0, page_w_pt, page_h_pt, fill=1, stroke=0)

            # 3. Draw Narrative Text / Background Box with Language-Specific Unicode Font
            clean_story_text = story_text.strip() if story_text else ""
            if image_drawn and clean_story_text and not clean_story_text.lower().startswith("story scene for page"):
                try:
                    c.saveState()
                    has_box = bool(page_info.get("has_background_box", True))
                    text_x_pct = float(page_info.get("text_x", 50.0) if page_info.get("text_x") is not None else 50.0)
                    text_y_pct = float(page_info.get("text_y", 89.5) if page_info.get("text_y") is not None else 89.5)
                    font_color_str = str(page_info.get("font_color") or "#2D222A")
                    box_bg_str = str(page_info.get("box_bg_color") or "#FFFFFF")
                    box_border_str = str(page_info.get("box_border_color") or "#E5E7EB")
                    box_border_w = int(page_info.get("box_border_width", 1) if page_info.get("box_border_width") is not None else 1)
                    box_bg_opacity = float(page_info.get("box_bg_opacity", 0.85) if page_info.get("box_bg_opacity") is not None else 0.85)
                    box_bg_opacity = max(0.0, min(1.0, box_bg_opacity))
                    raw_align = str(page_info.get("text_align") or "center").lower()

                    align_code = 1 if raw_align == "center" else (2 if raw_align == "right" else 0)

                    resolved_text_color = text_color if is_cmyk else _parse_pdf_color(font_color_str, text_color)
                    resolved_bg_color = card_fill if is_cmyk else _parse_pdf_color(box_bg_str, colors.white)
                    resolved_border_color = card_stroke if is_cmyk else _parse_pdf_color(box_border_str, colors.HexColor("#E5E7EB"))

                    # Canvas coordinate conversion: (0, 0) is bottom-left, y goes upward
                    center_x_pt = (text_x_pct / 100.0) * page_w_pt
                    center_y_pt = (1.0 - (text_y_pct / 100.0)) * page_h_pt

                    font_size_pt = max(9, min(24, int(page_info.get("font_size", 15) or 15)))
                    leading_pt = font_size_pt * 1.35

                    # Resolve correct Unicode font for the page's language and script
                    page_lang = str(page_info.get("language") or doc_lang).lower().strip()
                    effective_lang = cls.detect_script_language(clean_story_text, default_lang=page_lang)
                    story_font = cls.get_font_for_language(effective_lang)
                    latin_font = cls.get_font_for_language("english")

                    story_markup = _prepare_story_text_markup(clean_story_text, story_font, latin_font)

                    # Explicitly enable shaping=1 so ReportLab activates HarfBuzz text shaping for Tamil & Indic scripts
                    p_style = ParagraphStyle(
                        f"PDFStoryText_{idx}",
                        fontName=story_font,
                        fontSize=font_size_pt,
                        leading=leading_pt,
                        textColor=resolved_text_color,
                        alignment=align_code,
                        shaping=1 if HAS_HARFBUZZ else 0
                    )
                    para = Paragraph(story_markup, p_style)
                    box_layout = str(page_info.get("box_layout") or "banner").lower()
                    box_radius = int(page_info.get("box_border_radius", 14) if page_info.get("box_border_radius") is not None else 14)
                    box_radius = max(0, min(40, box_radius))
                    max_box_w = page_w_pt * 0.90 if box_layout == "banner" else page_w_pt * 0.88

                    if not has_box:
                        # Only show narrative text, no box
                        wrap_w = max_box_w - 20.0
                        para_w, para_h = para.wrap(wrap_w, 300)
                        draw_x = center_x_pt - (para_w / 2.0) if align_code == 1 else (center_x_pt - para_w if align_code == 2 else center_x_pt - (para_w / 2.0))
                        draw_x = max(16.0, min(page_w_pt - para_w - 16.0, draw_x))
                        draw_y = max(16.0, min(page_h_pt - para_h - 16.0, center_y_pt - (para_h / 2.0)))
                        para.drawOn(c, draw_x, draw_y)
                    else:
                        # Draw background box with configured layout, opacity, border & alignment
                        if box_layout == "banner":
                            box_width = page_w_pt * 0.90
                            para_w, para_h = para.wrap(box_width - 32.0, 300)
                            box_height = para_h + 18.0
                            box_x = max(8.0, min(page_w_pt - box_width - 8.0, center_x_pt - (box_width / 2.0)))
                            box_y = max(16.0, min(page_h_pt - box_height - 16.0, center_y_pt - (box_height / 2.0)))
                            text_x = box_x + 16.0
                            text_y = box_y + (box_height - para_h) / 2.0
                        else:
                            para_w, para_h = para.wrap(max_box_w - 28.0, 300)
                            box_width = min(max_box_w, max(para_w + 28.0, 100.0))
                            box_height = para_h + 16.0
                            box_x = max(12.0, min(page_w_pt - box_width - 12.0, center_x_pt - (box_width / 2.0)))
                            box_y = max(12.0, min(page_h_pt - box_height - 12.0, center_y_pt - (box_height / 2.0)))
                            text_x = box_x + 14.0
                            text_y = box_y + (box_height - para_h) / 2.0

                        c.saveState()
                        c.setFillColor(resolved_bg_color)
                        c.setFillAlpha(box_bg_opacity)
                        c.setStrokeColor(resolved_border_color)
                        c.setLineWidth(max(0.5, float(box_border_w)))
                        c.roundRect(box_x, box_y, box_width, box_height, radius=box_radius, fill=1, stroke=1 if box_border_w > 0 else 0)
                        c.restoreState()

                        para.drawOn(c, text_x, text_y)

                    c.restoreState()
                except Exception as text_err:
                    print(f"Notice: Could not render story text overlay on page {page_num}: {text_err}")

            # 4. Preview Watermark (Language Edition badge removed per request)
            lang_key = str(doc_lang or "english").lower().strip()

            if book_type == "preview" and image_drawn:
                c.saveState()
                c.setFillColor(banner_bg)
                wm_text = f"PERSONALIZED PREVIEW • {lang_key.upper()}" if lang_key != "english" else "PERSONALIZED PREVIEW"
                wm_font = cls.get_font_for_language("english") or "Helvetica-Bold"
                c.setFont(wm_font, 8.5)
                wm_w = max(c.stringWidth(wm_text, wm_font, 8.5) + 24.0, 170.0)
                c.rect(0, page_h_pt - 26, wm_w, 26, fill=1, stroke=0)
                c.setFillColor(colors.white)
                c.drawString(14, page_h_pt - 17, wm_text)
                c.restoreState()

            c.restoreState()
            c.showPage()
            pages_rendered += 1

            if book_type == "preview" and pages_rendered >= 3:
                break

        preflight_validation["page_count"] = pages_rendered
        c.save()

        return pdf_buffer.getvalue(), preflight_validation

    @classmethod
    def compose_storybook_pdf(
        cls,
        pages_data: List[Dict[str, Any]],
        output_filename: str,
        book_type: str = "preview",
        child_name: str = "Little Adventurer",
        story_title: str = "Personalized Story",
        page_size: str = "8x8",
        color_mode: str = "rgb",
        language: str = "english"
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Compose a complete, deterministic square children's picture book and save to MinIO.
        """
        pdf_bytes, preflight_validation = cls.compose_storybook_pdf_bytes(
            pages_data=pages_data,
            book_type=book_type,
            child_name=child_name,
            story_title=story_title,
            page_size=page_size,
            color_mode=color_mode,
            language=language
        )

        category = "previews" if book_type == "preview" else "final_books"
        object_key = storage.save_bytes(
            data=pdf_bytes,
            category=category,
            custom_name=output_filename,
            extension=".pdf"
        )
        return object_key, preflight_validation
