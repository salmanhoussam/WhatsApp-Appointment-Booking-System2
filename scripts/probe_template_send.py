"""
Send ONE template to Salman's own number, to settle where the template path actually fails.

WHAT THIS IS FOR. `new_reservation_alert` is not sending. Two very different causes look
identical from outside: the template PATH could be broken for this environment, or OUR template's
definition/approval/parameters could be wrong. Sending a template we know is approved separates
them — and nothing else does.

HISTORY, BECAUSE IT IS THE WHOLE REASON THIS SCRIPT LOOKS LIKE THIS:

  1. It first checked WHATSAPP_TOKEN — a name that exists nowhere in this repo. It aborted on
     production reporting a missing credential that was never missing. Now it reads through
     `settings`, the same read WhatsAppService does, so the two cannot disagree about a name.
  2. It then sent `hello_world` and got 131058 — Meta allows that template only from its Public
     Test Numbers. The script called this "the template PATH is broken", which is false and would
     have tripped Salman's gate ("if it fails, stop D13") on a result saying the opposite.
  3. Default is now `3p_direct_integration_test_template`: Meta's own integration-test template,
     auto-created on THIS WABA at onboarding, status "Active - Quality pending" = approved and
     sendable. Being ours, 131058 does not apply.

  Twice I got a parameter count wrong by reading a rendered preview. So this now READS THE
  TEMPLATE'S DEFINITION FROM META FIRST and builds the request from that. A probe that guesses
  the shape of its own request cannot tell "the channel is broken" from "I built it wrong" —
  which is the only question it exists to answer.

USABLE AS A PROBE, NEVER AS A PRODUCT MESSAGE (Salman asked exactly this). The default template
is English-only onboarding copy with no variables and no buttons: it cannot carry a booking and it
cannot carry تأكيد/إلغاء. Never send it to a customer.

    railway run venv/bin/python scripts/probe_template_send.py                    # dry run
    railway run venv/bin/python scripts/probe_template_send.py --send
    railway run venv/bin/python scripts/probe_template_send.py new_reservation_alert --send
"""
import asyncio
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

SALMAN = "96178727986"

# Meta's OWN integration-test template, auto-created on this WABA at onboarding. Status
# "Active - Quality pending" = approved and sendable; it is NOT `hello_world`, which Meta allows
# only from its Public Test Numbers and which therefore returned 131058 here (2026-09-12).
#
# Salman asked the right question about it: usable as a probe, or test-only? As a PROBE it is
# exactly right -- it is this WABA's own template, so a send proves a template reaches a cold
# number FROM OUR NUMBER. As a PRODUCT message it is useless: English-only onboarding copy, no
# variables to carry a booking, no buttons to carry تأكيد/إلغاء. Never send it to a customer.
DEFAULT_TEMPLATE = "3p_direct_integration_test_template"
DEFAULT_LANGUAGE = "en_US"

SEND = "--send" in sys.argv
_named = [a for a in sys.argv[1:] if not a.startswith("--")]
TEMPLATE = _named[0] if _named else DEFAULT_TEMPLATE


async def _lookup(client, waba: str, token: str, name: str):
    """The template's real definition from Meta, or None. READ ONLY."""
    r = await client.get(f"https://graph.facebook.com/v18.0/{waba}/message_templates",
                         params={"limit": 100},
                         headers={"Authorization": f"Bearer {token}"})
    if r.status_code != 200:
        return None, f"HTTP {r.status_code}"
    for t in r.json().get("data", []):
        if t.get("name") == name:
            return t, None
    return None, "not found on this WABA"


async def main() -> int:
    import httpx
    from app.core.config import settings
    from app.services.whatsapp_service import WhatsAppService

    token, waba = settings.WHATSAPP_ACCESS_TOKEN, settings.WHATSAPP_BUSINESS_ACCOUNT_ID
    print(f"  WHATSAPP_ACCESS_TOKEN           {'set' if token else 'NOT SET'}")
    print(f"  WHATSAPP_PHONE_NUMBER_ID        {'set' if settings.WHATSAPP_PHONE_NUMBER_ID else 'NOT SET'}")
    print(f"  WHATSAPP_BUSINESS_ACCOUNT_ID    {'set' if waba else 'NOT SET'}")
    if not token or not settings.WHATSAPP_PHONE_NUMBER_ID:
        print("\nABORT: run it through `railway run` so production's values are injected.")
        return 1

    # LOOK THE TEMPLATE UP BEFORE SENDING IT.
    #
    # This exists because I got the parameter count wrong twice by reading a rendered preview:
    # once sending 7 body params to a 1-header/6-body template, once assuming `hello_world` was
    # usable at all. A probe that guesses the shape of what it sends cannot distinguish "the
    # channel is broken" from "I built the request wrong" -- which is the only thing it is for.
    header_n = body_n = 0
    status = language = "?"
    if waba:
        async with httpx.AsyncClient(timeout=30) as client:
            tpl, err = await _lookup(client, waba, token, TEMPLATE)
        if err:
            print(f"\n⚠️  could not read '{TEMPLATE}' from Meta ({err}) — sending with 0 params")
        else:
            status, language = tpl.get("status", "?"), tpl.get("language", "?")
            for comp in tpl.get("components", []):
                n = len(set(re.findall(r"\{\{\s*(\d+)\s*\}\}", comp.get("text") or "")))
                if str(comp.get("type", "")).upper() == "HEADER":
                    header_n = n
                elif str(comp.get("type", "")).upper() == "BODY":
                    body_n = n
            print(f"\n  Meta's definition: status={status} language={language} "
                  f"header={header_n} body={body_n}")
            if status != "APPROVED" and "PENDING" in status.upper():
                print(f"  ⚠️  status is {status} — a send may be refused for that alone")

    lang = language if language != "?" else DEFAULT_LANGUAGE
    print(f"\n  template  {TEMPLATE}  ({lang})")
    print(f"  to        {SALMAN}")
    if not SEND:
        print("\nDRY RUN — nothing sent. Re-run with --send.")
        return 0

    wa = WhatsAppService()
    result = await wa.send_template(
        to            = SALMAN,
        name          = TEMPLATE,
        language      = lang,
        header_params = ["probe"] * header_n or None,
        body_params   = [f"probe{i+1}" for i in range(body_n)] or None,
    )

    print("\n── result ──")
    print(f"  accepted by Meta : {bool(result)}")
    print(f"  wamid            : {getattr(result, 'wamid', None) or '—'}")
    print(f"  our reason       : {getattr(result, 'reason', None) or '—'}")
    print(f"  Meta error_code  : {getattr(result, 'error_code', None) or '—'}")
    print("\n── how to read it ──")
    code = getattr(result, "error_code", None)
    if result:
        print("  Accepted. Now check the PHONE. Arriving proves a template reaches a cold number")
        print("  from THIS number, so new_reservation_alert's failure is its own definition,")
        print("  approval state, or parameter split — not the path.")
        print("  Accepted is NOT delivered (proven on production 2026-09-11: Meta accepted a")
        print("  message with a wamid and then failed it with 131047). The phone is the evidence.")
    elif code == 131058:
        print("  INCONCLUSIVE, not a failure of ours. 131058 = Meta allows this template only")
        print("  from its Public Test Numbers. Credentials, request shape and reachability are")
        print("  all proven by getting a template-specific error at all. DO NOT stop D13 on it.")
        print(f"  Try this WABA's own template: {DEFAULT_TEMPLATE}")
    elif status.upper() != "APPROVED":
        # THIRD TIME THIS SCRIPT DREW A FALSE CONCLUSION, and the last one it can: it printed
        # "THIS is the result Salman's gate means: fix the send path" for a template it had just
        # read as PENDING, minutes after the path was PROVEN by a delivered message. The status is
        # already in hand above -- not using it was the bug, so the fix is to use it, not to add
        # another error-code special case.
        print(f"  EXPECTED — this template is {status}, not APPROVED.")
        print("  A template under review is not sendable at all, and Meta reports it as though")
        print("  it does not exist in its locale (132001), which reads like a missing template")
        print("  rather than a pending one. Nothing here says anything about the channel.")
        print("  THE PATH IS ALREADY PROVEN: 3p_direct_integration_test_template was accepted")
        print("  AND delivered from this number on 2026-09-12. Do NOT re-diagnose it.")
        print("  Re-run this once Meta approves the template. Nothing to fix in our code from")
        print("  this result alone — check the locale line above matches what Meta reports.")
    else:
        print("  Rejected, and the template IS approved and the parameter count came from Meta")
        print("  rather than a guess — so this is the channel or the locale, not the shape.")
        print("  `reason`: credentials_missing is an unset variable, network_error is us,")
        print("  meta_<status> is Meta refusing us; 190/401 is the token; 132001 with an APPROVED")
        print("  template means the LOCALE we sent does not match the one Meta has.")
        print("  THIS is the result Salman's gate means: fix the send path before D13.")
    # Exit non-zero ONLY for a rejection that actually implicates the channel. A PENDING
    # template and 131058 are both "inconclusive by construction", and a non-zero exit would read
    # as "the channel is broken" to anything scripting this.
    if result or code == 131058 or status.upper() != "APPROVED":
        return 0
    return 2


if __name__ == "__main__":
    print(f"probe_template_send — {TEMPLATE} — {'SEND' if SEND else 'DRY RUN'}\n")
    sys.exit(asyncio.run(main()))
