# app/db/client.py
import logging
from prisma import Prisma

# إعداد الـ Logger لمراقبة حالة الاتصال
logger = logging.getLogger(__name__)

prisma_client = Prisma()

async def connect_db():
    try:
        if not prisma_client.is_connected():
            await prisma_client.connect()
            logger.info("✅ Successfully connected to the database (Prisma).")
    except Exception as e:
        logger.error(f"❌ Failed to connect to the database: {e}")
        raise e

async def disconnect_db():
    try:
        if prisma_client.is_connected():
            await prisma_client.disconnect()
            logger.info("🛑 Successfully disconnected from the database (Prisma).")
    except Exception as e:
        logger.error(f"❌ Error while disconnecting from the database: {e}")