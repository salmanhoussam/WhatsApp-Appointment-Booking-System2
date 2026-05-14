"""
app/schemas/page_content.py
Generic Page Builder — Content Schema v1

Validates the structure stored in Client.config["content"]:

  {
    "sections": [
      { "id": "s_...", "type": "hero", "order": 0, "data": { ... } }
    ],
    "template_key": "fashion-grid",
    "page_type": "showcase"
  }

Section types supported:
  hero            — title + subtitle + CTA + bg image/video
  story           — heading + body paragraphs + stats grid
  featured_items  — auto-pulls is_featured=True items from catalog
  categories_grid — auto-pulls catalog categories as visual tiles
  gallery         — freeform image upload grid
  location        — paragraph + maps_url + tag list
  cta             — full-width call-to-action banner

All section data is validated as Dict[str, Any] — content schema is
intentionally loose to allow fields to evolve without migrations.
The SectionType enum enforces the type discriminant.

Usage:
  from app.schemas.page_content import PageContent, PageSection

  content_raw = client.config.get("content", {})
  content = PageContent(**content_raw)          # raises ValidationError on bad input
  section_types = [s.type for s in content.sections]
"""

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ── Section type discriminant ─────────────────────────────────────────────────

class SectionType(str, Enum):
    hero            = "hero"
    story           = "story"
    featured_items  = "featured_items"
    categories_grid = "categories_grid"
    gallery         = "gallery"
    location        = "location"
    cta             = "cta"


# ── Individual section ────────────────────────────────────────────────────────

class PageSection(BaseModel):
    """
    One section in the page builder output.

    id         — client-generated uid (e.g. "s_1715900000_abc12")
    type       — discriminant from SectionType enum
    order      — 0-based display order; sections are sorted by this before rendering
    data       — type-specific payload, e.g. { title_ar, bg_image_url } for hero
    """
    id:    str
    type:  SectionType
    order: int                    = 0
    data:  Dict[str, Any]         = Field(default_factory=dict)


# ── Page-level content model ──────────────────────────────────────────────────

class PageContent(BaseModel):
    """
    Full page builder payload stored under Client.config["content"].

    sections     — ordered list of page sections (sorted by PageSection.order)
    template_key — layout template for DynamicPage.jsx:
                   fashion-grid | showcase | landing | food-cafe | normal
    page_type    — hint for the public renderer:
                   showcase | store | restaurant | services | landing
    """
    sections:     List[PageSection] = Field(default_factory=list)
    template_key: Optional[str]     = "normal"
    page_type:    Optional[str]     = "showcase"

    def sorted_sections(self) -> List[PageSection]:
        """Returns sections sorted by their order field."""
        return sorted(self.sections, key=lambda s: s.order)


# ── Config wrapper (subset of Client.config) ─────────────────────────────────

class PageContentConfig(BaseModel):
    """
    Subset of Client.config that carries the page-builder payload.
    Use this for strict validation when reading config.content from DB.

    class Config extra="allow" lets all other config keys pass through
    (e.g. active_services, currency) without being stripped.
    """
    content: Optional[PageContent] = None

    model_config = {"extra": "allow"}


# ── Helper ────────────────────────────────────────────────────────────────────

def parse_page_content(config: Dict[str, Any]) -> Optional[PageContent]:
    """
    Safe parser — returns PageContent or None (never raises).

    Usage in routes/services:
      content = parse_page_content(client.config or {})
      if content:
          sections = content.sorted_sections()
    """
    raw = config.get("content")
    if not raw:
        return None
    try:
        return PageContent(**raw)
    except Exception:
        return None
