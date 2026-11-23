import os
from pathlib import Path
from dotenv import load_dotenv, find_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import List, Union, Optional

BASE_DIR = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = Path(__file__).resolve().parent.parent
STORAGE_BASE = BACKEND_DIR / "storage"

# Search and load .env file reliably from all likely locations
def find_and_load_env():
    candidates = [
        BACKEND_DIR / ".env",
        BASE_DIR / ".env",
        Path.cwd() / ".env",
    ]
    # Check parent directory hierarchy
    p = Path.cwd().resolve()
    for _ in range(3):
        cand = p / ".env"
        if cand not in candidates:
            candidates.append(cand)
        if p == p.parent:
            break
        p = p.parent

    primary_env = None
    for cand in candidates:
        if cand.is_file():
            load_dotenv(cand, override=True)
            primary_env = cand
            break

    if not primary_env:
        found = find_dotenv(usecwd=True)
        if found and Path(found).is_file():
            primary_env = Path(found)
            load_dotenv(primary_env, override=True)

    return str(primary_env) if primary_env else None

ACTIVE_ENV_FILE = find_and_load_env()


class Settings(BaseSettings):
    PROJECT_NAME: str = "Personalized Children's Storybook"
    API_V1_PREFIX: str = "/api/v1"
    
    # Database Configuration (PostgreSQL)
    DATABASE_URL: str = ""

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_database_url(cls, v: Optional[str]) -> str:
        from urllib.parse import quote_plus
        raw = str(v).strip() if v else os.getenv("DATABASE_URL", "").strip()

        if raw:
            return raw

        # Fallback: assemble dynamically from legacy .env components if DATABASE_URL is not set
        user = os.getenv("DB_USER", os.getenv("POSTGRES_USER", "postgres")).strip()
        pwd = os.getenv("DB_PASSWORD", os.getenv("POSTGRES_PASSWORD", "")).strip()
        host = os.getenv("DB_HOST", os.getenv("POSTGRES_HOST", "localhost")).strip()
        port = os.getenv("DB_PORT", os.getenv("POSTGRES_PORT", "5432")).strip()
        db_name = (os.getenv("DB_NAME", os.getenv("POSTGRES_DB", ""))).strip().lstrip("/")

        if not db_name:
            raise ValueError("DATABASE_URL is not set and no DB_NAME was found in .env")

        auth = f"{user}:{quote_plus(pwd)}@" if pwd else (f"{user}@" if user else "")
        return f"postgresql+asyncpg://{auth}{host}:{port}/{db_name}"
    
    # Auth & Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "editorial-storybook-super-secret-key-2026-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 8)))  # Default 8 hours
    PASSWORD_RESET_CODE_EXPIRE_MINUTES: int = int(os.getenv("PASSWORD_RESET_CODE_EXPIRE_MINUTES", "5"))  # Default 5 minutes

    # SMTP Email Configuration
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "") or os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "") or os.getenv("SMTP_USER", "") or os.getenv("SMTP_USERNAME", "noreply@kuttystory.co.in")
    SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "Kutty Stories")
    SMTP_USE_TLS: bool = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
    
    # Storage Configuration (MinIO Object Storage)
    STORAGE_BACKEND: str = os.getenv("STORAGE_BACKEND", "minio")
    MINIO_ENDPOINT: str = os.getenv("MINIO_ENDPOINT", "127.0.0.1:9000")
    MINIO_ACCESS_KEY: str = os.getenv("MINIO_ACCESS_KEY", "")
    MINIO_SECRET_KEY: str = os.getenv("MINIO_SECRET_KEY", "")
    MINIO_BUCKET: str = os.getenv("MINIO_BUCKET", "kuttystory")
    MINIO_SECURE: bool = os.getenv("MINIO_SECURE", "false").lower() in ("true", "1", "yes")
    MINIO_PUBLIC_URL: Optional[str] = os.getenv("MINIO_PUBLIC_URL", None)

    # Storage directories (Cache / Scratch for temporary file processing)
    STORAGE_DIR: Path = STORAGE_BASE
    ORIGINAL_PDFS_DIR: Path = STORAGE_BASE / "original_pdfs"
    SOURCE_PAGES_DIR: Path = STORAGE_BASE / "source_pages"
    CHILD_PHOTOS_DIR: Path = STORAGE_BASE / "child_photos"
    GENERATED_ASSETS_DIR: Path = STORAGE_BASE / "generated_assets"
    PREVIEWS_DIR: Path = STORAGE_BASE / "previews"
    FINAL_BOOKS_DIR: Path = STORAGE_BASE / "final_books"
    
    # Image & Story Providers Configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    HF_TOKEN: str = os.getenv("HF_TOKEN", "")
    FAL_KEY: str = os.getenv("FAL_KEY", "")
    ACTIVE_STORY_PROVIDER: str = os.getenv("ACTIVE_STORY_PROVIDER", "gemini") # gemini, rule_based
    ACTIVE_IMAGE_PROVIDER: str = os.getenv("ACTIVE_IMAGE_PROVIDER", "magic_hour") # magic_hour, local, huggingface
    HF_MODEL_NAME: str = os.getenv("HF_MODEL_NAME", "")
    HF_FACE_SWAP_SPACE: str = os.getenv("HF_FACE_SWAP_SPACE", "")
    HF_FACE_ENHANCE_SPACE: str = os.getenv("HF_FACE_ENHANCE_SPACE", "")
    HF_INSTANT_ID_SPACE: str = os.getenv("HF_INSTANT_ID_SPACE", "")
    HF_FACE_SWAP_ENHANCE: bool = os.getenv("HF_FACE_SWAP_ENHANCE", "false").lower() == "true"
    HF_FACE_SWAP_TIMEOUT: float = float(os.getenv("HF_FACE_SWAP_TIMEOUT", "25.0"))
    PREFER_LOCAL_FUSION: bool = os.getenv("PREFER_LOCAL_FUSION", "false").lower() in ("true", "1", "yes")
    
    # Face Swap & Photo Providers Configuration
    FACE_SWAP_PROVIDER: str = os.getenv("FACE_SWAP_PROVIDER", "local")
    MAGIC_HOUR_API_KEY: str = os.getenv("MAGIC_HOUR_API_KEY", "")
    ALLOW_LOCAL_FALLBACK: bool = os.getenv("ALLOW_LOCAL_FALLBACK", "false").strip().lower() in ("true", "1", "yes")

    # Magic Hour Concurrency & Retry Settings (Default 3 for Creator Plan concurrency)
    MAGIC_HOUR_MAX_CONCURRENCY: int = int(os.getenv("MAGIC_HOUR_MAX_CONCURRENCY", "3"))
    MAGIC_HOUR_MAX_RETRIES: int = int(os.getenv("MAGIC_HOUR_MAX_RETRIES", "3"))
    MAGIC_HOUR_RETRY_BASE_SECONDS: float = float(os.getenv("MAGIC_HOUR_RETRY_BASE_SECONDS", "2.0"))

    # Magic Hour Studio Photo Enhancement / AI Image Editor Configuration
    MAGIC_HOUR_ENHANCE_TOOL: str = os.getenv("MAGIC_HOUR_ENHANCE_TOOL", "ai_image_editor")
    MAGIC_HOUR_ENHANCE_MODEL: str = os.getenv("MAGIC_HOUR_ENHANCE_MODEL", "flux-2-klein")
    MAGIC_HOUR_ENHANCE_RESOLUTION: str = os.getenv("MAGIC_HOUR_ENHANCE_RESOLUTION", "1024px")
    MAGIC_HOUR_ENHANCE_PROMPT: str = os.getenv(
        "MAGIC_HOUR_ENHANCE_PROMPT",
        "Clean professional studio portrait of the person, seamless pure white background, sharp natural studio lighting, crisp facial details, preserve person's exact face, expression, and clothing"
    )
    MAGIC_HOUR_ENHANCE_FALLBACK_TOOL: str = os.getenv("MAGIC_HOUR_ENHANCE_FALLBACK_TOOL", "image_background_remover")
    
    # Budgets & Limits
    PER_BOOK_BUDGET_USD: float = float(os.getenv("PER_BOOK_BUDGET_USD", "2.50"))
    PREVIEW_PAGE_LIMIT: int = int(os.getenv("PREVIEW_PAGE_LIMIT", "3"))  # Configurable number of pages to generate during initial preview
    PAID_FALLBACK_ENABLED: bool = os.getenv("PAID_FALLBACK_ENABLED", "false").strip().lower() in ("true", "1", "yes")

    # Razorpay Payment Gateway
    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "")
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "")
    RAZORPAY_WEBHOOK_SECRET: str = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")
    
    # Print specifications
    PRINT_TRIM_WIDTH_MM: float = 210.0
    PRINT_TRIM_HEIGHT_MM: float = 210.0
    PRINT_BLEED_MM: float = 3.0
    PRINT_SAFE_MARGIN_MM: float = 10.0
    
    # CORS Allowed Origins - Strictly retrieved only from .env
    CORS_ORIGINS: Union[List[str], str] = []
    CORS_ORIGIN_REGEX: Optional[str] = os.getenv("CORS_ORIGIN_REGEX", None)

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        raw = v if v is not None and v != "" else os.getenv("CORS_ORIGINS", "")
        if isinstance(raw, str):
            raw_str = raw.strip()
            if raw_str.startswith("[") and raw_str.endswith("]"):
                try:
                    import json
                    parsed = json.loads(raw_str)
                    if isinstance(parsed, list):
                        return [str(item).strip().strip("\"'") for item in parsed if str(item).strip()]
                except Exception:
                    pass
            return [item.strip().strip("\"'") for item in raw_str.split(",") if item.strip()]
        elif isinstance(raw, (list, tuple, set)):
            return [str(item).strip().strip("\"'") for item in raw if str(item).strip()]
        return []

    model_config = SettingsConfigDict(
        env_file=ACTIVE_ENV_FILE if ACTIVE_ENV_FILE else ".env",
        extra="allow",
        case_sensitive=False
    )


settings = Settings()

# All files are stored exclusively in MinIO object storage.
# Local filesystem directories are not required.

