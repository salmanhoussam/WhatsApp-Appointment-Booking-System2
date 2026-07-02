"""
Dating Router (Phase 75) — Public endpoints for date invitation pages.
Zero business logic — delegates entirely to dating_service.
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.core.limiter import limiter
import app.services.dating_service as dating_service

router = APIRouter()


# ── Pydantic schemas ───────────────────────────────────────────────────────────

class CreatePageRequest(BaseModel):
    her_name: str
    owner_phone: str
    her_phone: Optional[str] = None
    slug: Optional[str] = None
    config: dict = {}


class AnswerRequest(BaseModel):
    answer: str          # "yes" | "later" | "no"
    chosen_food: str
    event_date: Optional[datetime] = None


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/create", tags=["Dating"])
@limiter.limit("20/hour")
async def create_date_page(request: Request, body: CreatePageRequest):
    """
    Create a personalized date invitation page.
    Returns the page record, the shareable URL, and a wa.me link for the owner.
    """
    result = await dating_service.create_date_page(body.model_dump())
    return {
        "success": True,
        "data": {
            "page_url": result["page_url"],
            "wa_link": result["wa_link"],
            "slug": result["page"].slug,
            "expires_at": result["page"].expires_at,
        },
    }


@router.get("/{slug}", tags=["Dating"])
async def get_date_page(slug: str):
    """
    Fetch a public DatePage by slug.
    Used by the frontend DatingPageResolver on load.
    """
    page = await dating_service.get_page(slug)
    if not page:
        raise HTTPException(status_code=404, detail="هذه الصفحة غير موجودة أو انتهت صلاحيتها.")

    # Don't expose internal fields to the public view
    return {
        "success": True,
        "data": {
            "slug": page.slug,
            "her_name": page.her_name,
            "config": page.config,
            "answered": page.answered_at is not None,
            "answer": page.answer,
            "expires_at": page.expires_at,
        },
    }


@router.post("/{slug}/answer", tags=["Dating"])
@limiter.limit("5/minute")
async def submit_answer(request: Request, slug: str, body: AnswerRequest):
    """
    Record the girl's answer.
    Returns a wa.me link so she can notify the owner directly.
    Rejects duplicate answers with 409.
    """
    if body.answer not in ("yes", "later", "no"):
        raise HTTPException(status_code=400, detail="answer يجب أن يكون: yes | later | no")

    page = await dating_service.get_page(slug)
    if not page:
        raise HTTPException(status_code=404, detail="هذه الصفحة غير موجودة أو انتهت صلاحيتها.")
    if page.answered_at is not None:
        raise HTTPException(status_code=409, detail="تم تسجيل الإجابة مسبقاً.")

    event_date = body.event_date or datetime.now(timezone.utc)
    result = await dating_service.submit_answer(
        slug=slug,
        answer=body.answer,
        chosen_food=body.chosen_food,
        event_date=event_date,
    )
    return {
        "success": True,
        "data": {
            "answer": body.answer,
            "wa_link": result["wa_link"],
        },
    }
