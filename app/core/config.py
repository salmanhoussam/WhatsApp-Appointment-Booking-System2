# app/core/config.py
import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # المشروع
    PROJECT_NAME: str = "WhatsApp Appointment Booking System"
    VERSION: str = "1.0.0"
    
    # 🔗 إعدادات قاعدة البيانات (ضرورية لـ Prisma)
    DATABASE_URL: str
    DIRECT_URL: str

    # ⏰ إعدادات المنطقة الزمنية (اختياري)
    TIMEZONE: str = "Asia/Riyadh"
    
    # 🚀 إعدادات إضافية
    ENVIRONMENT: str = "development"  # development / production
    PORT: int = 8000
    
    # 🔐 إعدادات الأمان (للمستقبل إذا أضفنا مصادقة)
    SECRET_KEY: str = os.getenv("SECRET_KEY", "my-super-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 ساعة
    
    # 🌐 إعدادات CORS
    # في الإنتاج: ضع روابط الفرونت اند في متغير FRONTEND_URL على Railway
    # يدعم عدة روابط مفصولة بفاصلة: "https://smar.salmansaas.com,https://dashboard.salmansaas.com"
    FRONTEND_URL: Optional[str] = os.getenv("FRONTEND_URL")

    @property
    def CORS_ORIGINS(self) -> List[str]:
        origins = [
            # Local dev
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://localhost:8000",
            # Production — hardcoded as safety baseline so CORS never
            # breaks if FRONTEND_URL env var is mis-configured on Railway
            "https://salmansaas.com",
            "https://www.salmansaas.com",
            "https://smar.salmansaas.com",
            "https://auth.salmansaas.com",
        ]
        if self.FRONTEND_URL:
            # Additional origins from Railway env var (comma-separated)
            for url in self.FRONTEND_URL.split(","):
                url = url.strip()
                if url and url not in origins:
                    origins.append(url)
        return origins
    
    # 📁 إعدادات رفع الملفات (إذا احتجنا لاحقاً)
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 5 * 1024 * 1024  # 5MB
    ALLOWED_EXTENSIONS: List[str] = [".jpg", ".jpeg", ".png", ".gif", ".webp"]
    
    # 👑 Super admin — slug of the platform owner's client account
    SUPER_ADMIN_SLUG: str = os.getenv("SUPER_ADMIN_SLUG", "smar")

    # 🤖 إعدادات الـ AI
    ANTHROPIC_API_KEY: Optional[str] = os.getenv("ANTHROPIC_API_KEY")
    ONBOARDING_SECRET: Optional[str] = os.getenv("ONBOARDING_SECRET")  # ASCII only

    # 📱 إعدادات واتساب
    WHATSAPP_VERIFY_TOKEN: str = os.getenv("WHATSAPP_VERIFY_TOKEN", "my_secure_token")
    WHATSAPP_ACCESS_TOKEN: Optional[str] = os.getenv("WHATSAPP_ACCESS_TOKEN")
    WHATSAPP_PHONE_NUMBER_ID: Optional[str] = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
    WHATSAPP_BUSINESS_ACCOUNT_ID: Optional[str] = os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID")
    WHATSAPP_API_VERSION: str = "v18.0"  # إصدار API من فيسبوك
    
    # 🧪 إعدادات البيئة المحلية للتطوير
    LOCAL_DOMAINS: List[str] = ["localhost", "127.0.0.1"]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # يتجاهل أي متغيرات إضافية في .env
        case_sensitive = True

    # دالة مساعدة للتحقق من صحة الإعدادات
    def is_development(self) -> bool:
        return self.ENVIRONMENT.lower() == "development"
    
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

# نسخة واحدة مشتركة من الإعدادات
settings = Settings()

# تحذير إذا كان SECRET_KEY هو القيمة الافتراضية في الإنتاج
if settings.is_production() and settings.SECRET_KEY == "my-super-secret-key-change-in-production":
    raise ValueError("⚠️ يجب تغيير SECRET_KEY في بيئة الإنتاج!")