"""
setup_google_sheet.py — SalmanSaaS CRM Google Sheet setup (v2)

4 tabs:
  clients           — one row per tenant (with selected_services snapshot)
  onboarding_queue  — leads from المحقق كونان
  services          — client_services activation rows
  platform_services — master catalog of what SalmanSaaS offers

Run after any schema change or to rebuild from scratch:
  python scripts/setup_google_sheet.py

Safe to re-run — clears then rewrites all data rows.
Headers keep their formatting.
"""

import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

SHEET_ID = os.getenv("GOOGLE_SHEET_ID", "1W_DsyAgswnSKT1o-M251JfFYYxO9CQyTopgQbGhyR-w")

# ── Tab names ──────────────────────────────────────────────────────────────────
TAB_CLIENTS   = "clients"
TAB_QUEUE     = "onboarding_queue"
TAB_SERVICES  = "services"
TAB_PLATFORM  = "platform_services"

# ── Column headers ─────────────────────────────────────────────────────────────
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

PLATFORM_HEADERS = [
    "key", "module_key", "name_ar", "name_en", "description_ar",
    "icon", "monthly_price", "is_active",
]

HEADER_FORMAT = {
    "backgroundColor": {"red": 0.07, "green": 0.07, "blue": 0.12},
    "textFormat": {
        "bold": True,
        "foregroundColor": {"red": 0.83, "green": 0.66, "blue": 0.32},
    },
}

ALL_TABS = {
    TAB_CLIENTS:  CLIENTS_HEADERS,
    TAB_QUEUE:    QUEUE_HEADERS,
    TAB_SERVICES: SERVICES_HEADERS,
    TAB_PLATFORM: PLATFORM_HEADERS,
}


# ── Google Sheets helpers ──────────────────────────────────────────────────────

def _load_credentials_json() -> dict:
    """
    Load Google service account JSON from:
      1. GOOGLE_SERVICE_ACCOUNT_JSON env var (JSON string)
      2. GOOGLE_CREDENTIALS_FILE env var (path to .json file)
      3. service-account.json in project root (dev convenience)
    """
    raw = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "").strip()
    if raw and raw.startswith("{"):
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass

    # Fallback: read from a file path
    file_path = os.getenv(
        "GOOGLE_CREDENTIALS_FILE",
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "service-account.json"),
    )
    if os.path.exists(file_path):
        with open(file_path, encoding="utf-8") as f:
            print(f"  Reading credentials from {file_path}")
            return json.load(f)

    print("ERROR: Google credentials not found.")
    print("  Option 1: set GOOGLE_SERVICE_ACCOUNT_JSON env var")
    print("  Option 2: set GOOGLE_CREDENTIALS_FILE=/path/to/credentials.json")
    print("  Option 3: place service-account.json in the project root")
    sys.exit(1)


def _get_sheets_service():
    from google.oauth2.service_account import Credentials
    from googleapiclient.discovery import build

    creds_dict = _load_credentials_json()
    creds = Credentials.from_service_account_info(
        creds_dict,
        scopes=["https://www.googleapis.com/auth/spreadsheets"],
    )
    return build("sheets", "v4", credentials=creds, cache_discovery=False)


def _get_existing_sheet_ids(svc) -> dict:
    meta = svc.spreadsheets().get(spreadsheetId=SHEET_ID).execute()
    return {s["properties"]["title"]: s["properties"]["sheetId"] for s in meta["sheets"]}


def _ensure_tabs(svc, existing: dict) -> dict:
    requests = []
    for tab in ALL_TABS:
        if tab not in existing:
            requests.append({"addSheet": {"properties": {"title": tab}}})

    if requests:
        resp = svc.spreadsheets().batchUpdate(
            spreadsheetId=SHEET_ID, body={"requests": requests}
        ).execute()
        for reply in resp.get("replies", []):
            if "addSheet" in reply:
                props = reply["addSheet"]["properties"]
                existing[props["title"]] = props["sheetId"]
        new_names = [r["addSheet"]["properties"]["title"] for r in requests]
        print(f"  Created tabs: {new_names}")

    return existing


def _clear_data_rows(svc):
    """Clear all data rows (row 2 onward) in every tab — keeps headers."""
    ranges = [f"{tab}!A2:Z5000" for tab in ALL_TABS]
    svc.spreadsheets().values().batchClear(
        spreadsheetId=SHEET_ID, body={"ranges": ranges}
    ).execute()
    print("  Cleared old data rows.")


def _write_headers(svc):
    batch = {
        "valueInputOption": "RAW",
        "data": [
            {"range": f"{tab}!A1", "values": [headers]}
            for tab, headers in ALL_TABS.items()
        ],
    }
    svc.spreadsheets().values().batchUpdate(
        spreadsheetId=SHEET_ID, body=batch
    ).execute()
    print("  Headers written.")


def _format_headers(svc, sheet_ids: dict):
    requests = []
    for tab, headers in ALL_TABS.items():
        sid = sheet_ids.get(tab)
        if sid is None:
            continue
        # Gold on dark background
        requests.append({
            "repeatCell": {
                "range": {
                    "sheetId": sid,
                    "startRowIndex": 0, "endRowIndex": 1,
                    "startColumnIndex": 0, "endColumnIndex": len(headers),
                },
                "cell": {"userEnteredFormat": HEADER_FORMAT},
                "fields": "userEnteredFormat(backgroundColor,textFormat)",
            }
        })
        # Freeze first row
        requests.append({
            "updateSheetProperties": {
                "properties": {
                    "sheetId": sid,
                    "gridProperties": {"frozenRowCount": 1},
                },
                "fields": "gridProperties.frozenRowCount",
            }
        })

    if requests:
        svc.spreadsheets().batchUpdate(
            spreadsheetId=SHEET_ID, body={"requests": requests}
        ).execute()
        print("  Headers formatted (gold on dark, frozen).")


# ── DB seeding ─────────────────────────────────────────────────────────────────

async def _seed_from_db(svc):
    from app.db.client import prisma_client

    await prisma_client.connect()

    # ── 1. Sync selected_services for all clients first ────────────────────────
    print("  Syncing selected_services snapshot...")
    all_clients = await prisma_client.client.find_many(order={"createdAt": "asc"})

    for c in all_clients:
        active_svcs = await prisma_client.clientservice.find_many(
            where={"clientId": c.id, "isActive": True}
        )
        keys = [s.serviceKey for s in active_svcs]
        await prisma_client.client.update(
            where={"id": c.id},
            data={"selected_services": keys},
        )

    # Re-fetch with updated data
    clients = await prisma_client.client.find_many(order={"createdAt": "asc"})

    # ── 2. Build clients tab rows ──────────────────────────────────────────────
    client_rows = []
    service_rows = []

    for c in clients:
        user = await prisma_client.user.find_first(where={"clientId": c.id})
        svcs = await prisma_client.clientservice.find_many(where={"clientId": c.id})

        sel = c.selected_services or []
        sel_str = ", ".join(sel) if isinstance(sel, list) else str(sel)

        client_rows.append([
            c.slug,
            c.name_ar or "",
            c.name_en or "",
            c.service_type or "",
            c.status or "trial",
            c.currency or "USD",
            c.primary_color or "",
            user.fullName if user else "",
            c.phone or "",
            c.email or (user.email if user else ""),
            c.trial_ends_at.isoformat() if c.trial_ends_at else "",
            c.createdAt.isoformat() if c.createdAt else "",
            sel_str,
            "", "", "",   # notes, deal_value, next_action — filled manually
        ])

        for s in svcs:
            service_rows.append([
                c.slug,
                s.serviceKey,
                "TRUE" if s.isActive else "FALSE",
                s.activatedAt.isoformat() if s.activatedAt else "",
            ])

    # ── 3. Build platform_services tab rows ────────────────────────────────────
    platform_rows = []
    platform_svcs = await prisma_client.platformservice.find_many(
        order={"sortOrder": "asc"}
    )
    for p in platform_svcs:
        platform_rows.append([
            p.key,
            p.moduleKey,
            p.nameAr,
            p.nameEn,
            p.descriptionAr or "",
            p.icon or "",
            float(p.monthlyPrice) if p.monthlyPrice else 0,
            "TRUE" if p.isActive else "FALSE",
        ])

    await prisma_client.disconnect()

    # ── 4. Write all tabs in one batchUpdate ───────────────────────────────────
    batch_data = []
    if client_rows:
        batch_data.append({"range": f"{TAB_CLIENTS}!A2",  "values": client_rows})
    if service_rows:
        batch_data.append({"range": f"{TAB_SERVICES}!A2", "values": service_rows})
    if platform_rows:
        batch_data.append({"range": f"{TAB_PLATFORM}!A2", "values": platform_rows})

    if batch_data:
        svc.spreadsheets().values().batchUpdate(
            spreadsheetId=SHEET_ID,
            body={"valueInputOption": "USER_ENTERED", "data": batch_data},
        ).execute()
        print(
            f"  Seeded: {len(client_rows)} clients · "
            f"{len(service_rows)} service rows · "
            f"{len(platform_rows)} platform services"
        )
    else:
        print("  No data found in DB.")


# ── Main ───────────────────────────────────────────────────────────────────────

async def main():
    print(f"\nSalmanSaaS -- Google Sheet Setup v2")
    print(f"   Sheet: https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit\n")

    svc = _get_sheets_service()
    print("Authenticated OK")

    existing = _get_existing_sheet_ids(svc)
    print(f"  Existing tabs: {list(existing.keys())}")

    existing = _ensure_tabs(svc, existing)
    _clear_data_rows(svc)
    _write_headers(svc)
    _format_headers(svc, existing)

    print("\nSeeding from DB...")
    await _seed_from_db(svc)

    print(f"\nDone.")
    print(f"   https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit\n")


if __name__ == "__main__":
    asyncio.run(main())
