/**
 * useImageUpload.js — Phase 52.5
 *
 * Uploads a single image to POST /api/v1/admin/upload/
 * Handles auth, FormData construction, progress, and error state.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   const { upload, uploading, error, reset } = useImageUpload()
 *
 *   // Catalog item image
 *   const { url, image_id } = await upload(file, {
 *     context:     'catalog_item',
 *     category_id: 'uuid',
 *     item_id:     'uuid',
 *   })
 *
 *   // Hero / Logo / Story page image
 *   const { url } = await upload(file, { context: 'page_hero' })
 *   const { url } = await upload(file, { context: 'page_logo' })
 *
 *   // Booking unit images
 *   const { url, image_id } = await upload(file, { context: 'unit_cover', unit_id: 'uuid' })
 *   const { url, image_id } = await upload(file, { context: 'unit_gallery', unit_id: 'uuid' })
 *
 * ── Valid contexts ─────────────────────────────────────────────────────────────
 *   catalog_item  → requires category_id + item_id
 *   page_hero     → no extra ids
 *   page_logo     → no extra ids
 *   page_story    → no extra ids
 *   page_demo     → no extra ids
 *   unit_cover    → requires unit_id
 *   unit_gallery  → requires unit_id
 *
 * ── Returns from upload() ──────────────────────────────────────────────────────
 *   { url: string, image_id: string|null }
 *   Throws on network/server error.
 */

import { useState, useCallback } from 'react'
import adminApi from '../utils/admin.config'

const VALID_CONTEXTS = [
  'catalog_item',
  'page_hero', 'page_logo', 'page_story', 'page_demo',
  'unit_cover', 'unit_gallery',
]

export default function useImageUpload() {
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState(null)

  const reset = useCallback(() => setError(null), [])

  const upload = useCallback(async (file, options = {}) => {
    const {
      context,
      category_id = null,
      item_id     = null,
      unit_id     = null,
      caption_ar  = null,
      caption_en  = null,
    } = options

    if (!file) throw new Error('No file provided')
    if (!VALID_CONTEXTS.includes(context)) {
      throw new Error(`Invalid context '${context}'. Valid: ${VALID_CONTEXTS.join(', ')}`)
    }

    setUploading(true)
    setError(null)

    try {
      const form = new FormData()
      form.append('file', file)
      form.append('context', context)
      if (category_id) form.append('category_id', category_id)
      if (item_id)     form.append('item_id',     item_id)
      if (unit_id)     form.append('unit_id',     unit_id)
      if (caption_ar)  form.append('caption_ar',  caption_ar)
      if (caption_en)  form.append('caption_en',  caption_en)

      const res = await adminApi.post('/upload/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      return { url: res.data.url, image_id: res.data.image_id ?? null }
    } catch (err) {
      const msg = err?.response?.data?.detail
        ?? err?.response?.data?.error?.message
        ?? err?.message
        ?? 'فشل رفع الصورة'
      setError(msg)
      throw err
    } finally {
      setUploading(false)
    }
  }, [])

  return { upload, uploading, error, reset }
}
