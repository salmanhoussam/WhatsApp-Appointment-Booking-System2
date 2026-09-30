# Research — W0: Whish Payments Capability Check

**Status:** Research only. **No decision is made by this document.** It exists to decide whether
there is anything to build at all — including the outcome **"nothing"**, which is a real and
pre-authorised result, not a failure.

**Captured** 2026-10-01, on Salman's explicit instruction, after he twice corrected the framing:

> *"لا أريد إغلاق الملف، ولا أريد الموافقة الآن على تخزين credentials."*
> *"ما بعمل Plan للتنفيذ. بعمل Plan للتحقق من Capability فقط."*

**Measured against:** `HEAD = a493f18`, 2026-10-01. Every `REPO` figure is perishable.
**Gate:** 🔴 CLOSED — no code, no schema, no migration, no credential storage decision.

> Evidence tags per `documentation-policy.md`'s `research/` entry condition:
> `SOURCE` · `REPO` · `INFER` · `PROP` · `UNKNOWN`. This document contains **zero** `DECISION`.

---

## 0. The correction that produced this file

The first pass of this investigation ended by asking Salman to choose between **(أ)** Alzabt stores
a Whish credential per tenant and **(ب)** Alzabt collects and remits. He refused the question, and
he was right:

> **An `UNKNOWN` about an external party is not a `DECISION` we own.**

(أ) is not our architecture — it is a *hypothesis about how Whish might offer integration*. Asking
for a ratification before asking Whish would have committed us to a shape the vendor may not even
sell. Recorded here because the failure mode is reusable: this is the same class as
`feedback_recommendation_decision_habit`'s "a Gap never auto-becomes a Requirement", one level
further out — **an external unknown never auto-becomes an internal decision.**

A second claim was withdrawn in the same exchange: a proposed owner-facing text reading
*"Whish takes 3%"*. The 3% figure describes Whish's **consumer** Payment Link, and the
Business/Checkout contract is a separate product. Writing a fee disclosure for a contract we have
not read is a `text-context-rule` violation — a text carrying a certainty its moment does not hold.

---

## 1. What is actually true outside — and the trap in the sources

### 🔴 Two sources look like Whish and are not

```
❌ pay.codnloc.com/api.php   A THIRD-PARTY gateway that WRAPS Whish. Its own keys, its own
                             contract, its own fees. Integrating with it ≠ integrating with Whish.
❌ laravel-whish-pay          States of itself, verbatim: "NOT affiliated with, endorsed by, or
                             maintained by Whish Money."
```

Neither is a contract. The second is still valuable for one reason only: **its configuration key
names match the circulated technical specification independently** — two unrelated sources agreeing
on the same three header names is corroboration, not proof.

### `SOURCE` The shape the public record describes

From a Whish technical specification circulated via a third-party mirror (the PDF itself now
returns 404), corroborated by the unofficial Laravel package's config keys:

```
Live      https://whish.money/itel-service/api/
Sandbox   https://lb.sandbox.whish.money/itel-service/api/      🟢 a test environment exists

Headers on every request:
   channel      issued by Whish
   secret       issued by Whish
   websiteurl   the third-party website the API is integrated on

Response envelope:  status · code · dialog · data
Currencies:         USD · LBP · AED        ← note: no SAR
Issuance:           "once merchant information is verified, they receive their Channel and Secret"
```

Payment-creation fields, as reflected by the unofficial client:
`amount · currency · invoice · externalId · successCallbackUrl · failureCallbackUrl ·
successRedirectUrl · failureRedirectUrl` → response carries **`collectUrl`**.
Verification: `getStatus(currency, externalId)` → `status · payerPhone`.

### `SOURCE` Whish sells more than one QR, and they are not the same thing

```
Whish Me       a personal account holder's QR — someone scans it and SENDS money
Scan to Pay    a MERCHANT's QR, scanned from inside the Whish app, paying the merchant
Whish Pay      a merchant gateway for accepting online payments on a site or app
Collection / Checkout Services   corporate offerings, entered through a commercial contact path
```

⇒ **The personal QR and the merchant QR must never be conflated.** They have the same visual form
and different commercial meaning — the same failure shape `text-context-rule` governs for message
keys, appearing here in a payments surface.

---

## 2. What is true inside — `REPO`, measured 2026-10-01

### Whish is already in production, as a label

```
19 references to "whish" across app/, prisma/, frontend/, scripts/ — every one a LABEL:
   app/schemas/booking.py:57    payment_method: "cash | whish | omt | card"
   app/schemas/booking.py:58    payment_reference   # "receipt ref for Whish/OMT"
   BookingModal.jsx:137         choosing "Whish Money" reveals a field the customer TYPES into
```

⇒ **Today's "Whish integration" is: the customer pays outside the system, types a receipt number,
and we trust it.** The project is therefore not *adding a payment provider* — it is **replacing a
manual trust flow that is already live**. That is the honest pitch: *we stop trusting a typed
number.*

### Three measurements that change the scope

```
🔴 PricingPage.jsx:143   "دفع محلي (Whish / OMT)" is ADVERTISED as a pricing feature already
                          ⇒ this is a promise on the record, not a new idea

🔴 Booking carries paymentReference · StoreOrder does NOT carry it at all
                          ⇒ on the restaurant/store path the receipt number has nowhere to live

🔴 Zero payment models: no Invoice, no Payment, no Transaction, no paymentStatus, no paidAt
   StoreOrder.status is a SINGLE status and it means FULFILMENT (default "pending")
                          ⇒ any payment state would be a SECOND, independent axis on that model
                             (paid+undelivered and delivered+unpaid both exist) — an ADR, never a
                             sketch inside a research note
```

### `REPO` We cannot send an image on WhatsApp. At all.

```
app/services/whatsapp_service.py — four senders:
   send_text · send_template · send_interactive_buttons · send_list_message
   zero image · zero media
```

⇒ "and Lia sends the QR" is **not a small addition**: it needs media upload to Meta (or a public
URL), a new sender, and its own verification. **A first POC that returns a text link only is
strictly cheaper and loses nothing** — Whish itself documents the Payment Link as something shared
over WhatsApp.

### `REPO` There is no home for a third-party credential — and the one precedent is bad

```
The only place this repository stores a third-party credential:
   FleetDriver.uberToken   String?   // encrypted OAuth token - Phase 2
```

A plain string, with the encryption deferred into a comment for a phase that never arrived. So a
Whish secret has **no safe home today**, and specifically **must not live in `Client.config`** —
that JSON is served by the public `/config` endpoint.

### `REPO` Currency

`Client.currency` defaults to **`SAR`**; `StoreOrder.currency` defaults to `USD`. Whish supports
USD/LBP/AED and **not SAR**. The live value for caracas/arizona must be read before any test.

---

## 3. The two shapes, and why they are not one shape

`PROP` Two candidate products were named. They are **not** phase 1 and phase 2 of the same thing.

### (A) Display the merchant's own QR

`REPO` **Cost, measured:** the per-tenant media store already exists —

```
GalleryImage   imageType: gallery | cover | catalog | page_hero | page_logo | page_gallery |
                          experience   (clientId-scoped for the page-level kinds)
upload_service.FOLDER_MAP   context → path routing:  page_hero → pages/home/hero · …
```

⇒ (A) is **one `FOLDER_MAP` entry + one `imageType` value + a display surface.** An existing
pattern. **Zero API · zero secret · zero callback.**

`INFER` **But its limit is structural, not staged.** A cashier QR is scanned and the customer
**types the amount themselves**. No amount from us, no `externalId`, no reference.

> **(A) can never reconcile. Not now, not in a later phase.**

So when an owner using (A) asks *"who paid?"*, the answer does not exist by design. That must be
told to him at delivery, not discovered at the question.

⚠️ `UNKNOWN` **And (A)'s real risk is commercial:** if Whish already hands a verified merchant a
QR and a dashboard, then "Alzabt displays the QR" adds **nothing** — the owner prints what Whish
gave him and tapes it to the register. (A) may be a feature that makes the platform look busy.
This is question ⑦ below.

🔴 **The risk that IS ours:** a QR is a **bearer instrument**. Tenant A's QR inside tenant B's
folder sends **money to the wrong merchant**, with no error and no log line. This is not
hypothetical — a real path traversal in the file-upload surface was confirmed and
fixed on 2026-08-30 (`f75164f`, evidence `386e85d`), and `storage-tenant.md` §7 already forbids the mixing. ⇒ **(A) costs what an image
upload costs and carries the risk a bearer financial instrument carries. Both are true at once.**

### (B) A payment link generated by Lia

```
owner → "ابعتيلي Whish بـ30$" → Alzabt → Whish API → collectUrl → WhatsApp → customer pays
                                                                  → funds to the TENANT's account
```

`INFER` Reconcilable: `externalId` + `getStatus` + the two callback URLs exist in the described
contract. *(An earlier claim in this session — "we could never tell the owner whether he paid" —
is **withdrawn**: it generalised from the absence of the feature in our system to the absence of
the capability in theirs.)*

`INFER` **A new operation class for Lia.** All seven registered operations write a row we can
inspect afterwards. This one writes **nothing of ours and creates a real financial artifact
outside**. Audit therefore matters *more*, not less — there is no row to examine after the fact —
and it must pass the same preview/confirm gate every other Lia write passes: **`30$` and `300$`
are one keystroke apart.**

### (C) Both

`PROP` Defensible, because they answer different questions — (A) presence payment at the counter,
(B) remote payment over WhatsApp. It is **not** "A then B".

---

## 4. W0 — the check itself

**W0 is one phone call and one page.** It is not a project, and it must not become one.
Contact path: Corporate Solutions · +961 1 788 999.

### The eight questions

```
①  Can our platform create a Whish payment link PROGRAMMATICALLY on a merchant's behalf,
   and receive a payment URL back?

②  What identity does that call use — a per-merchant channel/secret issued to each merchant,
   or one platform credential? How is a merchant onboarded and verified?

③  Do funds settle DIRECTLY into that merchant's own Whish account?

④  Does the link accept amount, currency (USD/LBP), and an externalId/invoice reference we
   generate?

⑤  🔴 Our merchants share one host — alzabt.salmansaas.com/<merchant>. Can several merchants be
   registered under the SAME websiteurl with different credentials, or does each need its own
   domain?

⑥  Is sandbox access available before go-live, and what are the fees for this specific product?

⑦  What does a verified merchant already receive WITHOUT a platform — a ready QR? a dashboard?
   ⇒ decides whether (A) carries any value at all

⑧  Does the Merchant QR accept a PRE-SET amount, or does the customer always type it?
   ⇒ decides whether (A) and (B) are genuinely separate products
```

⑤ is the sharpest operational question in the file and **no public source answers it.** ⑦ and ⑧
were added because without them the answer to ① can look sufficient while leaving the product
question open.

### 🔴 Kill criteria — written BEFORE the call, deliberately

Salman, 2026-10-01: *"الدخول في تقييم دون معايير واضحة للانسحاب هو مجرد إضاعة للوقت."*

The file closes with **"neither (A) nor (B)"** if any one of these holds:

```
✖  Whish does not issue a per-merchant credential through an intermediary platform
✖  or it requires a separate domain per merchant  (the shared-websiteurl question, ⑤)
✖  or the merchant already receives a full QR + dashboard without us AND the programmatic
   payment link is refused
   ⇒ then there is nothing to build: we record WHY, and we move on
```

Without these three stated in advance, **any answer reads as "so we build something."**

---

## 5. Open `UNKNOWN`s after this file

```
🟡 ⑤ shared websiteurl across merchants — unanswered by every public source
🟡 the real fee and contract of the Business/Checkout product (NOT the consumer 3%)
🟡 whether Whish onboards a SaaS platform holding many sub-merchants at all
🟡 the live `currency` value on caracas/arizona (schema default is SAR; Whish has no SAR)
🟡 whether an imported/typed receipt number flow (today's live behaviour) should be retired
   or kept as a fallback — untouched by this file
```

**Nothing here authorises code, schema, a credential-storage design, or a production write.**
Promotion out of `research/` is a decision, and this document does not make one.
