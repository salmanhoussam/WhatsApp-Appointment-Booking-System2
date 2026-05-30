import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenantBase } from '../../../hooks/useTenantSlug';

export const LanguageContext = { t: {} };

export default function SpatialHomePage() {
  const navigate = useNavigate();
  const base = useTenantBase();
  useEffect(() => { navigate(`${base}/listings`, { replace: true }); }, [navigate, base]);
  return null;
}
