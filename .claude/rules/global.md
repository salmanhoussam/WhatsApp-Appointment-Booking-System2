# Global Rules — Always Active

## Multi-Tenancy (CRITICAL)
Every DB query MUST filter by clientId or slug. No exceptions. Never return cross-tenant data.

## 4-Layer Architecture
Routes → Services → Repositories → DB
Zero business logic in Routes. Zero Prisma calls outside Repositories.

## Session Protocol
START:  /session-open
END:    /session-close
DEPLOY: /audit --pre-deploy

## Zero Hallucination
Read files before writing any code. Never invent variables, endpoints, or model fields.
Use tools to verify file contents before editing.
