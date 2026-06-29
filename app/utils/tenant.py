from fastapi import Request, HTTPException
from app.core.config import settings
from app.db.client import prisma_client  # ✅ تم التصحيح هنا
import logging
import re

logger = logging.getLogger(__name__)

async def get_client_from_subdomain(request: Request) -> str:
    """
    استخراج client_id من subdomain (أو من query parameter slug)
    """
    host = request.headers.get("host", "")
    logger.info(f"📡 Request host: {host}")
    
    host_without_port = host.split(":")[0]
    
    # 1️⃣ التحقق من وجود slug في query parameters (للتطوير)
    slug_from_query = request.query_params.get("client_slug")
    if slug_from_query:
        logger.info(f"🏢 Using client slug from query: {slug_from_query}")
        # ✅ تم التصحيح هنا: استخدام prisma_client
        client = await prisma_client.client.find_first(where={"slug": slug_from_query})
        if client:
            return client.id
        else:
            raise HTTPException(status_code=404, detail="Client not found")
    
    # 2️⃣ البيئة المحلية
    if host_without_port in settings.LOCAL_DOMAINS:
        logger.warning("⚠️ Local development: expecting X-Client-ID header")
        raise HTTPException(
            status_code=400,
            detail="For local development, provide X-Client-ID header or ?client_slug=..."
        )
    
    # 3️⃣ استخراج slug من subdomain
    if host_without_port.endswith(settings.MAIN_DOMAIN):
        slug = host_without_port.replace(f".{settings.MAIN_DOMAIN}", "")
        
        if "." in slug:
            slug = slug.split(".")[0]
        
        logger.info(f"🏢 Extracted client slug: {slug}")
        
        if re.match(r"^[a-zA-Z0-9-]+$", slug):
            # ✅ تم التصحيح هنا: استخدام prisma_client
            client = await prisma_client.client.find_first(where={"slug": slug})
            if client:
                return client.id
            else:
                raise HTTPException(status_code=404, detail=f"Client '{slug}' not found")
    
    # 4️⃣ لم نجد أي slug
    raise HTTPException(
        status_code=400,
        detail="Client identifier not found. Use X-Client-ID header or subdomain."
    )