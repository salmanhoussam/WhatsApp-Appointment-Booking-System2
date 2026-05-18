#!/usr/bin/env python3
"""
seed_page_content.py — Seed page builder content for a tenant from JSON.

Reads scripts/data/{slug}/page_content.json and patches Client.config.content
in the database directly via Prisma (DIRECT_URL).

Usage:
    python scripts/seed_page_content.py caracas
    python scripts/seed_page_content.py footlab
    python scripts/seed_page_content.py --all
"""
import asyncio
import json
import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from dotenv import load_dotenv
load_dotenv()

from prisma import Prisma, Json

DATA_DIR = Path(__file__).parent / "data"


async def seed_tenant(slug: str, db: Prisma, dry_run: bool = False) -> bool:
    page_file = DATA_DIR / slug / "page_content.json"
    if not page_file.exists():
        print(f"⚠️  No page_content.json found for '{slug}' at {page_file}")
        return False

    content = json.loads(page_file.read_text(encoding="utf-8"))
    content.pop("_meta", None)  # strip meta before saving

    client = await db.client.find_unique(where={"slug": slug})
    if not client:
        print(f"❌ Client '{slug}' not found in DB")
        return False

    # Merge into existing config (don't overwrite other config keys)
    existing_config = client.config or {}
    if isinstance(existing_config, str):
        import json as _json
        existing_config = _json.loads(existing_config)

    new_config = {**existing_config, "content": content}

    if dry_run:
        print(f"[DRY RUN] Would update config for '{slug}':")
        print(f"  template_key: {content.get('template_key')}")
        print(f"  sections: {len(content.get('sections', []))} sections")
        return True

    await db.client.update(
        where={"slug": slug},
        data={"config": Json(new_config)},
    )

    print(f"✅ {slug}: seeded {len(content.get('sections', []))} sections (template: {content.get('template_key')})")
    return True


async def main():
    args = sys.argv[1:]
    if not args:
        print("Usage: python scripts/seed_page_content.py <slug|--all> [--dry-run]")
        sys.exit(1)

    dry_run = "--dry-run" in args
    slugs_arg = [a for a in args if not a.startswith("--")]

    db = Prisma(datasource={"url": os.environ["DIRECT_URL"]})
    await db.connect()

    if "--all" in args:
        # Find all slugs that have a page_content.json
        slugs = [d.name for d in DATA_DIR.iterdir() if (d / "page_content.json").exists()]
        print(f"Found {len(slugs)} tenants with page_content.json: {slugs}")
    else:
        slugs = slugs_arg

    ok = 0
    for slug in slugs:
        if await seed_tenant(slug, db, dry_run=dry_run):
            ok += 1

    await db.disconnect()
    print(f"\n{'[DRY RUN] ' if dry_run else ''}Done — {ok}/{len(slugs)} tenants seeded")


if __name__ == "__main__":
    asyncio.run(main())
