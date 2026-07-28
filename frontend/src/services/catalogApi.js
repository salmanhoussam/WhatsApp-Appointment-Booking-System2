import publicApi from '../utils/publicApi'

// GET every category across every active capability, correctly attributed via each category's own
// real `module_key` — no tenant-wide moduleKey collapse (TOS-004, Capability Resolution Layer).
// Backed by the same generic endpoint the Admin Catalog tab already uses successfully when it
// omits the module_key filter — confirmed real, not a new backend behavior.
export function fetchAllCategories(slug) {
  return publicApi.get(`/${slug}/catalog/categories`, { params: { client_slug: slug } })
}

// GET categories — module-aware endpoint routing
export function fetchCategories(moduleKey, slug) {
  const base = { client_slug: slug }
  if (moduleKey === 'restaurant')
    return publicApi.get('/restaurant/menu/categories', { params: base })
  if (moduleKey === 'store')
    return publicApi.get('/store/categories', { params: base })
  // catalog module: slug in path, module_key as query param for disambiguation
  return publicApi.get(`/${slug}/catalog/categories`, { params: { ...base, module_key: moduleKey } })
}

// GET items for a category — module-aware endpoint routing
export function fetchItems(moduleKey, slug, categoryId) {
  const base = { client_slug: slug }
  if (moduleKey === 'restaurant')
    return publicApi.get(`/restaurant/menu/categories/${categoryId}/items`, { params: base })
  if (moduleKey === 'store')
    return publicApi.get('/store/products', { params: { ...base, category_id: categoryId } })
  return publicApi.get(`/${slug}/catalog/categories/${categoryId}/items`, { params: base })
}

// GET a single item's full detail — module-aware endpoint routing.
// Only the 'store' branch is verified/real today (GET /store/products/{id},
// confirmed live 2026-07-21). No single-item endpoint exists for 'restaurant'
// yet — do not guess a path for it until one is confirmed real.
export function fetchItem(moduleKey, slug, itemId) {
  const base = { client_slug: slug }
  if (moduleKey === 'store')
    return publicApi.get(`/store/products/${itemId}`, { params: base })
  return Promise.reject(new Error(`fetchItem: no confirmed single-item endpoint for moduleKey "${moduleKey}"`))
}
