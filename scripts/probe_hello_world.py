"""
Send Meta's pre-approved `hello_world` template, to isolate WHERE the template path fails.

SALMAN'S IDEA, 2026-09-12: *"فينا نستخدم التمبليت تبع Hello World مبدئيًا لنتأكد إنه الفلو صحيح
على الـtest number."* It is the right instrument, because it removes every variable our own
template introduces.

WHAT IT PROVES
  * credentials, WHATSAPP_PHONE_NUMBER_ID and the send_template() request shape all work
  * a TEMPLATE reaches a number whose 24-hour window is closed — which is the whole reason the
    merchant alert needs one (free-form gets 131047 there, confirmed on production 2026-09-11)

WHAT IT DOES NOT PROVE — and this is why it is a probe, not a test
  * nothing about OUR parameter contract: `hello_world` takes no parameters at all
  * nothing about buttons: it has none

So read it as a fork, not a verdict:
    sends OK   -> templates work here; any failure of `new_reservation_alert` is that template's
                  own definition, approval state, or parameter split
    fails      -> the template PATH is broken for this environment, and our parameters were never
                  the question

RECIPIENT IS ALWAYS SALMAN'S OWN NUMBER, per the standing rule that every real WhatsApp test
targets his phone — a made-up number only ever proves 131026.

TO NOT SEND, just print what would be sent:
    railway run venv/bin/python scripts/probe_hello_world.py

TO ACTUALLY SEND:
    railway run venv/bin/python scripts/probe_hello_world.py --send

`railway run` INJECTS the environment into this process. It never prints it, which is the
established pattern here after a real leak (`.claude/rules/` — Railway is commit + logs only).
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

SALMAN = "96178727986"
SEND = "--send" in sys.argv


async def main() -> int:
    # Imported after the path fix, and deliberately inside main(): importing app.services at
    # module scope pulls the whole settings chain before we have reported what is missing.
    from app.services.whatsapp_service import WhatsAppService

    # READ THROUGH `settings`, NOT os.getenv WITH A NAME TYPED HERE.
    #
    # The first version of this probe checked "WHATSAPP_TOKEN" and aborted on production saying
    # it was not set. It was never set anywhere: the name does not exist in this repository. The
    # app reads WHATSAPP_ACCESS_TOKEN (config.py:81), so the probe was measuring my own typo and
    # reporting it as a missing production credential — the exact class of false negative a probe
    # exists to rule out.
    #
    # Going through `settings` means the probe and the sender can never disagree about the name
    # again: if WhatsAppService can find a credential, so can this, because it is the same read.
    from app.core.config import settings

    # PRESENCE ONLY. Never the value — that rule exists because it was broken once.
    creds = {
        "WHATSAPP_ACCESS_TOKEN":        settings.WHATSAPP_ACCESS_TOKEN,
        "WHATSAPP_PHONE_NUMBER_ID":     settings.WHATSAPP_PHONE_NUMBER_ID,
        "WHATSAPP_BUSINESS_ACCOUNT_ID": settings.WHATSAPP_BUSINESS_ACCOUNT_ID,
        "WHATSAPP_CENTRAL_NUMBER":      settings.WHATSAPP_CENTRAL_NUMBER,
    }
    for name, value in creds.items():
        print(f"  {name:<32}{'set' if value else 'NOT SET'}")

    # Only the two the send itself needs. WhatsAppService refuses without exactly these.
    missing = [n for n in ("WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID") if not creds[n]]
    if missing:
        print(f"\nABORT: {', '.join(missing)} not in this environment.")
        print("       Run it through `railway run` so production's own values are injected.")
        return 1

    print(f"\n  template  hello_world  (language en_US — Meta's own, not ours)")
    print(f"  to        {SALMAN}")
    if not SEND:
        print("\nDRY RUN — nothing sent. Re-run with --send.")
        return 0

    wa = WhatsAppService()
    # en_US, not ar: `hello_world` exists only in en_US, and send_template's own docstring warns
    # that asking for a translation that does not exist fails with "template name does not exist
    # in the translation" — which reads like a missing template rather than a wrong locale.
    result = await wa.send_template(to=SALMAN, name="hello_world", language="en_US")

    print("\n── result ──")
    print(f"  accepted by Meta : {bool(result)}")
    print(f"  wamid            : {getattr(result, 'wamid', None) or '—'}")
    print(f"  our reason       : {getattr(result, 'reason', None) or '—'}")
    print(f"  Meta error_code  : {getattr(result, 'error_code', None) or '—'}")
    print("\n── how to read it ──")
    if result:
        print("  Accepted. Now check the PHONE: 'Hello World' arriving proves a template reaches")
        print("  a cold number here, so new_reservation_alert's failure is its own definition,")
        print("  approval state, or parameter split — not the path.")
        print("  Accepted is NOT delivered (proven on production 2026-09-11: Meta accepted a")
        print("  message with a wamid and then failed it with 131047). The phone is the evidence.")
    else:
        print("  Rejected. The template PATH is broken for this environment, and our own")
        print("  template's parameters were never the question. Read `reason`: credentials_missing")
        print("  is an unset variable, network_error is us, meta_<status> is Meta refusing us.")
    return 0 if result else 2


if __name__ == "__main__":
    print(f"probe_hello_world — {'SEND' if SEND else 'DRY RUN'}\n")
    sys.exit(asyncio.run(main()))
