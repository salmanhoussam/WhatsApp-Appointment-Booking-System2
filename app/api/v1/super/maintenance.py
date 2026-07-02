"""
Super Admin — Maintenance endpoints.
Mounted at /api/v1/super/maintenance (see main.py).

All routes require SUPER_ADMIN role via require_super_admin dependency.
Called by Railway cron job (Phase 75-E):
  Schedule: 0 3 * * *
  Command:  curl -X POST {RAILWAY_URL}/api/v1/super/maintenance/cleanup-date-pages \
              -H "Authorization: Bearer $SUPER_ADMIN_TOKEN"
"""

from fastapi import APIRouter, Depends

from app.core.tenant import require_super_admin
from app.services import dating_service

router = APIRouter(tags=["Super Admin — Maintenance"])


@router.post("/cleanup-date-pages")
async def cleanup_date_pages(_user=Depends(require_super_admin)):
    """
    Soft-delete all expired DatePage rows (is_deleted=True where expires_at < now).
    Safe to call repeatedly — idempotent.
    """
    count = await dating_service.cleanup_expired()
    return {"success": True, "deleted_count": count}
