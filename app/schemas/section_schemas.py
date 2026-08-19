"""
app/schemas/section_schemas.py — TOS-005 Phase B: the single, canonical declaration of every
Homepage section type's editable shape.

Per TOS-005-cms-generic-engine.md S4.1's binding mechanics: this is the ONE real file this
information lives in. `app/api/v1/admin/content.py` imports it directly for server-side
validation; the Dashboard fetches it via `GET /content/sections/schema` (added alongside this
file) instead of hand-keeping a parallel copy — `SettingsTab.jsx`'s old `SECTION_FIELDS`/
`SECTION_LABELS` objects are retired in this same change, not left running beside this file.

Scope (matches TOS-005 Contract Phase B, not expanded beyond it): full editable field schemas for
the 9 sections `ALZABT_HOMEPAGE_SECTION_SETTINGS_CONTRACT.md` S2 already inventoried, transcribed
from that table (hero's two fields already unified with the Inline Interface in Phase A). The
other 5 real section types `SECTION_MAP` (`DynamicPage.jsx`) renders — `categories_grid`, `offers`,
`testimonials`, `video_story`, `story_experience`, all real in RK's live config — get a `label_ar`
only, `fields: {}`, deliberately preserving their exact current behavior (labeled row, no edit
button, since the Dashboard's `SectionRow` already only renders an edit button when `fields` is
non-empty). Declaring real, generically-editable field schemas for those 5 is a separate future
decision, not silently done here while retiring `SECTION_LABELS` would otherwise have dropped
their labels entirely.

`kind` vocabulary: `text`, `textarea`, `url`, `number`, `boolean`, `select` (all scalar) |
`repeatable` (structural — `fields` for an array of objects, or `item_kind` for an array of bare
scalars, e.g. `location.tags`) | `group` (structural — a single nested object, `fields` for its
own sub-shape, e.g. a hypothetical `hero.cta = {label, url}` — not yet used by any real section,
Tenant OS Section Editor Phase 2, 2026-08-20) | `media` (declared for schema/discovery purposes
only — see below). `select`'s `options` is a list of `{value, label_ar}`.

`hero.bg_image_url` (`pipeline: singleton`) and `gallery.images` (`pipeline: collection`) are now
declared below (Tenant OS Section Editor Phase 4, 2026-08-20) — `bg_type`/`framed_video_url` and
staff members' own photos are still absent, each with its own separate, not-yet-schema-driven
Renderer. Declaring a `media` field here is a different layer than *how* the upload happens: the
schema entry says "this section has a media field, here's its real reference (a `GalleryImage` row,
singleton or collection)"; the Dashboard's `MediaField` (`SettingsTab.jsx`) reads the `pipeline`
value and mounts the correct existing, unchanged upload flow (`HeroMediaSection`/
`GalleryMediaSection`) — never a third, generic upload implementation. `_validate_value` below still
rejects any attempt to set a `media`-kind field via `update_section_fields` — declaring it here is
for discovery (`GET /content/sections/schema`) only; the real value is still written exclusively
through its own dedicated media endpoint (`PATCH /admin/media/hero-image`,
`POST /admin/media/gallery-images`), never a second write path. Phase 2 (2026-08-20) added the
`media`/`group` kind vocabulary and validation without wiring either field live, specifically to
avoid a real duplicate-UI window; Phase 4 (same day, Salman's explicit go-ahead) does the actual
wiring and, in the same change, removes `HeroMediaSection`/`GalleryMediaSection`'s old General
Settings placement so the field is only ever editable from one place at a time.

Going-forward convention (2026-08-19, Salman's explicit instruction): page content must only ever
change through this validated path -- `content_service.py`'s `update_section_fields`/
`add_repeatable_item`/`update_repeatable_item` call `validate_fields`/`validate_repeatable_item`
internally now, not only `content.py`'s routes, so any future script/AI action that imports and
calls the canonical Service directly is refused bad data too, the same as a Dashboard request.
Real, honest limit: a script that writes to `Client.config` via raw Prisma (`db.client.update`),
bypassing this Service entirely, is not something this file can prevent -- that boundary is Python
import discipline, not a technical guard. 3 real historical scripts do exactly this
(`scripts/fix_cta_mrh.py`, `scripts/add_why_choose_us_mrh.py`, `scripts/set_mrh_social_contact.py`,
all dated 2026-08-18, all one-off and already executed, all predating this file) -- not rewritten
retroactively (repository-hygiene.md's own norm), but any *future* script touching section content
must call `content_service.py`, never raw Prisma, to stay inside this Contract.
"""

SECTION_SCHEMAS = {
    "hero": {
        "label_ar": "الصفحة الرئيسية (Hero)",
        "fields": {
            "bg_image_url":            {"kind": "media", "pipeline": "singleton", "label_ar": "خلفية الصفحة الرئيسية (صورة أو فيديو)"},
            "title_ar":               {"kind": "text", "label_ar": "العنوان الرئيسي"},
            "subtitle_ar":             {"kind": "text", "label_ar": "النص التوضيحي"},
            "cta_text_ar":             {"kind": "text", "label_ar": "نص زر الحجز"},
            "framed_video_caption_ar": {"kind": "text", "label_ar": "نص توضيحي للفيديو المؤطر (وضع الفيديو المؤطر فقط)"},
        },
    },
    "story": {
        "label_ar": "قصتنا",
        "fields": {
            "heading_ar": {"kind": "text",     "label_ar": "العنوان"},
            "body_ar":    {"kind": "textarea", "label_ar": "النص"},
            "stats": {
                "kind": "repeatable", "label_ar": "الأرقام (مثلاً: عدد الخدمات)",
                "fields": {
                    "num":   {"kind": "text", "label_ar": "الرقم"},
                    "label": {"kind": "text", "label_ar": "الوصف"},
                },
            },
        },
    },
    "staff": {
        "label_ar": "فريقنا",
        # members[] are live Barber API data, not authored `data` -- never part of this schema.
        "fields": {"heading_ar": {"kind": "text", "label_ar": "العنوان"}},
    },
    "gallery": {
        "label_ar": "معرض الصور",
        "fields": {
            "images":       {"kind": "media", "pipeline": "collection", "label_ar": "صور المعرض"},
            "heading_ar":   {"kind": "text",   "label_ar": "العنوان"},
            "limit":        {"kind": "number", "label_ar": "عدد الصور المعروضة (اتركه فارغاً لعرض الكل)"},
            "gallery_link": {"kind": "url",     "label_ar": "رابط \"عرض الكل\""},
        },
        # images[] is declared above for discovery only -- its real value is still written
        # exclusively through GalleryMediaSection's own dedicated endpoints (Phase 4).
    },
    "featured_items": {
        "label_ar": "الخدمات",
        "fields": {
            "heading_ar": {"kind": "text",   "label_ar": "العنوان"},
            "limit":      {"kind": "number", "label_ar": "عدد الخدمات المعروضة"},
        },
    },
    "hours": {
        "label_ar": "ساعات العمل",
        "fields": {
            "heading_ar": {"kind": "text", "label_ar": "العنوان"},
            "rows": {
                "kind": "repeatable", "label_ar": "أيام العمل (احتياطي — يُتجاهل إذا كانت ساعات العمل مضبوطة)",
                "fields": {
                    "day_ar":   {"kind": "text",    "label_ar": "اليوم"},
                    "open_ar":  {"kind": "text",    "label_ar": "من"},
                    "close_ar": {"kind": "text",    "label_ar": "إلى"},
                    "closed":   {"kind": "boolean", "label_ar": "مغلق"},
                },
            },
            # Real, structural -- but dead for any tenant with Client.config.working_hours set
            # (HoursSection.jsx prioritizes that), per
            # ALZABT_HOMEPAGE_SECTION_SETTINGS_CONTRACT.md S3. Declared for schema completeness,
            # not because a Dashboard editor for it is currently planned.
        },
    },
    "location": {
        "label_ar": "الموقع",
        "fields": {
            "heading_ar": {"kind": "text",     "label_ar": "العنوان"},
            "para_ar":    {"kind": "textarea", "label_ar": "النص"},
            "maps_url":   {"kind": "url",       "label_ar": "رابط الخريطة (Google Maps Embed)"},
            "tags":       {"kind": "repeatable", "item_kind": "text", "label_ar": "الوسوم (مثلاً: موقف سيارات، قرب المول)"},
        },
    },
    "cta": {
        "label_ar": "دعوة الحجز (CTA)",
        "fields": {
            "text_ar":    {"kind": "text", "label_ar": "العنوان"},
            "subtext_ar": {"kind": "text", "label_ar": "النص التوضيحي"},
            "button_ar":  {"kind": "text", "label_ar": "نص الزر"},
            "link":       {"kind": "url",  "label_ar": "رابط الزر"},
            "variant": {
                "kind": "select", "label_ar": "شكل القسم",
                "options": [
                    {"value": "",             "label_ar": "عادي"},
                    {"value": "banner",       "label_ar": "بانر ذهبي كامل"},
                    {"value": "promo-strip",  "label_ar": "شريط مضغوط"},
                ],
            },
        },
    },
    "why_choose_us": {
        "label_ar": "ليش تختارنا",
        "fields": {
            "heading_ar": {"kind": "text", "label_ar": "العنوان"},
            "items": {
                "kind": "repeatable", "label_ar": "العناصر",
                "fields": {
                    "icon_key": {
                        "kind": "select", "label_ar": "الأيقونة",
                        "options": [
                            {"value": "classic",       "label_ar": "قص عصري وكلاسيكي"},
                            {"value": "quick_booking", "label_ar": "حجز سريع"},
                            {"value": "pro_stylists",  "label_ar": "حلاقين محترفين"},
                            {"value": "luxury",        "label_ar": "أجواء فاخرة"},
                            {"value": "trusted",       "label_ar": "موثوق"},
                        ],
                    },
                    "title_ar": {"kind": "text",     "label_ar": "العنوان"},
                    "body_ar":  {"kind": "textarea", "label_ar": "النص"},
                },
            },
        },
    },
    # The 5 section types below are real (SECTION_MAP, DynamicPage.jsx) and real in RK's live
    # config (categories_grid/offers/testimonials/video_story/story_experience were never in
    # ALZABT_HOMEPAGE_SECTION_SETTINGS_CONTRACT.md's 9-section inventory) -- `label_ar` only,
    # preserving exactly their current Dashboard behavior (labeled row, no edit button). A real
    # field schema for any of these is a separate future decision, not implied by this Phase.
    "categories_grid":  {"label_ar": "التصنيفات",       "fields": {}},
    "offers":            {"label_ar": "العروض",           "fields": {}},
    "testimonials":      {"label_ar": "آراء العملاء",     "fields": {}},
    "video_story":       {"label_ar": "فيديو القصة",      "fields": {}},
    "story_experience":  {"label_ar": "تجربة القصة",      "fields": {}},
}


def get_section_schema(section_type: str) -> dict | None:
    return SECTION_SCHEMAS.get(section_type)


def get_repeatable_field_schema(section_type: str, field: str) -> dict | None:
    """Returns the field's own schema dict if it's a declared `kind: repeatable` field on that
    section, else None. TOS-005 Phase C's own gate before any repeatable-group route touches a
    field -- `{field}` is never trusted as arbitrary client input."""
    schema = SECTION_SCHEMAS.get(section_type)
    if schema is None:
        return None
    field_schema = schema["fields"].get(field)
    if field_schema is None or field_schema.get("kind") != "repeatable":
        return None
    return field_schema


def validate_repeatable_item(section_type: str, field: str, item) -> str | None:
    """Validates one item against its repeatable field's declared item shape -- `fields` for an
    object item (e.g. why_choose_us.items' {icon_key, title_ar, body_ar}), or `item_kind` for a
    bare-scalar item (e.g. location.tags' plain strings). Server-side, independent of any client,
    same discipline as validate_fields above (TOS-005 §4.1, Salman's condition 4)."""
    field_schema = get_repeatable_field_schema(section_type, field)
    if field_schema is None:
        return f"'{field}' is not a declared repeatable field on section '{section_type}'"
    sub_fields = field_schema.get("fields")
    item_kind = field_schema.get("item_kind")
    if sub_fields is not None:
        if not isinstance(item, dict):
            return f"Item must be an object with fields: {list(sub_fields.keys())}"
        for sub_key, sub_value in item.items():
            sub_schema = sub_fields.get(sub_key)
            if sub_schema is None:
                return f"Field '{sub_key}' is not declared for '{section_type}.{field}' items"
            err = _validate_value(sub_key, sub_value, sub_schema)
            if err:
                return err
    elif item_kind is not None:
        err = _validate_value(field, item, {"kind": item_kind})
        if err:
            return err
    return None


def validate_fields(section_type: str, fields: dict) -> str | None:
    """Returns an error message if invalid, else None. Server-side enforcement, independent of
    any client (TOS-005 S4.1, Salman's condition 4) -- called from content.py's
    update_section_fields before any write, so a raw API call bypassing the Dashboard entirely is
    rejected exactly the same way a Dashboard-originated one would be."""
    schema = SECTION_SCHEMAS.get(section_type)
    if schema is None:
        return f"Unknown section type: {section_type}"
    declared = schema["fields"]
    for key, value in fields.items():
        field_schema = declared.get(key)
        if field_schema is None:
            return f"Field '{key}' is not declared for section '{section_type}'"
        err = _validate_value(key, value, field_schema)
        if err:
            return err
    return None


def _validate_value(key: str, value, field_schema: dict) -> str | None:
    if value is None:
        return None  # clearing a field is always allowed
    kind = field_schema["kind"]
    if kind in ("text", "textarea", "url"):
        if not isinstance(value, str):
            return f"Field '{key}' must be a string"
    elif kind == "number":
        if not isinstance(value, (int, float)) or isinstance(value, bool):
            return f"Field '{key}' must be a number"
    elif kind == "boolean":
        if not isinstance(value, bool):
            return f"Field '{key}' must be a boolean"
    elif kind == "select":
        options = [opt["value"] for opt in field_schema.get("options", [])]
        if options and value not in options:
            return f"Field '{key}' must be one of {options}"
    elif kind == "repeatable":
        if not isinstance(value, list):
            return f"Field '{key}' must be a list"
        sub_fields = field_schema.get("fields")
        item_kind = field_schema.get("item_kind")
        for i, item in enumerate(value):
            if sub_fields is not None:
                if not isinstance(item, dict):
                    return f"Field '{key}[{i}]' must be an object"
                for sub_key, sub_value in item.items():
                    sub_schema = sub_fields.get(sub_key)
                    if sub_schema is None:
                        return f"Field '{key}[{i}].{sub_key}' is not declared"
                    err = _validate_value(f"{key}[{i}].{sub_key}", sub_value, sub_schema)
                    if err:
                        return err
            elif item_kind is not None:
                err = _validate_value(f"{key}[{i}]", item, {"kind": item_kind})
                if err:
                    return err
    elif kind == "group":
        # A single nested object, not a list -- e.g. a hypothetical hero.cta = {label, url}.
        # Recurses through the same _validate_value used everywhere else, so a group's sub-fields
        # get the identical type checking any top-level or repeatable-item field gets.
        sub_fields = field_schema.get("fields", {})
        if not isinstance(value, dict):
            return f"Field '{key}' must be an object with fields: {list(sub_fields.keys())}"
        for sub_key, sub_value in value.items():
            sub_schema = sub_fields.get(sub_key)
            if sub_schema is None:
                return f"Field '{sub_key}' is not declared for group field '{key}'"
            err = _validate_value(f"{key}.{sub_key}", sub_value, sub_schema)
            if err:
                return err
    elif kind == "media":
        # Declared for discovery only (GET /content/sections/schema) -- never writable through
        # this generic path. A media field's real value always goes through its own dedicated
        # upload endpoint (e.g. PATCH /admin/media/hero-image), never `update_section_fields`.
        return (
            f"Field '{key}' is a media field and cannot be set via section fields -- "
            f"it is managed by its own dedicated media endpoint"
        )
    return None
