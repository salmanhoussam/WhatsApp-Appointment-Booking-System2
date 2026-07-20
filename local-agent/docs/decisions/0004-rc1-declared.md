# 0004 — RC1 Declared

**Date:** 2026-07-16

## Decision

Phases 1 (core architecture), 2 (local LLM integration), and 2.5 (product-catalog import) are complete, reviewed, and verified. Development stops adding features and enters a controlled dogfooding period: real usage, not more architecture, is what's needed next.

## Definition of RC1 (verbatim)

> RC1 is considered feature complete for the current scope. The purpose of this release is to validate usability, stability, prompt quality, and workflow using real business data. Only isolated bug fixes, prompt improvements, and documentation updates are allowed during RC1. New features are deferred until RC1 is completed.

## Why

Before Phase 3 (WhatsApp, vision/OCR, more plugins) is worth building, the core (Ollama integration, plugin system, catalog import) needs to survive real natural-language usage — real datasets, real phrasing, real failures — not just manual test scenarios. Building more on top of an unproven core would compound any problems real usage surfaces.

## Exit criteria, backlog policy, success metrics

See [../releases/rc1-release-notes.md](../releases/rc1-release-notes.md) for the full, still-current text (exit criteria checklist, backlog policy, success metrics) — not duplicated here to avoid drift between two copies.

## Related

[../STATUS.md](../STATUS.md), [../releases/dogfooding-checklist.md](../releases/dogfooding-checklist.md)
