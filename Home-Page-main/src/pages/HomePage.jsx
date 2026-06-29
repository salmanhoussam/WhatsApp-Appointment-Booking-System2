import React from 'react';
import Navbar from '../components/layout/Navbar';
import HeroSection from '../components/home/HeroSection'; 
import ProblemSolutionSection from '../components/home/ProblemSolutionSection';
import WorkflowDemoSection from '../components/home/WorkflowDemoSection';
import UseCasesSection from '../components/home/UseCasesSection';
import TrustSection from '../components/home/TrustSection';
import CTASection from '../components/home/CTASection';
import Footer from '../components/layout/Footer';

const HomePage = () => {
  return (
    <div className="min-h-screen bg-[#090412] text-slate-300 font-sans overflow-x-hidden selection:bg-emerald-500 selection:text-white relative">
      
      {/* Background Glow Animation */}
      <div className="fixed top-0 right-1/4 w-96 h-96 bg-emerald-600/5 blur-[120px] rounded-full pointer-events-none animate-pulse"></div>
      <div className="fixed bottom-1/4 left-1/3 w-80 h-80 bg-purple-600/5 blur-[100px] rounded-full pointer-events-none animate-pulse"></div>

      <Navbar />
      <main>
        <HeroSection />
        <ProblemSolutionSection />
        <WorkflowDemoSection />
        <UseCasesSection />
        <TrustSection />
        <CTASection />
      </main>
      
      <Footer /> 
      
    </div>
  );
};

export default HomePage;