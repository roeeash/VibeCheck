# SUBAGENTS.md — VibeCheck Ultra Subagent Roles

Spawn these subagents via the `Agent` tool with `model: "haiku"` for focused subtasks.
Each role has a narrow scope — never overlap them on the same file in the same turn.

---

## Role: `backend`

**When to spawn:** Implementing or modifying anything under `packages/` or `apps/web/src/` (Express API, audit modules, CDP detectors, correlator, reporter, evidence store).

**What it does:**
- Implements `AnalysisModule` contract: `initialize()`, `onEvent()`, `finalize()`, `dispose()`
- Writes detector logic (pure functions operating on CDP events / network data)
- Creates/modifies Express routes and middleware in `apps/web/src/`
- Updates `packages/*/src/index.ts` exports
- Follows `Result<T, VibeError>` error handling, pino logging, strict TypeScript

**What it must NOT do:**
- Touch `apps/web/client/` (frontend territory)
- Write test files (testing territory)
- Add dependencies without checking `architecture.md` approved list

**Prompt template:**
```
You are implementing backend engine code for VibeCheck Ultra (black-box web performance auditor).
Context: packages/ contains analysis modules (observer, proxy, architect, etc.) implementing the AnalysisModule contract.
Task: [describe the specific detector/module/route to implement]
Constraints:
- Result<T, VibeError> not throw. Timeouts on all CDP/network ops.
- No any without comment. kebab-case files. pino structured logging.
- observedIn = runtime attribution only (never local file paths).
- Architect findings: never high confidence.
Read the relevant existing files before editing. Report what you changed.
```

---

## Role: `test`

**When to spawn:** Writing or updating unit tests, integration tests, or E2E tests against the fixture site.

**What it does:**
- Writes vitest unit tests for pure functions (detectors, parsers, scorers)
- Writes integration tests with mocked CDP for module orchestration
- Writes E2E tests in `tests/e2e/` against `apps/fixture-site`
- Adds fixture routes to `apps/fixture-site/` for new anti-patterns
- Verifies test IDs match finding IDs emitted by detectors

**What it must NOT do:**
- Use mock data in E2E tests where real fixture routes exist
- Modify production source files (backend/frontend territory)
- Skip fixture creation — every finding type needs a corresponding fixture

**Prompt template:**
```
You are writing tests for VibeCheck Ultra (black-box web performance auditor).
Context: vitest workspace, fixture site at apps/fixture-site (Next.js 14, port 3001).
Task: [describe what to test — specific detector, module, or E2E flow]
Constraints:
- Unit tests for pure functions only. Mock CDP for module integration tests.
- E2E tests hit the real fixture site — no mock data.
- Every new finding type needs a fixture route that triggers it.
- Target score for fixture site with all anti-patterns: ~25–35. Clean control: ≥ 90.
Read existing test files first. Report what you added and what passes.
```

---

## Role: `integration`

**When to spawn:** Wiring frontend (`apps/web/client/`) to the API, aligning TypeScript types between packages and the client, updating WebSocket event handling, or modifying the client data layer.

**What it does:**
- Updates `apps/web/client/src/lib/api.ts` and `websocket.ts`
- Keeps `apps/web/client/src/types.ts` in sync with `packages/core/src/` types
- Wires new module findings into `results-dashboard.tsx` and `module-section.tsx`
- Updates `SCAN_PHASES` / `PHASE_LOG` in `types.ts` when new modules are added
- Ensures Vite proxy config covers any new API routes

**What it must NOT do:**
- Implement new API routes or engine logic (backend territory)
- Write tests (testing territory)
- Add UI components that aren't driven by real API data

**Prompt template:**
```
You are wiring the React frontend to the VibeCheck Ultra API.
Context: apps/web/client/ is a Vite+React 18 SPA. API runs on port 3000 (Express). WS at /ws/audit.
Task: [describe the integration change — new finding type display, WS event, type sync, etc.]
Constraints:
- Client types in src/types.ts must stay compatible with packages/core/src/finding.ts.
- No hardcoded ports — use relative /api paths (proxied by Vite in dev).
- Score is computed client-side: max(0, 100 - sum(finding.scoreImpact)).
- observedIn is runtime attribution — display as-is, never reformat as a file path.
Read apps/web/client/src/types.ts and the relevant component before editing. Report what changed.
```

---

## Usage Pattern

```ts
// In the main conversation, spawn the right subagent for each subtask:

Agent({
  description: "Implement architect detector",
  subagent_type: "general-purpose",
  model: "haiku",
  prompt: `[backend role prompt template filled in]`
})

Agent({
  description: "Write architect unit tests",
  subagent_type: "general-purpose",
  model: "haiku",
  prompt: `[test role prompt template filled in]`
})

Agent({
  description: "Wire architect findings to UI",
  subagent_type: "general-purpose",
  model: "haiku",
  prompt: `[integration role prompt template filled in]`
})
```

Run backend + test subagents in parallel when they touch different files.
Always run integration subagent after backend subagent completes (type dependency).
