/**
 * Media Capability — Schema.
 *
 * .claudedocs/architecture/capabilities/media.md (Media Capability contract: "Upload image/video
 * into a specific context (hero, logo, product, unit gallery)"), .claudedocs/adr/
 * TOS-002-editing-engine.md (Schema drives the generic renderer).
 *
 * `uploadContext` maps to the existing, real `app/api/v1/admin/upload.py` FOLDER_MAP/
 * IMAGE_TYPE_MAP context key — Media reuses the real upload endpoint for the actual file
 * transfer (Design Principle 2: prefer existing capability over new infrastructure); this
 * Schema's `apiPath` is only the second step, writing the already-uploaded URL into the
 * right place.
 *
 * `getCurrentValue`/`applyLocalUpdate`/`getPreviewPatch` (Site Configuration Sprint 3, Phase 3):
 * shared with Content via `sectionFieldHelpers.js` since this field lives in the identical
 * `content.sections` shape — see that file's own header for why.
 */

import { getSectionFieldValue, applySectionFieldUpdate, getSectionFieldPreviewPatch } from './sectionFieldHelpers'

export const mediaSchema = {
  'hero.bg_image': {
    type: 'image',
    label_ar: 'صورة خلفية الهيرو',
    operations: ['ReplaceMedia'],
    sectionType:   'hero',
    dataField:     'bg_image_url',
    apiField:      'image_url', // media.py's PATCH body key -- distinct from dataField
                                 // (the section.data key); Content's two fields happen to
                                 // reuse the same name for both, Media's route doesn't.
    apiPath:       '/media/hero-image',
    uploadContext: 'page_hero',
    getCurrentValue:  getSectionFieldValue,
    applyLocalUpdate: applySectionFieldUpdate,
    getPreviewPatch:  getSectionFieldPreviewPatch,
  },
}
