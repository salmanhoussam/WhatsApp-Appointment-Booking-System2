import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import useTenantConfig from '../../../hooks/useTenantConfig';
import HeroSection from '../sections/HeroSection';
import AboutSection from '../sections/AboutSection';
import CategoriesSection from '../sections/CategoriesSection';
import FeaturedSection from '../sections/FeaturedSection';
import GallerySection from '../sections/GallerySection';
import WhyUsSection from '../sections/WhyUsSection';
import ReviewsSection from '../sections/ReviewsSection';
import ContactSection from '../sections/ContactSection';
import Footer from '../ui/Footer';
import '../beit-al-fakhar.css';

export default function BeitAlFakharHomePage() {
  const { config } = useTenantConfig('beit-al-fakhar');
  const waLink = config?.whatsapp_number
    ? `https://wa.me/${config.whatsapp_number}?text=${encodeURIComponent('مرحباً 👋 بدي أستفسر عن منتجاتكم')}`
    : null;

  return (
    <div data-slug="beit-al-fakhar" dir="rtl" style={{ minHeight: '100vh', background: '#fff' }}>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 1.5rem', height: 60,
        background: 'rgba(20,15,10,0.55)', backdropFilter: 'blur(14px)',
      }}>
        <span style={{ color: '#fff', fontWeight: 900, fontSize: '1.05rem', letterSpacing: '0.04em' }}>بيت الفخار</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link to="/beit-al-fakhar/store" style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none' }}>
            المتجر
          </Link>
          {waLink && (
            <a href={waLink} target="_blank" rel="noreferrer">
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: '#25D366', color: '#fff', fontWeight: 800, fontSize: '0.78rem',
                borderRadius: 999, padding: '0.45rem 1rem',
              }}>
                <MessageCircle size={13} /> واتساب
              </span>
            </a>
          )}
        </div>
      </nav>

      <HeroSection waLink={waLink} />
      <AboutSection />
      <CategoriesSection />
      <FeaturedSection />
      <GallerySection />
      <WhyUsSection />
      <ReviewsSection />
      <ContactSection waLink={waLink} />
      <Footer />
    </div>
  );
}
