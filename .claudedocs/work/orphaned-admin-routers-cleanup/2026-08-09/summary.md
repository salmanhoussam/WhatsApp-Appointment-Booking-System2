# Orphaned Admin Router Cleanup — Evidence

Follows: `.claudedocs/todo_list.md`'s "Decide the fate of the dead admin CRUD scaffolding" item
(originally logged 2026-07-31), and corrects a mischaracterization of the same finding made in
`.claudedocs/evolution/user-roles-permissions.md`'s 2026-08-09 investigation entry (which called it
a live, reachable, unauthenticated hole — that claim was never re-verified against router
registration before being written down).

## Confirmed Findings

- **Read** `app/api/v1/admin/__init__.py` in full — its import line is:
  `from . import properties, bookings, dashboard, units, settings, team, services, gallery,
  restaurant, store, catalog, upload, reservations, resources, barbers, client_services, fleet,
  content, media, catalog_services`. `customers`, `prices`, `booking_services`, `listings` are
  absent. No `include_router()` call anywhere in the file references them either.
- **Read** `app/main.py` — the only admin-scoped mount is `app.include_router(admin_v1_router,
  prefix="/api/v1/admin")` (line 70), where `admin_v1_router` is exactly the router built in the
  file above. No other file mounts these four modules.
- **Executed** `grep -rn "customers\b" app/main.py app/api/v1/*.py app/api/v1/*/__init__.py` (and
  the equivalent for `prices`, `booking_services`, `listings`) — zero matches referencing the four
  admin router modules (the only `prices`/`listings` hits were unrelated: inline variable names in
  `public/__init__.py`, and `public/listings.py`, a separate, already-mounted public file).
  Re-confirmed post-deletion with a matching grep for `admin.customers|admin.prices|
  admin.booking_services|admin.listings` across `app/` and `frontend/src/` — zero matches.
- **Read** `frontend/src/pages/generic-admin/GenericAdminDashboard.jsx:475` — the "العملاء"
  (Customers) nav tab's `renderTab()` case returns `<ComingSoonTab label="العملاء" ... />`, not any
  component that calls `/admin/customers`.
- **Executed** `grep -rln "customer_service\b" / "price_service\b" / "booking_service_service\b"
  app --include="*.py"`, excluding each module's own dead router — `customer_service` and
  `booking_service_service` have no other importer beyond `app/services/__init__.py`'s star-export;
  `price_service` is imported by `app/api/v1/admin/units.py` and `app/api/v1/public/__init__.py`/
  `app/services/public_service.py` — genuinely live, via already-authenticated paths.
- **Executed** `grep -rln "prisma_client\.customer\b\|\.customer\.\(find|create|update|delete\)"`
  (and the `price`/`bookingservice` equivalents) across `app/` — `Customer`/`Price` rows are read/
  written by `app/repositories/customer_repo.py`, `app/repositories/price_repo.py`,
  `app/services/public_service.py`, `app/services/whatsapp_flow.py`,
  `app/repositories/availability_repo.py`, `app/repositories/public_repo.py` — all real, live,
  already-secured code paths, none of which go through the four deleted files.
- **Executed** `grep -rln "ListingService\|ListingRepository" app --include="*.py"`, excluding the
  dead router — zero other importers; admin-side `ListingService`/`ListingRepository` were fully
  isolated to `admin/listings.py`.
- **Executed** `grep -rln "admin.customers\|admin.prices\|admin.booking_services\|admin\.listings\b"
  app tests` — zero matches; no test coverage referenced any of the four files.
- **Deleted** the four files (`git rm`): `app/api/v1/admin/customers.py`,
  `app/api/v1/admin/prices.py`, `app/api/v1/admin/booking_services.py`,
  `app/api/v1/admin/listings.py`. Left the service/repository layer untouched
  (`customer_service.py`, `price_service.py`, `booking_service_service.py`, `customer_repo.py`,
  `price_repo.py`) since those remain live via other paths.
- **Executed** `venv/bin/python3 -c "from app.main import app; print('OK')"` post-deletion — app
  imports cleanly, confirming no other module depended on the deleted files.

## Side Findings

- `app/api/v1/public/listings.py` (a separate, already-mounted, unrelated file) was momentarily
  confused with the deleted `admin/listings.py` during the grep pass — confirmed distinct by path
  and mount point; not touched.
- `todo_list.md`'s "Least Privilege" entry (line 361) already references
  `app/api/v1/public/listings.py` as a possibly-relevant future building block — unaffected by this
  cleanup, noted only to avoid future confusion between the two same-named files.

## Unknowns

None — every claim above was checked directly (file reads + greps + a real import), not inferred.

## Conclusion

The 2026-08-09 "live unauthenticated hole" claim in `evolution/user-roles-permissions.md` was
incorrect — corrected in that same file's own next dated entry. The real, accurate classification
is: confirmed dead/orphaned admin CRUD scaffolding (Forgotten drift category,
`repository-hygiene.md`), safely deleted as Repository Hygiene, not a security fix.
