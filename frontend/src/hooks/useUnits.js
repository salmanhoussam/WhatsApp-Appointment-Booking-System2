/**
 * useUnits.js  —  Phase 32.5
 *
 * Fetches the unit catalog for the current tenant.
 * Self-contained: reads slug via useTenantSlug() — zero props required.
 *
 * Returns:
 *   units       — Unit[]  (empty array until loaded)
 *   isLoading   — boolean (true on initial fetch and refetches)
 *   error       — string | null
 *   fetchUnits  — (filters?: object) => Promise<void>  — call to refetch / filter
 *
 * Endpoint: GET /api/v1/public/{slug}/listings
 * Response shape expected: { units: [...] }  OR  [...] (bare array fallback)
 *
 * Usage:
 *   const { units, isLoading, error, fetchUnits } = useUnits();
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import publicApi from '../utils/publicApi';
import useTenantSlug from '../hooks/useTenantSlug';

export default function useUnits() {
  const slug = useTenantSlug();

  const [units,     setUnits]     = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState(null);

  // Keep latest slug in a ref so the fetchUnits callback never goes stale
  const slugRef = useRef(slug);
  useEffect(() => { slugRef.current = slug; }, [slug]);

  const fetchUnits = useCallback(async (filters = {}) => {
    const currentSlug = slugRef.current;
    if (!currentSlug) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await publicApi.get(`/${currentSlug}/listings`, {
        params: filters,
      });
      // Backend may return { units: [...] } or a bare array
      const data = res.data;
      setUnits(Array.isArray(data) ? data : (data?.units ?? []));
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.error  ||
        err?.message                ||
        'Failed to load units';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);  // stable — reads slug from ref

  // Auto-fetch on mount and whenever slug changes
  useEffect(() => {
    fetchUnits();
  }, [slug, fetchUnits]);

  return { units, isLoading, error, fetchUnits };
}
