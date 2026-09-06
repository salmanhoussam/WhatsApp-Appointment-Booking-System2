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
  - ALLOWED:  default_services (list[str]), page_template (str | None), staff_backing_model (str | None)
  - NEVER:    procedural logic, per-tenant overrides, Reservations engine internals, section
              content/labels (those stay in the vertical's own page_templates/{vertical}.json),
              anything that varies per-tenant.
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
