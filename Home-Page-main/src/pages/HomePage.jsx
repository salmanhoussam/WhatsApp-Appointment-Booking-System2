import React from 'react';
import Navbar from '../components/layout/Navbar';
import HeroSection from '../components/home/HeroSection'; 
import BookingSection from '../components/home/BookingSection';
import ServicesSection from '../components/home/ServicesSection';
import CTASection from '../components/home/CTASection';
import Footer from '../components/layout/Footer'; // تم تفعيل الاستيراد هنا

const HomePage = () => {
  return (
    <div className="min-h-screen bg-[#090412] text-slate-300 font-sans overflow-x-hidden selection:bg-purple-500 selection:text-white relative">
      
      {/* Background Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-700/10 blur-[120px] rounded-full pointer-events-none"></div>

      <Navbar />
      <main>
        <HeroSection />
        <BookingSection />
        <ServicesSection />
        <CTASection />
      </main>
      
      {/* تم تفعيل الفوتر ليظهر في الصفحة */}
      <Footer /> 
      
    </div>
  );
};

export default HomePage;