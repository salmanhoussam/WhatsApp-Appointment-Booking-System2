/**
 * DemoLandingPage.jsx
 * Public landing page for demo.salmansaas.com/home
 * All inline — no separate component files, no Tailwind.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import publicApi from '../../../utils/publicApi';

// ─────────────────────────────────────────────
// Design Tokens
// ─────────────────────────────────────────────
const GOLD         = '#d4a853';
const GOLD_DIM     = 'rgba(212,168,83,0.12)';
const GOLD_GLOW    = 'rgba(212,168,83,0.15)';
const GOLD_MED     = 'rgba(212,168,83,0.35)';
const CARD_BG      = 'rgba(255,255,255,0.04)';
const CARD_BORDER  = '1px solid rgba(255,255,255,0.08)';
const TEXT_PRI     = 'rgba(255,255,255,0.92)';
const TEXT_SEC     = 'rgba(255,255,255,0.45)';
const BG_MAIN      = '#050508';
const BG_STRIP     = '#080810';
const FONT         = "system-ui, -apple-system, 'Segoe UI', sans-serif";

// ─────────────────────────────────────────────
// Copy strings
// ─────────────────────────────────────────────
const copy = {
  ar: {
    logoName:         'SalmanSaaS',
    loginBtn:         'تسجيل الدخول',
    registerBtn:      'أنشئ حساب',
    heroH1:           'أنشئ منشأتك الرقمية في 30 ثانية',
    heroSub:          'قائمة مطعم، متجر إلكتروني، أو نظام حجوزات — كل شيء جاهز فوراً',
    formTitle:        'ابدأ تجربتك المجانية',
    typeLabel:        'نوع النشاط',
    namearLabel:      'اسم منشأتك',
    namearPh:         'مثال: مطعم الأصيل',
    nameenLabel:      'Business Name (English)',
    nameenPh:         'e.g. Al Aseel Restaurant',
    submitBtn:        'ابدأ مجاناً ←',
    submitting:       'جارٍ الإنشاء...',
    disclaimer:       'لا يلزم بطاقة ائتمانية · تجربة 7 أيام مجانية',
    successTitle:     'منشأتك جاهزة!',
    successSub:       'تجربتك المجانية جاهزة للانطلاق',
    successSlugLabel: 'معرّف منشأتك',
    successPassLabel: 'كلمة المرور المؤقتة',
    successShow:      'إظهار',
    successHide:      'إخفاء',
    successNote:      'احفظ كلمة المرور — ستحتاجها للدخول إلى لوحة التحكم',
    successCta:       'افتح منشأتي',
    demoTitle:        'شاهد الإمكانيات',
    demoSub:          'أمثلة حية من عملائنا',
    discoverBtn:      'اكتشف ←',
    featTitle:        'لماذا SalmanSaaS؟',
    f1Title:          'جاهز في لحظات',
    f1Desc:           'أنشئ منشأتك الكاملة في دقيقة واحدة دون أي معرفة تقنية',
    f2Title:          'عربي بالكامل',
    f2Desc:           'واجهة RTL أصيلة، دعم كامل للغة العربية والإنجليزية',
    f3Title:          'لوحة تحكم قوية',
    f3Desc:           'أدر القائمة، المخزون، والحجوزات من مكان واحد',
    footerCopy:       '© 2026 SalmanSaaS',
    footerLogin:      'تسجيل الدخول',
    footerRegister:   'إنشاء حساب',
    footerPrivacy:    'الخصوصية',
    navServices:      'العروض',
    menuOpen:         'فتح القائمة',
    menuClose:        'إغلاق القائمة',
    errFill:          'يرجى ملء جميع الحقول',
    errServer:        'حدث خطأ، يرجى المحاولة مجدداً',
    storiesTitle:     'عملاء يثقون بنا',
    storiesSub:       'قصص حقيقية من منشآت تستخدم SalmanSaaS',
  },
  en: {
    logoName:         'SalmanSaaS',
    loginBtn:         'Login',
    registerBtn:      'Create Account',
    heroH1:           'Launch your digital business in 30 seconds',
    heroSub:          'Restaurant menu, online store, or booking system — everything ready instantly',
    formTitle:        'Start your free trial',
    typeLabel:        'Business type',
    namearLabel:      'اسم منشأتك (Arabic)',
    namearPh:         'مثال: مطعم الأصيل',
    nameenLabel:      'Business Name (English)',
    nameenPh:         'e.g. Al Aseel Restaurant',
    submitBtn:        'Start Free →',
    submitting:       'Creating...',
    disclaimer:       'No credit card required · 7-day free trial',
    successTitle:     'Your business is ready!',
    successSub:       'Your free trial is live',
    successSlugLabel: 'Your business ID',
    successPassLabel: 'Temporary Password',
    successShow:      'Show',
    successHide:      'Hide',
    successNote:      'Save your password — you will need it to access your dashboard',
    successCta:       'Open My Business',
    demoTitle:        'See It Live',
    demoSub:          'Live examples from our clients',
    discoverBtn:      'Discover →',
    featTitle:        'Why SalmanSaaS?',
    f1Title:          'Ready in Seconds',
    f1Desc:           'Build your complete business in under a minute — zero technical knowledge needed',
    f2Title:          'Fully Bilingual',
    f2Desc:           'Native RTL interface with full Arabic and English language support',
    f3Title:          'Powerful Dashboard',
    f3Desc:           'Manage your menu, inventory, and bookings all from one place',
    footerCopy:       '© 2026 SalmanSaaS',
    footerLogin:      'Login',
    footerRegister:   'Create Account',
    footerPrivacy:    'Privacy',
    navServices:      'Live Demos',
    menuOpen:         'Open menu',
    menuClose:        'Close menu',
    errFill:          'Please fill in all fields',
    errServer:        'An error occurred, please try again',
    storiesTitle:     'Trusted by Businesses',
    storiesSub:       'Real stories from businesses using SalmanSaaS',
  },
};

// ─────────────────────────────────────────────
// Business type options
// ─────────────────────────────────────────────
const BUSINESS_TYPES = [
  { value: 'restaurant', icon: '🍽️', labelAr: 'مطعم',   labelEn: 'Restaurant' },
  { value: 'store',      icon: '🛍️', labelAr: 'متجر',   labelEn: 'Store'      },
  { value: 'booking',   icon: '🏠', labelAr: 'حجوزات', labelEn: 'Booking'    },
];

// ─────────────────────────────────────────────
// Live demo cards data
// ─────────────────────────────────────────────
const DEMO_CARDS = [
  {
    slug:      'olivello',
    labelAr:   'زيت زيتون فاخر',
    labelEn:   'Premium Olive Oil',
    badgeAr:   'متجر',
    badgeEn:   'Store',
    descAr:    'تجربة تسوق راقية لأفضل زيت الزيتون اللبناني',
    descEn:    'Premium Lebanese olive oil shopping experience',
    url:       '/olivello/home',
    accent:    '#6d9b3a',
  },
  {
    slug:      'caracas',
    labelAr:   'مطعم كاراكاس',
    labelEn:   'Caracas Restaurant',
    badgeAr:   'مطعم',
    badgeEn:   'Restaurant',
    descAr:    'قائمة رقمية تفاعلية وطلب عبر واتساب',
    descEn:    'Interactive digital menu with WhatsApp ordering',
    url:       '/caracas/menu',
    accent:    '#e53935',
  },
  {
    slug:      'footlab',
    labelAr:   'متجر فوتلاب',
    labelEn:   'Footlab Store',
    badgeAr:   'متجر',
    badgeEn:   'Store',
    descAr:    'متجر أحذية عصري بتجربة تسوق سلسة',
    descEn:    'Modern sneaker store with smooth shopping experience',
    url:       '/footlab/store',
    accent:    '#1565c0',
  },
  {
    slug:      'smar',
    labelAr:   'بيت سمار',
    labelEn:   'Beit Smar',
    badgeAr:   'حجوزات',
    badgeEn:   'Booking',
    descAr:    'حجز شاليهات وفلل فاخرة في لبنان',
    descEn:    'Luxury chalet and villa booking in Lebanon',
    url:       '/smar/showcase',
    accent:    GOLD,
  },
];

// ─────────────────────────────────────────────
// Features data
// ─────────────────────────────────────────────
const FEATURES = [
  { icon: '⚡', titleKey: 'f1Title', descKey: 'f1Desc' },
  { icon: '🌐', titleKey: 'f2Title', descKey: 'f2Desc' },
  { icon: '📊', titleKey: 'f3Title', descKey: 'f3Desc' },
];

// ─────────────────────────────────────────────
// Customer Stories data
// ─────────────────────────────────────────────
const CUSTOMER_STORIES = [
  {
    avatar:      '🍽️',
    businessType: { ar: 'مطعم', en: 'Restaurant' },
    name:        { ar: 'أحمد — مطعم الزيتونة، بيروت', en: 'Ahmad — Al Zeitouneh, Beirut' },
    quoteAr:     'في أقل من ساعة أصبح لدي قائمة رقمية كاملة. زبائني الآن يطلبون عبر الواتساب مباشرة.',
    quoteEn:     'In under an hour I had a full digital menu. Customers now order directly via WhatsApp.',
    metric:      { ar: '+٤٠٪ في الطلبات', en: '+40% in Orders' },
    accent:      '#e8a045',
  },
  {
    avatar:      '👟',
    businessType: { ar: 'متجر إلكتروني', en: 'Online Store' },
    name:        { ar: 'سارة — ستايل ستور، الرياض', en: 'Sara — Style Store, Riyadh' },
    quoteAr:     'كنت أبيع عبر انستغرام يدوياً. اليوم متجري الكامل يدير نفسه.',
    quoteEn:     'I used to sell manually on Instagram. Today my full store runs itself.',
    metric:      { ar: '٢× مبيعات في ٣٠ يوم', en: '2× sales in 30 days' },
    accent:      '#7c3aed',
  },
  {
    avatar:      '🏠',
    businessType: { ar: 'حجوزات', en: 'Booking' },
    name:        { ar: 'خالد — شاليهات النخيل، دبي', en: 'Khaled — Al Nakheel Chalets, Dubai' },
    quoteAr:     'نظام الحجز الجديد وفّر عليّ ٣ ساعات يومياً كنت أقضيها في الردود اليدوية.',
    quoteEn:     'The new booking system saved me 3 hours daily I used to spend on manual replies.',
    metric:      { ar: '٣ ساعات يومياً موفّرة', en: '3 hours saved daily' },
    accent:      '#0ea5e9',
  },
  {
    avatar:      '☕',
    businessType: { ar: 'كافيه', en: 'Café' },
    name:        { ar: 'ليلى — كافيه لونا، عمّان', en: 'Layla — Luna Café, Amman' },
    quoteAr:     'أول يوم فتحت فيه الرابط أمام زبائني، جاءتني ١٢ طلبية خلال ساعتين.',
    quoteEn:     'The first day I shared the link with customers, I got 12 orders in 2 hours.',
    metric:      { ar: '١٢ طلبية في أول يومين', en: '12 orders on day one' },
    accent:      '#d4a853',
  },
];

// ─────────────────────────────────────────────
// Keyframe injection (spinner + glow)
// ─────────────────────────────────────────────
const KEYFRAMES = `
  @keyframes dl-spin {
    to { transform: rotate(360deg); }
  }
  @keyframes dl-fade-up {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes dl-glow-pulse {
    0%, 100% { box-shadow: 0 0 32px ${GOLD_GLOW}, 0 8px 32px rgba(0,0,0,0.4); }
    50%       { box-shadow: 0 0 56px rgba(212,168,83,0.28), 0 8px 32px rgba(0,0,0,0.4); }
  }
  @keyframes dl-card-hover {
    from { transform: translateY(0); }
    to   { transform: translateY(-4px); }
  }
`;

// ─────────────────────────────────────────────
// Spinner
// ─────────────────────────────────────────────
function Spinner() {
  return (
    <span style={{
      display:      'inline-block',
      width:        '15px',
      height:       '15px',
      border:       '2px solid rgba(10,10,15,0.3)',
      borderTop:    '2px solid rgba(10,10,15,0.85)',
      borderRadius: '50%',
      animation:    'dl-spin 0.7s linear infinite',
      flexShrink:   0,
    }} />
  );
}

// ─────────────────────────────────────────────
// Navbar
// ─────────────────────────────────────────────
function DemoNavbar({ lang, t, toggleLang }) {
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const isAr = lang === 'ar';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navStyle = {
    position:       'fixed',
    top:            0,
    left:           0,
    right:          0,
    zIndex:         100,
    padding:        '1rem 2rem',
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
    transition:     'background 0.35s, border-color 0.35s',
    background:     scrolled ? 'rgba(5,5,8,0.92)' : 'transparent',
    borderBottom:   scrolled ? '1px solid rgba(212,168,83,0.12)' : '1px solid transparent',
    backdropFilter: scrolled ? 'blur(16px)' : 'none',
    WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none',
    boxSizing:      'border-box',
  };

  const logoStyle = {
    display:    'flex',
    alignItems: 'center',
    gap:        '8px',
    textDecoration: 'none',
  };

  const logoDotStyle = {
    width:       '8px',
    height:      '28px',
    background:  GOLD,
    borderRadius: '2px',
    boxShadow:   `0 0 10px ${GOLD_MED}`,
  };

  const logoTextStyle = {
    fontFamily:    FONT,
    fontWeight:    900,
    fontSize:      '1.35rem',
    letterSpacing: '-0.02em',
    color:         '#fff',
  };

  const logoGoldStyle = {
    color: GOLD,
  };

  const desktopLinksStyle = {
    display:    'flex',
    gap:        '1rem',
    alignItems: 'center',
  };

  const ghostLinkStyle = {
    fontFamily:    FONT,
    fontSize:      '13px',
    fontWeight:    500,
    color:         TEXT_SEC,
    textDecoration: 'none',
    padding:       '7px 14px',
    borderRadius:  '8px',
    border:        '1px solid rgba(255,255,255,0.1)',
    transition:    'color 0.2s, border-color 0.2s',
    cursor:        'pointer',
    background:    'transparent',
  };

  const goldBtnStyle = {
    fontFamily:    FONT,
    fontSize:      '13px',
    fontWeight:    700,
    color:         '#0a0a0f',
    textDecoration: 'none',
    padding:       '8px 18px',
    borderRadius:  '8px',
    border:        'none',
    background:    GOLD,
    cursor:        'pointer',
    transition:    'opacity 0.2s',
  };

  const langPillStyle = {
    fontFamily:    FONT,
    fontSize:      '12px',
    fontWeight:    700,
    color:         GOLD,
    background:    GOLD_DIM,
    border:        `1px solid ${GOLD_MED}`,
    borderRadius:  '999px',
    padding:       '5px 14px',
    cursor:        'pointer',
    letterSpacing: '0.04em',
    transition:    'background 0.2s',
  };

  return (
    <nav style={navStyle} dir={isAr ? 'rtl' : 'ltr'} role="navigation">
      {/* Logo */}
      <a href="/" style={logoStyle}>
        <div style={logoDotStyle} />
        <span style={logoTextStyle}>
          Salman<span style={logoGoldStyle}>SaaS</span>
        </span>
      </a>

      {/* Desktop links */}
      <div style={{ ...desktopLinksStyle, display: window.innerWidth < 640 ? 'none' : 'flex' }}
           className="dl-desktop-links">
        <button
          onClick={toggleLang}
          style={langPillStyle}
          aria-label="Toggle language"
        >
          {lang === 'ar' ? 'EN' : 'AR'}
        </button>
        <a
          href="/login"
          style={ghostLinkStyle}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_SEC; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
        >
          {t.loginBtn}
        </a>
        <a
          href="/register"
          style={goldBtnStyle}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          {t.registerBtn}
        </a>
      </div>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label={menuOpen ? t.menuClose : t.menuOpen}
        style={{
          display:    'flex',
          flexDirection: 'column',
          gap:        '4px',
          background: 'transparent',
          border:     'none',
          cursor:     'pointer',
          padding:    '4px',
        }}
        className="dl-hamburger"
      >
        {[0,1,2].map((i) => (
          <span key={i} style={{
            width:        '22px',
            height:       '2px',
            background:   '#fff',
            borderRadius: '2px',
            display:      'block',
            transition:   'opacity 0.2s',
            opacity:      menuOpen && i === 1 ? 0 : 1,
          }} />
        ))}
      </button>

      {/* Mobile slide-down */}
      {menuOpen && (
        <div style={{
          position:    'absolute',
          top:         '100%',
          left:        0,
          right:       0,
          background:  'rgba(5,5,8,0.97)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(212,168,83,0.12)',
          padding:     '1.5rem 2rem',
          display:     'flex',
          flexDirection: 'column',
          gap:         '1rem',
          animation:   'dl-fade-up 0.2s ease-out',
        }}>
          <button onClick={toggleLang} style={{ ...langPillStyle, alignSelf: isAr ? 'flex-end' : 'flex-start' }}>
            {lang === 'ar' ? 'EN' : 'AR'}
          </button>
          <a href="/login" style={{ ...ghostLinkStyle, textAlign: 'center' }} onClick={() => setMenuOpen(false)}>
            {t.loginBtn}
          </a>
          <a href="/register" style={{ ...goldBtnStyle, textAlign: 'center', display: 'block' }} onClick={() => setMenuOpen(false)}>
            {t.registerBtn}
          </a>
        </div>
      )}

      {/* Inject responsive CSS */}
      <style>{`
        .dl-hamburger { display: none !important; }
        .dl-desktop-links { display: flex !important; }
        @media (max-width: 640px) {
          .dl-hamburger { display: flex !important; }
          .dl-desktop-links { display: none !important; }
        }
      `}</style>
    </nav>
  );
}

// ─────────────────────────────────────────────
// Hero Section
// ─────────────────────────────────────────────
function HeroSection({ lang, t, navigate }) {
  const isAr = lang === 'ar';
  const [businessType, setBusinessType] = useState('restaurant');
  const [nameAr,       setNameAr]       = useState('');
  const [nameEn,       setNameEn]       = useState('');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [result,       setResult]       = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nameAr.trim() || !nameEn.trim()) {
      setError(t.errFill);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res  = await publicApi.post('/demo/create', {
        business_type: businessType,
        name_ar:       nameAr.trim(),
        name_en:       nameEn.trim(),
      });
      const data = res.data?.data ?? res.data;
      setResult(data);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.error  ||
        t.errServer;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const sectionStyle = {
    minHeight:       '100vh',
    background:      BG_MAIN,
    display:         'flex',
    flexDirection:   'column',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         '8rem 1.5rem 5rem',
    position:        'relative',
    overflow:        'hidden',
    boxSizing:       'border-box',
  };

  const glowStyle = {
    position:    'absolute',
    top:         '30%',
    left:        '50%',
    transform:   'translate(-50%, -50%)',
    width:       '600px',
    height:      '400px',
    background:  `radial-gradient(ellipse at center, ${GOLD_GLOW} 0%, transparent 65%)`,
    pointerEvents: 'none',
    zIndex:      0,
  };

  const contentStyle = {
    position:   'relative',
    zIndex:     1,
    textAlign:  'center',
    maxWidth:   '720px',
    width:      '100%',
    animation:  'dl-fade-up 0.7s ease-out both',
  };

  const h1Style = {
    fontFamily:    FONT,
    fontWeight:    900,
    fontSize:      'clamp(2rem, 5vw, 3.2rem)',
    lineHeight:    1.15,
    color:         TEXT_PRI,
    margin:        '0 0 1.25rem',
    letterSpacing: '-0.02em',
    direction:     isAr ? 'rtl' : 'ltr',
  };

  const subStyle = {
    fontFamily:  FONT,
    fontSize:    'clamp(1rem, 2.5vw, 1.2rem)',
    color:       TEXT_SEC,
    lineHeight:  1.7,
    margin:      '0 auto 2.5rem',
    maxWidth:    '560px',
    direction:   isAr ? 'rtl' : 'ltr',
  };

  const glassPanel = {
    background:          'rgba(10,10,15,0.75)',
    backdropFilter:      'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border:              CARD_BORDER,
    borderRadius:        '20px',
    padding:             'clamp(1.5rem, 4vw, 2.5rem)',
    width:               '100%',
    maxWidth:            '460px',
    margin:              '0 auto',
    boxSizing:           'border-box',
    animation:           'dl-glow-pulse 3.5s ease-in-out infinite',
    boxShadow:           `0 0 32px ${GOLD_GLOW}, 0 8px 32px rgba(0,0,0,0.4)`,
  };

  const inputStyle = {
    background:   'rgba(255,255,255,0.05)',
    border:       '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding:      '12px 16px',
    color:        '#fff',
    fontSize:     '14px',
    fontFamily:   FONT,
    outline:      'none',
    width:        '100%',
    boxSizing:    'border-box',
    transition:   'border-color 0.2s',
  };

  const submitStyle = {
    width:         '100%',
    padding:       '14px',
    background:    loading ? 'rgba(212,168,83,0.55)' : GOLD,
    border:        'none',
    borderRadius:  '8px',
    color:         '#0a0a0f',
    fontSize:      '15px',
    fontFamily:    FONT,
    fontWeight:    700,
    cursor:        loading ? 'not-allowed' : 'pointer',
    letterSpacing: '0.02em',
    display:       'flex',
    alignItems:    'center',
    justifyContent: 'center',
    gap:           '8px',
    transition:    'background 0.2s, opacity 0.2s',
    marginTop:     '4px',
  };

  if (result) {
    return (
      <section style={sectionStyle}>
        <div style={glowStyle} />
        <div style={{ ...contentStyle, maxWidth: '460px' }}>
          <div style={glassPanel}>
            <SuccessCard
              t={t}
              lang={lang}
              slug={result.slug}
              tempPassword={result.temp_password}
              onNavigate={() => navigate(`/${result.slug}/home`)}
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={sectionStyle}>
      <div style={glowStyle} />
      <div style={contentStyle}>
        <h1 style={h1Style}>{t.heroH1}</h1>
        <p style={subStyle}>{t.heroSub}</p>

        {/* Glass form panel */}
        <div style={glassPanel} dir={isAr ? 'rtl' : 'ltr'}>
          {/* Business type selector */}
          <p style={{
            color: TEXT_SEC, fontSize: '12px', fontFamily: FONT,
            margin: '0 0 10px', letterSpacing: '0.04em',
          }}>
            {t.typeLabel}
          </p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            {BUSINESS_TYPES.map((bt) => {
              const active = businessType === bt.value;
              return (
                <button
                  key={bt.value}
                  onClick={() => setBusinessType(bt.value)}
                  style={{
                    flex:          1,
                    padding:       '12px 6px',
                    background:    active ? GOLD_DIM : 'rgba(255,255,255,0.03)',
                    border:        active ? `1px solid ${GOLD}` : '1px solid rgba(255,255,255,0.07)',
                    borderRadius:  '12px',
                    cursor:        'pointer',
                    color:         active ? GOLD : TEXT_SEC,
                    fontSize:      '12px',
                    fontFamily:    FONT,
                    fontWeight:    active ? 700 : 400,
                    textAlign:     'center',
                    transition:    'all 0.2s',
                    outline:       'none',
                    display:       'flex',
                    flexDirection: 'column',
                    alignItems:    'center',
                    gap:           '5px',
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
                >
                  <span style={{ fontSize: '20px' }}>{bt.icon}</span>
                  <span>{isAr ? bt.labelAr : bt.labelEn}</span>
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '0 0 18px' }} />

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Name AR */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: TEXT_SEC, fontSize: '11px', fontFamily: FONT, letterSpacing: '0.04em' }}>
                {t.namearLabel}
              </label>
              <input
                type="text"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder={t.namearPh}
                dir="rtl"
                style={inputStyle}
                onFocus={(e)  => { e.target.style.borderColor = GOLD; }}
                onBlur={(e)   => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              />
            </div>

            {/* Name EN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: TEXT_SEC, fontSize: '11px', fontFamily: FONT, letterSpacing: '0.04em' }}>
                {t.nameenLabel}
              </label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder={t.nameenPh}
                dir="ltr"
                style={inputStyle}
                onFocus={(e)  => { e.target.style.borderColor = GOLD; }}
                onBlur={(e)   => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background:   'rgba(239,68,68,0.08)',
                border:       '1px solid rgba(239,68,68,0.25)',
                borderRadius: '8px',
                padding:      '10px 14px',
                color:        '#fca5a5',
                fontSize:     '13px',
                fontFamily:   FONT,
                textAlign:    'center',
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={submitStyle}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              {loading && <Spinner />}
              {loading ? t.submitting : t.submitBtn}
            </button>
          </form>

          {/* Disclaimer */}
          <p style={{
            color:      'rgba(255,255,255,0.25)',
            fontSize:   '11px',
            fontFamily: FONT,
            textAlign:  'center',
            margin:     '14px 0 0',
            lineHeight: 1.6,
          }}>
            {t.disclaimer}
          </p>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// Success Card (inline — not DemoLauncher)
// ─────────────────────────────────────────────
function SuccessCard({ t, lang, slug, tempPassword, onNavigate }) {
  const [visible, setVisible] = useState(false);
  const isAr = lang === 'ar';

  return (
    <div style={{
      textAlign:     'center',
      display:       'flex',
      flexDirection: 'column',
      gap:           '18px',
      alignItems:    'center',
      direction:     isAr ? 'rtl' : 'ltr',
    }}>
      {/* Check icon */}
      <div style={{
        width:        '60px',
        height:       '60px',
        borderRadius: '50%',
        background:   `radial-gradient(circle, ${GOLD_DIM}, transparent)`,
        border:       `1px solid ${GOLD}44`,
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        fontSize:     '26px',
      }}>
        ✅
      </div>

      <div>
        <h3 style={{ color: '#fff', fontFamily: FONT, fontSize: '18px', fontWeight: 700, margin: 0 }}>
          {t.successTitle}
        </h3>
        <p style={{ color: TEXT_SEC, fontSize: '13px', fontFamily: FONT, margin: '5px 0 0' }}>
          {t.successSub}
        </p>
      </div>

      {/* Slug */}
      <div style={{
        background:   GOLD_DIM,
        border:       `1px solid ${GOLD}44`,
        borderRadius: '12px',
        padding:      '10px 20px',
        width:        '100%',
        boxSizing:    'border-box',
      }}>
        <p style={{ color: TEXT_SEC, fontSize: '11px', fontFamily: FONT, margin: '0 0 4px', letterSpacing: '0.05em' }}>
          {t.successSlugLabel}
        </p>
        <code style={{ color: GOLD, fontSize: '14px', fontFamily: 'monospace', fontWeight: 600, direction: 'ltr', display: 'block' }}>
          {slug}
        </code>
      </div>

      {/* Password */}
      <div style={{
        background:   CARD_BG,
        border:       CARD_BORDER,
        borderRadius: '12px',
        padding:      '12px 16px',
        width:        '100%',
        boxSizing:    'border-box',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: TEXT_SEC, fontSize: '11px', fontFamily: FONT, letterSpacing: '0.05em' }}>
            {t.successPassLabel}
          </span>
          <button
            onClick={() => setVisible(!visible)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: GOLD, fontSize: '12px', fontFamily: FONT, padding: 0 }}
          >
            {visible ? t.successHide : t.successShow}
          </button>
        </div>
        <code style={{
          color:      visible ? '#fff' : 'rgba(255,255,255,0.12)',
          fontSize:   '14px',
          fontFamily: 'monospace',
          direction:  'ltr',
          display:    'block',
          filter:     visible ? 'none' : 'blur(6px)',
          transition: 'filter 0.2s',
          userSelect: visible ? 'text' : 'none',
        }}>
          {tempPassword}
        </code>
      </div>

      <p style={{ color: `${GOLD}cc`, fontSize: '12px', fontFamily: FONT, margin: 0, textAlign: 'center', lineHeight: 1.6 }}>
        {t.successNote}
      </p>

      <button
        onClick={onNavigate}
        style={{
          width:         '100%',
          padding:       '14px',
          background:    GOLD,
          border:        'none',
          borderRadius:  '12px',
          color:         '#0a0a0f',
          fontSize:      '15px',
          fontFamily:    FONT,
          fontWeight:    700,
          cursor:        'pointer',
          letterSpacing: '0.02em',
          transition:    'opacity 0.2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
      >
        {t.successCta}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Live Demo Cards Section
// ─────────────────────────────────────────────
function DemoCardsSection({ lang, t }) {
  const isAr = lang === 'ar';
  const navigate = useNavigate();

  return (
    <section
      id="demo-cards-section"
      style={{
        background: BG_MAIN,
        padding:    'clamp(4rem, 8vw, 6rem) 1.5rem',
        boxSizing:  'border-box',
      }}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem', animation: 'dl-fade-up 0.6s ease-out both' }}>
          <h2 style={{
            fontFamily:    FONT,
            fontWeight:    800,
            fontSize:      'clamp(1.6rem, 3.5vw, 2.2rem)',
            color:         TEXT_PRI,
            margin:        '0 0 0.75rem',
            letterSpacing: '-0.02em',
          }}>
            {t.demoTitle}
          </h2>
          <p style={{ color: TEXT_SEC, fontSize: '15px', fontFamily: FONT, margin: 0 }}>
            {t.demoSub}
          </p>
        </div>

        {/* Cards grid */}
        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap:                 '1.25rem',
        }}>
          {DEMO_CARDS.map((card) => (
            <DemoCard
              key={card.slug}
              card={card}
              lang={lang}
              t={t}
              onNavigate={() => navigate(card.url)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function DemoCard({ card, lang, t, onNavigate }) {
  const [hovered, setHovered] = useState(false);
  const isAr = lang === 'ar';

  const label  = isAr ? card.labelAr  : card.labelEn;
  const badge  = isAr ? card.badgeAr  : card.badgeEn;
  const desc   = isAr ? card.descAr   : card.descEn;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:   CARD_BG,
        border:       `1px solid ${hovered ? `${card.accent}55` : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '12px',
        padding:      '1.5rem',
        cursor:       'pointer',
        transition:   'border-color 0.25s, transform 0.25s, box-shadow 0.25s',
        transform:    hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow:    hovered ? `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${card.accent}22` : 'none',
        boxSizing:    'border-box',
        display:      'flex',
        flexDirection: 'column',
        gap:          '12px',
        borderTop:    `1px solid ${card.accent}44`,
      }}
      onClick={onNavigate}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onNavigate(); }}
    >
      {/* Badge row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: isAr ? 'row-reverse' : 'row' }}>
        <span style={{
          background:    `${card.accent}18`,
          border:        `1px solid ${card.accent}33`,
          borderRadius:  '999px',
          padding:       '3px 12px',
          color:         card.accent,
          fontSize:      '11px',
          fontFamily:    FONT,
          fontWeight:    600,
          letterSpacing: '0.04em',
        }}>
          {badge}
        </span>
        <span style={{
          width:        '8px',
          height:       '8px',
          borderRadius: '50%',
          background:   card.accent,
          boxShadow:    `0 0 8px ${card.accent}88`,
          display:      'block',
          flexShrink:   0,
        }} />
      </div>

      {/* Name */}
      <h3 style={{
        fontFamily:    FONT,
        fontWeight:    700,
        fontSize:      '16px',
        color:         TEXT_PRI,
        margin:        0,
        direction:     isAr ? 'rtl' : 'ltr',
        textAlign:     isAr ? 'right' : 'left',
      }}>
        {label}
      </h3>

      {/* Description */}
      <p style={{
        color:      TEXT_SEC,
        fontSize:   '13px',
        fontFamily: FONT,
        margin:     0,
        lineHeight: 1.6,
        direction:  isAr ? 'rtl' : 'ltr',
        textAlign:  isAr ? 'right' : 'left',
        flexGrow:   1,
      }}>
        {desc}
      </p>

      {/* CTA */}
      <button
        onClick={(e) => { e.stopPropagation(); onNavigate(); }}
        style={{
          background:    'transparent',
          border:        `1px solid ${card.accent}44`,
          borderRadius:  '8px',
          padding:       '8px 16px',
          color:         card.accent,
          fontSize:      '13px',
          fontFamily:    FONT,
          fontWeight:    600,
          cursor:        'pointer',
          transition:    'background 0.2s',
          textAlign:     'center',
          alignSelf:     'stretch',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = `${card.accent}18`; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        {t.discoverBtn}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Customer Stories Section
// ─────────────────────────────────────────────
function CustomerStoriesSection({ lang, t }) {
  const isAr = lang === 'ar';
  const cardRefs = CUSTOMER_STORIES.map(() => ({ current: null }));

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.12 }
    );

    cardRefs.forEach((ref) => {
      if (ref.current) observer.observe(ref.current);
    });

    return () => observer.disconnect();
    // cardRefs is stable per render — suppress lint
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section
      style={{
        background: '#060610',
        padding:    '80px 1.5rem',
        boxSizing:  'border-box',
        borderTop:  '1px solid rgba(255,255,255,0.04)',
      }}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Story-card CSS — injected once */}
      <style>{`
        .story-card {
          opacity: 0;
          transform: translateY(32px);
          transition: opacity 0.65s cubic-bezier(0.22,1,0.36,1),
                      transform 0.65s cubic-bezier(0.22,1,0.36,1);
        }
        .story-card.visible {
          opacity: 1;
          transform: translateY(0);
        }
        @media (prefers-reduced-motion: reduce) {
          .story-card {
            transition: opacity 0.3s;
            transform: none !important;
          }
        }
      `}</style>

      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{
            fontFamily:    FONT,
            fontWeight:    800,
            fontSize:      'clamp(1.6rem, 3.5vw, 2.2rem)',
            color:         TEXT_PRI,
            margin:        '0 0 0.75rem',
            letterSpacing: '-0.02em',
          }}>
            {t.storiesTitle}
          </h2>
          <p style={{ color: TEXT_SEC, fontSize: '15px', fontFamily: FONT, margin: 0 }}>
            {t.storiesSub}
          </p>
        </div>

        {/* Cards grid */}
        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap:                 '1.25rem',
        }}>
          {CUSTOMER_STORIES.map((story, i) => (
            <StoryCard
              key={i}
              story={story}
              lang={lang}
              delay={i * 150}
              refCallback={(el) => { cardRefs[i].current = el; }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function StoryCard({ story, lang, delay, refCallback }) {
  const isAr = lang === 'ar';
  const [hovered, setHovered] = useState(false);

  const quote      = isAr ? story.quoteAr       : story.quoteEn;
  const name       = isAr ? story.name.ar       : story.name.en;
  const bizType    = isAr ? story.businessType.ar : story.businessType.en;
  const metric     = isAr ? story.metric.ar     : story.metric.en;
  const { accent } = story;

  return (
    <div
      ref={refCallback}
      className="story-card"
      style={{ transitionDelay: `${delay}ms` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        background:    'rgba(255,255,255,0.035)',
        border:        `1px solid ${hovered ? `${accent}66` : 'rgba(255,255,255,0.07)'}`,
        borderTop:     `3px solid ${accent}`,
        borderRadius:  '14px',
        padding:       '24px',
        boxSizing:     'border-box',
        display:       'flex',
        flexDirection: 'column',
        gap:           '12px',
        height:        '100%',
        transition:    'border-color 0.25s, transform 0.25s, box-shadow 0.25s',
        transform:     hovered ? 'translateY(-5px)' : 'translateY(0)',
        boxShadow:     hovered ? `0 16px 40px ${accent}1a` : 'none',
      }}>
        {/* Avatar + business info */}
        <div style={{
          display:    'flex',
          alignItems: 'center',
          gap:        '12px',
          flexDirection: isAr ? 'row-reverse' : 'row',
        }}>
          <div style={{
            fontSize:       '32px',
            lineHeight:     1,
            flexShrink:     0,
          }}>
            {story.avatar}
          </div>
          <div style={{ textAlign: isAr ? 'right' : 'left' }}>
            <p style={{
              fontFamily:  FONT,
              fontWeight:  700,
              fontSize:    '14px',
              color:       TEXT_PRI,
              margin:      0,
              lineHeight:  1.3,
              direction:   isAr ? 'rtl' : 'ltr',
            }}>
              {name}
            </p>
            <span style={{
              display:       'inline-block',
              marginTop:     '5px',
              background:    `${accent}18`,
              border:        `1px solid ${accent}33`,
              borderRadius:  '999px',
              padding:       '2px 10px',
              color:         accent,
              fontSize:      '11px',
              fontFamily:    FONT,
              fontWeight:    600,
              letterSpacing: '0.04em',
            }}>
              {bizType}
            </span>
          </div>
        </div>

        {/* Quote */}
        <p style={{
          fontFamily:  FONT,
          fontSize:    '14px',
          fontStyle:   'italic',
          color:       'rgba(255,255,255,0.75)',
          lineHeight:  1.7,
          margin:      0,
          direction:   isAr ? 'rtl' : 'ltr',
          textAlign:   isAr ? 'right' : 'left',
          flexGrow:    1,
        }}>
          "{quote}"
        </p>

        {/* Divider */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

        {/* Metric */}
        <p style={{
          fontFamily: FONT,
          fontWeight: 700,
          fontSize:   '18px',
          color:      accent,
          margin:     0,
          direction:  isAr ? 'rtl' : 'ltr',
          textAlign:  isAr ? 'right' : 'left',
        }}>
          {metric}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Features Strip
// ─────────────────────────────────────────────
function FeaturesSection({ lang, t }) {
  const isAr = lang === 'ar';

  return (
    <section
      id="services-section"
      style={{
        background: BG_STRIP,
        padding:    'clamp(4rem, 8vw, 6rem) 1.5rem',
        boxSizing:  'border-box',
        borderTop:  '1px solid rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{
            fontFamily:    FONT,
            fontWeight:    800,
            fontSize:      'clamp(1.5rem, 3.5vw, 2rem)',
            color:         TEXT_PRI,
            margin:        0,
            letterSpacing: '-0.02em',
          }}>
            {t.featTitle}
          </h2>
        </div>

        {/* 3 pillars */}
        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap:                 '1.5rem',
        }}>
          {FEATURES.map((feat, i) => (
            <FeaturePillar
              key={i}
              icon={feat.icon}
              title={t[feat.titleKey]}
              desc={t[feat.descKey]}
              isAr={isAr}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturePillar({ icon, title, desc, isAr }) {
  return (
    <div style={{
      background:   CARD_BG,
      border:       CARD_BORDER,
      borderRadius: '12px',
      padding:      '2rem 1.5rem',
      textAlign:    isAr ? 'right' : 'left',
      boxSizing:    'border-box',
    }}>
      <div style={{
        fontSize:     '2.5rem',
        marginBottom: '1rem',
        lineHeight:   1,
        textAlign:    'center',
      }}>
        {icon}
      </div>
      <h3 style={{
        fontFamily:    FONT,
        fontWeight:    700,
        fontSize:      '17px',
        color:         TEXT_PRI,
        margin:        '0 0 0.6rem',
        direction:     isAr ? 'rtl' : 'ltr',
      }}>
        {title}
      </h3>
      <p style={{
        color:      TEXT_SEC,
        fontSize:   '14px',
        fontFamily: FONT,
        margin:     0,
        lineHeight: 1.7,
        direction:  isAr ? 'rtl' : 'ltr',
      }}>
        {desc}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────
function DemoFooter({ lang, t }) {
  const isAr = lang === 'ar';

  const linkStyle = {
    color:          TEXT_SEC,
    textDecoration: 'none',
    fontSize:       '13px',
    fontFamily:     FONT,
    transition:     'color 0.2s',
  };

  return (
    <footer
      style={{
        background:  BG_MAIN,
        borderTop:   '1px solid rgba(255,255,255,0.06)',
        padding:     '2rem 2rem',
        boxSizing:   'border-box',
        display:     'flex',
        alignItems:  'center',
        justifyContent: 'space-between',
        flexWrap:    'wrap',
        gap:         '1rem',
      }}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Left — copy */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width:        '7px',
          height:       '22px',
          background:   GOLD,
          borderRadius: '2px',
          boxShadow:    `0 0 8px ${GOLD_MED}`,
          flexShrink:   0,
        }} />
        <span style={{ color: TEXT_SEC, fontSize: '13px', fontFamily: FONT }}>
          {t.footerCopy}
        </span>
      </div>

      {/* Right — links */}
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <a
          href="/login"
          style={linkStyle}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_SEC; }}
        >
          {t.footerLogin}
        </a>
        <a
          href="/register"
          style={linkStyle}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_SEC; }}
        >
          {t.footerRegister}
        </a>
        <a
          href="/privacy"
          style={linkStyle}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_SEC; }}
        >
          {t.footerPrivacy}
        </a>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────
// Root Page
// ─────────────────────────────────────────────
export default function DemoLandingPage() {
  const { lang, toggleLang } = useLanguage();
  const navigate = useNavigate();
  const t = copy[lang] || copy['ar'];

  return (
    <>
      {/* Global keyframes */}
      <style>{KEYFRAMES}</style>

      <div style={{
        background: BG_MAIN,
        minHeight:  '100vh',
        minWidth:   '320px',
        fontFamily: FONT,
        overflowX:  'hidden',
      }}>
        {/* BLOCK 1 — Sticky Navbar */}
        <DemoNavbar lang={lang} t={t} toggleLang={toggleLang} />

        {/* BLOCK 2 — Hero */}
        <HeroSection lang={lang} t={t} navigate={navigate} />

        {/* BLOCK 3 — Live Demo Cards */}
        <DemoCardsSection lang={lang} t={t} />

        {/* BLOCK 4 — Customer Stories */}
        <CustomerStoriesSection lang={lang} t={t} />

        {/* BLOCK 5 — Features Strip */}
        <FeaturesSection lang={lang} t={t} />

        {/* BLOCK 6 — Footer */}
        <DemoFooter lang={lang} t={t} />
      </div>
    </>
  );
}
