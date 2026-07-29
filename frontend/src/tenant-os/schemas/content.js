/**
 * Content Capability — Schema.
 *
 * .claudedocs/architecture/capabilities/content.md (Content Capability contract),
 * .claudedocs/adr/TOS-002-editing-engine.md (Schema drives the generic renderer — Dashboard
 * draws it, AI reads it, API uses it, all from this one definition).
 * Deliberately a plain exported object, not a "Schema Registry" service — two Capability
 * fields don't justify that abstraction yet (Q7; reconfirmed in
 * .claudedocs/reviews/content-capability-review.md).
 *
 * `sectionType`/`dataField`/`apiPath`/`promptLabel` were previously duplicated in a second,
 * parallel `CONTENT_FIELDS` object inside `GenericAdminDashboard.jsx` — a real, present
 * duplication the architecture review caught (two descriptions of the same two fields,
 * neither reading the other). Merged into this one Schema instead; `CONTENT_FIELDS` deleted.
 * This is deduplication, not a new layer — nothing about how the Schema is consumed changed.
 *
 * `getCurrentValue`/`applyLocalUpdate`/`getPreviewPatch` (added Site Configuration Sprint 3,
 * Phase 3): each field owns how its own current value is read and how a successful save updates
 * local state and the live preview — `saveFieldValue` in `GenericAdminDashboard.jsx` calls these
 * generically and never branches on which Capability/field it's handling. See
 * `.claudedocs/evolution/capability-operations-model.md`.
 */

import { getSectionFieldValue, applySectionFieldUpdate, getSectionFieldPreviewPatch } from './sectionFieldHelpers'

export const contentSchema = {
  'hero.title': {
    type: 'text',
    label_ar: 'عنوان الهيرو',
    operations: ['UpdateField'],
    sectionType: 'hero',
    dataField:   'title_ar',
    apiField:    'title_ar', // content.py's PATCH body key -- happens to match dataField here
    apiPath:     '/content/hero-title',
    promptLabel: 'عنوان الهيرو (Content Capability — hero.title):',
    getCurrentValue:  getSectionFieldValue,
    applyLocalUpdate: applySectionFieldUpdate,
    getPreviewPatch:  getSectionFieldPreviewPatch,
  },
  'story.heading': {
    type: 'text',
    label_ar: 'عنوان قسم القصة',
    operations: ['UpdateField'],
    sectionType: 'story',
    dataField:   'heading_ar',
    apiField:    'heading_ar', // content.py's PATCH body key -- happens to match dataField here
    apiPath:     '/content/story-heading',
    promptLabel: 'عنوان قسم القصة (Content Capability — story.heading):',
    getCurrentValue:  getSectionFieldValue,
    applyLocalUpdate: applySectionFieldUpdate,
    getPreviewPatch:  getSectionFieldPreviewPatch,
  },
}
