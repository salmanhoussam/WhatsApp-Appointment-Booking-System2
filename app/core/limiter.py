"""
The single rate limiter. Keyed by the REAL client IP, not the proxy's.

WHY NOT `get_remote_address` (2026-09-12). slowapi's default key function reads
`request.client.host`, which behind this topology is the PROXY, never the visitor — Railway
terminates TLS at a proxy and Cloudflare fronts it. So every limited endpoint shared ONE bucket
per worker: `@limiter.limit("5/minute")` on login was not "5 per attacker", it was "5 per minute
for everybody", and one person fumbling their password could lock out a real tenant.

`client_ip_from` is not new logic written here — it is the resolver already measured against real
production rows (security_audit_service.py:78, verified 2026-09-07: `request.client.host` returned
Cloudflare's edge 104.22.40.135 while the real client was 185.187.131.151, which is why
CF-Connecting-IP is checked first). `app/core/auth_lockout.py:46` already keys the auto-ban by it.
That was the actual defect's shape: two different notions of "who is calling" inside the SAME auth
path — the lockout counting real clients while the rate limiter counted the proxy.

Imported from `app.services` following the precedent already set by `core/auth_lockout.py` and
`core/tenant.py`, rather than copying the resolver into core — one capability, one implementation
(rules/backend/architecture.md §9).

STILL TRUE AND NOT FIXED HERE: storage is in-process, and the Dockerfile runs `gunicorn -w 2`, so
each worker keeps its own counters and a real per-IP limit is enforced at roughly 2× its stated
value. That needs shared storage (Redis) — new infrastructure, its own decision. It is now a
factor-of-two on a limit that actually targets the right person, instead of a limit aimed at the
wrong one.
"""
from slowapi import Limiter

from app.services.security_audit_service import client_ip_from

limiter = Limiter(key_func=client_ip_from)
