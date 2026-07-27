/**
 * EditableRegion — a pure Contract, not a UI wrapper.
 *
 * Declares {capability, key, schema} and registers it into the shared Discovery registry.
 * It renders its children identically for a real visitor and for any editing context — it
 * has zero knowledge of whether a Dashboard, an AI Assistant, or anything else exists.
 * Overlay, Highlight, Selection, Hover, and Inspector behavior all belong to the Editing
 * Engine's Interface-side rendering (e.g. DynamicPage.jsx's click-capture effect), never to
 * this component — ratified in .claudedocs/reviews/editing-engine-review.md §1a (Finding 3).
 *
 * `display: contents` keeps the wrapper invisible to layout; the data-* attributes are the
 * only real "extra" this component adds to the DOM, and they carry no styling or behavior
 * of their own.
 *
 * See .claudedocs/adr/TOS-002-editing-engine.md.
 */
import { useEffect } from 'react'
import { registerRegion, unregisterRegion } from './discovery'

export default function EditableRegion({ capability, fieldKey, schema, children }) {
  useEffect(() => {
    registerRegion({ capability, key: fieldKey, schema })
    return () => unregisterRegion({ capability, key: fieldKey })
  }, [capability, fieldKey, schema])

  return (
    <span data-capability={capability} data-field-key={fieldKey} style={{ display: 'contents' }}>
      {children}
    </span>
  )
}
