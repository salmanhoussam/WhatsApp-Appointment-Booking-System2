# Capability Reference Extraction — Comparison

Four Capabilities, each extracted from a Reference Product, not graded as a demo. Full detail per
Capability: `reservation.md`, `stay-booking.md`, `store.md`, `restaurant.md` (this folder).

| Capability | Reference(s) | Status | Recommendation |
|---|---|---|---|
| Reservation / Appointment | `hr` (target tenant, currently on the old path) + WhatsApp Appointment (old zip, comparison only) | Backend built, unwired; frontend incomplete | Build the Catalog↔Reservation bridge and a real Availability/Working-Hours engine before any real Barber pilot goes live on this Capability |
| Stay Booking | `smar` | Mature, working, structurally separate from Reservation | Keep as its own Capability, don't merge with Reservation; good reference for a future second stay-type tenant |
| Store | `footlab` | Mature, already generalized | Fix the silent WhatsApp no-op in the shared `CartPage.jsx`; add real `Variant`/`Discount`/Inventory models to replace the loose `metadata` bag |
| Restaurant | `caracas` | Good structure, broken wiring | Connect `MenuPage.jsx` to the real backend order endpoint first; only then generalize into a shared layer the way Store already was |

## What this extraction did not decide

Per Salman's own explicit sequencing: this is where the four Capability extractions stop. No decision
was made here about what enters the next generation of the platform versus what stays tenant-specific
— that's a separate sit-down, after all four are read, not something this document resolves on its
own.
