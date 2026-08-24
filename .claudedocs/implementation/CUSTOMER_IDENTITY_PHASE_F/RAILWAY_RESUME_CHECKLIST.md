# PHASE F — RESUME CHECKLIST

## Status

- Phase A-E: **COMPLETE**
- Phase F Contract: `ec20d5e` (`PRODUCTION_CONTRACT.md`, same folder)
- Railway: **NOT YET STARTED**
- No production changes made yet

**Resume rule**: when Railway work actually starts, this is not a restart from zero — begin
exactly at STEP 1 below.

---

## When Railway is started

### STEP 1 — Railway environment
- [ ] Confirm `ENVIRONMENT=production` on the real backend service.
- [ ] Do not proceed until confirmed.

### STEP 2 — Database identity
- [ ] Confirm Railway backend `DATABASE_URL` points to the same Supabase project used during
      Phase A-E.
- [ ] If **SAME**:
  - no migration
  - no re-application of unique index
- [ ] If **DIFFERENT**:
  - stop
  - apply required schema/migration
  - manually apply the hand-authored double-booking unique index
  - verify DB schema before continuing

### STEP 3 — Production deployment verification
- [ ] Deploy/start Railway.
- [ ] Verify startup succeeds with production guards enabled.
- [ ] Verify CORS behavior.
- [ ] Verify `/docs` is hidden in production.

### STEP 4 — WhatsApp production configuration
- [ ] Configure only the credentials required by the Phase F Contract.
- [ ] Verify webhook URL.
- [ ] Verify `WHATSAPP_VERIFY_TOKEN`.
- [ ] Do not start Stage 2 / per-tenant WABA work.

### STEP 5 — Production smoke test
- [ ] Real inbound WhatsApp message.
- [ ] Correct tenant resolution.
- [ ] Customer find/create.
- [ ] Service selection.
- [ ] Barber selection.
- [ ] Availability selection.
- [ ] Reservation creation.
- [ ] Verify Reservation + `customerId` directly in DB.
- [ ] Verify Calendar.
- [ ] Verify cancellation.
- [ ] Verify reschedule.
- [ ] Verify tenant isolation.
- [ ] Verify STAFF RBAC.
- [ ] Verify double-booking protection.

---

## RULE

Do not declare Phase F complete until the production evidence is captured.
Do not modify architecture or reopen A-E unless a real production failure requires it.
