from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import app.services.occasions_service as svc

router = APIRouter(prefix="/moments", tags=["moments"])


# ── Auth helpers ───────────────────────────────────────────────────────────

async def get_creator_id(authorization: str = Header(...)) -> str:
    try:
        token = authorization.replace("Bearer ", "")
        return svc.decode_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="غير مصرح")


# ── Schemas ────────────────────────────────────────────────────────────────

class RegisterIn(BaseModel):
    name: str
    phone: str
    password: str
    email: Optional[str] = None

class LoginIn(BaseModel):
    phone: str
    password: str

class CreatePageIn(BaseModel):
    type: str                    # wedding | anniversary | birthday | engagement | graduation | other
    title_ar: str
    title_en: Optional[str] = None
    message_ar: str
    message_en: Optional[str] = None
    event_date: datetime
    location_ar: Optional[str] = None
    location_en: Optional[str] = None
    cover_image: Optional[str] = None
    theme_color: Optional[str] = None
    max_guests: Optional[int] = None
    rsvp_enabled: bool = True
    slug: Optional[str] = None
    expires_at: Optional[datetime] = None

class RSVPIn(BaseModel):
    guest_name: str
    guest_phone: Optional[str] = None
    guest_count: int = 1
    message: Optional[str] = None
    attending: bool = True


# ── Auth routes ────────────────────────────────────────────────────────────

@router.post("/auth/register")
async def register(body: RegisterIn):
    try:
        result = await svc.register_creator(body.name, body.phone, body.password, body.email)
        return {"success": True, "data": {"token": result["token"], "name": result["creator"].name}}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/auth/login")
async def login(body: LoginIn):
    try:
        result = await svc.login_creator(body.phone, body.password)
        return {"success": True, "data": {"token": result["token"], "name": result["creator"].name}}
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


# ── Page routes ────────────────────────────────────────────────────────────

@router.post("/pages")
async def create_page(body: CreatePageIn, creator_id: str = Depends(get_creator_id)):
    try:
        page = await svc.create_page(creator_id, body.model_dump())
        return {"success": True, "data": {"slug": page.slug, "type": page.type, "id": page.id}}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/pages/my")
async def my_pages(creator_id: str = Depends(get_creator_id)):
    pages = await svc.get_my_pages(creator_id)
    return {"success": True, "data": pages}

@router.get("/pages/{slug}")
async def get_page(slug: str):
    try:
        page = await svc.get_public_page(slug)
        return {"success": True, "data": page}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ── RSVP route ─────────────────────────────────────────────────────────────

@router.post("/pages/{slug}/rsvp")
async def submit_rsvp(slug: str, body: RSVPIn):
    try:
        rsvp = await svc.submit_rsvp(
            slug, body.guest_name, body.guest_phone,
            body.guest_count, body.message, body.attending,
        )
        return {"success": True, "data": {"id": rsvp.id}}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
