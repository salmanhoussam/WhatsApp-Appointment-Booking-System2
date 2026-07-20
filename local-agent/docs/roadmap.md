# Roadmap (Phase 3+)

Forward-looking only. None of this is started, and none of it begins until RC1 exit criteria are satisfied (see [STATUS.md](STATUS.md)).

- **WhatsApp integration** — as an input layer in front of the existing agent; the agent code itself shouldn't need to change, only a new entrypoint alongside `app/routes.py`.
- **Vision / OCR** — `agents/vision_agent.py` exists as a stub (`handle_image(image_bytes) -> str`, `NotImplementedError`). Will require a real routing decision in `agents/command_agent.py` (currently text-only) — see [architecture/agent.md](architecture/agent.md)'s "known rough edge" note.
- **More plugins** — MySQL, SQL Server, a local POS API, Odoo, Square. Placeholder folders with a README each already exist under `plugins/`. See [guides/adding-a-plugin.md](guides/adding-a-plugin.md).
- **More import types** — customer, invoice, and inventory import (only product catalog import exists today). Building a second import type is also the trigger condition for reconsidering whether `services/catalog_import_service.py` should become a shared Import Engine — see [decisions/0002](decisions/0002-shared-vs-concrete-abstraction-rule.md).
- **Dynamic schema from `/agent/setup`'s context** — today the schema is fixed regardless of what business context is sent; a future version could actually shape the schema from it.
- **Known limitations becoming real fixes** — persistent Job IDs, error classification, an automated test suite, connection pooling. Currently deferred (see `STATUS.md`), not because they're unimportant, but because RC1's purpose is proving the current design with real usage first.

This list is not commitments or estimates — it's the set of things intentionally *not* being built right now, so nobody re-proposes them mid-RC1.
