from app.db.client import prisma_client
from passlib.context import CryptContext

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Creator ────────────────────────────────────────────────────────────────

async def get_creator_by_phone(phone: str):
    return await prisma_client.occasioncreator.find_unique(where={"phone": phone})

async def get_creator_by_email(email: str):
    return await prisma_client.occasioncreator.find_unique(where={"email": email})

async def get_creator_by_id(creator_id: str):
    return await prisma_client.occasioncreator.find_unique(where={"id": creator_id})

async def create_creator(name: str, phone: str, password: str, email: str | None = None):
    return await prisma_client.occasioncreator.create(data={
        "name": name,
        "phone": phone,
        "email": email,
        "password_hash": pwd_ctx.hash(password),
    })

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)


# ── OccasionPage ───────────────────────────────────────────────────────────

async def create_page(creator_id: str, data: dict):
    return await prisma_client.occasionpage.create(data={"creator_id": creator_id, **data})

async def get_page_by_slug(slug: str):
    return await prisma_client.occasionpage.find_unique(
        where={"slug": slug},
        include={"rsvps": True},
    )

async def get_pages_by_creator(creator_id: str):
    return await prisma_client.occasionpage.find_many(
        where={"creator_id": creator_id},
        order={"created_at": "desc"},
    )

async def update_page(page_id: str, creator_id: str, data: dict):
    return await prisma_client.occasionpage.update_many(
        where={"id": page_id, "creator_id": creator_id},
        data=data,
    )

async def delete_page(page_id: str, creator_id: str):
    return await prisma_client.occasionpage.delete_many(
        where={"id": page_id, "creator_id": creator_id},
    )


# ── RSVP ───────────────────────────────────────────────────────────────────

async def create_rsvp(page_id: str, data: dict):
    return await prisma_client.occasionrsvp.create(data={"page_id": page_id, **data})

async def get_rsvps_by_page(page_id: str):
    return await prisma_client.occasionrsvp.find_many(
        where={"page_id": page_id},
        order={"created_at": "desc"},
    )
