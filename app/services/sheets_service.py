"""
sheets_service.py — Google Sheets CRM sync (Phase 43)

Keeps a Google Sheet in sync with the clients + client_services tables.
Called via FastAPI BackgroundTasks — failures are logged silently (never block the API).

Setup required (Phase 43.1 — one-time manual):
  1. Google Cloud Console → Enable Sheets API → Create Service Account → Download JSON
  2. Share the target Sheet with the service account email (Editor)
  3. Set env vars:
       GOOGLE_SERVICE_ACCOUNT_JSON = <contents of downloaded JSON, as a string>
       GOOGLE_SHEET_ID             = 1W_DsyAgswnSKT1o-M251JfFYYxO9CQyTopgQbGhyR-w
"""

import json
import logging
import os
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

SHEET_ID = os.getenv("GOOGLE_SHEET_ID", "1W_DsyAgswnSKT1o-M251JfFYYxO9CQyTopgQbGhyR-w")

# ── Tab names ─────────────────────────────────────────────────────────────────
TAB_CLIENTS  = "clients"
TAB_QUEUE    = "onboarding_queue"
TAB_SERVICES = "services"

# ── Column headers ────────────────────────────────────────────────────────────
CLIENTS_HEADERS = [
    "slug", "name_ar", "name_en", "service_type", "status",
    "currency", "primary_color",
    "owner_name", "owner_phone", "owner_email",
    "trial_ends_at", "created_at",
    "selected_services",
    "notes", "deal_value", "next_action",
]

QUEUE_HEADERS = [
    "extracted_at", "confidence", "slug", "name_ar", "name_en",
    "service_type", "currency", "owner_name", "owner_phone", "owner_email",
    "needs_review", "notes",
]

SERVICES_HEADERS = [
    "slug", "service_key", "is_active", "activated_at",
]


def _get_service():
    """Build and return authenticated Google Sheets service. Returns None if not configured."""
    try:
        from google.oauth2.service_account import Credentials
        from googleapiclient.discovery import build

        raw = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
        if not raw:
            logger.warning("sheets_service: GOOGLE_SERVICE_ACCOUNT_JSON not set — skipping")
            return None

        creds_dict = json.loads(raw)
        creds = Credentials.from_service_account_info(
            creds_dict,
            scopes=["https://www.googleapis.com/auth/spreadsheets"],
        )
        return build("sheets", "v4", credentials=creds, cache_discovery=False)
    except Exception as e:
        logger.warning(f"sheets_service: failed to authenticate — {e}")
        return None


def _append_row(service, tab: str, values: list) -> None:
    service.spreadsheets().values().append(
        spreadsheetId=SHEET_ID,
        range=f"{tab}!A1",
        valueInputOption="USER_ENTERED",
        insertDataOption="INSERT_ROWS",
        body={"values": [values]},
    ).execute()


def _find_row_by_slug(service, tab: str, slug: str) -> int | None:
    """Return 1-based row index of the row where column A == slug, or None."""
    result = service.spreadsheets().values().get(
        spreadsheetId=SHEET_ID, range=f"{tab}!A:A"
    ).execute()
    rows = result.get("values", [])
    for i, row in enumerate(rows):
        if row and row[0] == slug:
            return i + 1
    return None


def _update_cell(service, tab: str, row: int, col: int, value) -> None:
    col_letter = chr(ord("A") + col - 1)
    service.spreadsheets().values().update(
        spreadsheetId=SHEET_ID,
        range=f"{tab}!{col_letter}{row}",
        valueInputOption="USER_ENTERED",
        body={"values": [[value]]},
    ).execute()


# ── Public API ────────────────────────────────────────────────────────────────

async def append_client_row(client_data: dict) -> None:
    """Called after a new tenant registers. Adds a row to the 'clients' tab."""
    service = _get_service()
    if not service:
        return
    try:
        svcs = client_data.get("selected_services", [])
        row = [
            client_data.get("slug", ""),
            client_data.get("name_ar", ""),
            client_data.get("name_en", ""),
            client_data.get("service_type", ""),
            client_data.get("status", "trial"),
            client_data.get("currency", "USD"),
            client_data.get("primary_color", ""),
            client_data.get("owner_name", ""),
            client_data.get("owner_phone", ""),
            client_data.get("owner_email", ""),
            client_data.get("trial_ends_at", ""),
            client_data.get("created_at", datetime.now(timezone.utc).isoformat()),
            ", ".join(svcs) if isinstance(svcs, list) else str(svcs or ""),
            "",  # notes — filled manually by Salman
            "",  # deal_value
            "",  # next_action
        ]
        _append_row(service, TAB_CLIENTS, row)
        logger.info(f"sheets_service: appended client '{client_data.get('slug')}'")
    except Exception as e:
        logger.warning(f"sheets_service: append_client_row failed — {e}")


async def update_client_status(slug: str, new_status: str) -> None:
    """Called when a tenant's status changes via Super Admin."""
    service = _get_service()
    if not service:
        return
    try:
        row_idx = _find_row_by_slug(service, TAB_CLIENTS, slug)
        if row_idx is None:
            logger.warning(f"sheets_service: slug '{slug}' not found in sheet — skipping status update")
            return
        # status is column E (index 5, col=5)
        status_col = CLIENTS_HEADERS.index("status") + 1
        _update_cell(service, TAB_CLIENTS, row_idx, status_col, new_status)
        logger.info(f"sheets_service: updated '{slug}' status → {new_status}")
    except Exception as e:
        logger.warning(f"sheets_service: update_client_status failed — {e}")


async def append_onboarding_queue(extracted: dict) -> None:
    """Called when المحقق كونان submits an extraction — adds to the queue tab."""
    service = _get_service()
    if not service:
        return
    try:
        row = [
            extracted.get("extracted_at", datetime.now(timezone.utc).isoformat()),
            extracted.get("confidence", ""),
            extracted.get("slug", ""),
            extracted.get("name_ar", ""),
            extracted.get("name_en", ""),
            extracted.get("service_type", ""),
            extracted.get("currency", ""),
            extracted.get("owner_name", ""),
            extracted.get("owner_phone", ""),
            extracted.get("owner_email", ""),
            ", ".join(extracted.get("needs_review", [])),
            extracted.get("notes", ""),
        ]
        _append_row(service, TAB_QUEUE, row)
        logger.info(f"sheets_service: queued extraction for '{extracted.get('slug')}'")
    except Exception as e:
        logger.warning(f"sheets_service: append_onboarding_queue failed — {e}")
