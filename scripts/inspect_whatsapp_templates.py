"""
Ask Meta what our templates actually are. READ ONLY — no message is ever sent.

WHY THIS REPLACES THE hello_world PROBE (2026-09-12). That probe came back
`131058 — Hello World templates can only be sent from the Public Test Numbers`: Meta refuses
`hello_world` from a real verified business number, by design. So it can never answer our
question from this account, and the probe was inconclusive BY CONSTRUCTION rather than failing.

What 131058 did prove, and it is not nothing: the credentials work (no 190/401), the request
shape is valid (Meta parsed it and returned a template-specific error), and the path reaches
Meta. What it cannot prove is anything about OUR template.

This asks directly instead, and answers both open questions in one read:

  1. Is `new_reservation_alert` APPROVED yet? (it was "in review")
  2. Is its parameter split really 1 header + 6 body — the thing we corrected on Salman's word
     and have never verified against Meta's own definition?

    venv/bin/python scripts/inspect_whatsapp_templates.py          # needs railway run
    railway run venv/bin/python scripts/inspect_whatsapp_templates.py
"""
import asyncio
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

OURS = "new_reservation_alert"


async def main() -> int:
    import httpx
    from app.core.config import settings

    token = settings.WHATSAPP_ACCESS_TOKEN
    waba  = settings.WHATSAPP_BUSINESS_ACCOUNT_ID

    # PRESENCE ONLY, never the value.
    print(f"  WHATSAPP_ACCESS_TOKEN           {'set' if token else 'NOT SET'}")
    print(f"  WHATSAPP_BUSINESS_ACCOUNT_ID    {'set' if waba else 'NOT SET'}")
    if not token or not waba:
        print("\nABORT: run it through `railway run` so production's values are injected.")
        return 1

    url = f"https://graph.facebook.com/v18.0/{waba}/message_templates"
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(url, params={"limit": 100},
                             headers={"Authorization": f"Bearer {token}"})

    if r.status_code != 200:
        body = r.text
        # Defensive: an error body should not echo a credential, but never assume it.
        if token:
            body = body.replace(token, "<redacted>")
        print(f"\n❌ HTTP {r.status_code}\n{body[:600]}")
        return 2

    rows = r.json().get("data", [])
    print(f"\n── {len(rows)} template(s) on this WABA ──")
    hdr = f"  {'name':<30}{'lang':<8}{'status':<12}{'category':<12}"
    print(hdr + "\n  " + "-" * (len(hdr) - 2))
    for t in sorted(rows, key=lambda x: (x.get("name", ""), x.get("language", ""))):
        print(f"  {t.get('name',''):<30}{t.get('language',''):<8}"
              f"{t.get('status',''):<12}{t.get('category',''):<12}")

    approved = [t for t in rows if t.get("status") == "APPROVED"]
    print(f"\n  APPROVED and therefore sendable right now: "
          f"{', '.join(sorted({t['name'] for t in approved})) or 'NONE'}")

    mine = [t for t in rows if t.get("name") == OURS]
    if not mine:
        print(f"\n🔴 '{OURS}' does not exist on this WABA under that exact name.")
        return 0

    for t in mine:
        print(f"\n── {OURS} [{t.get('language')}] · {t.get('status')} ──")
        counts: dict[str, int] = {}
        for comp in t.get("components", []):
            ctype = str(comp.get("type", "")).upper()
            text  = comp.get("text") or ""
            # Meta returns the component's literal text with {{n}} placeholders in it, which is
            # the authoritative parameter count -- not our assumption about it.
            n = len(set(re.findall(r"\{\{\s*(\d+)\s*\}\}", text)))
            if ctype in ("HEADER", "BODY"):
                counts[ctype] = n
            label = f"{ctype}" + (f" ({comp.get('format')})" if comp.get("format") else "")
            print(f"  {label:<20}{n} param(s)")
            if text:
                print(f"    {text[:150]}")
            for b in comp.get("buttons", []) or []:
                print(f"    button: type={b.get('type')} text={b.get('text')!r}")

        header_n, body_n = counts.get("HEADER", 0), counts.get("BODY", 0)
        ours = (1, 6)
        print(f"\n  Meta says      header={header_n}  body={body_n}")
        print(f"  our code sends header={ours[0]}  body={ours[1]}")
        print(f"  {'✅ MATCH' if (header_n, body_n) == ours else '🔴 MISMATCH — this is why the send is rejected'}")
        if t.get("status") != "APPROVED":
            print(f"  ⏳ status={t.get('status')} — nothing sends through it until APPROVED, "
                  f"whatever the parameters say.")
    return 0


if __name__ == "__main__":
    print("inspect_whatsapp_templates — READ ONLY, no send\n")
    sys.exit(asyncio.run(main()))
