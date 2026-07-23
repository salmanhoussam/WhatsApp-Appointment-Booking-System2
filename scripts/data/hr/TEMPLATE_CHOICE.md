# Why `booking.json`, not `store.json`

Confirmed by reading both templates directly, not assumed: `store.json` has no `hours`,
`location`, or `story` section — its shape (`offers`/`categories_grid`/`featured_items`/`cta`) is
built for browse-and-checkout retail. `booking.json` has `hours` (real shop opening hours) and
`location` (a physical address a walk-in client needs) plus a `story` section — the shape an
appointment-based, single-physical-location service business like RK Barber Shop actually needs.
`featured_items` (shared by both templates) covers the service/product catalog either way.
