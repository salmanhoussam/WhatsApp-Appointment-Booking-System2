# Lia live — 2026-09-19 · summary

**Status: CLOSED for this session.** R0 answered its question and was removed; R1 is live and verified; defaults +
preview editing deployed (e290e59) but NOT yet exercised live.

| Evidence | What it proves |
|---|---|
| `r0-1.md` + `r0-1-railway-backend.txt` | model reads the reservation correctly yet says `low` (S-2) |
| `r0-2b-and-registration-review.md` + `r0-2b-railway-backend.txt` | same with only the phone missing; 11/12 pipeline steps are already server-side; the confidence gate is the one exception |
| `r1-live-reservation-created.md` + `r1-live-db.txt` + `r1-live-railway-backend.txt` | **first reservation created by Lia from a sentence** (86efa834), every field checked |

Unknowns carried: a-vs-b never separated (moot after R1) · two DROPPED messages at 17:23/17:24 (content unknown) ·
defaults + edit at the preview not yet tested live · Step 3 (links) blocked.
