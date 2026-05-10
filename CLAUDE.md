# CLAUDE.md — VibeCheck Ultra Project Context

> **This file is the entry point for any Claude session working on this project. Read this first, every time, before reading any other file.**

---

## What This Project Is

**VibeCheck Ultra** is a black-box web performance auditor with an interactive web UI. Given a URL, it produces a comprehensive performance report identifying rendering, network, memory, asset, and inferred backend issues — with reproduction traces and prioritized recommendations.

**Flow:** Paste a URL → Full black-box scan → Interactive results dashboard with findings organized by module.

**Think:** "WebPageTest with a brain" or "Lighthouse that actually catches the things humans miss" — but as a web app, not a CLI.

**Critically:** This tool has **no source code access**. Everything is inferred from what the browser observes. This constraint shapes every architectural decision.

---

## Project Identity

- **Name:** VibeCheck Ultra
- **Type:** Web application (React frontend + Node.js audit engine)
- **Stage:** Greenfield — building from scratch
- **Frontend:** React 18, TypeScript, custom UI with lightning-strike transition animation
- **Backend:** Node.js 20+, Playwright, Chrome DevTools Protocol (CDP)
- **Output:** Interactive results dashboard + downloadable `VIBE_REPORT.md` + trace artifacts

---

## How to Work With This Project

### Reading Order (every new Claude session)

1. **`CLAUDE.md`** (this file) — project context, conventions, current state
2. **`architecture.md`** — system design, module boundaries, data flow
3. **`SUBAGENTS.md`** — subagent roles and prompt templates for delegation
4. **`instructions/instruction<N>.md`** — the specific stage you're working on
5. **`design-suggestion/`** — the UI/UX reference (hero, scan, results views)
6. **Source files** relevant to the current task

### Subagent Delegation

For every stage, decompose work into the three roles defined in `SUBAGENTS.md` and spawn Haiku subagents:

| Subtask type | Role | Files touched |
|---|---|---|
| Audit modules, detectors, Express routes | `backend` | `packages/*/src/`, `apps/web/src/` |
| Unit, integration, E2E tests + fixtures | `test` | `tests/`, `apps/fixture-site/` |
| Frontend ↔ API wiring, type sync | `integration` | `apps/web/client/src/` |

**Rules:**
- Spawn with `model: "haiku"` and the prompt template from `SUBAGENTS.md`.
- `backend` + `test` subagents can run in parallel when they touch different files.
- `integration` subagent must run **after** `backend` completes (type dependency).
- Main conversation reviews subagent output before marking a subtask done.

### MCP Function Call Syntax

When the user sends a message matching the pattern `functionName(args)` — with no surrounding context — treat it as an MCP tool invocation, not a bash command. Before doing anything else:

1. Scan available `mcp__*` tools for a name match against `functionName`.
2. If a match exists, invoke it immediately with `args` as the parameter.
3. Do not ask for clarification. Do not re-interpret as CLI syntax.

Example: `run_audit(example.com)` → invoke `mcp__vibecheck__run_audit` with `url: "https://example.com"`.

### Before Writing Any Code

Claude must:
1. Confirm which **stage** is being worked on (instruction1, instruction2, etc.)
2. Read that instruction file **completely**
3. Check `STATUS.md` (if present) for what's already done
4. Ask the user before deviating from the documented architecture

### Decision Hierarchy

When instructions conflict or are ambiguous:
1. **User's explicit message** in the current turn
2. **The current `instruction<N>.md`**
3. **`architecture.md`**
4. **`CLAUDE.md`** (this file)
5. **General best practices**

Claude does **not** invent features outside the current instruction file. If something seems missing, Claude asks.

---

## Core Principles (Non-Negotiable)

### 1. Black-Box Only
- We never assume access to source code, schemas, or build artifacts on disk.
- All evidence comes from: HTTP responses, CDP events, DOM observation, heap snapshots, runtime probes. Source maps may be used for optional symbolication enrichment **if** publicly exposed, but are never required.
- If a feature requires source access, it doesn't belong in this tool.

### 2. Evidence-Based Findings
- Every finding in the report must include **reproducible evidence** (CDP trace, HAR entry, screenshot, heap snapshot).
- Findings are tagged with **confidence**: `high` (directly observed), `medium` (strongly inferred), `low` (heuristic).
- We never report something we cannot prove or replay.

### 3. Direct Impact vs. Theoretical Debt
- **Direct Impact** = measured user pain (long INP, observed N+1, heap leak in stress test).
- **Theoretical Debt** = static patterns without runtime confirmation (oversized image not yet in viewport, unused CSS not yet hit).
- These are reported in **separate sections**. Never mixed.

### 4. Reproducibility
- Every audit run produces artifacts allowing a third party to replay the exact scenario:
  - `vibe-trace.json` (CDP timeline)
  - `vibe-har.json` (network archive)
  - `vibe-heap-*.heapsnapshot`
  - `vibe-screenshots/`
  - The exact flow script used

### 5. Report Only, Never Fix
- VibeCheck **diagnoses** — it does not modify, patch, or fix the target site.
- Findings include **recommendations** (text guidance), not auto-fixes or codemods.
- The UI displays findings with `$ recommendation →` labels, never "apply fix" buttons.

### 6. Honest About Inference
- Backend findings (DB latency, N+1, RLS cost) are **inferred** from network behavior.
- Inferred findings are always labeled as such with confidence levels.
- We never claim to know what's happening server-side.

---

## Code Conventions

### TypeScript
- **Strict mode on.** No `any` without comment justifying it.
- Prefer `interface` for public contracts, `type` for unions/utilities.
- Every module exports a single clear surface; no kitchen-sink barrel files.

### File Naming
- `kebab-case.ts` for filenames.
- `PascalCase` for classes and types.
- `camelCase` for functions and variables.
- `SCREAMING_SNAKE_CASE` for constants and env vars.

### Module Structure
Every module under `packages/` follows:
```
packages/<module>/
├── src/
│   ├── index.ts           # public exports only
│   ├── <feature>.ts       # implementation
│   └── types.ts           # shared types
├── tests/
│   └── <feature>.test.ts
├── package.json
└── README.md              # what this module does, in 1 paragraph
```

### Error Handling
- Use **Result types**, not throw, for expected failures: `Result<T, VibeError>`.
- Throw only for programmer errors (invariant violations).
- Every CDP/network operation has a timeout. Never hang silently.

### Logging
- Use `pino` (structured logging).
- Log levels: `trace` (CDP events), `debug` (module internals), `info` (lifecycle), `warn` (retryable), `error` (audit failures).
- Never log secrets, auth tokens, or response bodies above `trace`.

### Testing
- **Unit tests** for pure functions (parsers, scorers, inference rules).
- **Integration tests** with mocked CDP for module orchestration.
- **End-to-end tests** against a fixture site (`apps/fixture-site`) deliberately containing every anti-pattern we detect.

---

## Glossary (use these terms consistently)

- **Audit** — one full run of the tool against one or more URLs.
- **Flow** — a Playwright script defining user interactions during an audit.
- **Finding** — a single performance issue detected during an audit.
- **Evidence** — the trace/HAR/snapshot/screenshot proving a finding.
- **Module** — one of the 6 analysis modules (Observer, Proxy, Architect, Asset Inspector, Render, Memory).
- **Vibe-Score** — the 0–100 weighted score in the final report.
- **Direct Impact** — finding with measured runtime evidence.
- **Theoretical Debt** — static pattern without runtime confirmation.
- **observedIn** — where a finding was detected, expressed as runtime attribution (component name, network endpoint, DOM selector, stack trace) — never as a local source file path.
- **recommendation** — text guidance for addressing a finding. No auto-fix, no codemod.

---

## What Claude Should NOT Do

- ❌ Add features not in the current instruction file.
- ❌ Assume source code access at any point.
- ❌ Skip evidence capture "because the finding is obvious."
- ❌ Mix Direct Impact and Theoretical Debt in the same section.
- ❌ Use mock data in CI tests where real fixtures should run.
- ❌ Add dependencies without checking against the approved list in `architecture.md`.
- ❌ Refactor outside the current task's scope.
- ❌ Write code without first viewing the relevant existing files.
- ❌ Design auto-fix, codemod, or "apply fix" features. This is a report-only tool.

---

## What Claude SHOULD Do

- ✅ Ask before architectural deviations.
- ✅ Read `SUBAGENTS.md` and delegate subtasks to `backend`, `test`, and `integration` Haiku subagents.
- ✅ Read the full instruction file before starting.
- ✅ Run tests after every meaningful change.
- ✅ **Update `HANDOFF.md` at the end of every stage** — mark the stage done, update "What's Done", update "Next Steps". This is mandatory, not optional.
- ✅ Update `STATUS.md` at the end of each work session.
- ✅ Capture evidence for every finding type during testing.
- ✅ Prefer small, reviewable commits over big-bang changes.
- ✅ Surface uncertainty explicitly — never bluff confidence on inferred behavior.

---

## Current Project State

> Update this section at the end of every session.

- [ ] Stage 1: Foundation & Audit Engine
- [ ] Stage 2: Observer Module (CDP + Web Vitals)
- [ ] Stage 3: Proxy Module (Network Forensics)
- [ ] Stage 4: Asset Inspector Module
- [ ] Stage 5: Architect Module (Inferred Backend)
- [ ] Stage 6: Render Module (React Profiler, Memoization, Virtualization)
- [ ] Stage 7: Memory Module (Intervals, Listeners, Unbounded State)
- [ ] Stage 8: Scoring, Tiers & Report Engine
- [ ] Stage 9: Web UI — Landing, Scan, Results
- [ ] Stage 10: Polish, Evidence Bundling, Download & Production

---

## Quick Reference

- **Run audit engine:** `pnpm --filter @vibecheck/engine audit <url>`
- **Run web app dev:** `pnpm dev`
- **Run tests:** `pnpm test`
- **Lint:** `pnpm lint`
- **Type check:** `pnpm typecheck`
- **Build:** `pnpm build`
- **Dev fixture site:** `pnpm --filter fixture-site dev`

---

## Communication Style With User

- Be direct. The user is technical and prefers brevity.
- Ask one focused question rather than a list of clarifications.
- When showing progress, link to the file/line, don't paste large blocks.
- Mark assumptions explicitly: "Assuming X — say so if wrong."
- After completing a stage, summarize: what was built, what was tested, what's next.
