"""ONE production write on the TEST tenant: link Salman's barberlab-test account to barber «سامي».

WHY: his account has User.barberId = None while Hussein's rk account is linked, so Lia asks him
«مين الحلاق؟» on every daily log and his live test would not match Hussein's. Salman's explicit
instruction, 2026-09-22: «ربطو بسامي».

HOW: through `user_repo.update_user` -- the SAME repository call `PATCH /admin/team/{id}`
(app/api/v1/admin/team.py:486) makes, after re-applying that route's two real guards:
  1. the barber must belong to the SAME tenant as the user (team.py:472)
  2. no other login account may already hold that barber (User.barberId is @unique, team.py:475)
Nothing else is touched: role, preset and permissions stay exactly as they are, so the account
remains an owner with scope 'all' (permissions.scope_barber_id only narrows a 'self' scope).
"""
import asyncio, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), *[os.pardir] * 4))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
import _db_target                                                            # noqa: E402
os.environ["DATABASE_URL"] = _db_target.resolve(direct=False, quiet=True)

from app.db.client import prisma_client                                      # noqa: E402
from app.repositories import user_repo                                       # noqa: E402

SLUG, PHONE, BARBER_NAME = "barberlab-test", "96178727986", "سامي"


async def main() -> int:
    await prisma_client.connect()

    client = await prisma_client.client.find_first(where={"slug": SLUG})
    if not client:
        print(f"ABORT: tenant {SLUG} not found"); return 2
    if client.slug != SLUG:
        print("ABORT: wrong tenant resolved"); return 2

    user = await prisma_client.user.find_first(where={"clientId": client.id, "phone": PHONE})
    if not user:
        print(f"ABORT: no user with phone {PHONE} on {SLUG}"); return 2

    barber = await prisma_client.barber.find_first(
        where={"clientId": client.id, "name": BARBER_NAME})
    if not barber:
        print(f"ABORT: barber {BARBER_NAME!r} not found on {SLUG}"); return 2
    if str(barber.clientId) != str(client.id):
        print("ABORT: barber belongs to another tenant"); return 2

    taken = await user_repo.find_user_by_barber_id(str(barber.id))
    if taken and str(taken.id) != str(user.id):
        print(f"ABORT: barber already linked to {taken.email}"); return 2

    print(f"BEFORE  user={user.email} phone={user.phone} role={user.role} "
          f"barberId={user.barberId} preset={getattr(user, 'preset', None)} "
          f"permissions={'NULL' if getattr(user, 'permissions', None) is None else 'array'}")
    if str(user.barberId or "") == str(barber.id):
        print("NO-OP: already linked"); return 0
    if user.barberId:
        print(f"ABORT: already linked to another barber ({user.barberId}) — release it first")
        return 2

    await user_repo.update_user(str(user.id), {"barberId": str(barber.id)})

    after = await prisma_client.user.find_first(where={"id": user.id})
    print(f"AFTER   user={after.email} role={after.role} barberId={after.barberId} "
          f"preset={getattr(after, 'preset', None)} "
          f"permissions={'NULL' if getattr(after, 'permissions', None) is None else 'array'}")
    print(f"barber  {BARBER_NAME} id={barber.id}")
    ok = str(after.barberId) == str(barber.id) and after.role == user.role
    print("RESULT:", "✅ linked, nothing else changed" if ok else "🔴 unexpected state")
    return 0 if ok else 2


sys.exit(asyncio.run(main()))
