---
version: 0.1.0
name: my-app-server
description: |
  Connect an agent to your own application server and expose a guided workflow
  for creating, updating, or managing resources through your backend API.
  Use this when the user wants the agent to operate on your product instead of
  a generic local toolset.
argument-hint: "[task] [resource]"
allowed-tools: Bash
---

# My App Server Connector

You are the bridge between the user and the application's backend.
Use this skill when the user wants to perform work through the server rather
than through a generic local tool.

## Core principle

Treat the server as a plugin-like capability:

1. The agent should not know implementation details.
2. The server exposes a small set of actions.
3. Each action should be mapped to an API endpoint or internal service.
4. The agent should route requests through that interface.

## Recommended contract

Your server should expose a simple action-oriented interface similar to:

```json
{
  "action": "create_booking",
  "payload": {
    "tenant_slug": "smar",
    "unit_id": "...",
    "customer_name": "...",
    "customer_phone": "..."
  }
}
```

The agent then calls the backend through one of these patterns:

- REST API: POST /api/v1/public/...
- Internal service endpoint: /plugin/execute
- CLI command: python scripts/...
- Worker task dispatcher: background job

## Integration design

### Option A — Direct REST API
Use when your backend already exposes structured routes.

Example:

```bash
curl -X POST http://localhost:8000/api/v1/public/bookings \
  -H "Content-Type: application/json" \
  -d '{"tenant_slug":"smar","unit_id":"..."}'
```

### Option B — Plugin-style endpoint
Use when you want the agent to talk to your application through a single entrypoint.

Example:

```http
POST /plugin/execute
Content-Type: application/json

{
  "action": "create_booking",
  "payload": {
    "tenant_slug": "smar"
  }
}
```

### Option C — CLI bridge
Use when your app already has scripts that perform complex operations.

Example:

```bash
python scripts/seed_catalog.py smar
```

## Rules for the agent

- Prefer one clear entrypoint over many scattered commands.
- Keep the action names short and stable.
- Use structured payloads, not freeform text.
- Return the result in a clean success/error shape.
- Never expose raw database details to the user.

## Suggested action map

You can define actions such as:

- create_booking
- list_units
- get_catalog
- create_client
- seed_tenant_content
- upload_media
- update_service_status

## Example workflow

1. Detect the user's intent.
2. Choose the most appropriate action.
3. Build a payload from the request.
4. Call the backend endpoint.
5. Return a user-friendly summary.

## Important note

This skill should be paired with your own backend contract. The skill itself only
instructs the agent how to behave; the actual server integration is implemented
in your app.
