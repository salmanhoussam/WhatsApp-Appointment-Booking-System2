"""
Vertical Registry — the single, canonical mapping from a tenant's `Client.vertical` to what a new
tenant of that vertical needs at provisioning: default `client_services`, its Section Repertoire
template, and which staff-backing model it uses.

Platform-owned (`app/core/`, alongside `services.py`'s own `SERVICE_TYPE_MAP`), not a Tenant OS
Capability itself -- it has no tenant data, no Interface, no client-facing success measure (fails
TOS-003's Capability Proposal Gate on purpose). See
.claudedocs/architecture/ALZABT_VERTICAL_REGISTRY_ARCHITECTURE.md for the full architecture
decision this module implements, and
.claudedocs/architecture/ALZABT_VERTICAL_IMPACT_AND_MIGRATION_ANALYSIS.md for the migration plan
and no-breakage verification.

Read-only, developer-maintained. No runtime write path exists or should ever exist here -- a
vertical is added by a code change (a new dict entry + a stated reason in the commit, per
repository-hygiene.md's Persona & Prompt Drift convention extended to this file), never by a
tenant, admin, or AI action.

Ownership boundary (do not add anything outside this shape):
  - ALLOWED:  default_services (list[str]), page_template (str | None), staff_backing_model
              (str | None), booking_module (str | None)
  - NEVER:    procedural logic, per-tenant overrides, Reservations engine internals, section
              content/labels (those stay in the vertical's own page_templates/{vertical}.json),
              anything that varies per-tenant.

`booking_module` was added 2026-09-27 as the FOURTH allowed field, on Salman's explicit approval
(ق-ب-٢), and the whitelist above was amended rather than quietly stretched. It is the module key a
PUBLIC booking page must send as `ReservationIn.module_key` for a tenant of this vertical, resolved
server-side and handed to the frontend already decided -- see
.claudedocs/implementation/CLINIC_Q5B_BOOKING_MODULE_CONTRACT.md.

Why it belongs here and not in the Reservations domain: it is a structural fact about the vertical
that never varies per tenant, which is the same shape as `staff_backing_model` (itself already a
name from the booking world: Barber vs Resource). It is NOT "Reservations engine internals" -- those
are conflict detection, slot arithmetic and working hours, none of which appear here. The rejected
alternative was a third module-key map alongside RESOURCE_BACKED_MODULE_KEYS
(reservation_service.py) and MODULE_KEY_TO_RESOURCE_TYPE (public/reservations.py), which would have
to be kept in manual lockstep with both.

Two derivations were considered and refused, because each is right only by accident:
  - `booking_module = vertical` -- true today only because the two names coincide, and literally the
    "dispatched by staff_backing_model, NOT by vertical name" that
    ALZABT_UNIFIED_PROVISIONING_CONTRACT_FINAL.md:113 forbids.
  - deriving it from `staff_backing_model` -- "Resource" does not imply "clinic"; the mapping is not
    injective and breaks on the second Resource-backed vertical (a lab, a wash bay).
"""

VERTICAL_REGISTRY: dict[str, dict] = {
    "barber": {
        # `booking` REMOVED 2026-09-06. It was inherited from demo_service.py's
        # _SERVICE_MAP["barbershop"] and registration_service.py's _SERVICE_SEED_MAP["barbershop"],
        # which both cite service-system.md's "must seed both keys" note. That note is stale: its
        # own stated mechanism is the Reservations tab, and the tab is driven solely by
        # `hasReservations = activeServices.includes('reservations')` -- `booking` is never read.
        # Verified 2026-09-06 against the real codebase: there is NO `require_service("booking")`
        # anywhere (the only real gates are reservations/store/restaurant/catalog), and
        # GenericAdminDashboard never checks 'booking'. `booking` means UNIT booking (chalets,
        # rooms); a barbershop has no units. Live proof: `rk`, this project's reference Barber
        # tenant, does NOT carry `booking` and its Reservations surface works -- while `mr-h` does
        # carry it with 0 units and never uses it. So rk was the correct configuration and the
        # outlier; this makes the Registry match it.
        #
        # Scope: this changes provisioning for FUTURE barber tenants only. No existing row is
        # touched. The two duplicate dicts named above still contain `booking` -- deliberately left
        # alone here, since consolidating them into this Registry is its own separate step (see
        # this module's docstring, "not done yet"). The barber template already sends only
        # `services: ['reservations']` (template-registry.js), so it agrees with this list.
        "default_services": ["reservations", "catalog", "whatsapp_ordering"],
        # Not yet built -- Section System P3 (ALZABT_SECTION_SYSTEM_WORK_SEQUENCE.md). Left
        # explicitly None rather than pointing at a file that doesn't exist yet.
        "page_template": None,
        "staff_backing_model": "Barber",
        # The value the public booking page already sends today -- until 2026-09-27 it was a bare
        # literal in frontend/src/hooks/useReservationBooking.js. Declaring it here does not change
        # what is sent; it gives the literal a source.
        "booking_module": "barber",
    },
    "clinic": {
        # ق-ب-٣ (Salman, 2026-09-27). EXACTLY what CLINIC_TEST_TENANT_CONTRACT.md §2 ratifies for
        # cliniclab-test -- `reservations` only. Deliberately NOT barber's list: a clinic has no
        # catalog surface and no WhatsApp number at all (that contract sets whatsapp_number and
        # phone NULL on purpose, so a test booking cannot send a real message).
        "default_services": ["reservations"],
        # Not built. Left None rather than naming a file that does not exist -- same honesty as
        # barber's own entry above.
        "page_template": None,
        # Clinic books a Resource (a doctor), not a Barber. resource_repo/Resource.type == "doctor";
        # see MODULE_KEY_TO_RESOURCE_TYPE in app/api/v1/public/reservations.py.
        "staff_backing_model": "Resource",
        "booking_module": "clinic",
    },
}


def get_vertical(vertical: str | None) -> dict | None:
    """Look up a vertical's registry entry.

    Returns None for both real cases a caller must handle explicitly and distinctly if it cares
    about the difference -- unassigned (`vertical is None`) and unsupported (`vertical` set but no
    matching entry, e.g. a typo or a not-yet-registered vertical). This function does not
    distinguish the two in its return value on purpose (both are "nothing to provision from"); a
    caller that needs to tell them apart checks `vertical is None` itself before calling this.
    """
    if vertical is None:
        return None
    return VERTICAL_REGISTRY.get(vertical)


def resolve_booking_module(vertical: str | None) -> str | None:
    """Resolve a tenant's PUBLIC booking module key from its vertical. Pure lookup, no I/O.

    This is the server side of ق-٥-ب (Salman, 2026-09-27): the page is told which booking module it
    is, it does not work it out. `Client.vertical` therefore never reaches any Interface -- the
    resolved answer does. See .claudedocs/implementation/CLINIC_Q5B_BOOKING_MODULE_CONTRACT.md.

    That split is what lets three ratified statements all stay true at once:
      - schema.prisma:106-108  `vertical` is never read at render time (by an Interface -- the
                               server owns it and may read it),
      - ALZABT_VERTICAL_REGISTRY_ARCHITECTURE.md:26   Interfaces never read this Registry,
      - ALZABT_VERTICAL_REGISTRY_ARCHITECTURE.md:255  the staff-model choice is "Derived, and stays
                               derived ... every render" -- which is literally this question.

    Returns None for BOTH of `get_vertical`'s two documented cases, exactly as that function does:
    an unassigned vertical (5 of 9 real client rows on 2026-09-27) and a set-but-unregistered one (a
    typo, or a vertical nobody has added here yet). They are not the same thing and a caller that
    surfaces this value MUST tell them apart itself -- `vertical is not None and result is None` is
    the unregistered case, and it is a provisioning defect that has to be visible rather than
    degrade quietly into "looks like a legacy tenant". That is the caller's job by design, the same
    way `get_vertical`'s own docstring already assigns it; keeping the decision here would mean
    logging from a pure lookup table.

    A registered vertical with no `booking_module` key also returns None rather than raising: the
    field is optional in the shape, and a vertical that has not declared one has not decided.
    """
    entry = get_vertical(vertical)
    if entry is None:
        return None
    return entry.get("booking_module")
