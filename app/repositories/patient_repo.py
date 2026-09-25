"""Patient Repository — Prisma queries for the Clinic Patient Identity layer.

Clinic P2, 2026-09-25. Queries ONLY. No business logic, no folding, no matching decision --
those live in `app/services/patient_service.py`, which is the single write path.

EVERY function takes `client_id` and puts it in the `where` clause. Not one of them can be
called without it, and that is deliberate rather than conventional: a patient list leaking
across tenants is the worst failure this layer can have.

The Arabic folding that decides whether two spellings are the same person happens in the SERVICE
layer, never here -- Postgres does not fold «أحمد» and «احمد» the way this codebase does, and a
half-match in SQL would be worse than none. Same reasoning `customer_repo.list_for_client`
already records for the same problem.
"""

from typing import Optional

from app.db.client import prisma_client


async def find_patient(client_id: str, patient_id: str):
    """One patient, scoped to the tenant. Returns None for another tenant's id."""
    return await prisma_client.patient.find_first(
        where={"id": patient_id, "clientId": client_id}
    )


async def list_patients_for_contact(client_id: str, customer_id: str) -> list:
    """Every patient this ONE contact is responsible for, with the link rows.

    This is the only lookup the booking path is allowed to use for "who might this appointment
    be for". Deliberately scoped to one contact: a match ACROSS contacts would reveal that a
    patient exists to someone who has no relationship with them.
    """
    return await prisma_client.patientcontact.find_many(
        where={"clientId": client_id, "customerId": customer_id},
        include={"patient": True},
        order={"createdAt": "asc"},
    )


async def find_link(client_id: str, patient_id: str, customer_id: str):
    """The link row between one patient and one contact, or None.

    This is what answers "may THIS contact act for THIS patient" -- the question SEC-3 refuses
    on. A caller must never infer the answer from the patient merely existing in the tenant.
    """
    return await prisma_client.patientcontact.find_first(
        where={"clientId": client_id, "patientId": patient_id, "customerId": customer_id}
    )


async def create_patient(client_id: str, name: str):
    return await prisma_client.patient.create(
        data={"clientId": client_id, "name": name}
    )


async def create_link(client_id: str, patient_id: str, customer_id: str, role: str):
    return await prisma_client.patientcontact.create(
        data={"clientId": client_id, "patientId": patient_id,
              "customerId": customer_id, "role": role}
    )


async def list_patients_for_client(client_id: str, active_only: bool = True) -> list:
    """Every patient of ONE tenant. For an admin surface that does not exist yet (P7).

    Present because the deterministic detector's "is this a duplicate" question is asked against
    a contact's own list, and a future admin search will need the tenant-wide one; kept here so
    both live behind the same tenant-scoping rule.
    """
    where: dict = {"clientId": client_id}
    if active_only:
        where["isActive"] = True
    return await prisma_client.patient.find_many(where=where, order={"createdAt": "asc"})


async def find_reservation_patient(client_id: str, reservation_id: str) -> Optional[str]:
    """The patientId on one reservation, tenant-scoped. Returns None when unset or not ours."""
    row = await prisma_client.reservation.find_first(
        where={"id": reservation_id, "clientId": client_id}
    )
    return getattr(row, "patientId", None) if row else None
