import { useState, useEffect } from 'react';
import axios from '../../../utils/publicApi';

export function useMomentPage(type, slug) {
  const [page, setPage]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    axios.get(`/public/moments/pages/${slug}`)
      .then(r => setPage(r.data.data))
      .catch(() => setError('الصفحة غير موجودة'))
      .finally(() => setLoading(false));
  }, [slug]);

  return { page, loading, error };
}

export function useCountdown(eventDate) {
  const [diff, setDiff] = useState(null);

  useEffect(() => {
    if (!eventDate) return;
    const tick = () => {
      const ms = new Date(eventDate) - new Date();
      if (ms <= 0) { setDiff({ days:0, hours:0, minutes:0, seconds:0 }); return; }
      setDiff({
        days:    Math.floor(ms / 86400000),
        hours:   Math.floor((ms % 86400000) / 3600000),
        minutes: Math.floor((ms % 3600000) / 60000),
        seconds: Math.floor((ms % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [eventDate]);

  return diff;
}

export async function submitRSVP(slug, payload) {
  const r = await axios.post(`/public/moments/pages/${slug}/rsvp`, payload);
  return r.data;
}

export async function registerCreator(payload) {
  const r = await axios.post('/public/moments/auth/register', payload);
  return r.data;
}

export async function loginCreator(payload) {
  const r = await axios.post('/public/moments/auth/login', payload);
  return r.data;
}

export async function createMomentPage(payload, token) {
  const r = await axios.post('/public/moments/pages', payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return r.data;
}

export async function getMyPages(token) {
  const r = await axios.get('/public/moments/pages/my', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return r.data;
}
