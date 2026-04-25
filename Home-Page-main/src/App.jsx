// src/App.jsx
import React from 'react';
import { LanguageProvider } from './contexts/LanguageContext';
import HomePage from './pages/HomePage';
import GeneralPrivacyPage from './pages/GeneralPrivacyPage';
import SpecificPrivacyPage from './pages/SpecificPrivacyPage';
import PrivacyTermsPage from './pages/PrivacyTermsPage';

function App() {
  const path = window.location.pathname;

  const renderPage = () => {
    switch(path) {
      case '/general-privacy': return <GeneralPrivacyPage />;
      case '/specific-privacy': return <SpecificPrivacyPage />;
      case '/privacy-terms': return <PrivacyTermsPage />;
      default: return <HomePage />;
    }
  };

  return (
    <LanguageProvider>
      {renderPage()}
    </LanguageProvider>
  );
}

export default App;