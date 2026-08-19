/**
 * Shared read/write helpers for any schema field that lives inside
 * `config.content.sections[type].data[field]` — the shape Content's fields and Media's
 * `hero.bg_image` both already use. Extracted here once a second Capability (Media) needed the
 * identical shape, mirroring `content_sections_repo.py`'s own extraction on the backend for the
 * same reason (content_service.py's header comment: "extracted once a second Capability needed
 * the identical shape").
 *
 * Each function takes `field` (the schema entry itself) so one shared implementation serves every
 * entry generically — no capability-specific branching lives here or in the caller
 * (`GenericAdminDashboard.jsx`'s `saveFieldValue`).
 */

export function getSectionFieldValue(settings, field) {
  return settings?.config?.content?.sections
    ?.find(s => s.type === field.sectionType)?.data?.[field.dataField] ?? ''
}

export function applySectionFieldUpdate(prevSettings, field, newValue) {
  const existingContent = prevSettings?.config?.content ?? {}
  const updatedSections = (existingContent.sections ?? []).map(s =>
    s.type === field.sectionType ? { ...s, data: { ...s.data, [field.dataField]: newValue } } : s
  )
  return {
    ...prevSettings,
    config: { ...(prevSettings?.config ?? {}), content: { ...existingContent, sections: updatedSections } },
  }
}

export function getSectionFieldPreviewPatch(updatedSettings) {
  // DynamicPage.jsx's PREVIEW_UPDATE handler does Object.assign(patch, e.data.config) — e.data
  // .config's own keys land directly on tenantConfig's top level. To patch tenantConfig.config,
  // e.data.config itself must be `{ config: updatedSettings.config }`, not the config object
  // directly.
  return { config: updatedSettings.config }
}

// TOS-005 Phase A (2026-08-19): a schema entry whose write path is the generic
// PATCH /content/sections/{type}/fields route (SectionFieldsUpdate's body shape,
// `{fields: {...}}`) supplies this as its `buildPatchBody`, instead of saveFieldValue's default
// flat `{[apiField]: newValue}` (still correct, unchanged, for entries with their own dedicated
// route — e.g. Media's hero.bg_image via /media/hero-image).
export function buildSectionFieldPatchBody(field, newValue) {
  return { fields: { [field.dataField]: newValue } }
}
