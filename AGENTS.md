# AGENTS.md — VibeCheck Ultra

> **Active development.** Code for most modules exists under `packages/`. Follow Stage Order below for remaining work.

---

## Non-Negotiables

- **Black-box only.** No source code access to target sites. Everything inferred from CDP, network, DOM, heap, runtime probes.
- **Report only, never fix.** Findings include `recommendation` (text guidance). No auto-fix, no codemod, no "apply fix" buttons.
- **Web app, not CLI.** React frontend + Node.js audit engine (Express/Fastify API). No `commander`, no `vibecheck` binary.
- **Source maps optional.** Only for symbolication enrichment when publicly exposed. Never required for a finding.

## What to Read First

1. `CLAUDE.md` — project identity, principles, conventions
2. `architecture.md` — module boundaries, data flow, monorepo layout
3. `SUBAGENTS.md` — subagent roles (backend / test / integration) and Haiku prompt templates
4. `instructions/instruction1-foundation.md` — first stage to implement
5. `design-suggestion/` — UI/UX reference (hero, scan, results views with lightning-strike transition)

## Architecture (6 Modules)

| Package | Responsibility |
|---|---|
| `packages/engine` | Playwright launcher, CDP bridge, module coordinator, API endpoints |
| `packages/observer` | Web Vitals, long tasks, LoAF, paint, reflow, layout thrash |
| `packages/proxy` | Network patterns: N+1, waterfall, over-fetching, cache misses |
| `packages/architect` | Inferred backend: DB time, offset pagination, wide responses |
| `packages/render` | React profiler, memoization, virtualization, inline allocations |
| `packages/memory` | Leaked intervals/listeners, unbounded state, recursive handlers |
| `packages/correlator` | Joins findings → root causes, computes Vibe-Score (0–100) |
| `packages/reporter` | JSON for frontend + `VIBE_REPORT.md` download + evidence bundle |
| `apps/web` | React frontend (landing → scan → results dashboard) |
| `apps/fixture-site` | Deliberately broken Next.js app for E2E testing |

**Module contract:** `initialize()` → `onEvent()` stream → `finalize()` returns `Finding[]` → `dispose()`. Modules never call each other directly.

## Key Conventions

- **`observedIn` field** — runtime attribution (component name, endpoint, DOM selector, stack trace). **Never** local source file paths like `components/Foo.tsx:42`.
- **`recommendation` field** — text guidance. Not a fix, not a codemod.
- **Finding categories** — `direct_impact` (measured runtime evidence) vs `theoretical_debt` (static pattern). Never mix in same report section.
- **Confidence** — Architect findings are **never** `high` confidence (always `medium` or `low`).
- **Error handling** — `Result<T, VibeError>`, not throw. Timeouts everywhere.
- **File naming** — `kebab-case.ts`, strict TypeScript, no `any` without comment.
- **pino** structured logging. Never log secrets above `trace`.

## Workspace Layout (When Built)

```
packages/    engine, observer, proxy, architect, asset-inspector, render, memory, correlator, reporter, injector, core, evidence
apps/        web (React frontend), fixture-site (Next.js test target)
flows/       Playwright flow scripts
tests/e2e/   End-to-end audits against fixture-site
```

## Testing

- Every finding type **must** have a corresponding fixture in `apps/fixture-site`. No fixture, no finding.
- Unit tests for pure functions. Module integration with mocked CDP. E2E against fixture site.
- The fixture site's anti-pattern audit should score ~25–35. Clean control ≥ 90.

## Design Reference

`design-suggestion/` contains the visual spec:
- `hero.jsx` — landing view with URL input
- `scan.jsx` — progress view with module-by-module status
- `results.jsx` — dashboard with score ring, KPIs, collapsible module findings
- `data.js` — synthetic finding data showing the exact structure (`observedIn`, `recommendation`, severity, impact)
- `lightning.js` — canvas-based lightning-strike transition animation

## Stage Order

1. Foundation & Audit Engine → 2. Observer → 3. Proxy → 4. Asset Inspector → 5. Architect → 6. Render → 7. Memory → 8. Scoring & Report → 9. Web UI → 10. Polish & Production

## Mandatory: Update HANDOFF.md After Every Stage

At the end of every completed stage, Claude **must** update `HANDOFF.md`:
- Move the stage from "What's NOT Done" → "What's Done"
- Update the Stage Order table status (❌ → ✅ or ⚠️)
- Update "Recommended Next Steps"
- Update the header status line and date

Skipping this update means the next session starts with stale context.

## Quick Reference

```
pnpm dev           # start web app dev server
pnpm test          # vitest across workspace
pnpm lint          # eslint
pnpm typecheck     # tsc -b --noEmit
pnpm build         # tsup per package + web app
```
