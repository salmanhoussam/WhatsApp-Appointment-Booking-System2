// الرابط الأساسي للباك إند (قسم الإدارة)
const BASE_URL = "http://127.0.0.1:8000/api/v1/admin";

/**
 * دالة لجلب جميع الشاليهات (Units) من الباك إند
 */
export const getUnits = async (clientId) => {
  try {
    const response = await fetch(`${BASE_URL}/units?client_id=${clientId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error("فشل في جلب الشاليهات");
    }
    
    const data = await response.json();
    // نرجع البيانات داخل كائن { data } لكي يتطابق مع كود res.data الموجود في الداشبورد
    return { data }; 
  } catch (error) {
    console.error("Error fetching units:", error);
    return { data: [] }; // إرجاع مصفوفة فارغة في حال حدوث خطأ لتجنب توقف الصفحة
  }
};

/**
 * دالة لتحديث بيانات شاليه معين (مثلاً لتغيير السعر أو الحالة من ChaletModal)
 */
export const updateUnit = async (unitId, updateData, clientId) => {
  try {
    const response = await fetch(`${BASE_URL}/units/${unitId}?client_id=${clientId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      throw new Error("فشل في تحديث بيانات الشاليه");
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error("Error updating unit:", error);
    throw error;
  }
};