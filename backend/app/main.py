import os
os.environ["OPENCV_LOG_LEVEL"] = "ERROR"
from pathlib import Path
from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI, Depends, Request, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base, SessionLocal, get_db
from app.services.pdf_importer import PDFImporterService
from app.routers import stories, personalization, books, admin, ai_admin, storage, auth, child_stories, feedbacks, payments, ai_health, site_settings, kuttys_stories, parenting_routine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize database tables & schema migrations
    Base.metadata.create_all(bind=engine)
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE personalization_jobs ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;"))
            conn.execute(text("ALTER TABLE personalization_jobs ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;"))
            conn.execute(text("ALTER TABLE personalization_jobs ADD COLUMN IF NOT EXISTS outfit_mode VARCHAR(30) DEFAULT 'story';"))
            conn.execute(text("ALTER TABLE personalization_jobs ADD COLUMN IF NOT EXISTS language VARCHAR(30) DEFAULT 'english';"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100);"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100);"))
            conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_razorpay_payment_id ON orders (razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;"))
            conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_razorpay_order_id ON orders (razorpay_order_id) WHERE razorpay_order_id IS NOT NULL;"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100);"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_carrier VARCHAR(100);"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url VARCHAR(500);"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP;"))
            conn.execute(text("ALTER TABLE story_pages ADD COLUMN IF NOT EXISTS has_background_box BOOLEAN DEFAULT FALSE;"))
            conn.execute(text("ALTER TABLE story_pages ADD COLUMN IF NOT EXISTS box_layout VARCHAR(20) DEFAULT 'banner';"))
            conn.execute(text("ALTER TABLE story_pages ADD COLUMN IF NOT EXISTS box_bg_color VARCHAR(30) DEFAULT '#FAF4E6';"))
            conn.execute(text("ALTER TABLE story_pages ADD COLUMN IF NOT EXISTS box_border_color VARCHAR(30) DEFAULT '#E8DEC8';"))
            conn.execute(text("ALTER TABLE story_pages ADD COLUMN IF NOT EXISTS box_border_width INTEGER DEFAULT 1;"))
            conn.execute(text("ALTER TABLE story_pages ADD COLUMN IF NOT EXISTS box_border_radius INTEGER DEFAULT 16;"))
            conn.execute(text("ALTER TABLE story_pages ADD COLUMN IF NOT EXISTS box_bg_opacity FLOAT DEFAULT 0.90;"))
            conn.execute(text("ALTER TABLE story_pages ADD COLUMN IF NOT EXISTS text_align VARCHAR(20) DEFAULT 'left';"))
            conn.execute(text("ALTER TABLE story_pages ADD COLUMN IF NOT EXISTS translations TEXT DEFAULT '{}';"))
            conn.execute(text("ALTER TABLE generated_assets ADD COLUMN IF NOT EXISTS error_code VARCHAR(50);"))
            conn.execute(text("ALTER TABLE generated_assets ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 1;"))
            conn.execute(text("ALTER TABLE generated_assets ADD COLUMN IF NOT EXISTS used_fallback BOOLEAN DEFAULT FALSE;"))
            conn.execute(text("ALTER TABLE generated_assets ADD COLUMN IF NOT EXISTS fallback_from VARCHAR(50);"))
            conn.execute(text("ALTER TABLE story_templates ADD COLUMN IF NOT EXISTS highlight VARCHAR(50);"))
            conn.execute(text("ALTER TABLE story_templates ADD COLUMN IF NOT EXISTS in_hero_carousel BOOLEAN DEFAULT FALSE;"))
            conn.execute(text("ALTER TABLE story_templates ADD COLUMN IF NOT EXISTS hardcover_cover_image_path VARCHAR(500);"))
            conn.execute(text("ALTER TABLE story_templates ADD COLUMN IF NOT EXISTS hardcover_cover_face_points TEXT;"))
            conn.execute(text("ALTER TABLE personalization_jobs ADD COLUMN IF NOT EXISTS format_type VARCHAR(30) DEFAULT 'digital';"))
            conn.execute(text("ALTER TABLE personalization_jobs ADD COLUMN IF NOT EXISTS cover_asset_path VARCHAR(500);"))
            conn.commit()
    except Exception as e:
        print(f"Notice during startup schema migration check: {e}")
    
    # 2. MinIO storage sync & DB path normalization
    try:
        from app.services.storage import storage as storage_mgr
        storage_mgr.sync_local_to_minio()
        db_mig = SessionLocal()
        try:
            storage_mgr.migrate_database_to_minio_keys(db_mig)
        finally:
            db_mig.close()
    except Exception as e:
        print(f"Notice during MinIO storage initialization: {e}")

    # 3. Idempotent import of the Unicorn Story PDF from sample-assets
    sample_pdf = settings.STORAGE_DIR.parent.parent / "sample-assets" / "unicorn Story.pdf"
    if sample_pdf.exists():
        db = SessionLocal()
        try:
            print(f"Checking sample story PDF at: {sample_pdf}")
            PDFImporterService.import_story_from_pdf(
                pdf_path=str(sample_pdf),
                db=db,
                title="The Girl and the Magical Unicorn",
                slug="unicorn-story",
                description="Join an enchanting personalized adventure with a gentle white unicorn, exploring secret meadows, helping a fledgling bird, and discovering the courage of true friendship.",
                category="Fairytale & Adventure",
                age_range="3-8 years",
                force_reimport=False
            )
        except Exception as e:
            print(f"Notice during startup PDF import: {e}")
        finally:
            db.close()
    else:
        print(f"Warning: sample PDF not found at {sample_pdf}")

    # 3. Idempotently seed default admin logins
    try:
        from app.seed_admin import seed_admin_users
        seed_admin_users()
    except Exception as e:
        print(f"Notice during startup admin seed: {e}")

    # 4. Validate configured image and face swap providers
    supported_image_providers = {"magic_hour", "local", "huggingface"}
    configured_img_prov = (getattr(settings, "ACTIVE_IMAGE_PROVIDER", "") or "").lower().strip()
    if configured_img_prov and configured_img_prov not in supported_image_providers:
        import logging
        logging.getLogger("uvicorn.error").warning(
            f"Unsupported ACTIVE_IMAGE_PROVIDER='{configured_img_prov}'. "
            f"Supported providers are: {', '.join(sorted(supported_image_providers))}."
        )

    face_swap_prov = (os.getenv("FACE_SWAP_PROVIDER", "") or getattr(settings, "FACE_SWAP_PROVIDER", "")).lower().strip()
    mh_key = (os.getenv("MAGIC_HOUR_API_KEY", "") or getattr(settings, "MAGIC_HOUR_API_KEY", "")).strip()
    if face_swap_prov != "magic_hour":
        import logging
        logging.getLogger("uvicorn.error").warning(
            f"[F3 Safeguard] FACE_SWAP_PROVIDER is set to '{face_swap_prov}' (expected 'magic_hour'). "
            "Face personalization may fall back to local/HF tiers if ALLOW_LOCAL_FALLBACK is enabled."
        )
    elif not mh_key:
        import logging
        logging.getLogger("uvicorn.error").warning(
            "[F3 Safeguard] MAGIC_HOUR_API_KEY is empty or not configured. "
            "Requests to Magic Hour will fail unless configured."
        )

    # 5. Reliability Watchdog: Automatically recover orphaned background generation jobs from prior crashes
    try:
        from app.services.job_runner import job_runner
        recovered_count = job_runner.recover_stuck_jobs(timeout_minutes=15)
        if recovered_count:
            print(f"[Watchdog] Recovered {recovered_count} interrupted generation jobs on startup.")
    except Exception as e:
        print(f"Notice during startup watchdog recovery check: {e}")

    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Personalized Children's Storybook Platform Prototype API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration - strictly driven by .env (settings.CORS_ORIGINS) with dynamic regex matching
origins_from_env = settings.CORS_ORIGINS
has_wildcard = "*" in origins_from_env

# Allow localhost/127.0.0.1 on any port (e.g. 5173, 4173, 3000, 8000) and approved domain subdomains
cors_regex = r"^https?://.*" if has_wildcard else r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$|^https?://([a-zA-Z0-9-]+\.)*(kuttystory\.co\.in|risingsuntech\.in)(:\d+)?$"

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins_from_env if not has_wildcard else ["*"],
    allow_origin_regex=cors_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.options("/{full_path:path}")
async def cors_preflight_handler(full_path: str, request: Request):
    """
    Handle cross-origin preflight checks (OPTIONS) cleanly across all routers.
    Returns HTTP 200 with required CORS headers.
    """
    origin = request.headers.get("origin", "")
    headers = {
        "Access-Control-Allow-Methods": "DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT",
        "Access-Control-Allow-Headers": request.headers.get("access-control-request-headers", "*"),
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
    }
    if origin:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Vary"] = "Origin"
    return Response(status_code=200, headers=headers)

from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi import HTTPException as FastAPIHTTPException

@app.exception_handler(FastAPIHTTPException)
async def fastapi_http_exception_handler(request: Request, exc: FastAPIHTTPException):
    return await custom_http_exception_handler(request, exc)

@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    origin = request.headers.get("origin", "")
    headers = {}
    if origin and (has_wildcard or origin in origins_from_env):
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Access-Control-Allow-Headers"] = "*"
        headers["Access-Control-Allow-Methods"] = "*"

    detail = exc.detail
    # When a 500-level HTTP error occurs, sanitize it to prevent leaking server paths or SQL traces
    if exc.status_code >= 500:
        logging.getLogger("uvicorn.error").error(
            f"500 Internal error on {request.method} {request.url.path}: {detail}",
            exc_info=True
        )
        detail_str = str(detail)
        if "\\" in detail_str or "/" in detail_str or "traceback" in detail_str.lower() or "line " in detail_str.lower():
            detail = "An internal server error occurred while processing the request. Please contact support."

    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": detail},
        headers=headers
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Guard: Do not convert client HTTP exceptions (404, 400, 401, 403, 422, etc.) to 500
    if isinstance(exc, (StarletteHTTPException, FastAPIHTTPException)):
        return await custom_http_exception_handler(request, exc)

    logging.getLogger("uvicorn.error").error(
        f"Unhandled error on {request.method} {request.url.path}: {exc}",
        exc_info=True
    )
    # Ensure CORS headers are included even on unhandled 500 exceptions
    origin = request.headers.get("origin", "")
    headers = {}
    if origin:
        if has_wildcard or (origin in origins_from_env):
            headers["Access-Control-Allow-Origin"] = origin
            headers["Access-Control-Allow-Credentials"] = "true"
            headers["Access-Control-Allow-Headers"] = "*"
            headers["Access-Control-Allow-Methods"] = "*"

    app_env = os.getenv("APP_ENV", "production").lower()
    is_dev = app_env in ["dev", "development", "local", "test"]
    client_detail = str(exc) if is_dev else "An internal server error occurred. Please try again later."
    if "\\" in client_detail or "/" in client_detail or "traceback" in client_detail.lower():
        client_detail = "An internal server error occurred. Please try again later."

    return JSONResponse(
        status_code=500,
        content={"detail": client_detail},
        headers=headers
    )



# Register routers
app.include_router(stories.router, prefix=settings.API_V1_PREFIX)
app.include_router(personalization.router, prefix=settings.API_V1_PREFIX)
app.include_router(books.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin.router, prefix=settings.API_V1_PREFIX)
app.include_router(ai_admin.router, prefix=settings.API_V1_PREFIX)
app.include_router(storage.router, prefix=settings.API_V1_PREFIX)
app.include_router(storage.router, prefix="")  # Expose /storage/{category}/{filename} for direct compatibility
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(child_stories.router, prefix=settings.API_V1_PREFIX)
app.include_router(feedbacks.router, prefix=settings.API_V1_PREFIX)
app.include_router(payments.router, prefix=settings.API_V1_PREFIX)
app.include_router(ai_health.router, prefix=settings.API_V1_PREFIX)
app.include_router(site_settings.router, prefix=settings.API_V1_PREFIX)
app.include_router(kuttys_stories.router, prefix=settings.API_V1_PREFIX)
app.include_router(parenting_routine.router, prefix=settings.API_V1_PREFIX)


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "database": "connected",
        "storage": "minio",
        "minio_endpoint": settings.MINIO_ENDPOINT,
        "minio_bucket": settings.MINIO_BUCKET
    }

from app.routers.auth import require_admin

@app.get("/admin_dashboard", dependencies=[Depends(require_admin)])
@app.get("/api/v1/admin_dashboard", dependencies=[Depends(require_admin)])
def admin_dashboard_alias(db = Depends(get_db)):
    return admin.get_dashboard_data(db)

@app.get("/api/v1/book-sales/by-state", dependencies=[Depends(require_admin)])
def public_book_sales_by_state(
    period: str = "30days",
    from_date: str = None,
    to_date: str = None,
    db = Depends(get_db)
):
    return admin.get_book_sales_by_state(period=period, from_date=from_date, to_date=to_date, db=db)


@app.get("/")
def root():
    return {
        "message": "Welcome to Personalized Children's Storybook API",
        "docs_url": "/docs",
        "api_v1": settings.API_V1_PREFIX,
        "admin_dashboard": "/admin_dashboard"
    }
