import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

const MomentsCreatePage = lazy(() => import('../../pages/moments/MomentsCreatePage'));
const MomentTemplate    = lazy(() => import('../../pages/moments/MomentTemplate'));

const Fallback = () => (
  <div style={{ width:'100vw', height:'100vh', background:'#060b18', display:'flex', alignItems:'center', justifyContent:'center' }}>
    <div style={{ width:'12px', height:'12px', borderRadius:'50%', background:'#d4a853', animation:'pulse 1.2s ease-in-out infinite' }} />
  </div>
);

export default function MomentsRoutes() {
  return (
    <Routes>
      {/* /moments → create page */}
      <Route index element={<Suspense fallback={<Fallback />}><MomentsCreatePage /></Suspense>} />
      <Route path="create" element={<Suspense fallback={<Fallback />}><MomentsCreatePage /></Suspense>} />
      {/* /moments/:type/:slug → public page */}
      <Route path=":type/:slug" element={<Suspense fallback={<Fallback />}><MomentTemplate /></Suspense>} />
    </Routes>
  );
}
