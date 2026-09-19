# R0-2 (option ب) + review of the reservation registration path — 2026-09-19 · build d3d6785

## R0-2 (ب) — live
Input (Salman, from 96178727986, 17:31:35 EEST): «سجل موعد لأحمد مبارح الساعة 4 شعر مع سامي».
Log (`r0-2b-railway-backend.txt`, fetched directly):
`lia_extract_raw sender=…7986 state=None op=create_reservation stop=end_turn tok=1092/88 raw_len=230 json=ok schema=ok
intent=create_reservation confidence=low unresolved=['customer_phone'] customer_name=present customer_phone=absent
reserved_at=2026-09-18T16:00:00 reserved_at_iso=ok service_name=قص شعر barber_name=سامي notes=absent other_keys=0`
Phone: «ما فهمت الموعد…» (reservation_unclear). DB (sealed read): 0 reservations · 0 customers · 0 audit rows (no
draft) · rk 0 · mr-h 0 · 0 write attempts.

| | R0-1 | R0-2 (ب) |
|---|---|---|
| schema / intent | ok / create_reservation | ok / create_reservation |
| confidence | low | **low** |
| missing | phone, barber | **phone only** |
| reserved_at | 2026-09-18T16:00 ✓ | 2026-09-18T16:00 ✓ |
| service / barber | «قص شعر» (typed «شعر») / — | «قص شعر» (typed «شعر») / سامي ✓ |
| draft | no | no |

CONFIRMED: with every field present and correct except the customer's phone, the production model still says
`low`, and the `confidence == "low"` guard alone stops the draft. NOT separated: a (always low) vs b (the missing
phone makes it low) — no attempt with a phone was made (no real test number).

Side observation: two DROPPED messages from 96178727986 at 17:23:42 and 17:24:03 EEST, between R0-1 and R0-2 —
content not logged. If they were replies to «ما فهمت», that is Finding 06 reproduced. UNKNOWN until Salman says what
they were.

## Salman's proposal (2026-09-19, verbatim intent)
«نستخرج الكلام المفيد من الجملة، نبعت JSON، والسيرفر يسجّل الحجز مش ليا. ولما تنطلب موافقة الأونر، السيرفر لازم يوافق
على الـJSON إنّه صح، بعدها نعرضه على صاحب المحل يأكّده، ونكتبه بالداتابيز.»
(Read «السيدر» as «السيرفر» — the backend.)

## The registration path as it is today — read, not recalled

| # | Step | Who decides | Where |
|---|---|---|---|
| 1 | Is this a reservation? | **code** (verbs/nouns) | `_entry_family` :184 |
| 2 | Is the sender an owner, allowed this operation? | **code** (C → ① → A → B) | `try_handle` |
| 3 | Sentence → JSON | **model** | `_extract_reservation` :779 · prompt block in `lia.md` |
| 4 | JSON shape valid? | **code** (pydantic, `extra="forbid"`, intent pinned) | `_ask_model` → `LiaReservationExtraction` |
| **5** | **Draft or «ما فهمت»?** | **🔴 the MODEL — its own `confidence`** | `try_handle` ~:2250 `extraction.confidence == "low"` |
| 6 | Missing fields → one question each | **code** | `_advance` :2330 · `_op_spec` :1181 |
| 7 | Values valid (lengths, date, no offset conversion) | **code** | `LiaReservationDraft` (lia_drafts.py:316) |
| 8 | Names → real ids of THIS tenant; unknown → question with the real list | **code** | `_resolve_reservation_rows` :1257 |
| 9 | Past or future | **code** | `_is_past` :1309 |
| 10 | Preview → owner presses ✅ | **owner** | `_reservation_preview_text` :1354 |
| 11 | Re-authorise at write time | **code** | `_still_authorised` (D9) |
| 12 | Write | **server** — `reservation_service.create_reservation`, never the model | `_write_reservation` :1672 |

**Finding: Salman's pipeline already exists, except for ONE step.** The model never writes, never emits an id, and
never chooses a barber or service; the server validates, resolves, previews and writes. The single place where the
model's opinion overrides the server is **step 5**: the model grades itself `low` and the server obeys without
checking anything, BEFORE steps 6–9 get to look at the JSON. That is exactly the step both live attempts died at.

## Recommendation (not a decision, not executed)
Replace step 5 for reservations: the server decides from the JSON, the model's confidence no longer gates.
```
schema invalid (extraction is None)          → «ما فهمت» — as today
schema valid                                 → draft opens → step 6 asks for what is missing
                                               (a missing or unparseable reserved_at is asked like any field)
confidence                                   → kept in the lia_draft_opened audit only (information, not a gate)
```
- This is plan v2's R1-C, made unconditional for reservations, and it makes the a-vs-b question moot: if the
  server no longer obeys `low`, why the model says `low` stops mattering. R0 has done its job.
- It matches Salman's second point literally: server validates → owner sees the preview → owner confirms → write.
  The owner's ✅ stays the only door to the database.
- Scope: reservation only. Service/product have the same gate; widening is a separate decision.

Risks, stated:
- A misread date reaches the preview instead of «ما فهمت» → visible, cancellable, nothing written without ✅.
- The prompt uses `low` to flag «more than one appointment in one message». Without the gate, the draft carries one
  of them silently. Needs a decision: accept (the preview shows which one), or keep `low` as a gate for that one case
  only (requires the model to say why — a contract change).
- R2 (a reply after «ما فهمت» is dropped) shrinks — «ما فهمت» becomes rare — but does not disappear.
- The model rewrote «شعر» → «قص شعر» twice. Harmless today (matching finds «شعر», and the preview shows the stored
  name), but it is the model adding words.
