from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.limiter import limiter

from app.core.config import settings
from app.core.handlers import register_handlers
from app.db.client import connect_db, disconnect_db, prisma_client

# Routers
from app.api.v1.public import router as public_v1_router
from app.api.v1.admin import router as admin_v1_router
from app.api.v1.admin.auth import router as auth_router
from app.api.v1.webhook import router as webhook_router
from app.api.v1.super.clients import router as super_router
from app.api.v1.super.platform_services import router as super_platform_router
from app.api.v1.super.maintenance import router as super_maintenance_router
from app.api.v1.onboarding import router as onboarding_router
from app.api.v1.ai_settings_agent import router as ai_settings_router
from app.api.v1.webhooks.samsara import router as samsara_webhook_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await connect_db()
    yield
    await disconnect_db()


_is_production = settings.ENVIRONMENT == "production"

app = FastAPI(
    title="Chalet & Hotel Booking SaaS API",
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url=None if _is_production else "/docs",
    redoc_url=None if _is_production else "/redoc",
    openapi_url=None if _is_production else "/openapi.json",
)

# ── Rate Limiting (slowapi) ────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Global exception handlers (must be registered before routers) ─────────────
register_handlers(app)

# ── CORS ──────────────────────────────────────────────────────────────────────
# في الإنتاج: يُقيَّد بـ FRONTEND_URL. في التطوير: مفتوح على localhost.
_cors_origins = settings.CORS_ORIGINS if settings.is_production() else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
# auth_router has no internal prefix — we set the full mount path here
app.include_router(auth_router,    prefix="/api/v1/auth",    tags=["Authentication"])
app.include_router(webhook_router, prefix="/api/v1/webhook", tags=["Webhooks"])
app.include_router(public_v1_router,  prefix="/api/v1/public")
app.include_router(admin_v1_router,   prefix="/api/v1/admin")
app.include_router(super_router,           prefix="/api/v1/super",             tags=["Super Admin"])
app.include_router(super_platform_router, prefix="/api/v1/super",             tags=["Super Admin — Platform Services"])
app.include_router(super_maintenance_router, prefix="/api/v1/super/maintenance", tags=["Super Admin — Maintenance"])
app.include_router(onboarding_router,      prefix="/api/v1/webhook",   tags=["Webhook-AI"])
app.include_router(ai_settings_router,    prefix="/api/v1/webhook",   tags=["Webhook-AI"])
app.include_router(samsara_webhook_router, prefix="/api/v1/webhooks",  tags=["Fleet — Samsara Webhook"])


@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "online",
        "service": "Chalet & Hotel Booking SaaS",
        "version": settings.VERSION,
        "docs": "/docs",
    }


@app.api_route("/health", methods=["GET", "HEAD"], tags=["Health"])
async def health_check():
    ts = datetime.now(timezone.utc).isoformat()
    try:
        await prisma_client.execute_raw("SELECT 1")
        return {"status": "ok", "db": "ok", "timestamp": ts}
    except Exception as e:
        import logging as _log
        _log.getLogger(__name__).error("Health check DB failure: %s", e)
        return JSONResponse(
            status_code=503,
            content={"status": "error", "db": "unreachable", "timestamp": ts},
        )
