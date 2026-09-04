# Railway Production Readiness — Frontend Build Blocker (Phase: VERIFY → PLAN, stopped for approval)

Follows: `service-execution-constitution.md`, `investigation-protocol.md`. Separate track from
`audit.md` (Backend, confirmed ONLINE — untouched this session, no evidence found requiring
reopening it). **No code changed. No commit made. No Railway action taken. No `npm install --force`
or `--legacy-peer-deps` run for real (see §5 — one read-only `npm view` registry check only).**

---

## A. Confirmed Root Cause

**Not a dependency-compatibility problem. A Docker build-context bug: the project's own existing
fix for this exact conflict never reaches the Railway build.**

- `frontend/package.json:32-33` declares `react: "^19.2.0"` / `react-dom: "^19.2.0"`.
- `frontend/package.json:23` declares `@relume_io/relume-ui: "^1.3.1"`, whose **latest published
  version on npm (1.3.1 — confirmed via `npm view @relume_io/relume-ui dist-tags`, no newer version
  exists)** declares `peerDependencies: { react: "^18.2.0", "react-dom": "^18.2.0", ... }` — real
  registry data, not the lockfile's cached copy.
- This is a real, live peer-dependency conflict under npm's default (non-legacy) resolver — exactly
  what Railway's build log showed.
- **The project already has a fix for this, committed to git, and it predates the conflict
  resurfacing today**: `frontend/.npmrc` (tracked by git — confirmed via `git ls-files`) contains
  `legacy-peer-deps=true`. Git blame: `.npmrc` was added in commit `100ded0`
  ("Arizona + Caracas homepages, restaurant migration, backend rules") — i.e. at the same time
  Relume was actually introduced into the codebase. Also matches this project's own
  `.claudedocs/todo_list.md` historical record: *"Relume UI installed + .npmrc legacy-peer-deps
  fix — ✅ Done 2026-07-04."* This was a real, already-made, already-approved project decision —
  not something invented today.
- **The bug**: `frontend/Dockerfile:6-7`:
  ```
  COPY package.json package-lock.json ./
  RUN npm ci --prefer-offline
  ```
  `.npmrc` is not part of the `package.json package-lock.json` COPY list, so it does not exist in
  the build container's `/app` directory at the moment `npm ci` runs on line 7. `npm ci` therefore
  runs under npm's **default strict peer-dependency resolution**, sees the real react19/react18
  conflict, and fails exactly as Railway's log showed — `ERESOLVE could not resolve dependency`.
  `.npmrc` only gets copied afterward, on line 10 (`COPY . .`), too late to matter.
- **This appears to be the first time this exact build path has ever run.** `git log --follow` on
  `frontend/Dockerfile` and `frontend/railway.json` shows both were added together in one commit,
  `c02f415` ("SalmanSaaS full platform — post-format rebuild") — there is no earlier version of
  this Dockerfile to compare against, and no evidence anywhere (session logs, todo_list.md) of a
  prior successful Railway frontend build. Locally, `npm ci`/`npm install` run from inside
  `frontend/` picks up `frontend/.npmrc` automatically (npm's normal project-local `.npmrc`
  resolution) — which is exactly why this was never caught in local dev or (per `frontend/wrangler.toml`'s
  presence) any earlier Cloudflare Pages build, where the whole repo is typically checked out flat
  before `npm install` runs, not staged through a multi-layer Docker `COPY`.

## B. Dependency Graph Evidence

- `@relume_io/relume-ui` is imported in **exactly 2 files**, both real, both live restaurant-tenant
  homepages: `frontend/src/pages/caracas/normal/HomePage.jsx:5` and
  `frontend/src/pages/arizona/normal/HomePage.jsx:4` — in both cases, only two named exports:
  `import { Button, Badge } from '@relume_io/relume-ui'`.
- **`@relume_io/relume-tailwind` (the companion package) is a project-wide concern, not scoped to
  those 2 files**: `frontend/tailwind.config.js:2,7,10` loads it as a global Tailwind plugin
  (`plugins: [relumePlugin]`) applied to Tailwind's build across the **entire** `frontend/src/**`
  content glob — not just the 2 files that literally `import` from the UI package. Removing Relume
  cleanly would mean also removing this plugin and verifying no other page anywhere in the app
  relies on a utility class the plugin contributes — a real, currently **unbounded/unverified** risk
  (a grep for literal `relume` imports would not catch usage of a Relume-contributed Tailwind
  utility class by name).
- `@relume_io/relume-tailwind` itself declares **no `peerDependencies`** (confirmed via `npm view`)
  — it is a pure build-time Tailwind plugin with no React coupling of its own; the entire conflict
  is scoped to `@relume_io/relume-ui` alone.
- `react@19.2.0` (declared) / `19.2.4` (resolved in `package-lock.json`) is not an isolated choice —
  it's the whole frontend's real, current, deliberately-used stack: `@types/react: ^19.2.7`,
  `react-dom: ^19.2.0`, and this project's own standing rule
  (`rules/frontend/routing.md`'s FM12 rule) is written specifically around **React 19 StrictMode**
  behavior. Every page built this session (the entire Alzabt homepage track) assumes React 19.
  React 19 is the architecture, not a stray version bump.

## C. Options Considered — evidence, not preference

| | What changes | What could break | Affects `ProductShowcaseHome`? | Affects production runtime? | Needs lockfile regen? | Needs local build verify? |
|---|---|---|---|---|---|---|
| **A — Remove `@relume_io/relume-ui`** | Rewrite 2 files' `Button`/`Badge` usage with native/other components; remove `@relume_io/relume-tailwind` plugin from `tailwind.config.js`; remove both packages from `package.json` | **Unbounded** — the Tailwind plugin is loaded globally; no confirmed way yet to prove no other page anywhere depends on a Relume-contributed utility class without a much deeper audit | No | No (build-time only) | Yes | Yes |
| **B — Upgrade Relume to a React-19-compatible version** | N/A | N/A | N/A | N/A | N/A | N/A — **not possible**: `1.3.1` is npm's `latest` tag for `@relume_io/relume-ui`, and it still declares `react: "^18.2.0"`. No newer version exists to upgrade to. Ruled out by registry evidence, not by choice. |
| **C — Downgrade React to 18** | `package.json` react/react-dom → `^18.x`, plus `@types/react`/`@types/react-dom`, full lockfile regen | Real risk to the whole app, not just Relume — React 19 is this project's deliberate, current, actively-developed stack (this session's entire Alzabt work, the FM12 StrictMode rule) | **Yes** — directly | **Yes** — every page, not just 2 | Yes (large diff) | Yes |
| **D — Other options the dependency graph supports** | Considered: Relume as an npm `overrides`/`resolutions` peer-dep force at the `package.json` level — functionally identical to legacy-peer-deps but scoped narrower; not chosen because it duplicates what `.npmrc` already declares project-wide and doesn't fix the real bug (the file still wouldn't reach the Docker layer without the same COPY fix) | — | — | — | — | — |
| **E — Fix the Docker COPY order so the project's own already-committed `.npmrc` reaches `npm ci`** | One line added to `frontend/Dockerfile`'s COPY statement (line 6): include `.npmrc` alongside `package.json`/`package-lock.json` | Cache-layer granularity: `.npmrc` changing would now also invalidate the `npm ci` Docker layer cache — a real but trivial cost (this file changes essentially never) | **No** — zero relation to the Alzabt homepage or any of today's uncommitted work | **No** — `.npmrc` only affects the *install* step; nothing about the built output or runtime bundle changes | **No** | Yes (to confirm) |

## D. Recommended Fix — Option E, on evidence, not speed

**Change exactly one line, `frontend/Dockerfile:6`:**
```diff
- COPY package.json package-lock.json ./
+ COPY package.json package-lock.json .npmrc ./
```

**Why, on the evidence above, not by default:**
- Option B is eliminated by registry fact, not judgment — there is nothing to upgrade to.
- Option C (downgrade React) would touch the entire app's runtime behavior to solve a conflict that
  is scoped to exactly one already-isolated legacy dependency used in 2 files — disproportionate,
  and directly contradicts this session's own explicit instruction not to touch
  `ProductShowcaseHome.jsx` or unrelated frontend work; downgrading React touches everything,
  including that file, whether or not its own code changes.
- Option A is not ruled out on principle, but its real blast radius (the global Tailwind plugin) is
  **currently unverified** — doing it safely would require a real audit of every page for
  Relume-contributed utility-class usage, which is out of scope for "fix a build blocker" and would
  itself need its own Contract per this project's documentation policy if pursued later.
- Option E is the only option that: (a) fixes the actual, specifically-diagnosed bug (a Docker COPY
  omission, not a real code incompatibility), (b) matches this project's own prior, already-approved
  decision (the `.npmrc` fix from 2026-07-04) rather than introducing a new one today, (c) touches
  zero runtime code, zero package versions, zero lockfile content, and (d) has the smallest possible
  diff and blast radius of any option — one line, one file, not `package.json`/`package-lock.json`
  at all.
- This is **not** "using `--legacy-peer-deps` to hide a conflict today" in the sense the session's
  own ban was written against — it is making an already-existing, already-committed, already-scoped
  project setting (`legacy-peer-deps=true` in `frontend/.npmrc`) actually reach the build step it
  was always meant to govern. No new install flag is introduced; no flag is passed on the command
  line at all.

## E. Exact Files That Need Changing (pending approval — not yet touched)

- `frontend/Dockerfile` — one line (§D above). Nothing else in this file changes.
- No change to `frontend/package.json`, `frontend/package-lock.json`, `frontend/.npmrc`,
  `frontend/tailwind.config.js`, or any `frontend/src/**` file.

---

## Verification/experimentation log (read-only only — nothing installed for real)

- `npm view @relume_io/relume-ui dist-tags` / `versions --json` — registry read, no install.
- `npm view @relume_io/relume-ui@latest peerDependencies` — registry read, confirms `react:
  "^18.2.0"` is still current on the latest published version.
- `npm view @relume_io/relume-tailwind peerDependencies` — registry read, empty (no peer deps).
- **No `npm install`, `npm ci`, or `npm run build` has been run yet in this environment this
  session** — `frontend/node_modules` does not exist locally (confirmed via `ls`). Objective 3's
  local clean-install + build verification has not started — it is the next step, after approval,
  using the real fix (COPY line added), not `--force`/`--legacy-peer-deps` typed on the command
  line as a workaround.

---

## Status: STOPPED FOR APPROVAL

Per this session's rule (`READ → VERIFY → PLAN → STOP FOR APPROVAL`, then only after approval
`CHANGE → BUILD → DEPLOY → VERIFY`). Waiting on Salman's go-ahead for Option E before touching
`frontend/Dockerfile`.

---

## F. Local Verification (executed after approval, 2026-08-28)

- `rm -rf frontend/node_modules && npm ci --prefer-offline` (run from `frontend/`) — **success**,
  `added 517 packages, and audited 661 packages in 18s`. No `ERESOLVE` error. One pre-existing,
  unrelated `EBADENGINE` warning (`camera-controls@3.1.2` wants Node ≥22, sandbox has 20.20.2) —
  not caused by this fix.
- `npm run build` — **success**, `✓ built in 24.33s`, exit code 0. `dist/index.html` and
  `dist/assets/ProductShowcaseHome-*.js` both present.
- Only pre-existing Vite chunk-size advisory, no errors.

## G. Commit + Push

- Committed `7d48308` — `frontend/Dockerfile` only (1 file, 1 line), scoped correctly (confirmed via
  `git diff --cached --stat` before commit — `ProductShowcaseHome.jsx` and the pre-existing
  `capability-operations-model.md` modification both correctly excluded).
- First push attempt from this session's own environment failed — no git credentials configured
  here (`fatal: could not read Username for 'https://github.com'`). Salman pushed from his own
  terminal; confirmed via `git rev-parse origin/main` matching `HEAD` (0 ahead/0 behind) once synced.
- Two Railway build attempts (`23:03:11Z`, `23:07:04Z`) ran against the pre-push state and failed
  identically to the original report — correctly diagnosed as stale/pre-push builds, not a sign the
  fix was wrong (both logs' `[builder 3/6]` line still showed the old `COPY package.json
  package-lock.json ./`, no `.npmrc`).

## H. Railway Deployment Result — CONFIRMED GREEN (2026-08-28, real dashboard evidence)

Salman triggered a fresh deploy after confirming the push landed. Real Railway dashboard evidence
(screenshot, this session): deployment attributed to commit `fix(frontend): include .npmrc in
Docker COPY so npm ci sees legacy-...` (i.e. `7d48308`), status **ACTIVE / "Deployment successful"**,
stage checklist all green — Initialization ✓ (01:03), **Build ✓ (01:02)**, Deploy ✓ (00:04),
Post-deploy ✓ (00:00). Service card shows **Online** at `demo.salmansaas.com`. The prior failing
attempt is now correctly relegated to History as "FAILED — 12 hours ago." This satisfies Objective
4's own bar ("لا تعتبر Railway healthy لمجرد أن deployment بدأ" — not just "deployment started," but
build actually transitioned past `npm ci` into a successful `npm run build` and the service is live).

## Status: **RESOLVED — Frontend Build Blocker CLOSED, 2026-08-28.**

Backend track (`audit.md`) was not reopened or touched during this entire track, per instruction.
Next: proceed to the rest of the Production Readiness checklist (Environment Audit → Production URL
→ DB identity → Deployment health → WhatsApp/Resend → Smoke Test), plus the newly-approved Alzabt
paid-domain architecture change (`alzabt.salmansaas.com`) — tracked separately, see
`domain-architecture.md` in this same folder.
