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
        # Same 4 keys demo_service.py's _SERVICE_MAP["barbershop"] and registration_service.py's
        # _SERVICE_SEED_MAP["barbershop"] already use -- this Registry is the one place both should
        # eventually read from instead of maintaining their own duplicate dicts (not done yet; both
        # still write additively alongside vertical per the Migration Plan's own additive-only
        # posture for this round).
        "default_services": ["booking", "reservations", "catalog", "whatsapp_ordering"],
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
