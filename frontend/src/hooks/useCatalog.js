import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import useTenantConfig from './useTenantConfig'
import useTenantSlug from '../hooks/useTenantSlug'
import useGenericStore from '../pages/generic/store/useGenericStore'
import { fetchAllCategories, fetchItems } from '../services/catalogApi'

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

  // Push config into store so moduleKey gets derived from active_services
  useEffect(() => {
    if (config && !configLoading) {
      setStoreConfig(config, config.active_services ?? [])
    }
  }, [config, configLoading, setStoreConfig])

  const [categories,    setCategories]    = useState([])
  const [activeCategory, setActiveCatRaw] = useState(null)
  const [items,         setItems]         = useState([])
  const [search,        setSearch]        = useState('')
  const [catsLoading,   setCatsLoading]   = useState(false) // ← BUG FIX: false, not true
  const [itemsLoading,  setItemsLoading]  = useState(false)

  // mountedRef must be reset to true in the effect's setup, not just useRef(true)'s
  // initializer — under React 18 StrictMode's dev-mode mount→cleanup→remount cycle,
  // the cleanup below runs once during that simulated unmount and (without this reset)
  // permanently latches mountedRef.current to false for the rest of the component's
  // real lifetime. Every subsequent `if (mountedRef.current)` guard in this file then
  // silently no-ops forever - fetches resolve correctly but state updates are skipped -
  // which was the confirmed root cause of the beit-al-fakhar /store infinite loading
  // spinner (proven via direct headless-Chrome CDP capture, 2026-07-21).
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Fetch every real category for this tenant once slug is ready -- no tenant-wide moduleKey
  // gate. Each category already carries its own real `module_key` (TOS-004, Capability
  // Resolution Layer); nothing here needs to know "the tenant's type" to fetch its categories.
  useEffect(() => {
    if (!slug) return
    setCatsLoading(true)
    fetchAllCategories(slug)
      .then(({ data }) => {
        if (!mountedRef.current) return
        const cats = data?.data ?? []
        setCategories(cats)
        if (cats.length) setActiveCatRaw(cats[0])
      })
      .catch(() => { if (mountedRef.current) setCategories([]) })
      .finally(() => { if (mountedRef.current) setCatsLoading(false) })
  }, [slug])

  // Fetch items when active category changes -- routed by THAT category's own module_key
  // (per-record ownership), never a tenant-wide derived value.
  useEffect(() => {
    if (!activeCategory || !slug) return
    setItemsLoading(true)
    setItems([])
    fetchItems(activeCategory.module_key, slug, activeCategory.id)
      .then(({ data }) => {
        if (!mountedRef.current) return
        setItems(data?.data ?? [])
      })
      .catch(() => { if (mountedRef.current) setItems([]) })
      .finally(() => { if (mountedRef.current) setItemsLoading(false) })
  }, [activeCategory, slug])

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
