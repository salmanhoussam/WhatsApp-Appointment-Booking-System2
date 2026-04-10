import { useState } from 'react';
import { updateUnit } from '../api'; // تأكد أنك تستورد updateUnit وليس updateProperty

export default function ChaletModal({ chalet, onClose, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ ...chalet });

  const handleSave = async () => {
    try {
      // إرسال التحديث للباك إند
      const response = await updateUnit(chalet.id, formData);
      // تحديث الواجهة
      onUpdate(response.data || formData);
      setIsEditing(false);
    } catch (error) {
      alert("حدث خطأ أثناء الحفظ");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96 shadow-2xl">
        <h2 className="text-xl font-bold mb-4">{chalet.name_en}</h2>
        
        {isEditing ? (
          <div className="flex flex-col gap-3">
            <label className="text-sm font-bold">اسم الشاليه:</label>
            <input 
              className="border p-2 rounded"
              value={formData.name_en || ''} 
              onChange={(e) => setFormData({...formData, name_en: e.target.value})} 
            />
            
            <label className="text-sm font-bold">الوصف:</label>
            <textarea 
              className="border p-2 rounded"
              value={formData.description || ''} 
              onChange={(e) => setFormData({...formData, description: e.target.value})} 
            />
            
            <label className="text-sm font-bold">السعة (أشخاص):</label>
            <input 
              type="number" 
              className="border p-2 rounded"
              value={formData.capacity || 0} 
              onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})} 
            />
            
            <div className="flex gap-2 mt-4">
              <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded flex-1 hover:bg-green-700">حفظ</button>
              <button onClick={() => setIsEditing(false)} className="bg-gray-500 text-white px-4 py-2 rounded flex-1 hover:bg-gray-600">إلغاء</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-gray-700">{chalet.description || "لا يوجد وصف حالياً."}</p>
            <p className="font-bold mt-2 text-blue-800">السعة: {chalet.capacity} أشخاص</p>
            
            <div className="flex gap-2 mt-6">
              <button onClick={() => setIsEditing(true)} className="bg-blue-600 text-white px-4 py-2 rounded flex-1 hover:bg-blue-700">تعديل البيانات</button>
              <button onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded flex-1 hover:bg-gray-300">إغلاق</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}