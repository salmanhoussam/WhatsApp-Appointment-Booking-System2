# Alzabt Marketing Route (`/alzabt`) + Demo Trigger — Post-Ship Verification

Follows `investigation-protocol.md` and `frontend/rules/browser-verification-protocol.md`. Real
browser evidence (nested Playwright MCP session), not code inspection. Purpose: after Section K
steps 1-9 shipped (commits `d65d421`..`9a39c8e`), no dedicated browser-verification evidence file
existed yet for the finished `/alzabt` page + `alzabt-demo` trigger specifically — this closes that
gap and answers "is there any real polish left, or is K1-K9 clean as shipped?"

## Confirmed Findings

- **`/alzabt` desktop** — loads clean. `document.getElementById('root').innerHTML.length` = 10798
  (real content, not a blank mount). `h1` = "الحجوزات؟ عالزبط." (correct hero copy, per Section P's
  resolved decision). 5 CTA buttons present, all with expected copy ("جرّب عالزبط", "جرّب عالزبط
  الآن ←", "شوف كيف بيشتغل", etc.).
- **Console** — 3 messages total across both desktop and mobile passes, all benign (Vite HMR
  connect/connected, React DevTools info). **0 errors, 0 warnings**, either pass.
- **Network** — 31 requests on initial load (fonts: Cairo/Space Mono/Tajawal/Playfair Display, Vite
  dev modules, `AlzabtLandingPage.jsx`). Checked the full unfiltered list, not just a filtered
  subset. **All 200 OK — 0 failed requests.**
- **Demo CTA → real booking flow, end to end**: clicking "جرّب عالزبط" navigates to
  `/alzabt-demo/reserve` and lands on a real, functioning booking page — not a stub. Real service
  catalog confirmed rendering with prices (the Step 2 gap this whole plan fixed): صبغة 15 USD/40min,
  تصفيف 5 USD/15min, كرياتين 25 USD/75min, شعر ولحية 12 USD/30min, لحية 6 USD/15min, شعر 8
  USD/20min. Real barber "كريم" and a live August 2026 calendar are both present, WhatsApp-confirm
  CTA visible — matches the `alzabt-demo` seed script's actual data (`scripts/
  seed_alzabt_demo_tenant.py`), confirming the seed → route → render chain works end-to-end, not
  just that the seed script ran successfully.
- **Mobile (390×844, real viewport resize, not emulation)** — `scrollWidth === clientWidth` (375,
  after Playwright's own scrollbar accounting), i.e. **no horizontal overflow**. Full-page
  screenshot shows nav pill, hero, 3-step card, feature list correctly stacked to single column,
  final CTA, footer — nothing clipped or overlapping. Console re-checked on this pass too, same 3
  benign messages, 0 errors.
- **Screenshots captured** (repo root, this run): `alzabt-desktop.png`, `alzabt-demo-landed.png`,
  `alzabt-demo-step.png`, `alzabt-mobile.png`.

## Side Findings

None beyond what Section K's own build commits already documented (the pre-existing
`pages/marketing/MarketingApp.jsx` third marketing surface, noted during the `/alzabt` route
commit — not re-investigated here, out of scope).

## Unknowns / Process Deviation

- `browser_click`'s normal ref-based flow needed `browser_snapshot`, which the harness denied
  permission for twice mid-run. Substituted a real `.click()` dispatch via `browser_evaluate` on
  the exact DOM-matched CTA button — a genuine click event on the real element, not a synthetic
  `navigate()` call bypassing the UI. Functionally equivalent evidence, but flagged per this
  project's Evidence Interrogation standard since it wasn't the literal tool originally specified.
- Not covered by this pass: actually completing a reservation through `alzabt-demo` (Step 7's
  original build-time verification already did this once, per the session report — "a real
  reservation was created and verified to persist during testing"). This pass verifies the entry
  point + first landed screen, not a second full booking completion.
- Not covered: RK itself — already closed under Step 8's own regression pass, not re-run here.

## Conclusion

**No real polish gap found.** `/alzabt` and the `alzabt-demo` trigger are clean as shipped —
0 console errors, 0 failed requests, correct copy, correct prices, no mobile overflow, real
end-to-end data flow confirmed. Steps 11-12 (full polish / final regression) remain satisfied by
Steps 1-8 plus this pass — nothing new to reopen. Step 13 (LIVE) stays stopped, unchanged, pending
Salman's explicit decision.
