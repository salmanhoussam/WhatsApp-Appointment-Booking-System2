import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { LanguageProvider } from '../pages/showcase/context/LanguageContext';
import '../pages/showcase/showcase.css';

const HomePage            = lazy(() => import('../pages/showcase/pages/HomePage'));
const GeneralPrivacyPage  = lazy(() => import('../pages/showcase/pages/GeneralPrivacyPage'));
const PrivacyTermsPage    = lazy(() => import('../pages/showcase/pages/PrivacyTermsPage'));
const SpecificPrivacyPage = lazy(() => import('../pages/showcase/pages/SpecificPrivacyPage'));
const RegistrationPage    = lazy(() => import('../pages/showcase/pages/RegistrationPage'));

const PageFallback = () => (
  <div style={{ width: '100vw', height: '100vh', background: '#090412' }} />
);

function ShowcaseLayout() {
  useEffect(() => {
    document.body.setAttribute('data-slug', 'showcase');
    return () => document.body.removeAttribute('data-slug');
  }, []);

  return (
    <LanguageProvider>
      <Outlet />
    </LanguageProvider>
  );
}

function ShowcaseRoutes() {
  return (
    <Routes>
      <Route element={<ShowcaseLayout />}>
        <Route index element={<Suspense fallback={<PageFallback />}><HomePage /></Suspense>} />
        <Route path="privacy" element={<Suspense fallback={<PageFallback />}><GeneralPrivacyPage /></Suspense>} />
        <Route path="terms" element={<Suspense fallback={<PageFallback />}><PrivacyTermsPage /></Suspense>} />
        <Route path="whatsapp-privacy" element={<Suspense fallback={<PageFallback />}><SpecificPrivacyPage /></Suspense>} />
        <Route path="register" element={<Suspense fallback={<PageFallback />}><RegistrationPage /></Suspense>} />
        {/* /contact scrolls to CTA section on home — no dedicated page yet */}
        <Route path="contact" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default ShowcaseRoutes;
