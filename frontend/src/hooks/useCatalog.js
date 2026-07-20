import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import useTenantConfig from './useTenantConfig'
import useTenantSlug from '../hooks/useTenantSlug'
import useGenericStore from '../pages/generic/store/useGenericStore'
import { fetchCategories, fetchItems } from '../services/catalogApi'

/**
 * useCatalog — domain hook for any catalog-driven page.
 *
 * Usage (generic page):
 *   const catalog = useCatalog()
 *   return <CatalogPage {...catalog} />
 *
 * Usage (custom tenant layout):
 *   const { categories, items, activeCategory, setActiveCategory } = useCatalog()
 *   return <MyTenantLayout items={items} />
 */
export default function useCatalog() {
  const { config, isLoading: configLoading } = useTenantConfig()
  const slug = useTenantSlug()
  const { moduleKey, setConfig: setStoreConfig } = useGenericStore()

  // TEMP RUNTIME TRACE — 2026-07-21, remove once beit-al-fakhar /store investigation closes
  console.log('[RUNTIME-TRACE] useCatalog render', { slug, moduleKey, configLoading, hasConfig: !!config })

  // Push config into store so moduleKey gets derived from active_services
  useEffect(() => {
    if (config && !configLoading) {
      console.log('[RUNTIME-TRACE] pushing config into store', { slug, active_services: config.active_services })
      setStoreConfig(config, config.active_services ?? [])
    }
  }, [config, configLoading, setStoreConfig])

  const [categories,    setCategories]    = useState([])
  const [activeCategory, setActiveCatRaw] = useState(null)
  const [items,         setItems]         = useState([])
  const [search,        setSearch]        = useState('')
  const [catsLoading,   setCatsLoading]   = useState(false) // ← BUG FIX: false, not true
  const [itemsLoading,  setItemsLoading]  = useState(false)

  const mountedRef = useRef(true)
  useEffect(() => () => { mountedRef.current = false }, [])

  // Fetch categories once moduleKey + slug are ready
  useEffect(() => {
    console.log('[RUNTIME-TRACE] categories effect fired', { moduleKey, slug, willFetch: !!(moduleKey && slug) })
    if (!moduleKey || !slug) return
    setCatsLoading(true)
    fetchCategories(moduleKey, slug)
      .then(({ data }) => {
        console.log('[RUNTIME-TRACE] categories fetch resolved', { count: data?.data?.length ?? 0 })
        if (!mountedRef.current) return
        const cats = data?.data ?? []
        setCategories(cats)
        if (cats.length) setActiveCatRaw(cats[0])
      })
      .catch((err) => {
        console.log('[RUNTIME-TRACE] categories fetch REJECTED', { message: err?.message, status: err?.response?.status })
        if (mountedRef.current) setCategories([])
      })
      .finally(() => { if (mountedRef.current) setCatsLoading(false) })
  }, [moduleKey, slug])

  // Fetch items when active category changes
  useEffect(() => {
    console.log('[RUNTIME-TRACE] items effect fired', { activeCategory: activeCategory?.id, moduleKey, slug })
    if (!activeCategory || !moduleKey || !slug) return
    setItemsLoading(true)
    setItems([])
    fetchItems(moduleKey, slug, activeCategory.id)
      .then(({ data }) => {
        console.log('[RUNTIME-TRACE] items fetch resolved', { count: data?.data?.length ?? 0 })
        if (!mountedRef.current) return
        setItems(data?.data ?? [])
      })
      .catch((err) => {
        console.log('[RUNTIME-TRACE] items fetch REJECTED', { message: err?.message, status: err?.response?.status })
        if (mountedRef.current) setItems([])
      })
      .finally(() => { if (mountedRef.current) setItemsLoading(false) })
  }, [activeCategory, moduleKey, slug])

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter((i) =>
      (i.name_ar ?? '').toLowerCase().includes(q) ||
      (i.name_en ?? '').toLowerCase().includes(q)
    )
  }, [items, search])

  // Switching category also clears search
  const setActiveCategory = useCallback((cat) => {
    setActiveCatRaw(cat)
    setSearch('')
  }, [])

  return {
    config,
    moduleKey,
    categories,
    activeCategory,
    setActiveCategory,
    items,
    filteredItems,
    search,
    setSearch,
    catsLoading,
    itemsLoading,
    isLoading: configLoading || catsLoading,
  }
}
