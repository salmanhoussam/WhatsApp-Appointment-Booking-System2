#!/usr/bin/env python3
"""
scripts/seed_beit_smar_units.py
──────────────────────────────
Seeds all 12 Beit Smar units into the database.

Units are named after Phoenician alphabet letters and match the actual
resort layout: 9 cottages (3 types) + 3 villas.

Usage:
    python scripts/seed_beit_smar_units.py

    # Dry run (prints what would be inserted, no DB writes):
    python scripts/seed_beit_smar_units.py --dry-run

    # Skip existing units (don't fail if already seeded):
    python scripts/seed_beit_smar_units.py --skip-existing

Requires:
    DIRECT_URL env var (port 5432, bypasses pgbouncer for migrations/seeds)
    or DATABASE_URL if DIRECT_URL is not set.
"""

import asyncio
import os
import sys
import argparse

# Force UTF-8 output on Windows (avoids cp1252 emoji crash)
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from pathlib import Path

# ── Add project root to path ───────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

# Load .env
try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env")
except ImportError:
    pass

from prisma import Prisma, Json


# ─────────────────────────────────────────────────────────────────────────────
# UNIT DEFINITIONS
# ─────────────────────────────────────────────────────────────────────────────

# Shared amenities for all cottages
_COTTAGE_AMENITIES = [
    {"icon": "bed-double",     "label": "King-size Bed",         "label_ar": "سرير كينغ فاخر"},
    {"icon": "bath",           "label": "Dual Rain Shower",      "label_ar": "دُش مطري مزدوج"},
    {"icon": "wifi",           "label": "Free Wi-Fi 24/7",       "label_ar": "إنترنت مجاني على مدار الساعة"},
    {"icon": "tv",             "label": "Smart TV + Netflix",    "label_ar": "تلفزيون ذكي + نتفليكس"},
    {"icon": "snowflake",      "label": "AC & Heating",          "label_ar": "تكييف وتدفئة"},
    {"icon": "utensils",       "label": "Kitchenette",           "label_ar": "مطبخ صغير مجهز"},
    {"icon": "sun",            "label": "Private Terrace",       "label_ar": "تراس خاص"},
    {"icon": "mountain",       "label": "Sea & Mountain View",   "label_ar": "إطلالة بحر وجبال"},
]

# Shared amenities for villas (extends cottages)
_VILLA_AMENITIES = [
    {"icon": "bed-double",     "label": "King & Twin Bedrooms",  "label_ar": "غرف نوم بأسرة فاخرة"},
    {"icon": "bath",           "label": "Dual Rain Showers",     "label_ar": "دُش مطري مزدوج لكل حمام"},
    {"icon": "wifi",           "label": "Free Wi-Fi 24/7",       "label_ar": "إنترنت مجاني على مدار الساعة"},
    {"icon": "tv",             "label": "Smart TV + Netflix",    "label_ar": "تلفزيون ذكي + نتفليكس"},
    {"icon": "snowflake",      "label": "AC & Heating",          "label_ar": "تكييف وتدفئة"},
    {"icon": "utensils",       "label": "Full Modern Kitchen",   "label_ar": "مطبخ حديث مجهز بالكامل"},
    {"icon": "mountain",       "label": "Panoramic View",        "label_ar": "إطلالة بانورامية"},
    {"icon": "pool",           "label": "Pool Access (The Club)","label_ar": "الوصول للمسبح - نادي بيت سمار"},
    {"icon": "sparkles",       "label": "5-Star Concierge",      "label_ar": "خدمة كونسيرج 5 نجوم"},
]

# Shared rules for all units (slight variations applied per unit)
def _make_rules(check_in="15:00", check_out="12:00", cancellation_days=14):
    return {
        "checkIn":      check_in,
        "checkOut":     check_out,
        "cancellation": (
            f"استرداد كامل 100% عند الإلغاء قبل {cancellation_days} يوماً من الوصول. "
            f"استرداد 50% عند الإلغاء قبل 7 أيام. لا استرداد عند الإلغاء خلال أقل من 7 أيام."
        ),
        "rules": [
            "ساعات الهدوء من منتصف الليل حتى 7:00 صباحاً",
            "إبراز الهوية الشخصية إلزامي عند الوصول",
            "يُرجى إطفاء التكييف والأضواء عند مغادرة الوحدة",
            "الحيوانات الأليفة مرحب بها",
            "التدخين ممنوع داخل الوحدة",
        ],
    }


UNITS = [
    # ── Detached Cottages (Aleph, Beth, Zayin, Het) ───────────────────────────
    {
        "name_ar":      "كوخ ألف — Aleph",
        "name_en":      "Aleph Cottage",
        "unit_type":    "chalet",
        "category":     "chalet",
        "capacity":     2,
        "bedrooms":     1,
        "bathrooms":    1,
        "price":        165.0,
        "price_label":  "تبدأ من $165 / ليلة",
        "sort_order":   1,
        "description_ar": "كوخ مستقل فاخر يحمل اسم الحرف الفينيقي الأول 'ألف'. تجربة إقامة حميمية وسط طبيعة البترون مع إطلالة خلابة على البحر.",
        "description_en": "A premium detached cottage bearing the name of the first Phoenician letter 'Aleph'. Intimate mountain retreat with breathtaking Mediterranean views.",
        "amenities": _COTTAGE_AMENITIES,
        "content_blocks": [
            {"type": "section_title", "content": "الهدوء والتواصل مع الطبيعة 🌿", "style": {"size": "large", "color": "gold", "bold": True}},
            {"type": "highlight_item", "icon": "mountain", "title": "إطلالة بانورامية", "content": "إطلالة مباشرة على البحر الأبيض المتوسط وكروم العنب الشهيرة في البترون."},
            {"type": "highlight_item", "icon": "sparkles", "title": "تصميم بوتيك فاخر", "content": "مفروشات راقية وتفاصيل معمارية مستوحاة من التراث اللبناني الأصيل."},
            {"type": "paragraph", "content": "يقع الكوخ في قلب منتجع بيت سمار، على بُعد خطوات من نادي السباحة ومطعم المنتجع. مسافة قصيرة من قلعة سمار جبيل التاريخية وطريق نبيذ الشمال.", "style": {"size": "normal", "color": "gray"}},
        ],
        "rules_policies": _make_rules(),
    },
    {
        "name_ar":      "كوخ بيت — Beth",
        "name_en":      "Beth Cottage",
        "unit_type":    "chalet",
        "category":     "chalet",
        "capacity":     2,
        "bedrooms":     1,
        "bathrooms":    1,
        "price":        165.0,
        "price_label":  "تبدأ من $165 / ليلة",
        "sort_order":   2,
        "description_ar": "كوخ مستقل أنيق يحمل اسم الحرف الفينيقي 'بيت'. تجربة خصوصية تامة مع كل مرافق الإقامة الفاخرة.",
        "description_en": "An elegant detached cottage named after the Phoenician letter 'Beth'. Complete privacy with all luxury amenities.",
        "amenities": _COTTAGE_AMENITIES,
        "content_blocks": [
            {"type": "section_title", "content": "خصوصية تامة بلمسة فينيقية ✨", "style": {"size": "large", "color": "gold", "bold": True}},
            {"type": "highlight_item", "icon": "sparkles", "title": "إقامة استثنائية", "content": "تصميم داخلي متوازن يجمع الأصالة اللبنانية مع الراحة العصرية."},
            {"type": "highlight_item", "icon": "bath", "title": "تجربة سبا", "content": "دُش مطري مزدوج وبياضات فندقية فاخرة لتجربة تشبه أرقى منتجعات السبا."},
            {"type": "paragraph", "content": "كوخ بيت هو ملجأ مثالي للأزواج الباحثين عن الهدوء والرومانسية وسط أجواء الجبل اللبناني.", "style": {"size": "normal", "color": "gray"}},
        ],
        "rules_policies": _make_rules(),
    },
    # ── Garden Cottages (Gimel, Daleth) ───────────────────────────────────────
    {
        "name_ar":      "كوخ جيم — Gimel",
        "name_en":      "Gimel Garden Cottage",
        "unit_type":    "chalet",
        "category":     "chalet",
        "capacity":     2,
        "bedrooms":     1,
        "bathrooms":    1,
        "price":        150.0,
        "price_label":  "تبدأ من $150 / ليلة",
        "sort_order":   3,
        "description_ar": "كوخ حديقة يحمل اسم الحرف الفينيقي 'جيم'. يطل مباشرة على الحديقة الخضراء للمنتجع مع أجواء هادئة تغمرك بالطبيعة.",
        "description_en": "A garden-facing cottage named after the Phoenician letter 'Gimel'. Opens directly onto the resort's green garden.",
        "amenities": _COTTAGE_AMENITIES,
        "content_blocks": [
            {"type": "section_title", "content": "نافذة على الطبيعة الخضراء 🌳", "style": {"size": "large", "color": "gold", "bold": True}},
            {"type": "highlight_item", "icon": "tree-pine", "title": "إطلالة الحديقة", "content": "تراس خاص يطل مباشرة على حديقة المنتجع المورقة مع أصوات الطبيعة."},
            {"type": "highlight_item", "icon": "coffee", "title": "صباح هادئ", "content": "استمتع بفنجان قهوتك الصباحية وسط أجواء خضراء منعشة."},
            {"type": "paragraph", "content": "كوخ جيم مثالي لمن يبحث عن التوازن بين الهدوء والإطلالة الطبيعية الساحرة.", "style": {"size": "normal", "color": "gray"}},
        ],
        "rules_policies": _make_rules(),
    },
    {
        "name_ar":      "كوخ دال — Daleth",
        "name_en":      "Daleth Garden Cottage",
        "unit_type":    "chalet",
        "category":     "chalet",
        "capacity":     2,
        "bedrooms":     1,
        "bathrooms":    1,
        "price":        150.0,
        "price_label":  "تبدأ من $150 / ليلة",
        "sort_order":   4,
        "description_ar": "كوخ حديقة يحمل اسم الحرف الفينيقي 'دال'. تجربة إقامة هادئة مع إطلالة مميزة على الحديقة الداخلية للمنتجع.",
        "description_en": "A peaceful garden cottage named after the Phoenician letter 'Daleth'. Serene stay with views of the inner garden.",
        "amenities": _COTTAGE_AMENITIES,
        "content_blocks": [
            {"type": "section_title", "content": "سكينة الطبيعة في قلب المنتجع 🍃", "style": {"size": "large", "color": "gold", "bold": True}},
            {"type": "highlight_item", "icon": "wind", "title": "هواء الجبل النقي", "content": "موقع محمي يمنحك هواء الجبل النقي مع خصوصية تامة."},
            {"type": "highlight_item", "icon": "moon", "title": "ليالٍ ساحرة", "content": "استمتع بسماء الجبل المرصعة بالنجوم من تراسك الخاص."},
            {"type": "paragraph", "content": "قريب من مرافق النادي والمسبح مع الحفاظ على الخصوصية والهدوء.", "style": {"size": "normal", "color": "gray"}},
        ],
        "rules_policies": _make_rules(),
    },
    # ── Terrace Cottages (He, Vav) ─────────────────────────────────────────────
    {
        "name_ar":      "كوخ هاء — He",
        "name_en":      "He Terrace Cottage",
        "unit_type":    "chalet",
        "category":     "chalet",
        "capacity":     2,
        "bedrooms":     1,
        "bathrooms":    1,
        "price":        175.0,
        "price_label":  "تبدأ من $175 / ليلة",
        "sort_order":   5,
        "description_ar": "كوخ تراس يحمل اسم الحرف الفينيقي 'هاء'. تراس واسع مع إطلالة مفتوحة على الوادي والبحر.",
        "description_en": "A terrace cottage named after the Phoenician letter 'He'. Spacious terrace with open valley and sea views.",
        "amenities": _COTTAGE_AMENITIES,
        "content_blocks": [
            {"type": "section_title", "content": "الإطلالة التي لا تُنسى 🌊", "style": {"size": "large", "color": "gold", "bold": True}},
            {"type": "highlight_item", "icon": "sun", "title": "شروق الشمس", "content": "استقبل الفجر من تراسك الخاص مع إطلالة بانورامية مكتملة على البحر الأبيض المتوسط."},
            {"type": "highlight_item", "icon": "mountain", "title": "وادي البترون", "content": "منظر خلاب على وادي البترون وكروم العنب الممتدة حتى أفق البحر."},
            {"type": "paragraph", "content": "كوخ هاء هو الخيار المثالي لتجربة الإطلالات الجبلية-البحرية المميزة لبيت سمار.", "style": {"size": "normal", "color": "gray"}},
        ],
        "rules_policies": _make_rules(),
    },
    {
        "name_ar":      "كوخ واو — Vav",
        "name_en":      "Vav Terrace Cottage",
        "unit_type":    "chalet",
        "category":     "chalet",
        "capacity":     2,
        "bedrooms":     1,
        "bathrooms":    1,
        "price":        175.0,
        "price_label":  "تبدأ من $175 / ليلة",
        "sort_order":   6,
        "description_ar": "كوخ تراس يحمل اسم الحرف الفينيقي 'واو'. يجمع بين خصوصية الإقامة الفاخرة وأجمل الإطلالات على البحر.",
        "description_en": "A terrace cottage named after the Phoenician letter 'Vav'. Where luxury privacy meets the most beautiful sea vistas.",
        "amenities": _COTTAGE_AMENITIES,
        "content_blocks": [
            {"type": "section_title", "content": "رومانسية فوق قمم البترون 🌅", "style": {"size": "large", "color": "gold", "bold": True}},
            {"type": "highlight_item", "icon": "heart", "title": "الوجهة الرومانسية", "content": "تراس مُضاء بإضاءة خافتة دافئة — مثالي لأمسيات رومانسية فوق الجبل."},
            {"type": "highlight_item", "icon": "coffee", "title": "فطور الصباح", "content": "يُقدَّم الفطور في تراسك أو في كلوب بيت سمار بإشراف فريق الكونسيرج."},
            {"type": "paragraph", "content": "أحد أبرز وحدات بيت سمار — يحجز في وقت مبكر خاصة خلال مواسم النبيذ والذروة الصيفية.", "style": {"size": "normal", "color": "gray"}},
        ],
        "rules_policies": _make_rules(),
    },
    # ── Premium Detached Cottages (Zayin, Het, Tet) ───────────────────────────
    {
        "name_ar":      "كوخ زين — Zayin",
        "name_en":      "Zayin Patio Cottage",
        "unit_type":    "chalet",
        "category":     "chalet",
        "capacity":     2,
        "bedrooms":     1,
        "bathrooms":    1,
        "price":        220.0,
        "price_label":  "تبدأ من $220 / ليلة",
        "sort_order":   7,
        "description_ar": "كوخ باتيو مستقل يحمل اسم الحرف الفينيقي 'زين'. فضاء خاص واسع مع باتيو خارجي مميز — من أكثر الوحدات طلباً في المنتجع.",
        "description_en": "A standalone patio cottage bearing the name of the Phoenician letter 'Zayin'. Generous private outdoor patio — one of the resort's most requested units.",
        "amenities": _COTTAGE_AMENITIES,
        "content_blocks": [
            {"type": "section_title", "content": "الخلاء بكامل خصوصيته ✨", "style": {"size": "large", "color": "gold", "bold": True}},
            {"type": "highlight_item", "icon": "sun", "title": "باتيو خاص واسع", "content": "مساحة خارجية خاصة تتيح لك الاستمتاع بالهواء الطلق في خصوصية تامة."},
            {"type": "highlight_item", "icon": "sparkles", "title": "تجربة ديسكفري", "content": "اكتشف منتجع بيت سمار — تواصل، طبيعة، هدوء — من أفضل وحداته الاستقبالية."},
            {"type": "paragraph", "content": "كوخ زين يقع على مسار الفلل الداخلي، قريب من طريق نبيذ الشمال وكروم العنب الشهيرة في البترون.", "style": {"size": "normal", "color": "gray"}},
        ],
        "rules_policies": _make_rules(),
    },
    {
        "name_ar":      "كوخ حاء — Het",
        "name_en":      "Het Cottage",
        "unit_type":    "chalet",
        "category":     "chalet",
        "capacity":     2,
        "bedrooms":     1,
        "bathrooms":    1,
        "price":        265.0,
        "price_label":  "تبدأ من $265 / ليلة",
        "sort_order":   8,
        "description_ar": "كوخ فاخر يحمل اسم الحرف الفينيقي 'حاء'. من أرقى وحدات المنتجع مع تشطيبات حجرية أصيلة وإطلالة استثنائية.",
        "description_en": "A premium cottage bearing the Phoenician letter 'Het'. Among the resort's finest units with authentic stone finishes.",
        "amenities": _COTTAGE_AMENITIES,
        "content_blocks": [
            {"type": "section_title", "content": "الفخامة الجبلية في أبهى صورها 🏡", "style": {"size": "large", "color": "gold", "bold": True}},
            {"type": "highlight_item", "icon": "star", "title": "أرقى الوحدات", "content": "تشطيبات حجرية لبنانية أصيلة تمنح الكوخ طابعاً تراثياً فريداً."},
            {"type": "highlight_item", "icon": "mountain", "title": "إطلالة استثنائية", "content": "إطلالة مباشرة لا عوائق فيها على البحر الأبيض المتوسط وكروم العنب."},
            {"type": "paragraph", "content": "الخيار الأول لمن يبحث عن التجربة الأكثر تميزاً في بيت سمار — يُوصى بالحجز المبكر.", "style": {"size": "normal", "color": "gray"}},
        ],
        "rules_policies": _make_rules(),
    },
    {
        "name_ar":      "كوخ طيت — Tet",
        "name_en":      "Tet Premium Cottage",
        "unit_type":    "chalet",
        "category":     "chalet",
        "capacity":     2,
        "bedrooms":     1,
        "bathrooms":    1,
        "price":        294.0,
        "price_label":  "تبدأ من $294 / ليلة",
        "sort_order":   9,
        "description_ar": "أفخم الأكواخ المستقلة في المنتجع — كوخ طيت يقدم أعلى مستوى من الخصوصية والتشطيب الفاخر.",
        "description_en": "The resort's most premium detached cottage — Tet offers the highest level of privacy and luxury finishing.",
        "amenities": _COTTAGE_AMENITIES,
        "content_blocks": [
            {"type": "section_title", "content": "ذروة التجربة في بيت سمار 🌟", "style": {"size": "large", "color": "gold", "bold": True}},
            {"type": "highlight_item", "icon": "star", "title": "الوحدة الأكثر تميزاً", "content": "موقع مميز، تشطيبات استثنائية، وخدمة كونسيرج أولوية."},
            {"type": "highlight_item", "icon": "sparkles", "title": "تجربة لا تُنسى", "content": "كل تفصيل في كوخ طيت مصمم ليترك انطباعاً دائماً."},
            {"type": "paragraph", "content": "للمناسبات الخاصة، أعياد الزواج، وشهر العسل — كوخ طيت يصنع الذكريات الأجمل.", "style": {"size": "normal", "color": "gray"}},
        ],
        "rules_policies": _make_rules(),
    },
    # ── Villas ─────────────────────────────────────────────────────────────────
    {
        "name_ar":      "فيلا إيريس",
        "name_en":      "Villa Iris",
        "unit_type":    "villa",
        "category":     "villa",
        "capacity":     4,
        "bedrooms":     2,
        "bathrooms":    2,
        "price":        500.0,
        "price_label":  "تبدأ من $500 / ليلة",
        "sort_order":   10,
        "description_ar": "فيلا إيريس — فيلا فاخرة بغرفتَي نوم مع مطبخ حديث مجهز بالكامل وإطلالة بانورامية لا مثيل لها. الخيار الأمثل للعائلات والأزواج الباحثين عن تجربة فاخرة.",
        "description_en": "Villa Iris — a luxurious 2-bedroom villa with a fully equipped modern kitchen and unparalleled panoramic views. Ideal for families and couples seeking a premium escape.",
        "amenities": _VILLA_AMENITIES,
        "content_blocks": [
            {"type": "section_title", "content": "فخامة الفيلا بإطلالة البحر الأبيض المتوسط 🌊", "style": {"size": "large", "color": "gold", "bold": True}},
            {"type": "highlight_item", "icon": "bed-double", "title": "غرفتا نوم فاخرتان", "content": "غرفة رئيسية بسرير كينغ وغرفة ثانية بسرير مزدوج — بياضات فندقية فاخرة في كلتيهما."},
            {"type": "highlight_item", "icon": "utensils", "title": "مطبخ حديث متكامل", "content": "مطبخ عصري مجهز بالكامل — مثالي للوجبات المنزلية مع إطلالة على الوادي والبحر."},
            {"type": "highlight_item", "icon": "pool", "title": "نادي بيت سمار", "content": "وصول كامل لمرافق النادي: المسبح، البار، الصالة الداخلية، ومنطقة الاستراحة الخارجية."},
            {"type": "paragraph", "content": "فيلا إيريس — من أكثر الوحدات طلباً لمناسبات الذكرى السنوية وشهر العسل في بيت سمار.", "style": {"size": "normal", "color": "gray"}},
        ],
        "rules_policies": _make_rules(check_in="17:00", check_out="14:00"),
    },
    {
        "name_ar":      "فيلا الأوركيد",
        "name_en":      "Villa Des Orchidées",
        "unit_type":    "villa",
        "category":     "villa",
        "capacity":     4,
        "bedrooms":     2,
        "bathrooms":    2,
        "price":        150.0,
        "price_label":  "تبدأ من $150 / ليلة",
        "sort_order":   11,
        "description_ar": "منزل حجري لبناني أصيل يعود لأكثر من قرن — فيلا الأوركيد تجمع بين الأصالة المعمارية والمرافق العصرية الفاخرة.",
        "description_en": "An authentic Lebanese stone house over a century old — Villa Des Orchidées blends architectural heritage with modern luxury amenities.",
        "amenities": _VILLA_AMENITIES,
        "content_blocks": [
            {"type": "section_title", "content": "التراث اللبناني في أبهى تجلياته 🏛️", "style": {"size": "large", "color": "gold", "bold": True}},
            {"type": "highlight_item", "icon": "star", "title": "منزل حجري تاريخي", "content": "بناء حجري لبناني أصيل يتجاوز عمره مئة عام — مُرمَّم بعناية فائقة مع الحفاظ على روحه الأصيلة."},
            {"type": "highlight_item", "icon": "utensils", "title": "مطبخ حديث متكامل", "content": "مطبخ كبير مجهز بالكامل مع أجهزة عصرية — مثالي للإقامات الطويلة."},
            {"type": "highlight_item", "icon": "tree-pine", "title": "حديقة زهور الأوركيد", "content": "حديقة خاصة مزروعة بالأوركيد والزهور البرية — تحيط بالفيلا من جميع الجهات."},
            {"type": "paragraph", "content": "متاحة للإيجار الشهري بسعر $1200 — الخيار الأمثل للإقامات الطويلة والعائلات.", "style": {"size": "normal", "color": "gray"}},
        ],
        "rules_policies": _make_rules(check_in="15:00", check_out="12:00"),
    },
    {
        "name_ar":      "فيلا J الكبرى",
        "name_en":      "Villa J",
        "unit_type":    "villa",
        "category":     "villa",
        "capacity":     9,
        "bedrooms":     5,
        "bathrooms":    5,
        "price":        950.0,
        "price_label":  "تبدأ من $950 / ليلة",
        "sort_order":   12,
        "description_ar": "الفيلا الأكبر في بيت سمار — فيلا J بـ 5 غرف نوم و5 حمامات تتسع لـ 9 ضيوف. مثالية للمجموعات والأسر الكبيرة والاحتفالات الخاصة.",
        "description_en": "Beit Smar's largest residence — Villa J features 5 bedrooms and 5 bathrooms for up to 9 guests. Perfect for groups, large families, and private celebrations.",
        "amenities": [
            {"icon": "bed-double",   "label": "5 Luxury Bedrooms",       "label_ar": "5 غرف نوم فاخرة"},
            {"icon": "bath",         "label": "5 En-Suite Bathrooms",     "label_ar": "5 حمامات ملحقة"},
            {"icon": "utensils",     "label": "Grand Chef's Kitchen",     "label_ar": "مطبخ كبير مجهز بالكامل"},
            {"icon": "wifi",         "label": "Free Wi-Fi 24/7",          "label_ar": "إنترنت مجاني على مدار الساعة"},
            {"icon": "tv",           "label": "Multiple Smart TVs",       "label_ar": "تلفزيونات ذكية في كل غرفة"},
            {"icon": "snowflake",    "label": "Central AC & Heating",     "label_ar": "تكييف وتدفئة مركزية"},
            {"icon": "mountain",     "label": "360° Panoramic View",      "label_ar": "إطلالة بانورامية 360°"},
            {"icon": "pool",         "label": "Exclusive Pool Access",    "label_ar": "وصول حصري للمسبح"},
            {"icon": "sparkles",     "label": "Dedicated Concierge",      "label_ar": "كونسيرج مخصص للفيلا"},
            {"icon": "baby",         "label": "Family & Pet Friendly",    "label_ar": "مناسبة للعائلات والحيوانات"},
        ],
        "content_blocks": [
            {"type": "section_title", "content": "المقر الأفخم في بيت سمار 👑", "style": {"size": "large", "color": "gold", "bold": True}},
            {"type": "highlight_item", "icon": "star", "title": "5 غرف نوم فاخرة", "content": "5 غرف نوم مستقلة بأسرة فاخرة وحمام ملحق لكل غرفة — راحة تامة لكل ضيف."},
            {"type": "highlight_item", "icon": "utensils", "title": "مطبخ الشيف", "content": "مطبخ ضخم مجهز بأحدث الأجهزة — مثالي للمأدبات العائلية والاحتفالات الخاصة."},
            {"type": "highlight_item", "icon": "sparkles", "title": "احتفالات خاصة", "content": "فيلا J هي الوجهة المفضلة للأعراس الصغيرة، أعياد الميلاد، والتجمعات العائلية الكبرى."},
            {"type": "paragraph", "content": "مساحة الفيلا الكبرى تتيح الاستضافة المريحة لـ 9 ضيوف مع الوصول الكامل لجميع مرافق نادي بيت سمار.", "style": {"size": "normal", "color": "gray"}},
        ],
        "rules_policies": _make_rules(check_in="17:00", check_out="14:00", cancellation_days=21),
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# SEED LOGIC
# ─────────────────────────────────────────────────────────────────────────────

async def seed(dry_run: bool = False, skip_existing: bool = False):
    db = Prisma()
    await db.connect()

    try:
        # ── Resolve smar client ────────────────────────────────────────────────
        client = await db.client.find_first(where={"slug": "smar", "isActive": True})
        if not client:
            print("❌ Client 'smar' not found in the database.")
            print("   Run: python scripts/backfill_smar.py first.")
            return

        # ── Resolve property ───────────────────────────────────────────────────
        prop = await db.property.find_first(
            where={"clientId": client.id, "isActive": True},
            order={"createdAt": "asc"},
        )
        if not prop:
            print("❌ No active Property found for smar.")
            print("   Create one via the Admin Settings → Properties tab first.")
            return

        print(f"✅ Client: {client.name} ({client.id})")
        print(f"✅ Property: {prop.name} ({prop.id})")
        print(f"   Units to seed: {len(UNITS)}")
        print()

        created = 0
        skipped = 0

        for u in UNITS:
            name_ar = u["name_ar"]

            # ── Skip if already exists ─────────────────────────────────────────
            existing = await db.unit.find_first(
                where={"clientId": client.id, "name_ar": name_ar}
            )
            if existing:
                if skip_existing:
                    print(f"   ⏭  SKIP  {name_ar} (already exists)")
                    skipped += 1
                    continue
                else:
                    print(f"   ⚠️  DUPLICATE: {name_ar} — use --skip-existing to skip")
                    skipped += 1
                    continue

            if dry_run:
                print(f"   🔵 DRY-RUN  {name_ar} ({u['name_en']}) — ${u['price']}/night — {u['capacity']} guests")
                created += 1
                continue

            unit = await db.unit.create(data={
                "clientId":       client.id,
                "propertyId":     prop.id,
                "name_ar":        name_ar,
                "name_en":        u["name_en"],
                "unit_type":      u["unit_type"],
                "category":       u.get("category"),
                "capacity":       u["capacity"],
                "bedrooms":       u.get("bedrooms"),
                "bathrooms":      u.get("bathrooms"),
                "price":          u.get("price"),
                "price_label":    u.get("price_label"),
                "sort_order":     u.get("sort_order", 0),
                "description_ar": u.get("description_ar"),
                "description_en": u.get("description_en"),
                "content_blocks": Json(u["content_blocks"]) if u.get("content_blocks") else None,
                "amenities":      Json(u["amenities"])      if u.get("amenities")      else None,
                "rules_policies": Json(u["rules_policies"]) if u.get("rules_policies") else None,
                "images":         [],
                "isActive":       True,
                "isAvailable":    True,
            })
            print(f"   ✅ CREATED {unit.name_ar} ({unit.name_en}) — id: {unit.id}")
            created += 1

        print()
        if dry_run:
            print(f"🔵 DRY RUN complete — {created} units would be created, {skipped} skipped.")
        else:
            print(f"🎉 Seed complete — {created} units created, {skipped} skipped.")

    finally:
        await db.disconnect()


def main():
    parser = argparse.ArgumentParser(description="Seed Beit Smar units")
    parser.add_argument("--dry-run",       action="store_true", help="Print plan without writing to DB")
    parser.add_argument("--skip-existing", action="store_true", help="Skip units that already exist")
    args = parser.parse_args()

    asyncio.run(seed(dry_run=args.dry_run, skip_existing=args.skip_existing))


if __name__ == "__main__":
    main()
