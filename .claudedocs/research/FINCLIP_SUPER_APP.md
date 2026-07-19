# Research Note — FinClip (Super App / Mini-Program Platform)

**Status:** Research only. No decision made to adopt this. Captured 2026-07-19 during an exploratory conversation, for future reference if a "native app per tenant" or "super app" direction is ever considered for SalmanSaaS.

## What it is

FinClip (by FinoGeeks) is a commercial SDK + platform that lets any existing mobile/desktop app become a **"Super App"** — a single host app that can dynamically load and run **Mini-Programs** (self-contained apps built in HTML/CSS/JS) inside it, sandboxed, without app-store rebuilds per feature or per client. Same model as WeChat/Alipay's mini-program ecosystems in China, offered as a general-purpose platform.

## Core components

- **FinClip SDK** — embedded in your existing app (~3MB), turns it into a "Host App" capable of downloading and running Mini-Programs on demand. Supports iOS, Android, Windows, macOS, Linux, HarmonyOS NEXT, and more.
- **Mini-Program Store** — a private app-store-like admin surface you own, to approve/publish/audit which Mini-Programs run inside your Host App.
- **FinClip App** — FinClip's own ready-made Super App, usable as a demo/reference or as a ready host.

## Cross-platform mechanism

Mini-Programs are not native code — they run inside FinClip's own runtime (a custom JS engine + rendering engine + native bridges per platform). One Mini-Program codebase runs unmodified across every platform the FinClip container is deployed on. Updates to a Mini-Program are pushed from the server and apply instantly — no app-store review wait, no forced user update.

## The relevant part for a multi-tenant SaaS — "One shell, multiple faces"

This is the piece most directly relevant to how SalmanSaaS already works:

- You build **one native Host App shell** (published once to the App/Play Store).
- Each **tenant/client is a separate Mini-Program** — isolated, independently updatable.
- On login (or slug/subdomain resolution), the server identifies the tenant and the Host App **dynamically downloads and renders that tenant's specific Mini-Program + theme + branding** — no separate app build per client.
- This is conceptually the same pattern as SalmanSaaS's existing registry-based tenant routing (`frontend/src/router/tenants/index.js`, one folder per tenant under `frontend/src/pages/`) — except FinClip's version produces a real installable native app on iOS/Android/Windows/etc., not a web-only experience.

## Comparison to SalmanSaaS today

| | SalmanSaaS today | FinClip model |
|---|---|---|
| Technology | React/Vite, web only | Mini-Program runtime, near-native |
| Platforms reached | Browser only | iOS / Android / Windows / macOS / Linux, real installable apps |
| Distribution | One URL per tenant (`demo.salmansaas.com/{slug}/...`) | One app in the App/Play Store, tenants loaded dynamically inside it |
| Update model | Deploy to Cloudflare Pages | Push Mini-Program update, applies instantly, no app-store review |

## Why this was captured

If SalmanSaaS ever wants to offer tenants (e.g. `anas`, `caracas`) a real installable mobile app instead of only a web page, this is the closest existing off-the-shelf model for doing that without building and maintaining N separate native apps. Not evaluated for cost, licensing, China-specific dependencies, or production suitability — this is a first-pass research capture only, not a recommendation.

## Sources

- [FinClip — Super App Solution Platform, Mini-App Container](https://en.finclip.com/)
- [FinClip SDK — Cross Platform / Cross-Device SDK for Mini-Program](https://en.finclip.com/products/finclip-sdk)
- [FinClip Mini-App Store](https://en.finclip.com/products/finclip-store)
- [FinClip App](https://en.finclip.com/products/finclip-app)
- [Cross-Platform Mini Program SDK Integration: Technical Implementation Guide for 2026](https://super-apps.ai/blogs/cross-platform-mini-program-sdk-integration-technical-implementation-guide-for-2026)
- [Mastering Multi-Tenant Mobile: Delivering White-Label SaaS Apps via Dynamic Modules](https://super-apps.ai/blog/mastering-multi-tenant-mobile-delivering-white-label-saas-apps-via-dynamic-modules/)
- [Empowering System Integrators: Building White-Label Super Apps for Enterprise Clients](https://super-apps.ai/blogs/empowering-system-integrators-building-white-label-super-apps-for-enterprise-clients)
- [FinClip: A Global, Multi-Platform Solution for H5, Mini Programs, and Flutter](https://en.finclip.com/blog/finclip-a-global-multi-platform-solution-for-h5-mini-programs-and-flutter/)
