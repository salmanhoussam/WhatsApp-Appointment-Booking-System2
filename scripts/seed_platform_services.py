"""
Seed platform_services table — master catalog of SalmanSaaS features.
Run once: python scripts/seed_platform_services.py
Idempotent (upsert by key).
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from dotenv import load_dotenv
load_dotenv()

from prisma import Prisma

SERVICES = [
    # ── Booking module ────────────────────────────────────────────────────────
    {
        "key":           "booking",
        "moduleKey":     "booking",
        "nameAr":        "نظام الحجز",
        "nameEn":        "Booking System",
        "descriptionAr": "حجز الوحدات مع تقويم التوفر وإدارة العملاء",
        "descriptionEn": "Unit booking with availability calendar and customer management",
        "icon":          "calendar",
        "monthlyPrice":  49.0,
        "sortOrder":     10,
    },
    {
        "key":           "gallery",
        "moduleKey":     "booking",
        "nameAr":        "معرض الصور",
        "nameEn":        "Photo Gallery",
        "descriptionAr": "معرض صور احترافي مع lightbox",
        "descriptionEn": "Professional photo gallery with lightbox",
        "icon":          "image",
        "monthlyPrice":  0.0,
        "sortOrder":     20,
    },
    {
        "key":           "whatsapp_ordering",
        "moduleKey":     "booking",
        "nameAr":        "طلبات واتساب",
        "nameEn":        "WhatsApp Ordering",
        "descriptionAr": "زر واتساب مع رسائل مُعدّة مسبقاً",
        "descriptionEn": "WhatsApp CTA button with pre-filled messages",
        "icon":          "message-circle",
        "monthlyPrice":  0.0,
        "sortOrder":     30,
    },
    # ── Restaurant module ─────────────────────────────────────────────────────
    {
        "key":           "restaurant",
        "moduleKey":     "restaurant",
        "nameAr":        "نظام المطعم",
        "nameEn":        "Restaurant System",
        "descriptionAr": "قائمة طعام رقمية مع نظام طلبات",
        "descriptionEn": "Digital menu with order management",
        "icon":          "utensils",
        "monthlyPrice":  39.0,
        "sortOrder":     10,
    },
    {
        "key":           "restaurant.menu",
        "moduleKey":     "restaurant",
        "nameAr":        "القائمة الرقمية",
        "nameEn":        "Digital Menu",
        "descriptionAr": "قائمة تفاعلية مع فئات وأسعار",
        "descriptionEn": "Interactive menu with categories and prices",
        "icon":          "book-open",
        "monthlyPrice":  0.0,
        "sortOrder":     11,
    },
    {
        "key":           "restaurant.table_booking",
        "moduleKey":     "restaurant",
        "nameAr":        "حجز الطاولات",
        "nameEn":        "Table Booking",
        "descriptionAr": "نظام حجز الطاولات مع إدارة التوفر",
        "descriptionEn": "Table reservation system with availability management",
        "icon":          "armchair",
        "monthlyPrice":  15.0,
        "sortOrder":     12,
    },
    {
        "key":           "restaurant.delivery",
        "moduleKey":     "restaurant",
        "nameAr":        "التوصيل",
        "nameEn":        "Delivery",
        "descriptionAr": "نظام توصيل مع مناطق وأسعار",
        "descriptionEn": "Delivery system with zones and pricing",
        "icon":          "truck",
        "monthlyPrice":  20.0,
        "sortOrder":     13,
    },
    # ── Store module ──────────────────────────────────────────────────────────
    {
        "key":           "store",
        "moduleKey":     "store",
        "nameAr":        "المتجر الإلكتروني",
        "nameEn":        "Online Store",
        "descriptionAr": "متجر متكامل مع سلة ومدفوعات",
        "descriptionEn": "Full e-commerce store with cart and payments",
        "icon":          "shopping-bag",
        "monthlyPrice":  59.0,
        "sortOrder":     10,
    },
    {
        "key":           "store.products",
        "moduleKey":     "store",
        "nameAr":        "كتالوج المنتجات",
        "nameEn":        "Product Catalog",
        "descriptionAr": "عرض المنتجات مع فلاتر وبحث",
        "descriptionEn": "Product listing with filters and search",
        "icon":          "package",
        "monthlyPrice":  0.0,
        "sortOrder":     11,
    },
    {
        "key":           "store.cart",
        "moduleKey":     "store",
        "nameAr":        "سلة التسوق",
        "nameEn":        "Shopping Cart",
        "descriptionAr": "سلة بدون تسجيل مع checkout",
        "descriptionEn": "Guest cart with checkout flow",
        "icon":          "shopping-cart",
        "monthlyPrice":  0.0,
        "sortOrder":     12,
    },
    {
        "key":           "store.wishlist",
        "moduleKey":     "store",
        "nameAr":        "المفضلة",
        "nameEn":        "Wishlist",
        "descriptionAr": "حفظ المنتجات للشراء لاحقاً",
        "descriptionEn": "Save products for later purchase",
        "icon":          "heart",
        "monthlyPrice":  5.0,
        "sortOrder":     13,
    },
    {
        "key":           "store.loyalty",
        "moduleKey":     "store",
        "nameAr":        "نقاط الولاء",
        "nameEn":        "Loyalty Points",
        "descriptionAr": "برنامج نقاط مع مكافآت",
        "descriptionEn": "Points-based loyalty rewards program",
        "icon":          "star",
        "monthlyPrice":  10.0,
        "sortOrder":     14,
    },
    # ── Shared / Planned ──────────────────────────────────────────────────────
    {
        "key":           "analytics",
        "moduleKey":     "shared",
        "nameAr":        "التحليلات",
        "nameEn":        "Analytics",
        "descriptionAr": "تقارير مبيعات وزيارات",
        "descriptionEn": "Sales and traffic analytics reports",
        "icon":          "bar-chart",
        "monthlyPrice":  15.0,
        "sortOrder":     90,
    },
    {
        "key":           "ai_bot",
        "moduleKey":     "shared",
        "nameAr":        "بوت الذكاء الاصطناعي",
        "nameEn":        "AI Chatbot",
        "descriptionAr": "بوت واتساب بالذكاء الاصطناعي يرد على العملاء",
        "descriptionEn": "AI-powered WhatsApp bot for customer support",
        "icon":          "bot",
        "monthlyPrice":  30.0,
        "sortOrder":     91,
    },
    {
        "key":           "whatsapp_blast",
        "moduleKey":     "shared",
        "nameAr":        "رسائل جماعية",
        "nameEn":        "WhatsApp Blast",
        "descriptionAr": "إرسال رسائل ترويجية لجميع العملاء",
        "descriptionEn": "Send promotional messages to all customers",
        "icon":          "send",
        "monthlyPrice":  20.0,
        "sortOrder":     92,
    },
]


async def main():
    db = Prisma(datasource={"url": os.environ["DIRECT_URL"]})
    await db.connect()

    print(f"Seeding {len(SERVICES)} platform services...")

    for svc in SERVICES:
        await db.platformservice.upsert(
            where={"key": svc["key"]},
            data={
                "create": {
                    "key":           svc["key"],
                    "moduleKey":     svc["moduleKey"],
                    "nameAr":        svc["nameAr"],
                    "nameEn":        svc["nameEn"],
                    "descriptionAr": svc.get("descriptionAr"),
                    "descriptionEn": svc.get("descriptionEn"),
                    "icon":          svc.get("icon"),
                    "monthlyPrice":  svc.get("monthlyPrice"),
                    "sortOrder":     svc.get("sortOrder", 0),
                    "isActive":      True,
                },
                "update": {
                    "nameAr":        svc["nameAr"],
                    "nameEn":        svc["nameEn"],
                    "descriptionAr": svc.get("descriptionAr"),
                    "icon":          svc.get("icon"),
                    "monthlyPrice":  svc.get("monthlyPrice"),
                    "sortOrder":     svc.get("sortOrder", 0),
                },
            },
        )
        print(f"  [{svc['moduleKey']}] {svc['key']}")

    await db.disconnect()
    print("\nDone.")


if __name__ == "__main__":
    asyncio.run(main())
