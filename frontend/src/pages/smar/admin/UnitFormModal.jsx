import React, { useState, useEffect } from 'react';

export default function UnitFormModal({ isOpen, onClose, unit, onSave }) {
  const [formData, setFormData] = useState({
    name_ar: '',
    capacity: 2,
    bedrooms: 1,
    bathrooms: 1,
    image_url: '',
  });

  // Hydrate form when opening in Edit mode or reset for Add mode
  useEffect(() => {
    if (unit) {
      setFormData({
        name_ar: unit.name_ar || unit.name || '',
        capacity: unit.capacity || 2,
        bedrooms: unit.bedrooms || 0,
        bathrooms: unit.bathrooms || 0,
        image_url: unit.image_url || '',
      });
    } else {
      setFormData({
        name_ar: '',
        capacity: 2,
        bedrooms: 1,
        bathrooms: 1,
        image_url: '',
      });
    }
  }, [unit, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Auto-cast number fields to integers
    const isNumberField = ['capacity', 'bedrooms', 'bathrooms'].includes(name);
    setFormData((prev) => ({ 
      ...prev, 
      [name]: isNumberField ? parseInt(value) || 0 : value 
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Prepare the payload mimicking the UnitUpdate schema expectations
    const updatedData = {
      ...formData,
      images: formData.image_url ? [formData.image_url] : []
    };
    
    // Call the parent's save handler and close 
    onSave(updatedData);
    onClose();
  };

  // Do not render if closed
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
      <div 
        className="w-full max-w-lg p-6 bg-[#16161a]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-white mb-6">
          {unit ? 'Edit Unit Details' : 'Add New Unit'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name Field */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Unit Name
            </label>
            <input 
              type="text" 
              name="name_ar"
              value={formData.name_ar} 
              onChange={handleChange} 
              placeholder="e.g. Royal Chalet (شاليه رويال)"
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#d4a853] focus:ring-1 focus:ring-[#d4a853] transition-all"
              required 
            />
          </div>

          {/* Numeric Specs - Row */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Capacity
              </label>
              <input 
                type="number" 
                name="capacity"
                value={formData.capacity} 
                onChange={handleChange} 
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-center focus:outline-none focus:border-[#d4a853] transition-all"
                min="1"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Beds
              </label>
              <input 
                type="number" 
                name="bedrooms"
                value={formData.bedrooms} 
                onChange={handleChange} 
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-center focus:outline-none focus:border-[#d4a853] transition-all"
                min="0"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Baths
              </label>
              <input 
                type="number" 
                name="bathrooms"
                value={formData.bathrooms} 
                onChange={handleChange} 
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-center focus:outline-none focus:border-[#d4a853] transition-all"
                min="0"
              />
            </div>
          </div>

          {/* Image URL Field */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Primary Image URL
            </label>
            <input 
              type="text" 
              name="image_url"
              value={formData.image_url} 
              onChange={handleChange} 
              placeholder="https://example.com/image.jpg"
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#d4a853] transition-all text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end items-center gap-4 pt-6 border-t border-white/10 mt-6">
            <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-bold tracking-wide text-gray-400 hover:text-white transition-colors"
            >
              CANCEL
            </button>
            <button 
              type="submit"
              className="px-8 py-2.5 text-sm font-black tracking-widest text-[#0a0a0f] bg-gradient-to-r from-[#d4a853] to-[#b8893a] rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(212,168,83,0.3)]"
            >
              {unit ? 'SAVE CHANGES' : 'CREATE UNIT'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
