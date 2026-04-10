import os
import uuid
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from supabase import create_client, Client
import logging

logger = logging.getLogger(__name__)

# 🟢 تحميل متغيرات البيئة
load_dotenv(override=True)

router = APIRouter(prefix="/api/v1/admin/upload", tags=["Admin Uploads"])

# إعداد عميل Supabase Storage
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY") # 👈 استخدم Service Role Key للرفع المباشر من الباك أند

if SUPABASE_URL and SUPABASE_SERVICE_KEY:
    supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
else:
    supabase_client = None
    logger.warning("⚠️ Supabase credentials not configured")

# دالة وهمية للحصول على المستخدم الحالي (استبدلها بدالة Auth الخاصة بك)
async def get_current_client():
    # في الكود الحقيقي، هذه الدالة تفك تشفير التوكن وتعيد بيانات المنتجع
    return {"slug": "beitsmar", "id": "123"} 

@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    current_client = Depends(get_current_client) # 👈 استخدمنا get_current_client هنا
):
    """
    رفع صورة شاليه إلى Supabase Storage
    """
    logger.info("🚀 Starting image upload process")
    
    if not supabase_client:
        logger.error("❌ Supabase client not configured")
        raise HTTPException(500, "Storage server not configured")

    slug = current_client.get("slug")
    if not slug:
        raise HTTPException(403, "Unauthorized: No client slug")

    # التحقق من نوع الملف
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(400, f"Invalid file type. Allowed: {allowed_types}")

    # تحديد المسار واسم الصورة
    file_extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    
    # 👈 التعديل الأهم: رفع الصورة لمجلد المنتجع في الباكيت properties
    file_path = f"{slug}/units/{unique_filename}" 
    
    logger.info(f"📌 Uploading image to path: {file_path}")

    try:
        # قراءة محتوى الملف
        file_bytes = await file.read()
        
        # التحقق من حجم الملف (حد 5MB)
        if len(file_bytes) > 5 * 1024 * 1024:
            raise HTTPException(400, "File too large. Max 5MB")
        
        # رفع الملف إلى Supabase (تأكد أن لديك bucket باسم properties)
        supabase_client.storage.from_("properties").upload(
            file_path, 
            file_bytes, 
            {
                "content-type": file.content_type,
                "cache-control": "3600",
                "upsert": "true" # 👈 لتجاوز الأخطاء إذا تم رفع نفس الاسم
            }
        )
        
        # جلب الرابط العام
        public_url = supabase_client.storage.from_("properties").get_public_url(file_path)
        
        logger.info(f"✅ Upload successful! URL: {public_url}")
        
        return {
            "image_url": public_url,
            "file_path": file_path,
            "message": "Image uploaded successfully"
        }
        
    except Exception as e:
        logger.error(f"🔥 Upload error: {e}", exc_info=True)
        raise HTTPException(500, f"Upload failed: {str(e)}")