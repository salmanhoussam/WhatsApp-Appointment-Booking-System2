#!/usr/bin/env python3
"""
scripts/monitor_health.py
─────────────────────────
Synthetic Login Health Monitor — validates the SSO login pipeline is alive.

Usage:
    python scripts/monitor_health.py

Cron (every 20 min):
    */20 * * * * cd /path/to/project && /path/to/venv/bin/python scripts/monitor_health.py >> logs/health.log 2>&1

Environment Variables (from .env or shell):
    API_BASE_URL     — defaults to https://api.salmansaas.com
    TEST_EMAIL       — admin test account email
    TEST_PASSWORD    — admin test account password
    HEALTH_TIMEOUT   — request timeout in seconds (default: 15)
"""

import os
import sys
import json
from datetime import datetime, timezone

# ── Load .env if python-dotenv is available ────────────────────────────────────
try:
    from dotenv import load_dotenv
    # Walk up to find .env relative to this script
    _root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    load_dotenv(os.path.join(_root, ".env"))
except ImportError:
    pass  # dotenv not installed — rely on shell env vars

import requests


# ── Configuration ──────────────────────────────────────────────────────────────
API_BASE_URL = os.getenv("API_BASE_URL", "https://api.salmansaas.com")
LOGIN_ENDPOINT = f"{API_BASE_URL}/api/v1/auth/users/login"
TEST_EMAIL = os.getenv("TEST_EMAIL")
TEST_PASSWORD = os.getenv("TEST_PASSWORD")
TIMEOUT = int(os.getenv("HEALTH_TIMEOUT", "15"))


def now_iso() -> str:
    """UTC timestamp in ISO format."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def check_health() -> dict:
    """
    Perform a synthetic login and return a health report dict.

    Returns:
        {
            "status":    "OK" | "FAIL",
            "timestamp": "2026-04-21 00:20:00 UTC",
            "endpoint":  "https://...",
            "http_code": 200 | None,
            "has_token":  True | False,
            "latency_ms": 342,
            "error":     None | "reason string",
        }
    """
    report = {
        "status": "FAIL",
        "timestamp": now_iso(),
        "endpoint": LOGIN_ENDPOINT,
        "http_code": None,
        "has_token": False,
        "latency_ms": None,
        "error": None,
    }

    # ── Pre-flight: ensure credentials exist ───────────────────────────────
    if not TEST_EMAIL or not TEST_PASSWORD:
        report["error"] = (
            "Missing TEST_EMAIL or TEST_PASSWORD in environment. "
            "Set them in .env or export before running."
        )
        return report

    # ── Execute synthetic login ────────────────────────────────────────────
    try:
        resp = requests.post(
            LOGIN_ENDPOINT,
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            timeout=TIMEOUT,
            allow_redirects=False,
        )

        report["http_code"] = resp.status_code
        report["latency_ms"] = int(resp.elapsed.total_seconds() * 1000)

        # ── Assert 200 ────────────────────────────────────────────────────
        if resp.status_code != 200:
            body_preview = resp.text[:200] if resp.text else "(empty body)"
            report["error"] = f"HTTP {resp.status_code} — {body_preview}"
            return report

        # ── Assert admin_access_token cookie ──────────────────────────────
        cookies = resp.cookies.get_dict()
        set_cookie_header = resp.headers.get("set-cookie", "")

        has_cookie = (
            "admin_access_token" in cookies
            or "admin_access_token" in set_cookie_header
        )

        # Also check if the token is in the JSON body (some setups return it there)
        body = {}
        try:
            body = resp.json()
        except (json.JSONDecodeError, ValueError):
            pass

        has_body_token = bool(body.get("admin_access_token") or body.get("access_token"))

        report["has_token"] = has_cookie or has_body_token

        if not report["has_token"]:
            report["error"] = (
                "Login returned 200 but no admin_access_token found "
                "in cookies or response body."
            )
            return report

        # ── All checks passed ─────────────────────────────────────────────
        report["status"] = "OK"
        report["error"] = None
        return report

    except requests.exceptions.Timeout:
        report["error"] = f"Request timed out after {TIMEOUT}s"
        return report

    except requests.exceptions.ConnectionError as exc:
        report["error"] = f"Connection error — {exc}"
        return report

    except Exception as exc:
        report["error"] = f"Unexpected error — {type(exc).__name__}: {exc}"
        return report


def main():
    report = check_health()

    if report["status"] == "OK":
        latency = report["latency_ms"]
        print(
            f"✅ [{report['timestamp']}] System Health: OK. "
            f"Login successful. Latency: {latency}ms"
        )
        sys.exit(0)
    else:
        print(
            f"🚨 [{report['timestamp']}] ALERT: Login failed!\n"
            f"   Endpoint:  {report['endpoint']}\n"
            f"   HTTP Code: {report['http_code']}\n"
            f"   Has Token: {report['has_token']}\n"
            f"   Latency:   {report['latency_ms']}ms\n"
            f"   Error:     {report['error']}"
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
