# -*- coding: utf-8 -*-
"""
scripts/test_tenant_integration.py
Integration test — registers a new tenant end-to-end and verifies DB state.

Tests:
  1. POST /api/v1/auth/register — creates Client + User
  2. Client row: slug, name_ar, status=trial, service_type
  3. User row: TENANT_ADMIN, setupToken present, isActive=True
  4. client_services: catalog seeded (required for store)
  5. GET /api/v1/auth/setup?token=... — issues JWT, invalidates token
  6. Cleanup: deletes test tenant from DB

Usage:
    python scripts/test_tenant_integration.py
    python scripts/test_tenant_integration.py --keep    # skip cleanup (inspect DB)

Env: backend must be running at VITE_API_URL or http://127.0.0.1:8000
"""

import asyncio
import sys
import os
import time
import requests

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BASE_URL  = os.getenv("VITE_API_URL", "http://127.0.0.1:8000")
KEEP_DATA = "--keep" in sys.argv

TEST_SLUG  = f"test-integration-{int(time.time())}"
TEST_EMAIL = f"{TEST_SLUG}@test.salmansaas.com"
TEST_PHONE = f"+9617{int(time.time()) % 100000000:08d}"

PAYLOAD = {
    "owner_name":       "Integration Tester",
    "email":            TEST_EMAIL,
    "password":         "TestPass123!",
    "business_name_ar": "متجر اختبار",
    "business_name_en": "Test Store",
    "whatsapp_number":  TEST_PHONE,
    "slug":             TEST_SLUG,
    "venue_type":       "store",
    "currency":         "USD",
    "services":         ["store", "catalog"],
}

OK   = "✅"
FAIL = "❌"
WARN = "⚠️"


def check(label, condition, detail=""):
    icon = OK if condition else FAIL
    print(f"  {icon} {label}" + (f" — {detail}" if detail else ""))
    return condition


async def cleanup(slug: str):
    from app.db.client import prisma_client
    await prisma_client.connect()

    client = await prisma_client.client.find_unique(where={"slug": slug})
    if client:
        await prisma_client.clientservice.delete_many(where={"clientId": client.id})
        await prisma_client.user.delete_many(where={"clientId": client.id})
        await prisma_client.client.delete(where={"id": client.id})
        print(f"\n  {OK} Cleaned up: {slug}")
    else:
        print(f"\n  {WARN} Cleanup: slug '{slug}' not found")

    await prisma_client.disconnect()


async def main():
    from app.db.client import prisma_client
    await prisma_client.connect()

    results = []
    print(f"\n{'='*55}")
    print(f"  Integration Test — {TEST_SLUG}")
    print(f"{'='*55}\n")

    # ── Step 1: Register via HTTP ────────────────────────────────────────────
    print("1. POST /api/v1/auth/register")
    try:
        r = requests.post(f"{BASE_URL}/api/v1/auth/register", json=PAYLOAD, timeout=10)
        ok = r.status_code == 200
        results.append(check("HTTP 200", ok, f"got {r.status_code}"))
        if not ok:
            print(f"     Response: {r.text[:300]}")
            await prisma_client.disconnect()
            sys.exit(1)

        resp_data = r.json().get("data", {})
        results.append(check("Response has token",        bool(resp_data.get("token"))))
        results.append(check("Response has slug",         resp_data.get("slug") == TEST_SLUG))
        results.append(check("Response has setup_url",    bool(resp_data.get("setup_url"))))
        results.append(check("Response status=trial",     resp_data.get("status") == "trial"))
        setup_url = resp_data.get("setup_url", "")
    except Exception as exc:
        print(f"  {FAIL} HTTP call failed: {exc}")
        await prisma_client.disconnect()
        sys.exit(1)

    # ── Step 2: Verify Client row ────────────────────────────────────────────
    print("\n2. DB — Client row")
    client = await prisma_client.client.find_unique(where={"slug": TEST_SLUG})
    results.append(check("Client row exists",   client is not None))
    if client:
        results.append(check("status = trial",      client.status == "trial"))
        results.append(check("service_type = store", getattr(client, "service_type", None) == "store"))
        results.append(check("isActive = True",      client.isActive))

    # ── Step 3: Verify User row ──────────────────────────────────────────────
    print("\n3. DB — User row")
    user = await prisma_client.user.find_first(
        where={"clientId": client.id, "role": "TENANT_ADMIN"}
    ) if client else None
    results.append(check("TENANT_ADMIN user exists", user is not None))
    if user:
        results.append(check("isActive = True",        user.isActive))
        results.append(check("setupToken present",     bool(getattr(user, "setupToken", None))))
        results.append(check("setupTokenExp present",  bool(getattr(user, "setupTokenExp", None))))

    # ── Step 4: Verify client_services ──────────────────────────────────────
    print("\n4. DB — client_services")
    if client:
        svcs = await prisma_client.clientservice.find_many(where={"clientId": client.id})
        keys = {s.serviceKey for s in svcs}
        results.append(check("'catalog' seeded",       "catalog" in keys, f"found: {sorted(keys)}"))
        results.append(check("'store' seeded",         "store" in keys))

    # ── Step 5: Magic link — GET /api/v1/auth/setup ──────────────────────────
    print("\n5. GET /api/v1/auth/setup (magic link)")
    if setup_url:
        token = setup_url.split("token=")[-1]
        try:
            r2 = requests.get(f"{BASE_URL}/api/v1/auth/setup", params={"token": token}, timeout=10)
            ok2 = r2.status_code == 200
            results.append(check("HTTP 200", ok2, f"got {r2.status_code}"))
            if ok2:
                d = r2.json().get("data", {})
                results.append(check("JWT token returned",  bool(d.get("token"))))
                results.append(check("Slug matches",        d.get("slug") == TEST_SLUG))

            # Verify token was invalidated
            user_after = await prisma_client.user.find_unique(where={"id": user.id}) if user else None
            results.append(check("setupToken cleared (one-time use)",
                                 not getattr(user_after, "setupToken", None)))

            # Second use should 404
            r3 = requests.get(f"{BASE_URL}/api/v1/auth/setup", params={"token": token}, timeout=10)
            results.append(check("Second use returns 404", r3.status_code == 404, f"got {r3.status_code}"))

        except Exception as exc:
            print(f"  {FAIL} Magic link test failed: {exc}")
    else:
        print(f"  {WARN} Skipped — no setup_url in registration response")

    # ── Summary ──────────────────────────────────────────────────────────────
    await prisma_client.disconnect()

    passed = sum(1 for r in results if r)
    total  = len(results)
    print(f"\n{'='*55}")
    print(f"  Result: {passed}/{total} checks passed")
    print(f"{'='*55}")

    if not KEEP_DATA:
        print("\nCleaning up test data...")
        await cleanup(TEST_SLUG)
    else:
        print(f"\n{WARN} --keep flag set: test data NOT deleted (slug: {TEST_SLUG})")

    if passed < total:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
