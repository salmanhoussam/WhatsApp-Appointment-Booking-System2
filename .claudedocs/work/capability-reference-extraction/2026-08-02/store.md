# Store (Catalog + Cart) Capability

## References

- **`footlab`** — already runs on the platform's generic layer, not a bespoke build.

## What exists today

Already generic, not tenant-specific code: `generic/normal/CatalogPage.jsx` →
`CartPage.jsx` → `useGenericStore.js`/`useCatalog.js` — real seeded data
(`scripts/data/footlab/items.json`, 10 products, real photos), dedicated
`FootlabAdminDashboard.jsx`. Because it's already shared, extraction here is less about "what should
become generic" (most of it already is) and more about what rough edges the *generic* layer itself
carries — since every future store tenant inherits them as-is.

## ✅ Keep

- Product card / image / category / cart / checkout flow — already the platform's shared Store
  default, proven live against real data

## ❌ Remove

- `CartPage.jsx:184,310-320` — WhatsApp send is client-side only and **silently no-ops** if
  `config.whatsapp_number` is blank, no user-facing error. A generic-layer weakness, not a
  footlab-specific one — matters more precisely because it ships to every store tenant unchanged

## 🟦 Missing Capability

- **Real structured variants/discounts** — per `.claude/rules/frontend/catalog-contract.md`'s own
  documented shape, these live inside a loose `metadata` JSON blob (`{ variants, discount, brand }`),
  not real typed fields
- **Inventory / stock-count** — no such field found in `CatalogItem`'s known field list; flagged as
  likely-missing, not yet exhaustively grepped — confirm before treating as certain

## 🎯 Target Architecture

**Frontend**
- Catalog Grid/List (already real)
- Cart Drawer (already real)
- Variant Picker (new)

**Backend**
- `app/api/v1/public/store.py` / `admin/store.py` (already real)
- Inventory tracking (new)

**Shared Models**
- `CatalogItem`, `CatalogCategory` (already real)
- Real `Variant`/`Discount` models (new — replacing the loose `metadata` bag)

**Tenant Customization**
- Theme/copy
- Branding
- WhatsApp number
