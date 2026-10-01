# Evolution — the unreachable capability

Accumulating insight, pre-ADR. One file, appended to by date, never rewritten
(`documentation-policy.md` rule 7).

---

## 2026-10-01

### Context

A five-hour session on the caracas restaurant: handing the owner his dashboard, loading a new menu,
making a printable QR, and starting a media-naming migration. Seven defects were found along the
way. None was the thing being worked on, and none was found by reading code.

### Discovery

All seven are the same shape, and it is **not** the shape
`evolution/capability-contracts.md` already records. That file is about a capability drifting into
**two** write paths. This is a capability with **zero entry points**: built, correct, tested, and
unreachable.

| the machine, fully built | the missing handle | what it cost |
|---|---|---|
| item editor, price field and all | no affordance on the category card | the owner reported "there are no items" |
| `replace_page_media` is generic over the slot; `page_logo` is in `FOLDER_MAP` | no route | zero tenants on the platform had a logo |
| `_fmt_category(include_items=True)`, `list_menu_categories(include_items=True)` | no `/menu` route | «الكل» 404'd for **the whole life of the page** |
| `CategoryCreate.image_url` + both services pass it through | no field in the dashboard | ten dead category images, unreplaceable |
| `app/core/sku.py`, complete and guarded by 30 checks | zero calls in `catalog_service` | every dashboard-created item born without a key |
| A-Q6 ratified and implemented in the migration script | not implemented in the dashboard path | a key held hostage by a retired dish |
| `Field` in `SettingsTab` accepts a `hint` | `CatalogTab`'s own copy does not | a sentence written for the owner, silently dropped |

### Current Understanding

**A capability is not shipped when it is built. It is shipped when something calls it.** Every row
above passed code review, has tests or an equivalent, and does exactly what it claims — in a
function nothing invokes.

Three properties make this class hard to see:

1. **It is invisible to the test suite.** 1470+ local checks pass, because the unit they cover
   works. Nothing asserts that a caller exists.
2. **It is invisible to `grep`.** The symbol is defined and imported somewhere; counting references
   finds the definition and the test, which reads as "in use".
3. **It survives review**, because every file is individually correct. The defect lives in the
   space between files.

And one sub-shape deserves its own name, because it is the most expensive:

> **A failure disguised as a normal state.**
> `GET /restaurant/menu` → 404 → `.catch(() => setAllItems([]))` → «لا توجد عناصر في هذا التصنيف»
> on a menu holding 97 live items. A swallowed error rendered as an empty state is
> **indistinguishable from a genuine empty state**, so nobody reports it and nothing alerts.
> The tab had never worked for a single customer.

### What actually found them

Not one came from reading code. The sources were:

```
a real browser driving the real customer journey   → the wa.me number, «الكل», the blank /store
a real API call against production                 → the SKU on create, the serializer gap
the owner, in his own words                        → "there is no way to edit items"
```

`rules/frontend/browser-verification-protocol.md` already says real browser evidence comes first
and code inspection second. Today is the strongest evidence yet for *why*: code inspection cannot
see an absence.

### Open Questions

- Is there a cheap, mechanical check? "every `app/services/*.py` public function has a caller
  outside its own module and outside `scripts/`" is greppable and would have caught rows 5 and 6.
  Rows 1, 4 and 7 are frontend affordances and would not be caught by anything static.
- Does the Completion Gate in `rules/tenant-onboarding.md` need a ninth box — **Owner Can
  Operate**: the owner logged in once himself, changed one price, and received one test order on
  his own number? Caracas passed all eight existing boxes while failing all three of those.
- Should `.catch(() => setX([]))` be a reviewable pattern in its own right? It appeared twice today
  and both were real failures rendered as emptiness.

### Promoted?

**No.** One day, seven instances, one codebase — a strong pattern and a narrow sample. The
Abstraction Rule's threshold is two independent cases and this is far past it on count, but every
one came from the same session and the same two surfaces (catalog + menu). A second, independent
session finding this shape elsewhere — the clinic vertical, the store, Lia — is what would earn an
ADR. Recorded now so that session recognises it instead of re-deriving it.
