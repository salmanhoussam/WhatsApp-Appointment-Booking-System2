# /seed

Seeds catalog data for a specific tenant from a local JSON file.

**Usage:** `/seed [slug]`  
**Example:** `/seed caracas` or `/seed footlab`

---

## What This Command Does

1. Reads the tenant slug from the argument.
2. Verifies that `scripts/data/{slug}/catalog.json` exists.
3. If found → runs `python scripts/seed_catalog.py --tenant {slug}`.
4. If not found → reports which file is missing and how to create it.

---

## Execution Steps

### Step 1 — Validate Argument

```bash
SLUG="$1"

if [ -z "$SLUG" ]; then
  echo "❌ Usage: /seed [slug]"
  echo "   Example: /seed caracas"
  exit 1
fi

echo "🌱 Seeding tenant: $SLUG"
```

### Step 2 — Check Data File

```bash
DATA_FILE="scripts/data/${SLUG}/catalog.json"

if [ -f "$DATA_FILE" ]; then
  echo "✅ Found: $DATA_FILE"
  # Count categories and items
  CATS=$(python3 -c "import json; d=json.load(open('$DATA_FILE')); print(len(d.get('categories', [])))" 2>/dev/null || echo "?")
  ITEMS=$(python3 -c "import json; d=json.load(open('$DATA_FILE')); print(sum(len(c.get('items', [])) for c in d.get('categories', [])))" 2>/dev/null || echo "?")
  echo "   Categories: $CATS | Items: $ITEMS"
else
  echo "❌ Data file not found: $DATA_FILE"
  echo ""
  echo "To create it, add a file at that path with this structure:"
  echo ""
  echo '{
  "categories": [
    {
      "name_ar": "اسم التصنيف",
      "name_en": "Category Name",
      "sort_order": 0,
      "items": [
        {
          "name_ar": "اسم العنصر",
          "name_en": "Item Name",
          "price": 0.0,
          "is_available": true
        }
      ]
    }
  ]
}'
  exit 1
fi
```

### Step 3 — Run the Seeder

```bash
python scripts/seed_catalog.py --tenant "$SLUG"
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo ""
  echo "╔══════════════════════════════════════════╗"
  echo "║        SEED COMPLETE ✅                  ║"
  echo "╚══════════════════════════════════════════╝"
  echo ""
  echo "Tenant '$SLUG' catalog seeded successfully."
  echo "Verify at: /api/v1/public/${SLUG}/menu/categories"
else
  echo ""
  echo "❌ Seeder failed with exit code $EXIT_CODE."
  echo "Check the output above for the error details."
fi
```

---

## Expected File Structure

```
scripts/
└── data/
    ├── caracas/
    │   └── catalog.json      ← restaurant menu data
    ├── footlab/
    │   └── catalog.json      ← store product data
    └── {slug}/
        └── catalog.json
```

## Notes

- The seeder uses `ON CONFLICT DO NOTHING` — safe to run multiple times.
- Module key is inferred from the tenant's `service_type` in the DB.
- If `scripts/seed_catalog.py` does not exist yet, the command will report that and stop.
