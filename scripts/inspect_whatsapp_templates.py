"""
Ask Meta what our templates actually are. READ ONLY — no message is ever sent, nothing is
created, nothing is deleted. The only HTTP verb used here is GET.

WHY THIS REPLACES THE hello_world PROBE (2026-09-12). That probe came back
`131058 — Hello World templates can only be sent from the Public Test Numbers`: Meta refuses
`hello_world` from a real verified business number, by design. So it can never answer our
question from this account, and the probe was inconclusive BY CONSTRUCTION rather than failing.

EXTENDED 2026-09-12 for the Barber Vertical WhatsApp Review (T2 §3). The first version answered
two questions (is `new_reservation_alert` approved, is it really 1+6). The review needs the whole
channel surface, because three separate wrong conclusions this session all came from reasoning
about a template from something other than Meta's own definition of it:

  * `summary`  -> message_template_count / message_template_limit: our ceiling, never once read
  * `id`       -> the hsm_id. There is NO documented GET for a single template by id, and DELETE
                  by `name` removes EVERY language while `hsm_id` removes one -- so any future
                  delete tool needs this, and it is only obtainable from this listing.
  * buttons    -> type, text, and whether a URL button's href carries {{n}}. This is what decides
                  whether an inbound tap arrives with a payload or as its literal button text,
                  which is exactly what `_CONFIRM_INTENTS` in whatsapp_merchant_actions.py keys on.
  * status     -> ten documented values, not three. PAUSED / DISABLED / LIMIT_EXCEEDED each DROP
                  a template that used to work, for quality or volume reasons. We monitor none of
                  them, so a merchant alert could stop arriving in silence.
  * header     -> format (TEXT/IMAGE/VIDEO/DOCUMENT/LOCATION) and its variable count.

    railway run venv/bin/python scripts/inspect_whatsapp_templates.py
    railway run venv/bin/python scripts/inspect_whatsapp_templates.py --json > /tmp/templates.json
"""
import asyncio
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

OURS = "new_reservation_alert"
AS_JSON = "--json" in sys.argv

# Statuses that silently take a WORKING template out of service. Read, never assumed.
DROPPING = {"PAUSED", "DISABLED", "LIMIT_EXCEEDED", "REJECTED", "PENDING_DELETION", "DELETED"}

VAR = re.compile(r"\{\{\s*(\d+)\s*\}\}")


def _vars(text: str) -> int:
    """Meta returns the component's literal text with {{n}} placeholders. That is the
    authoritative parameter count -- not our assumption about it."""
    return len(set(VAR.findall(text or "")))


def _say(*a):
    if not AS_JSON:
        print(*a)


async def main() -> int:
    import httpx
    from app.core.config import settings

    token = settings.WHATSAPP_ACCESS_TOKEN
    waba = settings.WHATSAPP_BUSINESS_ACCOUNT_ID

    # PRESENCE ONLY, never the value.
    _say(f"  WHATSAPP_ACCESS_TOKEN           {'set' if token else 'NOT SET'}")
    _say(f"  WHATSAPP_BUSINESS_ACCOUNT_ID    {'set' if waba else 'NOT SET'}")
    if not token or not waba:
        print("\nABORT: run it through `railway run` so production's values are injected.",
              file=sys.stderr)
        return 1

    url = f"https://graph.facebook.com/v18.0/{waba}/message_templates"
    params = {
        "limit": 100,
        # Ask for the fields the review needs by name, so a missing one is Meta's answer and not
        # a quiet default. `summary` carries the account's template ceiling.
        "fields": "id,name,language,status,category,components,quality_score,"
                  "rejected_reason,previous_category",
        "summary": "total_count",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(url, params=params, headers={"Authorization": f"Bearer {token}"})

    if r.status_code != 200:
        body = r.text
        # Defensive: an error body should not echo a credential, but never assume it.
        if token:
            body = body.replace(token, "<redacted>")
        print(f"\nHTTP {r.status_code}\n{body[:800]}", file=sys.stderr)
        return 2

    payload = r.json()
    rows = payload.get("data", [])

    if AS_JSON:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0

    # ---- the account's own ceiling, which we have never read -------------------------------
    summary = payload.get("summary") or {}
    print("\n── account ──")
    used = summary.get("message_template_count", summary.get("total_count", "?"))
    cap = summary.get("message_template_limit", "?")
    print(f"  templates used / limit   {used} / {cap}")
    print(f"  rows returned            {len(rows)}")
    if payload.get("paging", {}).get("next"):
        print("  ⚠  MORE PAGES EXIST — this listing is not complete")

    # ---- by status, because 'available' means APPROVED and nothing else --------------------
    by_status: dict[str, list] = {}
    for t in rows:
        by_status.setdefault(str(t.get("status", "?")).upper(), []).append(t)

    print("\n── by status (AVAILABLE = APPROVED only) ──")
    for st in sorted(by_status):
        names = ", ".join(sorted(f"{t.get('name')}[{t.get('language')}]" for t in by_status[st]))
        flag = "  🔴 DROPS A WORKING TEMPLATE" if st in DROPPING else ""
        print(f"  {st:<18}{len(by_status[st]):>2}  {names}{flag}")

    # ---- the full inventory table ----------------------------------------------------------
    print("\n── inventory ──")
    for t in sorted(rows, key=lambda x: (x.get("name", ""), x.get("language", ""))):
        q = t.get("quality_score") or {}
        print(f"\n  {t.get('name')}  [{t.get('language')}]")
        print(f"    status={t.get('status')}  category={t.get('category')}  "
              f"quality={q.get('score', 'n/a')}")
        print(f"    hsm_id={t.get('id')}")
        if t.get("rejected_reason") and t.get("rejected_reason") != "NONE":
            print(f"    rejected_reason={t.get('rejected_reason')}")

        for comp in t.get("components", []):
            ctype = str(comp.get("type", "")).upper()
            text = comp.get("text") or ""
            fmt = comp.get("format")
            if ctype == "BUTTONS":
                for b in comp.get("buttons", []) or []:
                    btype = b.get("type")
                    bits = [f"text={b.get('text')!r}"]
                    if b.get("url"):
                        dyn = _vars(b["url"])
                        bits.append(f"url={b['url']!r}")
                        bits.append(f"dynamic_vars={dyn}" + (" ✅" if dyn else " (static)"))
                    if b.get("phone_number"):
                        bits.append(f"phone={b['phone_number']}")
                    if b.get("example"):
                        bits.append(f"example={b['example']}")
                    print(f"    BUTTON {btype:<14}{'  '.join(bits)}")
                continue
            label = ctype + (f" ({fmt})" if fmt else "")
            print(f"    {label:<22}{_vars(text)} param(s)")
            if text:
                print(f"      {text[:200]}")

    # ---- the one assertion our code makes, checked against Meta ----------------------------
    mine = [t for t in rows if t.get("name") == OURS]
    print(f"\n── our code's assumption about {OURS} ──")
    if not mine:
        print(f"  🔴 '{OURS}' does not exist on this WABA under that exact name.")
        return 0
    for t in mine:
        counts = {}
        for comp in t.get("components", []):
            ctype = str(comp.get("type", "")).upper()
            if ctype in ("HEADER", "BODY"):
                counts[ctype] = _vars(comp.get("text") or "")
        got = (counts.get("HEADER", 0), counts.get("BODY", 0))
        ours = (1, 6)
        print(f"  [{t.get('language')}] Meta says header={got[0]} body={got[1]}  |  "
              f"our code sends header={ours[0]} body={ours[1]}  "
              f"{'✅ MATCH' if got == ours else '🔴 MISMATCH'}")
        if t.get("status") != "APPROVED":
            print(f"  ⏳ status={t.get('status')} — NOT available for production use, whatever "
                  f"the parameters say.")
    return 0


if __name__ == "__main__":
    _say("inspect_whatsapp_templates — READ ONLY (GET only: no send, no create, no delete)\n")
    sys.exit(asyncio.run(main()))
