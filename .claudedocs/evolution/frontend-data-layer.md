## 2026-08-06

### Context

Ahead of Store API work, Salman recalled that "a few days ago we built something shared for
fetching/caching data" and asked whether we should build a generic fetch-once/share-everywhere
layer now, before Staff Management — reasoning that Store's admin dashboard will need the same
thing Reservations just needed (avoid each view independently re-fetching barbers/catalog items).
He drafted his own recommendation (don't touch Phase 3.4's Step 0 now, defer any "Global Cache"
work to the Store Dashboard phase) and asked for it to be verified and properly connected to the
architecture docs, not just agreed to in chat.

### Discovery

Investigated directly (read-only) before agreeing to anything:

- `frontend/src/App.jsx:20-98` already wraps the entire app in `QueryClientProvider` from
  `@tanstack/react-query` — active for every route today, including the generic-admin dashboard.
- `.claude/skills/frontend/tanstack-query/SKILL.md` is a complete, already-written skill: a
  multi-tenant cache-key convention (`[slug, ...]` always first), a `staleTime` table per endpoint
  type, a documented `useEffect → useQuery` migration pattern, mutation/invalidation patterns, and a
  7-step Pilot Migration Checklist (PART 9).
- It's already proven in two real, independent hooks: `frontend/src/hooks/useTenantConfig.js` and
  `frontend/src/hooks/useCatalog.js`, both public-tenant-facing, both using `useQuery` exactly as
  the skill documents. That already clears this project's own Abstraction Rule
  (`rules/team-roles.md`) for React Query as the established pattern — it is not a proposal, it is
  running code.
- What's actually inconsistent is narrower than "no shared cache exists": `useBarbers()` and
  `useCatalogItems()` inside
  `frontend/src/pages/generic-admin/components/reservationInteractions.jsx` (Phase 3.4's Step 0,
  built this same session) are bespoke `useState` + `useEffect` fetch-on-mount hooks — they don't
  use `useQuery` and don't plug into the already-existing cache at all.

### Current Understanding

Salman's own instinct (don't touch Step 0 now, revisit at Store phase) is the right call, but the
underlying reason is narrower and lower-risk than "we need to build a Global Cache": no new
abstraction needs designing, because one already exists and is already proven. What's real is
consistency drift in one file. The concrete deferred action: when Store Dashboard admin work
begins, migrate `reservationInteractions.jsx`'s `useBarbers()`/`useCatalogItems()` to `useQuery`
following the skill's own PART 9 checklist, in the same pass that writes Store's own admin data
hooks — so Store starts on the established pattern from day one instead of creating a third
independent bespoke-fetch implementation.

No new ADR is warranted. React Query's adoption as this project's multi-tenant cache layer already
happened — it is a live, documented, twice-proven Skill, not an open technology decision. Writing an
ADR to "decide" to use it would misrepresent an already-settled fact as still open.

### Open Questions

- What `staleTime`/invalidation values admin-dashboard queries should use — the skill's PART 4
  table only covers public-facing endpoints today (`/client/{slug}/config`, `/restaurant/menu`,
  etc.), not admin routes like `/barbers/` or `/catalog/items`.
- Whether admin mutations (status change, reschedule, edit) should invalidate the
  `useBarbers`/`useCatalogItems` query cache the same way PART 6 documents for public bookings —
  not yet relevant since these hooks don't use `useQuery` yet, but will need an answer once they do.

### Promoted?

No — not a new ADR (reasoning above: the technology decision isn't actually open). Not a Maturity
Review candidate either — no prior Verification exists for this specific topic (admin-dashboard data
fetching), so this is the first real entry, not a re-assessment.

### Escalation Watch

If Store Dashboard's own admin hooks get built *without* `useQuery` too — i.e., a second independent
bespoke `useEffect` fetch hook appears in the Store admin surface — that is the second real instance
of the same drift from the established pattern. At that point this stops being a one-off left for
"later" and becomes worth raising to Salman directly as a real, repeating pattern, not deferred
again.
