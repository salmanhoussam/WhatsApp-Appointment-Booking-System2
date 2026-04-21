from datetime import datetime, date, timedelta
from prisma import Prisma
from app.schemas.price import PriceCreate, PriceUpdate
from typing import List, Optional

def to_datetime_start(d: date) -> datetime:
    """Convert date to datetime at start of day (00:00:00)."""
    return datetime.combine(d, datetime.min.time())

def to_datetime_end(d: date) -> datetime:
    """Convert date to datetime at end of day (23:59:59.999999)."""
    return datetime.combine(d, datetime.max.time())

async def get_prices(db: Prisma, client_id: str, unit_id: Optional[str] = None,
                     date_from: Optional[date] = None, date_to: Optional[date] = None) -> List[dict]:
    where = {"clientId": client_id}
    if unit_id:
        where["unitId"] = unit_id
    if date_from or date_to:
        where["date"] = {}
        if date_from:
            where["date"]["gte"] = to_datetime_start(date_from)
        if date_to:
            where["date"]["lte"] = to_datetime_end(date_to)
    return await db.price.find_many(where=where, order={"date": "asc"})

async def get_price(db: Prisma, price_id: str, client_id: str) -> Optional[dict]:
    return await db.price.find_first(
        where={"id": price_id, "clientId": client_id}
    )

async def create_price(db: Prisma, data: PriceCreate) -> dict:
    data_dict = data.model_dump()
    if "client_id" in data_dict:
        data_dict["clientId"] = data_dict.pop("client_id")
    if "unit_id" in data_dict:
        data_dict["unitId"] = data_dict.pop("unit_id")
    if "date" in data_dict and isinstance(data_dict["date"], date):
        data_dict["date"] = to_datetime_start(data_dict["date"])
    return await db.price.create(data=data_dict)

async def update_price(db: Prisma, price_id: str, data: PriceUpdate, client_id: str) -> Optional[dict]:
    existing = await get_price(db, price_id, client_id)
    if not existing:
        return None
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if "client_id" in update_data:
        update_data["clientId"] = update_data.pop("client_id")
    if "unit_id" in update_data:
        update_data["unitId"] = update_data.pop("unit_id")
    if "date" in update_data and isinstance(update_data["date"], date):
        update_data["date"] = to_datetime_start(update_data["date"])
    return await db.price.update(where={"id": price_id}, data=update_data)

async def delete_price(db: Prisma, price_id: str, client_id: str) -> bool:
    existing = await get_price(db, price_id, client_id)
    if not existing:
        return False
    await db.price.delete(where={"id": price_id})
    return True

async def set_bulk_prices(
    db: Prisma,
    client_id: str,
    unit_id: str,
    start_date: date,
    end_date: date,
    price: float,
    weekend_price: Optional[float] = None,
    currency: str = "SAR",
) -> int:
    prices_to_create = []
    current_date = start_date

    while current_date <= end_date:
        is_weekend = current_date.weekday() in [4, 5]  # Friday=4, Saturday=5
        daily_price = weekend_price if (is_weekend and weekend_price) else price

        prices_to_create.append({
            "clientId": client_id,
            "unitId": unit_id,
            "date": to_datetime_start(current_date),
            "price": daily_price,
            "currency": currency,
            "available": True
        })
        current_date += timedelta(days=1)

    await db.price.delete_many(
        where={
            "unitId": unit_id,
            "clientId": client_id,
            "date": {
                "gte": to_datetime_start(start_date),
                "lte": to_datetime_end(end_date)
            }
        }
    )

    created = await db.price.create_many(data=prices_to_create)
    return created