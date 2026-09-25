"""Patient Service — the ONE write path for the Clinic Patient Identity layer.

Clinic P2, 2026-09-25. Contract: .claudedocs/implementation/CLINIC_P2_PATIENT_IDENTITY_CONTRACT.md
Domain contract C1: .claudedocs/plans/clinic-vertical-pre-implementation-plan-2026-09-25.md §2

WHY THIS LAYER EXISTS, measured rather than predicted (P0.5, 2026-09-25): three of ten real
`Customer` rows already carry reservations under MORE THAN ONE name. One holds SEVEN people. The
system's identity is the phone, and a phone is not a person.

    Contact  = `Customer`. A number that can be reached. NEVER modified by this module.
    Patient  = the person an appointment is FOR, and the future owner of a record.

THE FIVE RULES THIS MODULE ENFORCES, each of them a decision Salman took on 2026-09-25:

  1. A patient's canonical identity is `Patient.id`. Not the phone, not the name, not the
     conversation.
  2. Matching happens INSIDE ONE CONTACT'S OWN LIST and nowhere else. A cross-contact match
     would reveal that a patient exists to someone who has no relationship with them.
  3. A match is a QUESTION, never a merge. Two candidates is an answer the caller must ask
     about, not choose between.
  4. There is NO `_within_one_edit` here, and its absence is the decision. Lia uses one-character
     tolerance to match a SERVICE, where a wrong guess costs a re-ask. Here a wrong guess merges
     two human beings.
  5. A `Customer` is never converted into a `Patient`, implicitly or in bulk.

NO CLINICAL DATA. This module stores a name and a link, and nothing else. The Medical Data
Boundary (plan §2 C5) is an architecture contract, not a prompt instruction: there is no column
to write a diagnosis into, and `scripts/test_clinic_patient_identity.py` MD-1 fails the build if
one appears.
"""

import logging
import re
from typing import Optional

from app.repositories import patient_repo

logger = logging.getLogger(__name__)

VALID_ROLES = ("self", "guardian", "other")


class PatientAccessDenied(Exception):
    """A patient id that is real in this tenant but does NOT belong to the asking contact.

    Kept distinct from "not found" on purpose: a caller must be able to audit the difference
    between an unknown id and a real one being reached for by the wrong person.
    """


# Arabic folding, for name comparison only.
#
# A DELIBERATE COPY of `lia_owner_entry._fold_ar`, not an import, and the reason is a scope
# constraint rather than taste: P2 is forbidden from touching Lia (Salman, 2026-09-25), and
# importing a private helper out of a 5k-line service would couple the clinic layer to the
# assistant. This is the SECOND real use of this folding, which is exactly when this project's
# Abstraction Rule says extraction becomes arguable -- so extraction is a separate decision with
# its own contract, not something smuggled in here.
#
# The ذ/ث/ظ folds that Lia's table carries are NOT included. Those were added for matching a
# SERVICE the owner typed fast («دقن» for «ذقن»), where a wrong match costs a re-ask. Folding
# them between two PEOPLE's names could merge two different patients, which is the one outcome
# this module exists to prevent.
_AR_FOLD = (("أ", "ا"), ("إ", "ا"), ("آ", "ا"), ("ى", "ي"), ("ة", "ه"), ("ـ", ""))


def fold_name(text: str) -> str:
    """Lowercase, strip punctuation and diacritics, fold the alef/ya/ta-marbuta spellings."""
    low = (text or "").strip().lower()
    for src_ch, dst in _AR_FOLD:
        low = low.replace(src_ch, dst)
    low = re.sub(r"[ً-ْ]", "", low)
    low = re.sub(r"[^\w\s]", " ", low, flags=re.UNICODE)
    return " ".join(low.split())


async def list_for_contact(client_id: str, customer_id: str) -> list[dict]:
    """Every patient this contact is responsible for. The ONLY list a booking path may offer."""
    links = await patient_repo.list_patients_for_contact(client_id, customer_id)
    out: list[dict] = []
    for link in links:
        p = getattr(link, "patient", None)
        if p is None or not p.isActive:
            continue
        out.append({"patient_id": p.id, "name": p.name, "role": link.role})
    return out


async def match_in_contact(client_id: str, customer_id: str, name: str) -> dict:
    """Is this name already one of THIS contact's patients?

    Returns one of three shapes, and the three are the whole contract:

        {"status": "none"}                          -> create a new patient
        {"status": "one",  "candidate": {...}}      -> ASK, never assume
        {"status": "many", "candidates": [...]}     -> ASK which, never choose

    "one" is not "yes". It is a single candidate the CALLER must put to the human, because two
    people genuinely share a name often enough that this project has already shipped a contract
    for it in the barber daily log (علي ×2, 2026-09-23, where the owner's answer was "leave them
    separate"). This function never writes and never decides.
    """
    folded = fold_name(name)
    if not folded:
        return {"status": "none"}
    hits = [p for p in await list_for_contact(client_id, customer_id)
            if fold_name(p["name"]) == folded]
    if not hits:
        return {"status": "none"}
    if len(hits) == 1:
        return {"status": "one", "candidate": hits[0]}
    return {"status": "many", "candidates": hits}


async def assert_contact_may_act(client_id: str, patient_id: str,
                                 customer_id: Optional[str]) -> None:
    """May this contact act for this patient? Raises rather than returning False.

    `customer_id=None` is the staff case (an appointment entered at the desk for a walk-in who
    has no number). It checks tenant ownership only -- a human at the desk is the authority, and
    the route's own permission gate is what stands behind them.
    """
    patient = await patient_repo.find_patient(client_id, patient_id)
    if patient is None:
        raise PatientAccessDenied("patient_not_found_in_tenant")
    if customer_id is None:
        return
    link = await patient_repo.find_link(client_id, patient_id, customer_id)
    if link is None:
        raise PatientAccessDenied("patient_not_linked_to_contact")


async def create_patient(client_id: str, name: str, customer_id: Optional[str] = None,
                         role: str = "self") -> dict:
    """Create a patient, and optionally link the contact who is responsible for them.

    `customer_id=None` creates a patient with NO contact, and that is a valid, intended state --
    the walk-in who arrived without a number. It is NOT the barber `WALK_IN` sentinel: that is a
    single shared `Customer` row holding seven real people today, and the clinic never reads it.

    Never raises on a duplicate name. Deciding whether two same-named people are one person is
    `match_in_contact`'s question for a human, and answering it here would be the silent merge
    this whole module exists to prevent.
    """
    name = (name or "").strip()
    if len(name) < 2:
        raise ValueError("A patient needs a name.")
    if role not in VALID_ROLES:
        raise ValueError(f"Invalid role. Use: {list(VALID_ROLES)}")

    patient = await patient_repo.create_patient(client_id, name)
    link = None
    if customer_id:
        link = await patient_repo.create_link(client_id, patient.id, customer_id, role)
    logger.info("🩺 patient created client=%s patient=%s linked=%s",
                client_id, patient.id, bool(link))
    return {"patient_id": patient.id, "name": patient.name,
            "linked_contact": customer_id if link else None,
            "role": link.role if link else None}


async def link_contact(client_id: str, patient_id: str, customer_id: str,
                       role: str = "other") -> dict:
    """Attach a SECOND (or third) contact to an existing patient.

    This is what makes "the same patient books from two different numbers" work without creating
    a second patient -- IG-4. The unique constraint on (patient_id, customer_id) makes a repeat
    call harmless; it is checked here first so the caller gets a fact rather than an exception.
    """
    if role not in VALID_ROLES:
        raise ValueError(f"Invalid role. Use: {list(VALID_ROLES)}")
    patient = await patient_repo.find_patient(client_id, patient_id)
    if patient is None:
        raise PatientAccessDenied("patient_not_found_in_tenant")
    existing = await patient_repo.find_link(client_id, patient_id, customer_id)
    if existing is not None:
        return {"patient_id": patient_id, "customer_id": customer_id,
                "role": existing.role, "created": False}
    link = await patient_repo.create_link(client_id, patient_id, customer_id, role)
    return {"patient_id": patient_id, "customer_id": customer_id,
            "role": link.role, "created": True}
