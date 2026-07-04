import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingBag, Info, ChevronRight } from 'lucide-react';

// ==========================================
// Mock Data (Replace with your actual API calls / useQuery)
// ==========================================
const RESTAURANT_INFO = {
  name: "كاراكاس",
  tagline: "أصالة المذاق اللبناني والشرقي",
  // Placeholder image - ready to be replaced by the Higgsfield MP4 later
  heroImage: "https://images.unsplash.com/photo-1544148103-0773bf10d330?q=80&w=2070&auto=format&fit=crop",
};

const CATEGORIES = [
  { id: 'all', name: 'الكل' },
  { id: 'starters', name: 'مقبلات ساخنة' },
  { id: 'grills', name: 'مشويات على الفحم' },
  { id: 'main', name: 'أطباق رئيسية' },
  { id: 'drinks', name: 'مشروبات وعصائر' },
];

const MENU_ITEMS = [
  { id: 1, categoryId: 'grills', name: 'مشاوي كاراكاس المشكلة', description: 'تشكيلة فاخرة من الكباب، الشيش طاووق، واللحم المشوي مع الخضار', price: 25.00, image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1000&auto=format&fit=crop' },
  { id: 2, categoryId: 'starters', name: 'حمص باللحمة', description: 'حمص بيروتي أصيل مغطى بقطع اللحم المفروم الطازج والصنوبر المقلي', price: 8.50, image: 'https://images.unsplash.com/photo-1576867757603-05b134ebc379?q=80&w=1000&auto=format&fit=crop' },
  { id: 3, categoryId: 'starters', name: 'بطاطا حرة', description: 'مكعبات البطاطا المقلية مع الثوم، الكزبرة، الفلفل الحار وزيت الزيتون', price: 6.00, image: 'https://images.unsplash.com/photo-1541529086526-db283c563270?q=80&w=1000&auto=format&fit=crop' },
  { id: 4, categoryId: 'main', name: 'شاورما لحم عربي', description: 'شاورما اللحم المتبلة تقدم مع صوص الطحينة، المخلل، والبطاطس', price: 12.00, image: 'https://images.unsplash.com/photo-1648624108819-21ce2c2bfa32?q=80&w=1000&auto=format&fit=crop' },
  { id: 5, categoryId: 'drinks', name: 'عصير رمان طازج', description: 'عصير رمان طبيعي 100% معصور على البارد بدون سكر مضاف', price: 5.00, image: 'https://images.unsplash.com/photo-1613478881439-0d1dc9e1cb46?q=80&w=1000&auto=format&fit=crop' },
];

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [isLoaded, setIsLoaded] = useState(false);

  // Simulate loading state
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 600);
    return () => clearTimeout(timer);
  }, []);

  const filteredItems = activeCategory === 'all' 
    ? MENU_ITEMS 
    : MENU_ITEMS.filter(item => item.categoryId === activeCategory);

  // === Loading Skeleton ===
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] animate-pulse">
        <div className="h-[40vh] bg-stone-300 w-full" />
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex gap-3 mb-8 overflow-hidden">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-10 w-24 bg-stone-200 rounded-full shrink-0" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex h-32 bg-stone-200 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#292524] font-sans selection:bg-orange-200" dir="rtl">
      
      {/* === 1. Cinematic Hero Section ===
        Ready for Video in Phase 2. Just replace the background image with a <video> tag later.
      */}
      <section className="relative h-[40vh] min-h-[300px] w-full overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transform scale-105 transition-transform duration-[10s]"
          style={{ backgroundImage: `url(${RESTAURANT_INFO.heroImage})` }}
        />
        {/* Warm Gradient Overlay to make text pop and give a cinematic feel */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1C1917] via-[#1C1917]/50 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 max-w-5xl mx-auto flex justify-between items-end">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-md">
              {RESTAURANT_INFO.name}
            </h1>
            <p className="text-stone-200 text-sm md:text-base font-medium flex items-center gap-2">
              <Info size={16} className="text-orange-400" />
              {RESTAURANT_INFO.tagline}
            </p>
          </motion.div>

          <button className="hidden md:flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full transition-colors border border-white/20">
            <Search size={18} />
            <span className="text-sm font-medium">بحث في المنيو</span>
          </button>
        </div>
      </section>

      {/* === 2. Sticky Category Navigation ===
        Warm styling, horizontal scroll
      */}
      <div className="sticky top-0 z-40 bg-[#FAFAF9]/90 backdrop-blur-md border-b border-stone-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex overflow-x-auto py-4 gap-3 no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {CATEGORIES.map((category) => {
              const isActive = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`
                    whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300
                    ${isActive 
                      ? 'bg-[#EA580C] text-white shadow-md shadow-orange-600/20 transform scale-105' 
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}
                  `}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* === 3. Menu Items Grid ===
        Cinematic full-bleed images inside cards, warm typography
      */}
      <main className="max-w-5xl mx-auto px-4 py-8 pb-32">
        <motion.div 
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, index) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="group flex bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 border border-stone-100"
              >
                {/* Image Area - Ready for Phase 3 AI Photos */}
                <div className="w-2/5 md:w-1/3 relative overflow-hidden bg-stone-100">
                  <img 
                    src={item.image} 
                    alt={item.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                  />
                </div>

                {/* Content Area */}
                <div className="w-3/5 md:w-2/3 p-4 md:p-5 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-[#292524] mb-1 line-clamp-1">{item.name}</h3>
                    <p className="text-stone-500 text-xs md:text-sm leading-relaxed line-clamp-2 mb-3">
                      {item.description}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-lg font-extrabold text-[#EA580C]">
                      ${item.price.toFixed(2)}
                    </span>
                    
                    <button className="w-8 h-8 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center hover:bg-[#EA580C] hover:text-white transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </main>

      {/* Floating Cart Button (Optional, just to complete the UI feel) */}
      <div className="fixed bottom-6 left-0 right-0 px-4 z-50 flex justify-center pointer-events-none">
        <button className="pointer-events-auto flex items-center gap-3 bg-[#1C1917] text-white px-6 py-4 rounded-full shadow-2xl shadow-black/30 hover:bg-[#292524] transition-colors transform hover:-translate-y-1">
          <div className="relative">
            <ShoppingBag size={20} />
            <span className="absolute -top-2 -right-2 bg-[#EA580C] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              2
            </span>
          </div>
          <span className="font-bold text-sm">عرض السلة ($33.50)</span>
          <ChevronRight size={18} className="text-stone-400" />
        </button>
      </div>

    </div>
  );
}