import publicApi from '../utils/publicApi'

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
