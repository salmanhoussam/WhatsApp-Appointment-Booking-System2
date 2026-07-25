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
  video_story     — sequence of video content-blocks that lead the page's
                     narrative (not a gallery); each block carries a
                     future-ready metadata model (title/description/CTA/
                     target category) unused by the v1 renderer
  story_experience — scroll-driven narrative video, two rendering modes
                     chosen by which data fields are present:
                       (a) frame-sequence canvas (frame_base_url + frame_count):
                           real video frames painted on <canvas>, for footage
                           with continuous camera motion that needs true
                           scroll-scrubbing.
                       (b) native video (video_url + video_duration_sec):
                           a real <video> plays forward between chapters and
                           pauses+snaps on each chapter's own [holdStart,
                           holdEnd) scroll range -- for footage that's already
                           discrete/captioned scenes rather than continuous
                           motion (added 2026-07-25, RK Barber Story
                           Experience Lab round 5).
                     Either mode: the frame/video plays freely between
                     chapters, then FREEZES across each chapter's own
                     [holdStart, holdEnd) scroll range while that chapter's
                     overlay text/CTA fades in, holds, and fades out --
                     directed as a cinematic play/pause sequence, not a
                     continuously scrubbing video.

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
    video_story     = "video_story"
    story_experience = "story_experience"


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
