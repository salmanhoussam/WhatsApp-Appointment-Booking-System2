"""F0.8 — the a3-PR invariant, audited. READ ONLY: no writes, no sends, ever.

    venv/bin/python scripts/audit_lia_owner_actor_invariant.py

THE INVARIANT (decision a3-PR, 2026-09-16)

    A tenant Lia operates on must have an ACTIVE `User` reachable from its published shop number.

    Decision D3-2 made this load-bearing: the shop number answers "which tenant" and no longer
    answers "who", so a tenant whose shop number resolves to no account has no actor — Lia refuses
    with `identity_unresolved`. That refusal is the RUNTIME half of a3-PR and it already works.
    This script is the PROVISIONING half: it makes the condition visible before an owner meets it.

WHY DETECTION RATHER THAN A HARD BLOCK AT PROVISIONING — a real finding, reported not worked around

    a3-PR was decided as "provisioning prevents, runtime detects". Measuring the three real
    tenant-creation paths afterwards showed a hard block cannot be placed at all of them:

      * `registration_service.register_new_tenant` SATISFIES the invariant already. It writes
        `Client.phone` and `User.phone` from one input (`:127` and `:167`), so every
        self-registered tenant has the account. A raise there would never fire.
      * `demo_service` CANNOT satisfy it, by design. It writes `Client.phone = "demo-<slug>"`, a
        placeholder with no digits at all (`:320`), and creates its User with no phone. A raise
        there would break demo-tenant creation outright — for tenants that decision **D0** places
        outside the population anyway.
      * `public_service.py:346` auto-creates `smar`, which is not a Lia tenant.

    And the placeholder case is already safe by construction: `_resolve_actor` filters candidate
    numbers to those with digits, so a `demo-<slug>` phone can never match a sender. Verified, not
    assumed — `scripts/test_lia_foundation.py` asserts the digit filter.

    So the honest form of "prevention" is a checkable invariant plus this audit, and a hard block
    is NOT inserted into a shared provisioning path without its own decision. Naming that gap is
    the point: it is a deliberate reduction of the approved item, not a silent one.
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts import _db_target                                        # noqa: E402

os.environ["DATABASE_URL"] = _db_target.resolve(direct=True, quiet=True)

from app.db.client import prisma_client                               # noqa: E402
from app.services.lia_owner_entry import _phone_candidates            # noqa: E402

# Decision D0: `alzabt-demo` is not a tenant and is excluded from every population and every
# tenant decision. `status` does NOT distinguish it (measured 2026-09-16: "active" on all four
# barber tenants), so the exclusion is by slug and must be written down, exactly here.
EXCLUDED_SLUGS = {"alzabt-demo"}


def _digits(v):
    return "".join(ch for ch in (v or "") if ch.isdigit())


async def main() -> int:
    await prisma_client.connect()
    try:
        clients = await prisma_client.client.find_many()
        users = await prisma_client.user.find_many()
        rows = await prisma_client.clientservice.find_many()

        # A tenant is "Lia-reachable" when it passes ① — `lia OR reservations` — which is exactly
        # what `_tenant_has_lia` asks. Read here rather than restated as a different rule.
        reachable = {
            r.clientId for r in rows
            if r.isActive and r.serviceKey in ("lia", "reservations")
        }

        print("Lia owner-actor invariant (a3-PR) — READ ONLY\n")
        print(f"{'slug':18} {'①':4} {'shop no.':10} {'actor?':8} verdict")
        print("-" * 72)

        violations, excluded, checked = [], [], 0
        for c in sorted(clients, key=lambda x: x.slug):
            if c.id not in reachable:
                continue
            if c.slug in EXCLUDED_SLUGS:
                excluded.append(c.slug)
                print(f"{c.slug:18} {'yes':4} {'—':10} {'—':8} EXCLUDED by D0 — not a tenant")
                continue

            checked += 1
            numbers = [n for n in (getattr(c, "whatsapp_number", None), c.phone) if _digits(n)]
            if not numbers:
                # The demo/placeholder shape. Not a violation: a number with no digits can never
                # match a sender, so Lia's path A is unreachable for this tenant by construction.
                print(f"{c.slug:18} {'yes':4} {'none':10} {'n/a':8} "
                      f"no dialable shop number — path A unreachable, path B only")
                continue

            found = []
            for n in numbers:
                cands = {_digits(x) for x in _phone_candidates(n) if _digits(x)}
                found += [u for u in users
                          if u.clientId == c.id and getattr(u, "isActive", True)
                          and _digits(getattr(u, "phone", None)) in cands]

            uniq = {u.id for u in found}
            shop = "..." + _digits(numbers[0])[-4:]
            if len(uniq) == 1:
                print(f"{c.slug:18} {'yes':4} {shop:10} {'1':8} OK")
            elif not uniq:
                print(f"{c.slug:18} {'yes':4} {shop:10} {'0':8} 🔴 VIOLATION — no active account")
                violations.append((c.slug, "no_active_user_on_shop_number"))
            else:
                print(f"{c.slug:18} {'yes':4} {shop:10} {len(uniq):<8} "
                      f"🔴 VIOLATION — ambiguous, Lia will refuse (I-3)")
                violations.append((c.slug, f"ambiguous_{len(uniq)}_accounts"))

        print("-" * 72)
        print(f"checked {checked} in-population tenant(s) · excluded {excluded or 'none'} · "
              f"{len(violations)} violation(s)")
        if violations:
            print("\n🔴 A violating tenant is not broken silently — Lia refuses with")
            print("   `identity_unresolved` / `identity_ambiguous` and records it. Fixing it means")
            print("   giving that tenant an active account carrying the shop number, which is a")
            print("   production write and needs its own approval.")
            for slug, why in violations:
                print(f"     {slug}: {why}")
        else:
            print("\n✅ every in-population Lia-reachable tenant satisfies the invariant.")
        return 1 if violations else 0
    finally:
        await prisma_client.disconnect()


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
