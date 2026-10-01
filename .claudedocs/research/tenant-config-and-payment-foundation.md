# Investigation — Tenant Client configuration + payment service foundation

**Status:** Investigation only. **No code, no schema, no migration, no credential, no deploy, no
push.** Commissioned by Salman 2026-10-01 while the Caracas menu work is in progress; that work is
untouched.

**Measured against** `HEAD = 0de5854`, 2026-10-01, three ways: reading the repository, reading
**production** through a sealed read-only connection (write refused before any read, proven each
run), and fetching **only** `whish.money` pages for external facts.

> Tags: `SOURCE FACT` (official Whish) · `REPO FACT` (the code) · `MEASUREMENT` (production rows) ·
> `INFERENCE` · `UNKNOWN`. **Zero DECISION.**

🔴 **One correction to the brief's own premise:** the uploaded `clients_rows.json` contains **one
row** (Caracas), not the Client rows plural. Part 6 asks for cross-tenant comparisons, so every
multi-tenant figure below is a `MEASUREMENT` from production, and the uploaded file is used only to
corroborate the Caracas row. Both agree.

---

## 1. Executive summary

1. `MEASUREMENT` **`payment_methods` is not payment configuration. It is a label list.** Across the
   whole platform it holds only `cash` (×4), `card` (×2) and `wish` (×1). No backend route branches
   on it; two frontend components render it as radio buttons. It carries no provider, no account,
   no credential.
2. `REPO FACT` **The architecture the brief hypothesises already exists.** `PlatformService`
   (catalog, with `monthlyPrice`) → `ClientService` (per-tenant activation) → `require_service()`
   (the gate). And `ClientService` already carries **`config Json?`** — a per-tenant, per-service
   configuration slot. **No parallel registry is needed.**
3. `MEASUREMENT` **That slot is completely unused: 35 `client_services` rows, 0 carry a config.**
4. 🔴 `REPO FACT` **`Client.config` is served to the open internet, wholesale**, by
   `GET /api/v1/public/{slug}/config`. A credential there would be public. `ClientService.config`
   is referenced by **zero** public routes.
5. 🔴 `SOURCE FACT` **The official Payment Link is a CARD product, not Whish-to-Whish**, and it is
   created **"through the Whish App"**. That contradicts both the stated product preference ("كله
   whish to whish") and Use Case B's premise that we could mint links programmatically.
6. 🔴 `SOURCE FACT` **Scan to Pay is tied to a POS provider**: *"pay at any merchant using Areeba or
   CCM POS"*. `INFERENCE` The merchant QR is therefore likely issued by the POS provider, not an
   asset Alzabt can generate — which would remove Use Case A entirely.
7. `SOURCE FACT` Official Whish sources are **silent** on APIs, programmatic links, callbacks,
   per-merchant credentials, sandbox and merchant fees. Every technical question in Part 4 that
   matters is `UNKNOWN` from official sources alone.
8. `MEASUREMENT` **`Client.selected_services` is a denormalised cache that is wrong on 7 of 10
   tenants.** The authoritative list is the `client_services` table, and `/config` correctly serves
   that one.
9. ⇒ **The smallest architecture is almost nothing**: one row in `platform_services`, one row in
   `client_services` per tenant, and the already-existing `config` column. **Nothing should be
   added until Whish answers.**

---

## 2. Client field inventory

Reference counts are `grep` over `app/**.py` and `frontend/src/**` — a hypothesis about importance,
never a conclusion on its own; each row below was then read.

| Field | refs be/fe | Who writes | Who reads | Authoritative? |
|---|---|---|---|---|
| `id` `slug` `phone` | — | registration / demo | everything | **Identity.** `phone` and `slug` are `@unique` |
| `name` `name_ar` `name_en` | — | registration, settings | `/config`, every page | Identity/presentation |
| `email` | — | registration | **`/config` — public** 🔴 | Identity; see §8 |
| `isActive` `status` | — | super admin | tenant resolution | Lifecycle |
| `currency` | 117 / 137 | registration (`"USD"` default) | prices, dashboard | **Runtime, and overloaded** — see §7 |
| `payment_methods` | 7 / 11 | registration, settings | `/config` → two UI lists | **Presentation only** |
| `whatsapp_number` | 24 / 57 | settings | `/config`, order + booking CTAs | **Runtime channel config** |
| `vertical` | 101 / 87 | registration, demo | `VERTICAL_REGISTRY` provisioning | **Runtime, authoritative** |
| `selected_services` | 6 / 0 | `sync_selected_services()` | Sheets export only | **Legacy cache — stale on 7/10** |
| `service_type` | 13 / 8 | demo, super | `SERVICE_TYPE_MAP` | **Transitional** — competes with `vertical` |
| `page_type` `template_key` | 16+21 / 52+5 | provisioning | page rendering | Presentation |
| `tier` | 6 / 3 | — (no writer found) | subscription display | Lifecycle |
| `lifecycle_state` | 51 / 0 | `subscription_service` | trial/subscribed routing | **Runtime, authoritative** |
| `provisioning_status` | 2 / 2 | `admin/provisioning.py` returns it | — | Near-dead |
| `config` | — | editing engine | **`/config` — public, wholesale** 🔴 | Runtime presentation |
| `features` | 7 / 12 | registration (a constant) | — | **Legacy** — written, never branched on |
| `unit_types` | 6 / 3 | registration | booking filters | Runtime (booking only) |
| `hero_video_url` | **0 / 0** | — | — | **Dead** |

**Overloaded fields, named:**

- `vertical` vs `service_type` — two answers to "what kind of tenant is this". `MEASUREMENT`
  they disagree on real rows: `mr-h` is `vertical=barber` but `service_type=services`;
  `cliniclab-test` is `vertical=clinic` but `service_type=real_estate`. `B-Q1` already ratified
  `VERTICAL_REGISTRY` as the winner; `service_type` is the loser still in place.
- `selected_services` vs `client_services` — cache vs table, §7.
- `currency` — a scalar `String` holding sometimes a code, sometimes a symbol, sometimes two codes.

---

## 3. Current sources of truth

```
what a tenant IS          →  Client.vertical  (service_type is the stale rival)
what a tenant MAY DO      →  client_services table   ⟵ the only gate, via require_service()
what a tenant is CALLED   →  Client.name_* , Client.config.content
how to REACH a tenant     →  Client.whatsapp_number
what the customer is SHOWN as payment options → Client.payment_methods  (labels only)
how a tenant actually GETS PAID → **nothing in this system knows**
```

The last line is the whole finding of Part 4.

---

## 4. Current payment architecture — there isn't one

`REPO FACT` Every reference to `payment_methods` in `app/`:

```
registration_service.py:134   write, default ["cash","card"]
public_service.py:207         a hardcoded default list for the smar auto-create path
public_service.py:238         pass-through into the /config response
admin/settings.py:74,109      the owner's own edit form
admin/auth.py:367             a default on a response model
demo_service.py:332           write, ["cash","card"]
```

**Not one of them branches on the value.** The frontend renders it:
`generic/normal/CartPage.jsx:627` and `design-system/organisms/BookingFlow.jsx:196,277` map it to
radio buttons. `INFERENCE` It is a **display vocabulary**, and it has no relationship to whether
money can actually move.

`REPO FACT` There is no `Invoice`, `Payment`, `Transaction` or `Ledger` model; `StoreOrder` has
`paymentMethod String?` and **no** `paymentStatus`, `paidAt` or `paymentReference`. The legacy
`Booking` model has `paymentReference`; `StoreOrder` does not. `MEASUREMENT` Caracas carries 0
orders, because its menu orders through `wa.me` and issues zero POST.

⇒ **Alzabt has never moved money and holds no concept for it. That is the correct starting state**
and nothing in this report proposes changing it.

---

## 5. Whish capability findings — official sources only

Unofficial clients, third-party gateways and mirrors are **excluded by instruction**, and the
earlier W0 file's reliance on them is superseded here for anything marked `SOURCE FACT`.

### `SOURCE FACT` — what the official pages actually say

| Product | Official wording |
|---|---|
| **Payment Link** | *"You can create a secure payment link **through the Whish App** and share it; the payer pays **with their card**, and the money goes directly into your Whish Wallet."* · *"Request payments effortlessly by sharing a secure payment link through SMS or WhatsApp. Let your **friends and family** send funds directly to your Whish account using their **credit or debit cards**."* |
| **Whish Me** | *"you can generate your own QR code and share it, so anyone who scans it can **send money** directly to your Whish account."* · *"Whish Me for receiving balance"* |
| **Scan to Pay** | *"scan the **merchant's** QR code through the Whish App and your payment goes through instantly."* · *"pay at any merchant using **Areeba or CCM POS**. Simply scan the QR code, and the amount will be deducted directly from your Whish balance"* |
| **Whish Pay** | *"lets merchants accept payments online through their **websites or apps**."* |
| **Corporate** | Payroll Solutions · Collection Services · Checkout Services |
| **Checkout sign-up asks** | First/Last Name, Phone, Email, Position, Company Name, Sector, Website URL, Website Domain, **platform type (Shopify / WordPress / Custom)** |
| **Collection sign-up asks** | Full Name/Position, Company Name, **Website URL**, Phone, Email |

### 🔴 Two official facts that overturn our working assumptions

1. **The Payment Link is a CARD product, described for "friends and family".** It is *not*
   Whish-to-Whish, and the only stated creation path is *through the Whish App*. The stated
   preference — *"كله whish to whish"* — is served by **Whish Me** and **Scan to Pay**, not by the
   Payment Link.
2. **Scan to Pay is described against Areeba or CCM POS terminals.** `INFERENCE` the merchant QR is
   an artefact of a POS relationship, not a self-serve asset. If that holds, **Use Case A is not
   ours to build or display** — the merchant already has it, from someone else.

### The eleven questions, answered honestly

| # | Question | Verdict from official sources |
|---|---|---|
| 1 | Programmatic integration? | **UNKNOWN** — every page silent on APIs |
| 2 | Merchant identity/auth? | **UNKNOWN** — silent on credentials |
| 3 | Per-tenant merchant config? | `INFERENCE` yes: both corporate forms are **per company**, asking Company Name + Website URL |
| 4 | Several merchants, one host? | **UNKNOWN** — the form asks for a Website URL and a platform type; nothing says whether two merchants may share a host |
| 5 | QR/payment without Alzabt holding funds? | `SOURCE FACT` **yes** — money goes *"directly into your Whish Wallet"*, i.e. the merchant's |
| 6 | Amount + currency on a link? | **UNKNOWN** — no official page states parameters |
| 7 | External reference? | **UNKNOWN** — silent |
| 8 | Payment status retrieval? | **UNKNOWN** — silent |
| 9 | Sandbox? | **UNKNOWN** — silent |
| 10 | Onboarding/verification? | `SOURCE FACT` a form per service, then *"our team will contact you"* — **human, not self-serve** |
| 11 | Merchant fees? | **UNKNOWN** — a consumer transfer table ($1–$5,000 → $1–$25) exists; **no merchant percentage is published**. The "3%" cited in an earlier session is **withdrawn**: it is not on these pages. |

---

## 6. Static QR vs Payment Link

```
Use case A — static merchant QR
   SOURCE FACT   Scan to Pay is described via Areeba/CCM POS
   INFERENCE     the QR likely belongs to the POS provider ⇒ Alzabt adds nothing by displaying it
   REPO FACT     if we ever did: GalleryImage + upload_service.FOLDER_MAP already hold per-tenant
                 images — one imageType value, no new model
   🔴 RISK        a QR is a bearer instrument. Tenant A's QR in tenant B's folder sends money to the
                 wrong merchant, silently. A real path traversal in that exact surface was fixed
                 2026-08-30 (f75164f).
   STRUCTURAL    a scanned QR carries no amount and no reference ⇒ **it can never be reconciled**,
                 now or later.

Use case B — dynamic payment link
   SOURCE FACT   exists, is CARD-based, created "through the Whish App"
   UNKNOWN       whether any programmatic path exists at all
   REPO FACT     if it did, Lia needs no new capability: send_text already exists, and the link is
                 text. (whatsapp_service has four senders and none sends an image, so a QR would
                 cost more than a link.)
```

⇒ **They are not phase 1 and 2 of one thing.** A is presence payment, unreconcilable by
construction; B is remote payment that could carry an amount — if an API exists at all.

---

## 7. Tenant data measurements — production, 10 tenants

```
slug             currency   payment_methods      whatsapp_number  vertical   service_type
alzabt-demo      USD        ['cash']             96170000000      barber     barbershop
arizona          $          NULL                 NULL             restaurant restaurant
barberlab-test   USD        ['cash','card']      96178727986      barber     barbershop
beit-al-fakhar   USD        []                   +201002856632    NULL       ecommerce
caracas          LBP,USD    ['cash','wish']      96176699852      restaurant restaurant
cliniclab-test   USD        NULL                 NULL             clinic     real_estate
footlab          USD        []                   (empty string)   NULL       ecommerce
mr-h             USD        NULL                 96171455767      barber     services
rk               USD        ['cash','card']      96176985477      barber     barbershop
smar             USD        NULL                 96171000000      NULL       real_estate
```

**Every payment method value in use, platform-wide:** `cash` ×4 · `card` ×2 · **`wish` ×1**.

🔴 **The spelling does not match the code.** The one real occurrence is **`wish`** (caracas), while
`public_service.py:207`'s own default list spells it **`whish`**. Any future code matching on
`'whish'` would miss the only tenant that has it.

**Currency values:** `USD` ×8 · **`$`** ×1 (arizona — a symbol, not a code) · **`LBP,USD`** ×1
(caracas — two codes in one scalar `String` whose schema default is `SAR`). `REPO FACT` **nothing
anywhere splits it on a comma** (zero hits across `app/` and `frontend/src/`); it is appended to a
number as an opaque string. `INFERENCE` a formatter receiving `"LBP,USD"` therefore has no defined
behaviour.

🔴 **And the field is simply ignored on the public page.**
Observed live on caracas: the dashboard renders `٠ LBP` while the menu renders `$4.50`. The cause
is **not** two competing columns — `admin/settings.py:105` returns `client.currency`, the same one
`/config` serves. It is that `caracas/normal/MenuPage.jsx`'s `formatPrice()` **hardcodes `$`** and
never reads the tenant's currency at all.

*(This paragraph first claimed `settings.currency` was a second, competing source. It is not; the
claim was withdrawn the moment `settings.py:105` was read. Recorded rather than silently fixed,
because the wrong version is the kind that survives review.)*

**`selected_services` cache vs `client_services` table — 7 of 10 are STALE:**

```
alzabt-demo 🔴 · arizona 🔴 · beit-al-fakhar 🔴 · caracas 🔴 · cliniclab-test 🔴 · footlab 🔴 · mr-h 🔴
barberlab-test ✅ · rk ✅ · smar ✅
```

`REPO FACT` only `sheets_service.py` reads the cache; `/config` serves `active_services` from the
live table. ⇒ the staleness is currently harmless **and the field is a trap for the next reader**.

**Credentials today:** `MEASUREMENT` 35 `client_services` rows, **0 carry a `config`**. And **no
`Client.config` on any tenant** matches `whish|wish|payment|token|secret|channel`.

⇒ **No tenant has enough information to support a payment integration. Not one.**

---

## 8. Security / credential storage

| Candidate | Public? | Evidence | Verdict |
|---|---|---|---|
| `Client.config` | 🔴 **YES, wholesale** | `GET /public/caracas/config` returns the entire blob, including `content.sections` | **Never.** A secret here is published |
| `Client` new column | no | — | Possible, but puts a secret beside `/config`'s own source row |
| **`ClientService.config`** | **no** | zero references in `app/api/v1/public/**` and `public_service.py` | **The natural home** — already scoped `@@unique([clientId, serviceKey])` |
| env vars | n/a | one process, all tenants | Cannot express per-tenant |
| existing encryption | 🔴 **none** | the only third-party credential in the schema is `FleetDriver.uberToken String?` with the comment `// encrypted OAuth token - Phase 2` — a **plain string, encryption deferred to a comment** | **No encryption pattern exists to reuse** |

🔴 **Side finding, not asked for:** `/public/{slug}/config` also returns the owner's personal
`email` (`mahmoudismail7763@gmail.com` for caracas) to anyone. That is unrelated to payments and is
recorded here because it was measured here.

⇒ `INFERENCE` If Whish confirms per-merchant credentials, the smallest safe shape is
`ClientService.config` for the **non-secret** parts and a **real** encrypted-secret mechanism —
which this repository does not have and would have to be built deliberately, not borrowed from
`uberToken`.

---

## 9. Smallest recommended architecture

**Conditional on Whish's answers. Nothing below is authorised.**

```
PlatformService  { key:"payments.whish", moduleKey:"payments", monthlyPrice }   ← EXISTS, add a row
        ↓
ClientService    { clientId, serviceKey:"payments.whish", isActive, config }    ← EXISTS, unused
        ↓
require_service("payments.whish")                                              ← EXISTS
        ↓
one service module that owns the one write path                                ← the only new code
```

**That is the whole proposal.** It reuses the three mechanisms the platform already runs and adds
no registry, no model, and no column.

**Explicitly NOT proposed** (the brief forbids them and the evidence does not require them):
Invoice · Payment ledger · refunds · chargebacks · accounting · money custody · orchestration.
`REPO FACT` justifying the refusal: nothing in this system has ever recorded a payment, and Caracas
holds 0 orders.

**And `payment_methods` stays what it is** — a label list. It must not quietly become the switch
that decides whether a provider is enabled; that is what `client_services` is for. Conflating them
would create exactly the second source of truth this report found three of.

---

## 10. What should remain unchanged

```
client_services + require_service()      the one gate. Do not add a second.
VERTICAL_REGISTRY                        the one definition of a vertical (B-Q1)
Client.payment_methods                   a label list — leave it, do not promote it
/public/{slug}/config                    keep it public ⇒ keep every secret out of it
the Caracas menu work in progress        untouched by this investigation
no money custody                         Alzabt is not a payment facilitator
```

---

## 11. Open questions for Whish

Ordered by how much each one changes the architecture, not by how technical it sounds.

```
①  Is there any programmatic way to create a payment request, or is the Whish App the only path?
②  If yes — what identity does it use? A per-merchant credential issued to each merchant, or one
   platform credential? (This decides whether §8 is needed at all.)
③  Do funds settle directly into the merchant's own Whish account, with Alzabt never holding them?
④  Can a request carry an amount, a currency (USD/LBP) and a reference we generate?
⑤  Our merchants share one host (alzabt.salmansaas.com/<merchant>). Can several merchants register
   with the same Website URL under separate credentials, or does each need its own domain?
⑥  Is there a sandbox, and what are the fees for the merchant product specifically?
⑦  What does a verified merchant already receive WITHOUT a platform — a QR? a dashboard?
⑧  Is the merchant QR (Scan to Pay) tied to an Areeba/CCM POS terminal, or can a merchant without a
   POS obtain one? ⇒ this single answer decides whether Use Case A exists for us.
⑨  Is the Payment Link card-only, or can a Whish wallet pay it? ⇒ decides whether "whish to whish"
   is reachable through a link at all.
```

### Kill criteria — written before the answers, deliberately

```
✖  No per-merchant credential through an intermediary platform
✖  or a separate domain required per merchant (⑤)
✖  or the merchant QR is POS-issued (⑧) AND no programmatic link exists (①)
⇒  then neither use case is ours: record why, and stop.
```

---

## 12. Implementation plan — AFTER Whish answers

```
Gate 0   Whish answers ① ② ③ ⑧ in writing.                        ← nothing starts before this
Gate 1   If ① is "app only" ⇒ the file closes. Record and stop.
Gate 2   If a credential is required ⇒ a secrets decision FIRST, as its own ADR.
         FleetDriver.uberToken is the precedent NOT to copy.
Gate 3   One platform_services row + one client_services row for ONE tenant. No code yet.
Gate 4   One service module, one write path, behind require_service("payments.whish").
Gate 5   Sandbox first, if one exists. A real payment is the last step, never the first.
```

**Nothing in this document authorises any of the above.** Promotion out of `research/` is a
decision, and this file makes none.
