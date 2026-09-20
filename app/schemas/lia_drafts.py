"""
Lia's data-entry contracts — the layer that decides what the AI said is ACCEPTABLE.

Established 2026-09-13, Salman's decision, Phase 1 of the Lia owner data-entry capability.
Full architecture: `.claudedocs/plans/lia-owner-data-entry.md`.

THE ONE PRINCIPLE THESE FILES EXIST TO ENFORCE: the AI produces a candidate draft, and Pydantic
is the authority. Not the model's confidence, not its phrasing, not how sure it sounds --
`model_validate_json` either accepts the shape or the request stops. That pattern is not invented
here: `app/api/v1/onboarding.py` has been doing exactly this in production since before Lia
existed (`ClientExtract.model_validate_json(content)`), and this inherits it rather than
re-deriving it.

TWO FIELDS ARE REQUIRED HERE THAT ARE OPTIONAL IN THE API, and that difference is the whole point.
`CatalogServiceCreate` lets `price` be None and defaults `duration_min` to 30. Those defaults are
correct for a dashboard form, where a human sees the empty box. Through a chat they are silent
data loss: an owner saying "ضيف كيراتين" and nothing else would create a free 30-minute keratin
treatment with no one noticing. Measured on real tenants the same day: 13 of 13 services carry no
description and no image, 4 of 4 barbers carry no photo, phone or description -- the "empty tables"
Salman named. Lia refuses to add to that pile: a missing price or duration becomes a QUESTION, not
a default.

WHAT IS DELIBERATELY NOT HERE:
  * `image_url` -- an image is Phase 2, and its purpose classification (DATA_SOURCE vs
    ENTITY_ASSET) is the thing that must be decided before any image is stored.
  * `category_id` -- the AI must never produce a database id. The backend resolves the category
    against the CURRENT tenant, and asks when it cannot.
  * `working_hours` / `variants` -- structured nested shapes whose errors break availability
    silently. Named as out of scope in the plan rather than left to a model's judgement.
"""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

# What a MESSAGE may ask the platform to do. A model returning anything else is refused rather
# than best-guessed -- "عدّل" and "شيل" are real requests with real contracts, and the plan's
# §12 keeps them out of the first slice on purpose (a delete has no undo here).
#
# `create_product` added 2026-09-17 (S3). This symbol is the VOCABULARY -- the set of operation
# names a draft may carry and `lia_operations` may be asked for. It is deliberately NOT the type
# of any single extraction's `intent`: each extraction class pins its own one-value Literal
# instead (see `LiaExtraction` and `LiaProductExtraction`), because the two use DIFFERENT prompts
# with different required fields. Typing both against this union would let the service prompt
# return `create_product` carrying a `duration_min`, and let the product prompt claim a service --
# a mismatch between the operation AUTHORISED before the model call and the one the model names.
# Pinning per class makes that mismatch structurally impossible rather than guarded against.
# `create_reservation` added 2026-09-18 (T4). Same rule as above: it is vocabulary, never the
# type of one extraction's `intent` -- the reservation prompt pins its own single value.
LiaIntent = Literal["create_service", "create_product", "create_reservation"]

# Currencies the shops actually price in. Anything else is a question, not a conversion -- Lia
# does no FX, ever.
_CURRENCIES = {"USD", "LBP"}


class LiaServiceDraft(BaseModel):
    """One proposed service, as extracted and BEFORE any write.

    Every bound below is a real product rule rather than defensive padding:

    - `name_ar` 2..200   matches `CatalogServiceCreate`'s own column, and 2 rejects a stray letter.
    - `price` > 0        a zero or negative price is never what an owner meant; it is a
                         mis-extraction. Free services exist, but they are a deliberate dashboard
                         choice, not something to infer from speech.
    - `duration_min`     5..480, and a multiple of 5. A barber books in 15/30/60; "37 minutes" is
                         a transcription artefact, not an appointment length. 480 caps a full day.
    """

    name_ar:        str = Field(min_length=2, max_length=200)
    price:          float = Field(gt=0, le=100_000)
    duration_min:   int = Field(ge=5, le=480)
    currency:       str = "USD"
    name_en:        Optional[str] = Field(default=None, max_length=200)
    description_ar: Optional[str] = Field(default=None, max_length=1000)

    @field_validator("name_ar", "name_en", "description_ar")
    @classmethod
    def _collapse(cls, v: Optional[str]) -> Optional[str]:
        """Whitespace only. A service's own name is not ours to rewrite beyond that."""
        if v is None:
            return None
        cleaned = " ".join(v.split())
        return cleaned or None

    @field_validator("currency")
    @classmethod
    def _known_currency(cls, v: str) -> str:
        up = (v or "USD").strip().upper()
        if up not in _CURRENCIES:
            raise ValueError(f"currency must be one of {sorted(_CURRENCIES)}")
        return up

    @field_validator("duration_min")
    @classmethod
    def _five_minute_grid(cls, v: int) -> int:
        if v % 5:
            raise ValueError("duration_min must be a multiple of 5")
        return v


class LiaExtraction(BaseModel):
    """The whole of what the model is allowed to return.

    `unresolved` is the model's own admission of what it could not read, and it is load-bearing:
    it is how "the owner did not say a price" reaches the code as a fact instead of arriving as a
    plausible number. A model that fills a gap silently is the failure this field exists to make
    visible -- so an extraction listing `price` as unresolved is ACCEPTED and turns into a
    question, while one that invents 25 and says nothing is indistinguishable from a real answer.

    `extra="forbid"` so a model that invents a field is refused rather than silently trimmed.
    """

    model_config = {"extra": "forbid"}

    # ONE value, not `LiaIntent`. See that symbol's own note: this class is fed by the SERVICE
    # prompt, so the only intent it may carry is the service one.
    intent:     Literal["create_service"]
    confidence: Literal["high", "medium", "low"]
    # Partial on purpose: the model fills what the owner actually said. Validation of the full
    # draft happens only once the gaps are filled, which is why this is a loose dict here and a
    # LiaServiceDraft later.
    data:       dict = Field(default_factory=dict)
    unresolved: list[str] = Field(default_factory=list)


class LiaProductDraft(BaseModel):
    """One proposed PRODUCT, as extracted and BEFORE any write. S3, 2026-09-17.

    THE DIFFERENCE FROM `LiaServiceDraft` IS ONE ABSENCE, and it is the entire point: there is no
    `duration_min`. A product is not booked, it is sold -- `CatalogItem` has no duration column
    and no foreign key from `Reservation`, which is exactly what the 2026-09-16 catalog
    investigation measured. `scripts/test_lia_product_s1.py` asserts that the real write path
    writes no duration field, so this schema and that write agree by construction rather than by
    convention.

    Bounds are the service draft's, deliberately identical where the meaning is identical:

    - `name_ar` 2..200   matches `CatalogItemCreate`'s own column.
    - `price` > 0        a zero or negative price is a mis-extraction, never an intention. An
                         owner who really gives something away sets that in the dashboard.

    NO `metadata`, NO `is_featured`, NO `sort_order`, NO `image_url`: every one of those exists on
    the write path and NONE of them may come from a chat message. The service layer's own defaults
    own them, which is the rule S1 verified (`isActive` is set by the SERVICE, not by the caller).
    """

    name_ar:        str = Field(min_length=2, max_length=200)
    price:          float = Field(gt=0, le=100_000)
    currency:       str = "USD"
    name_en:        Optional[str] = Field(default=None, max_length=200)
    description_ar: Optional[str] = Field(default=None, max_length=1000)

    @field_validator("name_ar", "name_en", "description_ar")
    @classmethod
    def _collapse(cls, v: Optional[str]) -> Optional[str]:
        """Whitespace only. A product's own name is not ours to rewrite beyond that."""
        if v is None:
            return None
        cleaned = " ".join(v.split())
        return cleaned or None

    @field_validator("currency")
    @classmethod
    def _known_currency(cls, v: str) -> str:
        up = (v or "USD").strip().upper()
        if up not in _CURRENCIES:
            raise ValueError(f"currency must be one of {sorted(_CURRENCIES)}")
        return up


class LiaProductExtraction(BaseModel):
    """What the PRODUCT prompt is allowed to return. S3, 2026-09-17.

    A second class rather than a widened `LiaExtraction`, for the reason `LiaIntent` records: the
    operation is authorised BEFORE the model is called, so the model must not be able to name a
    different one. Pinning `intent` to a single value makes the two agree structurally -- the same
    device `LiaEditPatch` already uses with `edit_draft`.

    `extra="forbid"` so a model that invents a field is refused rather than silently trimmed --
    and here that matters more than for a service: the invented field an owner would never see is
    exactly the kind that reaches a column.
    """

    model_config = {"extra": "forbid"}

    intent:     Literal["create_product"]
    confidence: Literal["high", "medium", "low"]
    data:       dict = Field(default_factory=dict)
    unresolved: list[str] = Field(default_factory=list)


class LiaDraftChanges(BaseModel):
    """ROLE: the PARTIAL set of fields this one instruction asked to change. Never a draft.

    Read the name as "the changes", not as "the draft's changeable fields" -- it carries only what
    moved, and an absent field means the owner did not mention it. `applied()` is the only way
    values leave here, and it drops every unset field, so a one-field instruction yields a
    one-key dict. Nothing in this class can produce a complete draft.

    The fields an edit instruction actually asked to change -- and ONLY those.

    EVERY FIELD IS OPTIONAL, and that is the whole safety property. A model asked to return the
    full draft after "غيّر الاسم لبروتين" will happily re-emit a price and a duration too, and
    nothing downstream can tell a re-emitted 30 from a freshly invented one. A partial patch makes
    "the owner did not mention the price" structurally representable: the field is simply absent.

    THE BOUNDS ARE REPEATED FROM `LiaServiceDraft` RATHER THAN INHERITED, deliberately. That model
    requires `price` and `duration_min` because a complete draft must carry both; this one cannot
    require anything because it carries only what changed. Inheriting either way would mean
    weakening the requirement there or imposing it here -- so the real product rules (price > 0,
    duration 5..480 on a 5-minute grid, USD/LBP only) are restated. The authority is still
    `LiaServiceDraft`: a patch is validated, merged, and then the WHOLE draft is validated again
    through the existing `_advance`.

    An EMPTY patch is a valid shape and means "nothing was understood". Deciding what to do about
    that is the caller's job, not the schema's -- so it becomes a question rather than a silent
    no-op.
    """

    model_config = {"extra": "forbid"}

    name_ar:        Optional[str] = Field(default=None, min_length=2, max_length=200)
    price:          Optional[float] = Field(default=None, gt=0, le=100_000)
    duration_min:   Optional[int] = Field(default=None, ge=5, le=480)
    currency:       Optional[str] = None
    name_en:        Optional[str] = Field(default=None, max_length=200)
    description_ar: Optional[str] = Field(default=None, max_length=1000)

    @field_validator("name_ar", "name_en", "description_ar")
    @classmethod
    def _collapse(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = " ".join(v.split())
        return cleaned or None

    @field_validator("currency")
    @classmethod
    def _known_currency(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        up = v.strip().upper()
        if up not in _CURRENCIES:
            raise ValueError(f"currency must be one of {sorted(_CURRENCIES)}")
        return up

    @field_validator("duration_min")
    @classmethod
    def _five_minute_grid(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v % 5:
            raise ValueError("duration_min must be a multiple of 5")
        return v

    def applied(self) -> dict:
        """Only the fields that were actually set, ready to merge onto a draft."""
        return {k: v for k, v in self.model_dump().items() if v is not None}


class LiaEditPatch(BaseModel):
    """ROLE: the ENVELOPE the model returns for one edit -- intent, confidence, and the changes.

    The partial data itself lives in `changes` (a `LiaDraftChanges`); this class adds the three
    things the code needs around it: which operation was meant, how sure the model was, and what
    it could not read. It is not itself the patch payload.

    One edit instruction against a draft that is already on the owner's screen.

    `edit_draft` IS NOT IN `LiaIntent`, and that separation is deliberate rather than an omission.
    `LiaIntent` is what a MESSAGE can ask the platform to do; this is an operation inside a draft
    that already exists -- it creates nothing, writes nothing, and is unreachable without a live
    draft. Folding it into `LiaIntent` would let a first message claim `edit_draft` with no draft
    to edit.

    `confidence` and `unresolved` carry the same load they carry in `LiaExtraction`: they are how
    "I could not tell what he wanted changed" arrives as a fact instead of as a plausible guess.
    "خليها أحسن" is not an edit, and it must become a question.
    """

    model_config = {"extra": "forbid"}

    intent:     Literal["edit_draft"]
    confidence: Literal["high", "medium", "low"]
    changes:    LiaDraftChanges = Field(default_factory=LiaDraftChanges)
    unresolved: list[str] = Field(default_factory=list)


# ── Reservations (T4, 2026-09-18) ─────────────────────────────────────────────

# The answer an owner gives when the customer has no number. Salman's decision, 2026-09-18: a
# walk-in ("زبون طيار") is the barber's bread and butter, and refusing to record one because a
# phone is missing would make the owner hate the tool. R-1 still holds in full -- Lia ASKS, and
# never invents a number that could belong to a real person.
#
# 🔴 WHY THIS EXACT SHAPE, MEASURED RATHER THAN CHOSEN:
#   * 🔴 CORRECTION (2026-09-18, found while writing the live-evidence reader). This comment
#     first said `Reservation.customerId` is NOT nullable. THAT WAS WRONG: the non-nullable
#     `customerId String @db.Uuid` I read is on `Booking` (schema.prisma:352), a different model.
#     `Reservation.customerId` is `String?` (schema.prisma:~62) and the schema's own comment says
#     pre-migration rows correctly carry null.
#     What is still true, and is the REAL reason a placeholder is used: `create_reservation`
#     takes `customer_phone: str` as a REQUIRED parameter and always runs a find-or-create from
#     it. So a null customer link is possible in the DATABASE but not through the shared service
#     as written -- reaching it would need a guarded branch in a write path used by the website,
#     the dashboard and the customer WhatsApp flow. That is a separate decision, not a detail.
#   * `create_reservation` runs `normalize_for_storage(phone) or phone` before a find-or-create.
#     Measured: `normalize_for_storage("walkin-123")` returns **"961123"** -- a plausible Lebanese
#     number. Any placeholder containing digits can therefore be rewritten into something that
#     could collide with a real customer. `WALK_IN` normalises to None and is stored verbatim.
#   * It is deliberately not a number at all, so it can never be dialled, matched against an
#     inbound sender, or mistaken for data.
WALK_IN_PHONE = "WALK_IN"


class LiaReservationDraft(BaseModel):
    """One proposed RESERVATION, as extracted and BEFORE any write. T4, 2026-09-18.

    IT CARRIES NAMES, NOT IDS, and that is the same rule the product path already follows for its
    category: the model never emits a database id. `service_name` and `barber_name` are resolved
    against the CURRENT tenant's real rows by the backend, and an unresolvable name becomes a
    question rather than a guess.

    `reserved_at` IS A NAIVE LOCAL WALL CLOCK, deliberately, and this is the single most
    dangerous field in the file. The platform stores local wall-clock time wearing a UTC label --
    proved by construction on 2026-09-17, not assumed: `_check_working_hours` reads the RAW
    `%H:%M` against the shop's local hours and 52 of 52 production rows fall inside 09:00-21:00,
    which is impossible for a true UTC instant in a UTC+3 shop. So the rule is **DO NOT CONVERT**.
    An aware datetime from the model has its tzinfo DROPPED rather than converted -- «الساعة ٤»
    means four o'clock on the shop's wall, and turning it into an instant would move every
    appointment by the tenant's real offset.

    NO `is_past` FIELD. Whether this already happened is derived by comparing `reserved_at` with
    the clock, in ONE place in the code. Letting the model declare it would create a second place
    for «مبارح» and «بكرا» to disagree.
    """

    customer_name:  str = Field(min_length=2, max_length=120)
    # Required, and `WALK_IN_PHONE` is the one non-number it accepts. Optional would let a silent
    # omission through; requiring it makes "he has no number" an explicit thing the owner SAID.
    customer_phone: str = Field(min_length=3, max_length=32)
    reserved_at:    datetime
    service_name:   str = Field(min_length=2, max_length=200)
    barber_name:    Optional[str] = Field(default=None, max_length=120)
    notes:          Optional[str] = Field(default=None, max_length=1000)

    @field_validator("customer_name", "service_name", "barber_name", "notes")
    @classmethod
    def _collapse(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = " ".join(v.split())
        return cleaned or None

    @field_validator("reserved_at")
    @classmethod
    def _wall_clock(cls, v: datetime) -> datetime:
        """Drop any offset WITHOUT converting — see the class docstring."""
        return v.replace(tzinfo=None) if v.tzinfo is not None else v


class LiaReservationExtraction(BaseModel):
    """What the RESERVATION prompt is allowed to return. T4, 2026-09-18.

    A fourth class rather than a widened one, for the reason `LiaIntent` records: the operation is
    authorised BEFORE the model is called, so the model must not be able to name a different one.
    """

    model_config = {"extra": "forbid"}

    intent:     Literal["create_reservation"]
    confidence: Literal["high", "medium", "low"]
    data:       dict = Field(default_factory=dict)
    # T5 (2026-09-20). MORE THAN ONE CUSTOMER IN ONE MESSAGE — «اليوم الصبح حلقت لعلي ومحمد
    # وأحمد». The FIRST stays in `data`, so a single-appointment message keeps byte-identical
    # shape and every existing reader is untouched; the rest arrive here in the order they were
    # said. Declared rather than tolerated: the class forbids extra keys, so an undeclared field
    # would make the whole extraction invalid instead of silently arriving.
    #
    # WHY THIS EXISTS AT ALL: the prompt used to answer `low` for a second appointment, and R1
    # (2026-09-19) made the server stop obeying `low` for reservations -- so the second one was
    # being dropped in silence. A defect we created with our eyes open, named as a risk the day
    # we chose it.
    extra:      list[dict] = Field(default_factory=list)
    unresolved: list[str] = Field(default_factory=list)


class LiaReservationChanges(BaseModel):
    """The PARTIAL set of reservation fields one edit instruction asked to change. 2026-09-19.

    Same safety property as `LiaDraftChanges`: every field is optional, so "he did not mention the
    barber" is an ABSENT field, never a re-emitted value. No ids, no price, no duration -- the
    server re-resolves names to this shop's real rows and validates the whole draft again.
    """

    model_config = {"extra": "forbid"}

    customer_name:  Optional[str] = Field(default=None, max_length=120)
    customer_phone: Optional[str] = Field(default=None, max_length=32)
    reserved_at:    Optional[str] = Field(default=None, max_length=40)
    service_name:   Optional[str] = Field(default=None, max_length=200)
    barber_name:    Optional[str] = Field(default=None, max_length=120)

    def applied(self) -> dict:
        """Only the fields that were actually set, ready to merge onto a draft."""
        return {k: v for k, v in self.model_dump().items() if v not in (None, "")}


class LiaReservationEditPatch(BaseModel):
    """One edit instruction against a RESERVATION draft already on the owner's screen. 2026-09-19.

    A class of its own rather than a widened `LiaEditPatch`, for the reason `LiaIntent` records:
    the operation is known before the model is called, and the service edit contract has no
    reservation fields to put «خلّيه مع زياد» into.
    """

    model_config = {"extra": "forbid"}

    intent:     Literal["edit_reservation"]
    confidence: Literal["high", "medium", "low"]
    changes:    LiaReservationChanges = Field(default_factory=LiaReservationChanges)
    unresolved: list[str] = Field(default_factory=list)
