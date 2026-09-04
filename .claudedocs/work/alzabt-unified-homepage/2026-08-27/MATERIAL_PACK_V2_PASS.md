# Alzabt Homepage — Material Pack v2 Content Pass (2026-08-27)

Follows: `investigation-protocol.md`. Executes
`new-matirial/alzabt/Alzabt_Material_Pack_v2/ALZABT_MATERIAL_PACK_V2.md` (Salman's own spec,
approved) once the 4 referenced binary images were actually placed in that folder.

## Visual inspection of the 4 reference boards (done before any code)

| Ref | File | Dimensions | Content |
|---|---|---|---|
| A | `Alzabt Arabic UI Kit Showcase.png` | 1536×1024 | Full UI kit: brand kit, Hero asset, booking phone, menu/catalog phone (8 real Lebanese items with real food photos), Order→Dashboard asset, 4 vertical showcase scenes, ambient elements, device-frame references |
| B | `Alzabt Arabic UI Showcase.png` | 1536×1024 | Same file already vetted 2026-08-27 as the source for Amendment 1 (previously named "ChatGPT Image Aug 27…") — clean, no forbidden content |
| C | `Alzabt SaaS Booking UI Kit.png` | 1536×1024 | Hero booking screen, dashboard with an added donut chart ("توزيع الحجوزات"), order success state, vertical examples, brand direction |
| D | `Alzabt Dark Arabic Booking Dashboard.png` | 1086×1448 | Older/weaker reference — largely a screenshot of an AI-prompt-authoring tool interface, not a clean UI showcase |

**Real finding, reported before implementation**: References A, C, and D all show **"RK Barber Shop"
baked directly into the dashboard/phone header text** — the exact placeholder the pack's own
Section 4 says to never use ("Never use: RK Barber Shop branding"). Reference D additionally shows
a fabricated "+200 محل" trust claim and some garbled Arabic text (AI text-rendering artifacts).
Reference B remains the cleanest of the four.

**Handling**: per the pack's own Section 0 ("references for content/mapping, not literal
screenshots to copy"), treated all 4 as compositional/layout direction only. Never reproduced the
"RK Barber Shop" text or the "+200 محل" claim anywhere. This is consistent with how every reference
image has been used all session (informing native, hand-built components — never flattened/cropped
wholesale).

## What was built — 3 concrete content gaps closed against the A01–A11 spec

1. **A05 (Order Success Screen)** — `CustomerBookingFlowMockup`'s `confirmed` state gained the
   spec's required thank-you line ("شكراً لطلبك! سيتواصل معك فريقنا قريباً"), an order number
   ("رقم الطلب #A1258"), and a return action ("العودة للطلب") — previously only showed a bare
   checkmark + summary row. Reference: board A/C's own order-success phone.
2. **A06 (Order → Dashboard State)** — the Order→Dashboard Ecosystem section's toast now reads
   "طلب جديد #A1258 من محمد علي" (order number + demo customer name) instead of the bare "طلب
   جديد", matching the spec's own required content. The WhatsApp panel's smaller `ScreenTile`
   placement deliberately kept the short text — verified narrower context. Added `textOverflow:
   ellipsis` safety to the toast regardless, in case a future longer string is ever passed.
3. **A11 (WhatsApp Integration Screen)** — added the spec's 4 required bullet lines (استقبال
   الرسائل والطلبات / ردود تلقائية ذكية / تأكيدات وتنبيهات فورية / كل شيء من مكان واحد) as a
   compact icon+text row above the mockup panel — the section previously had eyebrow/H2/sub/panel
   but none of these lines, a real content gap against the spec.

Everything else (A02/A06 dashboard identity, A07–A10 vertical scenes, general dark/violet/Cairo/RTL
system) was already satisfied by prior passes this session — not re-touched.

## Confirmed Findings (real browser evidence, Playwright MCP tools directly, both breakpoints)

1. **0 console errors** at 1440×900 and 390×844.
2. **No horizontal overflow**: 1425/1425 desktop, 375/375 mobile.
3. **A05 order-success phone**: all 5 required elements (checkmark, "تم الدفع ✓", thank-you line,
   order number, return button) confirmed fully visible, not clipped, via direct screenshot review
   at both breakpoints.
4. **A06 toast**: confirmed not truncated — measured `span.scrollWidth === span.clientWidth`
   (142px both) — and confirmed legible via direct screenshot review.
5. **A11 bullets**: confirmed rendering cleanly in a 4-column row at desktop, reflowing to a single
   column at mobile, via direct screenshot review at both breakpoints.

## Side Findings

- The pack's own A02/A06 continuity requirement ("must visibly be the same dashboard component in
  different states") was already true before this pass (same `DashboardControlCenterMockup`
  component, `toast` prop as the only variable) — confirmed still true after these changes, not a
  new finding.

## Unknowns

- None — every claim checked by direct measurement or screenshot.

## Not yet done

- **Not committed.** Standing rule — waiting for Salman's review.
