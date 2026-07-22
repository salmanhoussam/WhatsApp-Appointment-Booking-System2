/**
 * Media Capability — Schema.
 *
 * TENANT_OS_PLAN.md §13 (Media Capability contract: "Upload image/video into a specific
 * context (hero, logo, product, unit gallery)"), §14 (Schema drives the generic renderer).
 *
 * `uploadContext` maps to the existing, real `app/api/v1/admin/upload.py` FOLDER_MAP/
 * IMAGE_TYPE_MAP context key — Media reuses the real upload endpoint for the actual file
 * transfer (Design Principle 2: prefer existing capability over new infrastructure); this
 * Schema's `apiPath` is only the second step, writing the already-uploaded URL into the
 * right place.
 */

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
  },
}
