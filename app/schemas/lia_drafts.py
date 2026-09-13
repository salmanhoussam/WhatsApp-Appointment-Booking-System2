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

from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

# The intents Phase 1 can actually execute. A model returning anything else is refused rather
# than best-guessed -- "عدّل" and "شيل" are real requests with real contracts, and the plan's
# §12 keeps them out of the first slice on purpose (a delete has no undo here).
LiaIntent = Literal["create_service"]

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

    intent:     LiaIntent
    confidence: Literal["high", "medium", "low"]
    # Partial on purpose: the model fills what the owner actually said. Validation of the full
    # draft happens only once the gaps are filled, which is why this is a loose dict here and a
    # LiaServiceDraft later.
    data:       dict = Field(default_factory=dict)
    unresolved: list[str] = Field(default_factory=list)
