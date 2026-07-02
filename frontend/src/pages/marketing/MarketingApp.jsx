import React from 'react';
import { LanguageProvider } from './context/LanguageContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import HeroSection from './components/home/HeroSection';
import ProblemSolutionSection from './components/home/ProblemSolutionSection';
import WorkflowDemoSection from './components/home/WorkflowDemoSection';
import ServicesSection from './components/home/ServicesSection';
import UseCasesSection from './components/home/UseCasesSection';
import TrustSection from './components/home/TrustSection';
import CTASection from './components/home/CTASection';
import FAQSection from './components/home/FAQSection';
import './marketing.css';

function MarketingHome() {
  return (
    <div style={{ minHeight: '100vh', background: '#060b18', color: 'rgba(255,255,255,0.75)', fontFamily: 'Cairo, sans-serif', overflowX: 'hidden' }}>
      <Navbar />
      <main>
        <HeroSection />
        <ProblemSolutionSection />
        <WorkflowDemoSection />
        <ServicesSection />
        <UseCasesSection />
        <TrustSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}

export default function MarketingApp() {
  return (
    <LanguageProvider>
      <MarketingHome />
    </LanguageProvider>
  );
}
