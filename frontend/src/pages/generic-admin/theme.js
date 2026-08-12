// Re-exports the shared light design tokens (frontend/src/theme.js) — kept as this file so every
// existing `from '../theme'` import inside generic-admin/ keeps working unchanged. The tokens
// themselves now live in one place, shared with the customer-facing Booking Page
// (Alzabt Master Product Plan, Section K step 1 — the token-sharing refactor).
export { T, FONT } from '../../theme'
