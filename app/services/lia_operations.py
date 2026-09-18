"""
Lia — the Operation Registry.

Lia Foundation F0.6, 2026-09-16. Implements decision **D3-a**:

    OperationDefinition = ( permission , legacy_roles , service_key , write_fn )

WHY THIS FILE EXISTS
--------------------
Until now Lia asked ONE authorization question, hardcoded inside `_resolve_owner`:

    is_authorized(user, "services.write", "SUPER_ADMIN", "TENANT_ADMIN")

With one operation that was indistinguishable from the right thing. With two it becomes wrong in
both directions, and both directions were measured on real production accounts (2026-09-16):

  * `barberlab-test`'s MANAGER_RESERVATIONS account holds `reservations.write` and nothing else.
    It is refused by Lia today even for creating a reservation, which it is entitled to do.
  * An account holding `services.write` would have been accepted for an operation it does not
    hold, the moment the scope widened past create_service.

So the OPERATION supplies the question and the human actor supplies the answer. Lia holds no
permission of her own — invariant **I-7**, and the reason there is deliberately no "lia.write"
anywhere in this codebase.

WHY FOUR FIELDS AND NOT THREE
-----------------------------
The plan originally proposed `(permission, service_key, write_fn)`. `legacy_roles` was added after
measuring `app/core/permissions.py`'s invariant **I1**: an account with `permissions IS NULL` is
judged against THAT ROUTE'S OWN role tuple, not against the permission string. The real tuples
differ per area (services 2 roles, reservations 4, catalog 4 including MANAGER_UNITS), and all
three live tenant owners are legacy accounts. Carrying only the permission would have silently
changed what every real owner may do.

WHAT IS DELIBERATELY NOT IN A DEFINITION
----------------------------------------
No message text, no Arabic wording, no Meta identifiers, no `wamid`, no buttons, no tenant id, no
actor id, and nothing the model produces except the operation NAME. The channel owns how a
refusal is phrased; this registry owns what is being asked.

`service_key` here is the OPERATION's capability (`reservations` / `catalog` / `store`). It is NOT
Lia's own access key. Those are two separate checks and collapsing them would re-pin Lia to
`reservations` through the other door — see `lia_owner_entry._tenant_has_lia`.
"""

from dataclasses import dataclass
from typing import Callable, Optional

from app.core.permissions import (
    CATALOG_LEGACY_ROLES,
    RESERVATION_LEGACY_ROLES,
    SERVICES_LEGACY_ROLES,
    STORE_LEGACY_ROLES,
)


@dataclass(frozen=True)
class OperationDefinition:
    """One authorisable operation. Frozen: a definition is read, never adjusted at runtime."""

    name: str
    permission: str
    legacy_roles: tuple[str, ...]
    service_key: str
    # The SERVICE-layer function that performs the write. Never a repository: a repository call
    # would be a second write path for a capability that already has one, which
    # `rules/backend/architecture.md` §9 forbids. An operation with no service-layer function is
    # not registered at all (decision a-2) rather than registered as unavailable.
    write_fn: Callable
    # Which route this definition mirrors, so the drift test can find it and a reader can check it.
    mirrors_route: str


def _write_create_service():
    """Imported lazily — `catalog_service_service` pulls the Prisma client at import time."""
    from app.services import catalog_service_service
    return catalog_service_service.admin_create_service


def _write_create_reservation():
    from app.services import reservation_service
    return reservation_service.create_reservation


def _write_create_catalog_item():
    from app.services import catalog_service
    return catalog_service.admin_create_item


def _write_create_product():
    """THE SAME FUNCTION as `_write_create_catalog_item`, and that is not a duplication.

    `admin_create_item` writes one `CatalogItem`. Which SURFACE asked for it decides the gate and
    the permission, and the two surfaces are genuinely different:

        admin/catalog.py:142   require_service("catalog")  catalog.write  + MANAGER_UNITS
        admin/store.py:175-176 require_service("store")    store.write    no MANAGER_UNITS

    Measured 2026-09-16: `catalog` is INACTIVE on all three live tenants while `store` is active
    on rk and barberlab-test -- so reusing `create_catalog_item`'s definition for a product would
    refuse every real owner with a 403 on a capability nobody has. Hence two definitions over one
    write function: the table decides what is written, the route decides who may ask.
    """
    from app.services import catalog_service
    return catalog_service.admin_create_item


def _write_update_product():
    """S7 (2026-09-17). Mirrors `admin/store.py`'s PATCH /products, same gate as the POST.

    `admin_update_item` drops every `None` from its patch, so a price-only edit is one call that
    leaves every other column alone -- no read-modify-write, and no risk of blanking a field the
    owner never mentioned. It also re-validates a target category against the tenant, which is
    what will let the later "move it to another shelf" flow reuse this definition rather than
    grow a third one.
    """
    from app.services import catalog_service
    return catalog_service.admin_update_item


# ── The registry ─────────────────────────────────────────────────────────────
#
# Decision a-1: exactly the operations that have a real service-layer write function TODAY.
# `create_barber` is deliberately ABSENT, not present-and-disabled (decision a-2):
# `barber_repo.create_barber` writes through a repository, with the tenant id, the phone
# normalisation and the working hours enforced in the route. Reusing it from here would re-create
# the جعفر defect (a phone stored without its country code) and bypass `clientId`. It enters this
# registry when a shared service-layer write path is extracted, and not before.
#
# `create_product` WAS in that same sentence until 2026-09-17, on the belief that the store
# product path had no service-layer function either. That belief was wrong, and it was corrected
# by measurement rather than by re-reading: `catalog_service.admin_create_item` IS a service-layer
# function, `admin/store.py` calls it, and `scripts/test_lia_product_s1.py` runs the REAL function
# against a faked repository to prove the row it writes is a correct product (clientId carried,
# store partition, isActive set by the service, no duration field). So the operation qualifies
# under a-1 on the same terms as the others -- no exception was made for it.
#
# NOTE ON REACHABILITY: registering an operation does not make Lia able to perform it. The model
# can only ever produce a name that `LiaIntent` admits, and a family the cheap entry gate can
# recognise. `create_reservation` and `create_catalog_item` are registered and NOT reachable for
# exactly that reason. The registry is the authorization specification; the intents that reach it
# arrive per operation, each with its own phase.
_REGISTRY: dict[str, OperationDefinition] = {
    "create_service": OperationDefinition(
        name          = "create_service",
        permission    = "services.write",
        legacy_roles  = SERVICES_LEGACY_ROLES,
        service_key   = "reservations",
        write_fn      = _write_create_service,
        mirrors_route = "app/api/v1/admin/catalog_services.py:81",
    ),
    "create_reservation": OperationDefinition(
        name          = "create_reservation",
        permission    = "reservations.write",
        legacy_roles  = RESERVATION_LEGACY_ROLES,
        service_key   = "reservations",
        write_fn      = _write_create_reservation,
        # Corrected 2026-09-18: was :220, which is `update_status` today — the file moved under
        # it. The POST that actually mirrors this operation is :302, and the gate it carries
        # (reservations.write + RESERVATION_ROLES) is identical, so only the citation drifted.
        mirrors_route = "app/api/v1/admin/reservations.py:302",
    ),
    "create_catalog_item": OperationDefinition(
        name          = "create_catalog_item",
        permission    = "catalog.write",
        legacy_roles  = CATALOG_LEGACY_ROLES,
        service_key   = "catalog",
        write_fn      = _write_create_catalog_item,
        mirrors_route = "app/api/v1/admin/catalog.py:142",
    ),
    # S3, 2026-09-17. Every value below is read off `admin/store.py`, not chosen: the permission
    # and the legacy tuple from :176, the capability key from :175. See `_write_create_product`
    # for why this is a separate definition from `create_catalog_item` although the write
    # function is the same object.
    "create_product": OperationDefinition(
        name          = "create_product",
        permission    = "store.write",
        legacy_roles  = STORE_LEGACY_ROLES,
        service_key   = "store",
        write_fn      = _write_create_product,
        mirrors_route = "app/api/v1/admin/store.py:175-176",
    ),
    # S7, 2026-09-17. Registered because the live test exposed a dead end: once Lia says "this
    # already exists", refusing and stopping sends the owner back to the dashboard -- the one
    # thing she exists to avoid. Editing is the other half of the duplicate answer, not a
    # separate feature. Same gate and same permission as `create_product`, read off the PATCH
    # route, so no new authorisation question is introduced.
    "update_product": OperationDefinition(
        name          = "update_product",
        permission    = "store.write",
        legacy_roles  = STORE_LEGACY_ROLES,
        service_key   = "store",
        write_fn      = _write_update_product,
        mirrors_route = "app/api/v1/admin/store.py:220-221",
    ),
}

# Every registered operation must carry all four fields, checked at IMPORT rather than at the
# moment an owner sends a message. Same guard shape the reservation flow and the prompt loader
# already use: a malformed definition fails the app's startup, where it is visible, instead of
# failing one person's WhatsApp message, where it is not.
for _name, _op in _REGISTRY.items():
    if _name != _op.name:
        raise RuntimeError(f"Lia operation registry: key {_name!r} != name {_op.name!r}")
    if not _op.permission or "." not in _op.permission:
        raise RuntimeError(f"Lia operation {_name!r}: permission must be 'area.verb'")
    if not _op.legacy_roles:
        raise RuntimeError(
            f"Lia operation {_name!r}: legacy_roles is required -- invariant I1 judges a legacy "
            f"account against the route's own tuple, so an empty tuple would deny every owner"
        )
    if not _op.service_key:
        raise RuntimeError(f"Lia operation {_name!r}: service_key is required")
    if not callable(_op.write_fn):
        raise RuntimeError(f"Lia operation {_name!r}: write_fn must be callable")


def get(operation: str) -> Optional[OperationDefinition]:
    """The definition, or None for a name this registry does not know.

    None means "ask", never "assume a default". There is no fallback operation: a default would be
    exactly the hardcoded permission this registry exists to remove.
    """
    return _REGISTRY.get(operation)


def names() -> tuple[str, ...]:
    """Registered operation names, sorted — for tests and for the capability document."""
    return tuple(sorted(_REGISTRY))
