from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

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
from app.api.v1.onboarding import router as onboarding_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await connect_db()
    yield
    await disconnect_db()


app = FastAPI(
    title="Chalet & Hotel Booking SaaS API",
    version=settings.VERSION,
    lifespan=lifespan,
)

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
app.include_router(super_router,         prefix="/api/v1/super", tags=["Super Admin"])
app.include_router(super_platform_router, prefix="/api/v1/super", tags=["Super Admin — Platform Services"])
app.include_router(onboarding_router,    prefix="/api/v1/webhook", tags=["Webhook-AI"])


@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "online",
        "service": "Chalet & Hotel Booking SaaS",
        "version": settings.VERSION,
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    ts = datetime.now(timezone.utc).isoformat()
    try:
        await prisma_client.execute_raw("SELECT 1")
        return {"status": "ok", "db": "ok", "timestamp": ts}
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "db": "unreachable", "timestamp": ts, "detail": str(e)},
        )
