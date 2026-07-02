import httpx
import secrets
from datetime import datetime, timedelta
from jose import jwt
from app.core.config import settings
import app.repositories.occasions_repo as repo

NTFY_TOPIC = "salman-moments-2026"
OCCASION_LABELS = {
    "wedding": "زفاف 💍",
    "anniversary": "ذكرى سنوية 🌹",
    "birthday": "عيد ميلاد 🎂",
    "engagement": "خطوبة 💐",
    "graduation": "تخرج 🎓",
    "other": "مناسبة ✨",
}
THEME_COLORS = {
    "wedding":     "#d4a853",
    "anniversary": "#e11d48",
    "birthday":    "#8b5cf6",
    "engagement":  "#f472b6",
    "graduation":  "#3b82f6",
    "other":       "#ff1a55",
}


# ── Auth ───────────────────────────────────────────────────────────────────

async def register_creator(name: str, phone: str, password: str, email: str | None = None):
    if await repo.get_creator_by_phone(phone):
        raise ValueError("رقم الهاتف مسجّل مسبقاً")
    if email and await repo.get_creator_by_email(email):
        raise ValueError("البريد الإلكتروني مسجّل مسبقاً")
    creator = await repo.create_creator(name, phone, password, email)
    return {"creator": creator, "token": _make_token(creator.id)}

async def login_creator(phone: str, password: str):
    creator = await repo.get_creator_by_phone(phone)
    if not creator or not repo.verify_password(password, creator.password_hash):
        raise ValueError("رقم الهاتف أو كلمة المرور غير صحيحة")
    return {"creator": creator, "token": _make_token(creator.id)}

def _make_token(creator_id: str) -> str:
    payload = {
        "sub": creator_id,
        "role": "occasion_creator",
        "exp": datetime.utcnow() + timedelta(days=30),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_token(token: str) -> str:
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    if payload.get("role") != "occasion_creator":
        raise ValueError("invalid token")
    return payload["sub"]


# ── Pages ──────────────────────────────────────────────────────────────────

async def create_page(creator_id: str, payload: dict):
    occasion_type = payload.get("type", "other")
    slug = payload.get("slug") or _gen_slug()

    # Check slug uniqueness
    if await repo.get_page_by_slug(slug):
        slug = _gen_slug()

    data = {
        "slug":       slug,
        "type":       occasion_type,
        "title_ar":   payload["title_ar"],
        "title_en":   payload.get("title_en"),
        "message_ar": payload["message_ar"],
        "message_en": payload.get("message_en"),
        "event_date": payload["event_date"],
        "location_ar": payload.get("location_ar"),
        "location_en": payload.get("location_en"),
        "cover_image": payload.get("cover_image"),
        "theme_color": payload.get("theme_color") or THEME_COLORS.get(occasion_type, "#d4a853"),
        "max_guests":  payload.get("max_guests"),
        "rsvp_enabled": payload.get("rsvp_enabled", True),
        "expires_at":  payload.get("expires_at"),
    }
    page = await repo.create_page(creator_id, data)
    await _notify_created(page, creator_id)
    return page

async def get_public_page(slug: str):
    page = await repo.get_page_by_slug(slug)
    if not page or not page.is_active:
        raise ValueError("الصفحة غير موجودة أو غير نشطة")
    if page.expires_at and page.expires_at < datetime.utcnow():
        raise ValueError("انتهت صلاحية هذه الصفحة")
    return page

async def get_my_pages(creator_id: str):
    return await repo.get_pages_by_creator(creator_id)


# ── RSVP ───────────────────────────────────────────────────────────────────

async def submit_rsvp(slug: str, guest_name: str, guest_phone: str | None,
                      guest_count: int, message: str | None, attending: bool):
    page = await repo.get_page_by_slug(slug)
    if not page or not page.is_active or not page.rsvp_enabled:
        raise ValueError("التسجيل غير متاح لهذه المناسبة")

    rsvp = await repo.create_rsvp(page.id, {
        "guest_name":  guest_name,
        "guest_phone": guest_phone,
        "guest_count": guest_count,
        "message":     message,
        "attending":   attending,
    })
    await _notify_rsvp(page, rsvp)
    return rsvp


# ── Notifications ──────────────────────────────────────────────────────────

async def _notify_created(page, creator_id: str):
    label = OCCASION_LABELS.get(page.type, "مناسبة")
    url = f"https://demo.salmansaas.com/moments/{page.type}/{page.slug}"
    try:
        async with httpx.AsyncClient(timeout=5) as c:
            await c.post(
                f"https://ntfy.sh/{NTFY_TOPIC}",
                content=f"صفحة جديدة: {label}\n{page.title_ar}\n{url}",
                headers={"Title": "Moments — صفحة جديدة", "Priority": "default"},
            )
    except Exception:
        pass

async def _notify_rsvp(page, rsvp):
    status = "✅ حضور" if rsvp.attending else "❌ اعتذار"
    try:
        async with httpx.AsyncClient(timeout=5) as c:
            await c.post(
                f"https://ntfy.sh/{NTFY_TOPIC}",
                content=f"{status} — {rsvp.guest_name} ({rsvp.guest_count} أشخاص)\n{page.title_ar}",
                headers={"Title": "Moments — RSVP جديد", "Priority": "high"},
            )
    except Exception:
        pass


# ── Helpers ────────────────────────────────────────────────────────────────

def _gen_slug() -> str:
    return secrets.token_urlsafe(6).lower().replace("-", "").replace("_", "")[:8]
