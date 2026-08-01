# Tenant Onboarding — Evolution Log

## 2026-08-01

### Context

Salman personally tried to log into `hr`'s (RK Barber Shop) admin dashboard during Pilot prep and
got lost. Traced as part of a Dashboard UX Audit
(`.claudedocs/work/dashboard-ux-audit/2026-08-01/summary.md`), not assumed from his report alone.

### Discovery

The lockout wasn't a one-off — it's a structural gap in the onboarding flow itself:

- `registration_service.py` generates a one-time magic setup link (`setup_url`) with a **7-day
  expiry**, but that link is **only ever returned in the registration API's JSON response** —
  grepped the whole codebase: never emailed, never sent via WhatsApp, never persisted anywhere a
  tenant could retrieve it again later.
- **No resend-setup-link endpoint or UI exists anywhere.**
- **No password-reset flow exists anywhere** (frontend or backend — zero matches for "forgot
  password"/"reset password").
- The only real recovery path today is the platform-owner-only `POST /create-user` endpoint
  (protected by `SECRET_KEY`) — which is exactly what unblocked `hr` this session, but that's a
  manual, Salman-only intervention, not something the system does for itself.

### Current Understanding

Any tenant who doesn't act on their setup link within 7 days — or loses it — ends up exactly where
`hr` did: a real account, a real business, permanently locked out with no self-service way back in.
This isn't specific to `hr` or to this Pilot; it will recur for tenant #2, #10, #100 unless
addressed. `.claude/rules/tenant-onboarding.md`'s existing "Completion Gate" section defines what
"Onboarding Completed" means up through the dashboard rendering — it does not yet cover what happens
*after* completion if the owner needs back in later (password lost, link expired, staff turnover).

### Open Questions

- Should the setup link actually be delivered automatically (email via the already-integrated
  Resend provider, or WhatsApp) at registration time, instead of only appearing in an API response?
- Should there be a self-service "resend my setup link" or "forgot password" flow, or is a
  Super-Admin-mediated reset (extending today's manual `create-user` path into a real admin-UI
  action) sufficient at this project's current scale?
- What should the setup link's expiry actually be, and should it be configurable per registration
  method (self-service sign-up vs. onboarding-pipeline-created tenants)?

None of these are decided here — this entry records that the gap is real and dated, not what the
fix should be.

### Promoted?

No — a real, single confirmed instance, not yet a second independent case. Per this project's own
Abstraction Rule, stays as an Evolution entry (a real, logged gap awaiting a decision) rather than
being promoted to an ADR or ticketed for immediate work. Explicitly not fixed this session per
Salman's own staged process (Audit → compare → decide → build).
