# Product Readiness Audit — Final Comparison

Four products, investigation + real Browser Verification only, no code changes. Evidence basis is
not uniform across all four — flagged explicitly below rather than presented as if it were.

- **Barber (hr)**, **Store (footlab)**, **Booking (smar)** — backed by live, real Browser
  Verification this session (Playwright MCP against the running dev servers): real screenshots, real
  DOM reads, real network/console evidence.
- **Restaurant (caracas)** — backed by direct code investigation (Explore agent read + Capability
  Reference Extraction, `.claudedocs/work/capability-reference-extraction/2026-08-02/restaurant.md`),
  not a live browser pass. The finding is real and file:line-cited, but it is a different evidence
  tier from the other three — noted so this table isn't read as claiming more rigor than exists.

## Comparison

| Product | Overall Status | Biggest Risk | Recommendation |
|---|---|---|---|
| **Barber (hr)** | 🔴 Not Ready | Services (haircut, keratin) are sold exactly like physical products — zero date/time/availability logic anywhere in the real checkout path. A real, well-built Reservation backend exists but was never wired to this tenant. | Build the Catalog↔Reservation bridge and a real Working Hours model before any real pilot goes live on this product. Wireframes for the fix already exist (`dashboard-calibration/2026-08-02/phase2-5-dashboard-vision.md`) — this is a decision to execute, not a design question still open. |
| **Restaurant (caracas)** | 🔴 Not Ready | The real customer order flow (`MenuPage.jsx`) never calls the backend at all — it only opens a WhatsApp link and clears the cart. No order is ever persisted. The Admin's own Orders/Stats tabs are reading from a path nothing writes to. | Wire the real checkout to the existing `POST /restaurant/orders` endpoint — the backend and the state-machine order-status logic already work, this is a wiring gap, not a design gap. |
| **Store (footlab)** | 🟡 Needs Fixes | Checkout is blocked: the Payment Method dropdown has zero selectable options, confirmed via direct DOM read. A real customer cannot complete an order. | Fix the dropdown. Everything else in the journey (catalog, cart persistence, admin dashboard) already works cleanly with zero console errors. |
| **Booking (smar)** | 🟡 Needs Fixes | The canonical public URL (`/smar/home`) is a live infinite redirect loop — the literal front door doesn't load. Already a known, deliberately deferred issue, not new. | Fix the redirect (three known one-line options already identified). Once past that one URL, this is the most mature product of the four — the best reservation UX and the most operationally complete admin dashboard found in this whole audit. |

## Cross-cutting finding (not product-specific)

A real cross-tenant stale-`client_slug` request pattern was confirmed independently twice this
session — once on `footlab`'s admin, once on `smar`'s admin, each briefly querying the *previous*
tenant tested in the same browser session before settling into the correct one. Not a confirmed data
leak (both blocked or returned without visibly rendering), but a real multi-tenancy hygiene concern
per this project's own `rules/global.md` critical rule. Affects the admin layer generally, not
customer-facing — not included in the per-product risk ranking above, but worth tracking as its own
item (already logged: `project_product_readiness_audit_footlab_smar.md`).

---

## If Salman wanted to sell this product tomorrow, what is the smallest set of improvements that would increase customer confidence the most?

The honest answer differs by product — the four are not at the same distance from "sellable," and
pretending otherwise would understate two real structural gaps:

1. **Booking (smar) — highest return for the least effort.** One redirect fix unlocks the single
   most complete product in this whole audit. If only one thing gets fixed before selling anything
   tomorrow, this is it.
2. **Store (footlab) — one component fix.** Fix the Payment Method dropdown and this product's
   customer journey is genuinely ready — clean, zero errors, real data throughout.
3. **Restaurant (caracas) — a real but bounded fix.** Wire the existing checkout endpoint to the real
   order flow. Not a one-liner like the first two, but the backend logic already exists and works —
   this is wiring, not invention. Without this fix, every "order" a restaurant customer places is an
   illusion — the single most damaging thing to discover after the fact, worse than any UI rough edge.
4. **Barber (hr) is not ready as a full reservation product** — cannot be minimally patched. This is
   the one product where "smallest set of improvements" doesn't have a small answer — the gap is
   structural (no availability logic anywhere), not a fixable component. That is a narrower claim
   than "hr is not ready" — its actual Pilot bar may not require full reservation completeness at
   all (e.g. a retail-only Pilot, selling `منتجات العناية` via QR, already works today). That scope
   question is real, unresolved, and deliberately not settled in this document — see
   `outputs/pilot-decision.md`.

**In short**: fix the redirect on smar, fix the dropdown on footlab, wire the checkout on caracas —
three bounded, well-understood fixes that would let three of the four products be sold honestly
tomorrow. The fourth, hr, needs a real Pilot-scope decision, not a patch — that decision is framed,
not made, in `outputs/pilot-decision.md`.
