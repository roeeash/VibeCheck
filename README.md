# VibeCheck Ultra

> **Black-box web performance auditor.** Give it any live URL and get a detailed report of runtime, network, memory, and rendering issues — with reproducible evidence — without ever touching source code.

## The Problem It Solves

Static analysis tools (linters, type checkers, bundler analyzers) only see code at rest. They cannot detect:

- A React component re-rendering 400 times per keystroke
- An N+1 API call chain triggered by a `useEffect`
- A `setInterval` that never gets cleaned up on unmount
- An endpoint returning 200 fields when the client uses 3
- A layout shift caused by a late-loading image with no dimensions
- A long task (>50ms) blocking user interaction

VibeCheck observes the site the way a real user experiences it — through the browser — and catches every one of these.

## How It Works

```
Paste URL → Headless Chromium scan → 6 modules analyze → Correlated report with evidence
```

1. **User pastes a URL** into the web UI and clicks "Run Audit"
2. **Audit engine** launches a headless Chromium instance via Playwright and attaches CDP
3. **Six independent modules** initialize in parallel, each attaching CDP listeners and page-side injectors
4. **Flow script runs** — page load, scroll, click interactions, stress tests — while all modules collect events and evidence
5. **Modules finalize** and return their findings after the flow completes
6. **Correlator** joins related findings across modules, identifies root causes, computes the Vibe-Score (0–100)
7. **Report Generator** returns JSON to the frontend, offers a downloadable `VIBE_REPORT.md`, and bundles all evidence artifacts

### Output

A single `VIBE_REPORT.md` — a downloadable Markdown file containing all findings, evidence references, severity breakdowns, and the Vibe-Score (0–100). It serves as the portable audit artifact you can share, file, or archive.

## The Six Audit Modules

### Observer — Web Vitals + Runtime

| Watches | CDP events, PerformanceObserver, forced reflows, layout shifts |
|---|---|

**Finds:**
- Long tasks (>50ms) and their component attribution
- Long Animation Frames (LoAF) with script breakdown
- Cumulative Layout Shift (CLS) hotspots
- Forced synchronous layouts (reflow hotspots)
- Paint storms (rapid paint bursts)
- Web Vitals: LCP, INP, CLS, FCP, TBT with attribution

### Proxy — Network Forensics

| Watches | Every HTTP request/response via CDP interception |
|---|---|

**Finds:**
- N+1 request chains (sequential identical-pattern fetches)
- Waterfall dependencies (A must finish before B starts)
- Over-fetching (response fields vs. DOM usage ratio)
- Duplicate fetches (same URL fetched multiple times)
- Infinite re-fetch loops (`useEffect` without deps)
- Missing cache headers, uncompressed payloads
- Too many origins, HTTP/1.1 bottlenecks

### Architect — Inferred Backend Analysis

| Watches | Network response shape, timing, and query patterns |
|---|---|

**Finds:**
- Slow endpoints (inferred DB latency from TTFB)
- Wide responses (hundreds of fields, few used)
- Under-pagination (thousands of records, no cursor)
- N+1 at the API level (one parent → many child calls)
- Patterns consistent with missing indexes or RLS cost

> Confidence is never "high" — always inferred, never certain.

### Asset Inspector — Images, CSS, Bundles

| Watches | DOM resource references, CSS coverage, JS bundle composition |
|---|---|

**Finds:**
- Oversized images (natural dimensions vs. display size)
- Wrong image format (PNG where WebP would be smaller)
- Missing lazy loading on below-the-fold images
- Blocking CSS and render-blocking scripts
- Unused CSS rules (via coverage API)
- Bloated JS bundles, duplicate libraries, full lodash
- Heavy third-party scripts (analytics, widgets)
- `will-change` spam, CSS layout animations

### Render — React Profiler + Component Analysis

| Watches | React Profiler tap, DOM node counts, inline allocations |
|---|---|

**Finds:**
- Missing memoization (`React.memo`, `useMemo`, `useCallback` gaps)
- Re-render storms (excessive renders per interaction)
- Unvirtualized long lists (1000+ DOM nodes in viewport)
- Missing React keys causing re-order penalties
- Inline object/style allocations in render (new objects every frame)

### Memory — Leaks + Unbounded State

| Watches | Heap snapshots, interval/listener census, state growth |
|---|---|

**Finds:**
- Leaked intervals (`setInterval` without `clearInterval` on unmount)
- Leaked event listeners (`addEventListener` without cleanup)
- Unbounded state (arrays/maps that grow without bound on re-render)
- Stale closures (handlers capturing outdated values)
- Recursive handlers (chained `setTimeout` without exit condition)

> Method: Stress-tests the page with 50+ state churns and diffs heap snapshots to detect growth.

## Core Principles

| Principle | Meaning |
|---|---|
| **Black-Box Only** | No source code access. Everything inferred from CDP events, network traffic, DOM probes, heap snapshots, and runtime instrumentation. |
| **Evidence-Based** | Every finding includes reproducible proof: CDP traces, HAR entries, heap snapshots, screenshots. Nothing reported without evidence. |
| **Report Only, Never Fix** | Diagnoses — does not patch, modify, or auto-fix. Recommendations are text guidance, not codemods. |
| **Direct Impact vs Theoretical Debt** | Direct Impact = measured at runtime. Theoretical Debt = static pattern without runtime confirmation. Never mixed in the same section. |
| **Honest About Inference** | Backend findings are inferred from network behavior and always labeled with a confidence level. |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Web Frontend                       │
│  Landing → Scan (lightning transition) → Results Dashboard  │
└────────────────────────┬────────────────────────────────────┘
                         │  HTTP + WebSocket
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Audit Engine (Node.js)                     │
│  Playwright + CDP + Module Coordination + API Endpoints     │
└──┬───────────────────────────────────────────────────────┬──┘
   │                                                       │
   ▼                                                       ▼
┌──────────────────────┐                    ┌──────────────────────┐
│  Analysis Modules    │                    │   Evidence Store     │
│  Observer, Proxy,    │─── Findings ──────►│  HAR, traces, heaps  │
│  Architect, Asset,   │                    └──────────────────────┘
│  Render, Memory      │                              │
└──────────────────────┘                              ▼
                                      ┌──────────────────────────┐
                                      │   Correlation Engine     │
                                      │  Join findings + Score   │
                                      └────────────┬─────────────┘
                                                   ▼
                                      ┌──────────────────────────┐
                                      │     Report Generator     │
                                      │  JSON + MD + Evidence    │
                                      └──────────────────────────┘
```

### Module Contract

Every analysis module implements:

```
initialize(ctx) → onEvent(stream) → finalize() → Finding[] → dispose()
```

Modules never call each other directly. Communication is exclusively via the audit event stream.

## Finding Structure

Every finding follows this schema:

| Field | Description |
|---|---|
| `id` | Stable hash of `(module, type, target)` |
| `module` | Which module detected it |
| `type` | Machine-readable finding type |
| `category` | `"direct_impact"` or `"theoretical_debt"` |
| `severity` | `critical` \| `high` \| `medium` \| `low` |
| `confidence` | `high` \| `medium` \| `low` (Architect is never `"high"`) |
| `title` | One-line headline |
| `description` | Markdown explanation |
| `observedIn` | Runtime attribution (component, endpoint, selector) — **never** local source file paths |
| `evidence` | Array of `EvidenceRef` (trace, HAR, snapshot, screenshot) |
| `metrics` | Measured numbers (ms, bytes, count) |
| `recommendation` | Text guidance — **NOT** a fix or codemod |
| `scoreImpact` | How much it docks the Vibe-Score (0–100) |

## The Vibe-Score

A weighted composite score (0–100) where each module contributes a portion based on user-perceived impact:
- **Higher** = healthier performance
- **Lower** = more issues detected
- Score is broken down per-module in the report

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Backend | Node.js 20+, Express/Fastify, WebSocket |
| Browser | Playwright, Chrome DevTools Protocol (CDP) |
| Testing | Vitest (unit), Playwright (E2E), mocked CDP (integration) |
| Logging | pino (structured) |
| Validation | zod |
| Bundling | tsup |
| Workspace | pnpm monorepo |

## Monorepo Structure

```
packages/
  engine/          — Playwright launcher, CDP bridge, module coordinator
  observer/        — Web Vitals, long tasks, LoAF, reflow, layout thrash
  proxy/           — Network forensics: N+1, waterfall, over-fetching
  architect/       — Inferred backend: DB time, pagination, wide responses
  asset-inspector/ — Images, CSS, bundle composition
  render/          — React profiler, memoization, virtualization
  memory/          — Leaked intervals/listeners, unbounded state
  correlator/      — Joins findings, computes Vibe-Score
  injector/        — Page-side instrumentation scripts
  core/            — Shared types: Result, AuditEvent, Finding
  evidence/        — Evidence store + serialization + redaction
  reporter/        — JSON + Markdown report rendering

apps/
  web/             — Audit engine server + React frontend (landing, scan, results)
  fixture-site/    — Deliberately broken Next.js app for E2E testing

tests/
  e2e/             — End-to-end audits against fixture-site
```

## Fixture Site

A deliberately broken Next.js app (`apps/fixture-site`) containing every anti-pattern the tool detects. **Every finding type must have a corresponding fixture.** No fixture, no finding.

The fixture site scores ~25–35; a clean control scores ≥ 90.

**Examples of planted issues:**
- 10,000 unvirtualized DOM nodes
- N+1 fetch pattern in API routes
- 4000px image in a 200px container
- `setInterval` without cleanup
- `top`/`left` CSS animations
- Waterfall fetch chains
- Endpoint returning 100 fields when 3 are used
- Search input without debounce
- Duplicated lodash in bundle

## Security & Privacy

- Auth credentials never logged, never written to evidence files
- HAR scrubbed: `Authorization`, `Cookie`, `Set-Cookie` headers stripped
- Sensitive endpoint bodies redacted (`/auth`, `/login`, etc.)
- Rate limited: max 3 concurrent audits per IP
- Never bypasses CAPTCHA or bot protection
- Audit output ephemeral: cleaned after 24 hours unless downloaded
- pino structured logging, never logs secrets above `trace` level

## Performance Budget (for the tool itself)

| Metric | Budget |
|---|---|
| Cold start to first audit event | < 2s |
| Single-URL audit (no stress) | < 30s |
| Full audit (5 URLs, stress on) | < 3min |
| Memory ceiling | < 1.5GB RSS per audit |
| Output dir size | < 100MB per audit (gzipped) |

## What It Is Not

- **Not** a Lighthouse replacement for accessibility/SEO/PWA
- **Not** synthetic monitoring (one-shot auditor, not a beacon)
- **Not** a tool that modifies or fixes the target site
- **Not** a cross-time aggregation dashboard
- **Not** a subjective UX scorer
- **Not** a CLI — it is a web application
- **Not** an auto-fix or codemod generator

## Quick Start

```bash
pnpm dev           # Start web app dev server
pnpm test          # Run Vitest across workspace
pnpm lint          # Run ESLint
pnpm typecheck     # TypeScript type-check (tsc -b --noEmit)
pnpm build         # Build all packages + web app
```
