# -*- coding: utf-8 -*-
import asyncio, sys
sys.path.insert(0, '.')
sys.stdout.reconfigure(encoding='utf-8')

async def main():
    from app.db.client import prisma_client
    await prisma_client.connect()
    fixes = [
        ('a1a40b83-4e96-46a5-93c4-d3b051f944b7', 'عناية بالشعر'),
        ('9da1a817-fda3-4dae-bccf-4603a61c85ea', 'عناية بالبشرة'),
        ('23b411be-faeb-46cc-81e5-20ff6cc6b742', 'أظافر'),
        ('21c24f84-725c-43c6-b877-dbf88176206a', 'مكياج'),
    ]
    for cat_id, name_ar in fixes:
        await prisma_client.catalogcategory.update(
            where={'id': cat_id},
            data={'nameAr': name_ar}
        )
        print(f'Fixed: {cat_id[:8]} -> {name_ar}')
    await prisma_client.disconnect()
    print('Done.')

asyncio.run(main())
