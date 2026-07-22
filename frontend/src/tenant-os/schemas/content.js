/**
 * Content Capability — Schema (Sprint 1 scope: hero.title only).
 *
 * TENANT_OS_PLAN.md §13 (Content Capability contract), §14 (Schema drives the generic
 * renderer — Dashboard draws it, AI reads it, API uses it, all from this one definition).
 * Deliberately a plain exported object, not a "Schema Registry" service — one Capability's
 * one field doesn't justify that abstraction yet (Q7).
 */

export const contentSchema = {
  'hero.title': {
    type: 'text',
    label_ar: 'عنوان الهيرو',
    operations: ['UpdateField'],
  },
  'story.heading': {
    type: 'text',
    label_ar: 'عنوان قسم القصة',
    operations: ['UpdateField'],
  },
}
