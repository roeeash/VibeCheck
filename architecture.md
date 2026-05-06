# architecture.md — VibeCheck Ultra System Architecture

> Read after `CLAUDE.md`. This document defines module boundaries, data flow, and technical guidelines. Specific work items live in `instructions/instruction<N>.md`.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       React Web Frontend                        │
│  • Landing (URL input + scan)                                   │
│  • Scan progress with lightning-strike transition               │
│  • Results dashboard (findings by module, evidence, download)   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    HTTP + WebSocket
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Audit Engine (Node.js API)                  │
│   • Receives audit requests with URL + options                  │
│   • Launches Playwright + CDP                                   │
│   • Coordinates analysis modules                                │
│   • Emits progress events via WebSocket                         │
│   • Returns structured findings + evidence bundle               │
└──┬──────────────────────────────────────────────────────────┬───┘
   │                                                          │
   │  AuditEvent stream (typed events)                        │
   │                                                          │
   ▼                                                          ▼
┌──────────────────────┐                          ┌──────────────────────┐
│  Analysis Modules    │                          │   Evidence Store     │
│ (parallel, isolated) │                          │ (HAR, traces, heaps) │
├──────────────────────┤                          └──────────────────────┘
│ Observer             │                                      │
│ Proxy                │ ─────────► Findings ────►            │
│ Architect            │                                      │
│ Asset Inspector      │                                      │
│ Render               │                                      │
│ Memory               │                                      │
└──────────────────────┘                                      │
                                                               ▼
                                               ┌──────────────────────────┐
                                               │   Correlation Engine     │
                                               │ • Joins related findings │
                                               │ • Computes Vibe-Score    │
                                               └────────────┬─────────────┘
                                                            │
                                                            ▼
                                               ┌──────────────────────────┐
                                               │     Report Generator     │
                                               │ • JSON for frontend      │
                                               │ • VIBE_REPORT.md download│
                                               │ • Evidence bundle        │
                                               └──────────────────────────┘
```

---

## Monorepo Layout

```
vibecheck-ultra/
├── CLAUDE.md
├── architecture.md
├── instructions/
│   ├── instruction1-foundation.md
│   ├── instruction2-observer.md
│   ├── instruction3-proxy.md
│   ├── instruction4-asset-inspector.md
│   ├── instruction5-architect.md
│   ├── instruction6-interaction-auditor.md
│   ├── instruction7-scoring-report.md
│   ├── instruction8-web-ui.md
│   ├── instruction9-polish-evidence.md
│   └── instruction10-production.md
├── STATUS.md                        # current progress, updated each session
├── package.json                     # workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── packages/
│   ├── engine/                      # Node.js audit engine + module coordinator
│   ├── observer/                    # CDP + Web Vitals + paint + reflow + layout thrash
│   ├── proxy/                       # Network forensics, N+1, waterfall, over-fetching
│   ├── architect/                   # Inferred backend / DB analysis
│   ├── asset-inspector/             # Images, CSS, bundles
│   ├── render/                      # React profiler, memoization, virtualization
│   ├── memory/                      # Intervals, listeners, unbounded state
│   ├── correlator/                  # Joins findings into root causes + scoring
│   ├── injector/                    # Page-side instrumentation scripts
│   ├── core/                        # Shared types, Result, AuditEvent, Finding
│   └── evidence/                    # Evidence store + serialization
├── apps/
│   ├── web/                         # React frontend (Next.js or Vite)
│   └── fixture-site/                # Deliberately broken site for testing
├── flows/                           # Sample flow scripts
└── tests/
    └── e2e/                         # End-to-end audits against fixture-site
```

---

## Module Contract

Every analysis module implements this interface:

```ts
// packages/core/src/module.ts

export interface AnalysisModule {
  readonly name: string;
  readonly weight: number;        // contribution to Vibe-Score (0-100 sum across all)

  /** Called once at audit start. Set up CDP listeners, inject scripts. */
  initialize(ctx: AuditContext): Promise<Result<void, VibeError>>;

  /** Called for every AuditEvent. Modules pick what they care about. */
  onEvent(event: AuditEvent): Promise<void>;

  /** Called after the flow completes. Compute findings. */
  finalize(): Promise<Finding[]>;

  /** Called on shutdown. Detach listeners, clean up. */
  dispose(): Promise<void>;
}
```

**Why:** Modules are **independent and parallelizable**. They never call each other directly. They communicate only through the event stream and emit findings at the end. This makes them testable in isolation and the orchestrator simple.

---

## Core Data Types

### `AuditContext`
The bag of resources every module receives.

```ts
interface AuditContext {
  url: string;
  flow: FlowScript;
  page: Page;                       // Playwright page
  cdp: CDPSession;                  // Chrome DevTools Protocol
  evidenceStore: EvidenceStore;
  logger: Logger;
  config: AuditConfig;
  signal: AbortSignal;
}
```

### `AuditEvent`
The discriminated union streamed to all modules.

```ts
type AuditEvent =
  | { type: 'audit.start'; url: string; timestamp: number }
  | { type: 'audit.end';   url: string; timestamp: number }
  | { type: 'flow.step';   step: FlowStep; timestamp: number }
  | { type: 'network.request'; request: NetworkRequest }
  | { type: 'network.response'; response: NetworkResponse }
  | { type: 'cdp.long_task'; task: LongTask }
  | { type: 'cdp.long_animation_frame'; frame: LoAFEntry }
  | { type: 'cdp.layout_shift'; shift: LayoutShift }
  | { type: 'cdp.forced_reflow'; reflow: ForcedReflow }
  | { type: 'web_vital'; metric: WebVital }
  | { type: 'dom.mutation_burst'; burst: MutationBurst }
  | { type: 'heap.snapshot'; snapshot: HeapSnapshotRef }
  | { type: 'console.message'; message: ConsoleMessage };
```

### `Finding`
The standardized output of every module. Used by the frontend results dashboard.

```ts
interface Finding {
  id: string;                       // stable hash of (module, type, target)
  module: string;
  type: FindingType;                // enum, see below
  category: 'direct_impact' | 'theoretical_debt';
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: 'high' | 'medium' | 'low';
  title: string;                    // one-line headline
  description: string;              // markdown, multi-line
  observedIn: string;               // runtime attribution (component name, endpoint, selector)
  evidence: EvidenceRef[];          // pointers into evidence store
  metrics: Record<string, number>;  // numeric measurements
  recommendation: string;           // text guidance — NOT a fix or codemod
  scoreImpact: number;              // 0-100, how much it docks the Vibe-Score
}
```

### `EvidenceRef`
Pointer to a stored artifact, never the artifact itself.

```ts
interface EvidenceRef {
  kind: 'cdp_trace' | 'har_entry' | 'heap_snapshot' | 'screenshot' | 'console_log' | 'mutation_log';
  path: string;                     // relative to audit output dir
  range?: { start: number; end: number };  // for traces, ms offset
  selector?: string;                // for screenshots/DOM
  description: string;
}
```

---

## Module Boundaries (Strict)

| Module | Responsibilities | NOT Responsibilities |
|---|---|---|
| **Engine** | Launch browser, run flow, coordinate modules, API endpoints | Analysis logic |
| **Observer** | Web Vitals, long tasks, LoAF, paint, reflow, layout thrash | Network analysis, React-specific analysis |
| **Proxy** | Network patterns, N+1, waterfalls, payload health, over-fetching | Backend inference (that's Architect) |
| **Architect** | Inferring DB/backend behavior from network signals | Frontend analysis |
| **Asset Inspector** | Images, CSS, bundle composition | Animation runtime cost (Observer) |
| **Render** | React profiler, memoization, virtualization, inline allocations | Performance metrics |
| **Memory** | Intervals, listeners, unbounded state, recursive handlers | Heap snapshots (Observer) |
| **Correlator** | Joining related findings into root causes + Vibe-Score | Generating findings |
| **Report Generator** | JSON for frontend, MD download, evidence bundle | Scoring (correlator does it) |

---

## Data Flow

1. **Frontend** sends URL to audit engine API endpoint.
2. **Engine** launches Playwright, attaches CDP, instantiates all modules, calls `initialize()` on each.
3. **Engine** runs the flow step-by-step, emitting `flow.step` events.
4. **Browser/CDP** events stream through the engine, transformed into `AuditEvent`s.
5. **Modules** receive every event, store internal state, capture evidence into the evidence store.
6. **Engine** finishes flow, calls `finalize()` on each module to collect `Finding[]`.
7. **Correlator** merges findings, computes Vibe-Score, identifies root causes spanning modules.
8. **Report Generator** returns JSON to frontend, offers `VIBE_REPORT.md` download + evidence bundle.

---

## Concurrency Model

- **One browser instance per audit.** Multiple URLs run sequentially in tabs (or in fresh contexts to avoid state bleed).
- **Modules run in-process** but are designed for isolation — no shared mutable state between them.
- **Evidence writes are async** but ordered per URL.
- **Engine** handles concurrent audit requests via request queue.
- **Progress events** streamed to frontend via WebSocket during audit.

---

## Configuration

Passed from frontend as JSON to the audit API:

```ts
interface AuditConfig {
  url: string;
  flow?: string;                    // flow script name or inline JSON
  auth?: AuthConfig;
  budget?: PerformanceBudget;
  maxRoutes?: number;               // default 10
  output: { dir: string };
  modules?: { [name: string]: { enabled?: boolean; options?: unknown } };
  network?: 'fast' | 'slow_4g' | '3g';
  cpu?: 1 | 2 | 4 | 6;              // throttle multiplier
}
```

---

## Approved Dependencies

> Adding anything outside this list requires explicit approval.

**Runtime (Engine):**
- `playwright` — browser automation
- `chrome-remote-interface` — CDP
- `pino` — logging
- `zod` — runtime validation
- `express` or `fastify` — API server
- `ws` — WebSocket for progress streaming
- `p-limit`, `p-queue` — concurrency
- `source-map` — optional source map symbolication enrichment (only when maps are publicly exposed)
- `cheerio` — HTML parsing for link discovery
- `puppeteer-har` — HAR generation (or custom via CDP)
- `mitt` — typed event emitter

**Runtime (Frontend):**
- `react` + `react-dom` — UI framework
- TypeScript for type safety

**Development:**
- `typescript`, `tsx`, `vitest`, `@types/node`
- `eslint`, `@typescript-eslint/*`, `prettier`
- `tsup` — bundling
- `changesets` — versioning

**Banned:**
- ❌ Any AI/LLM SDK in the core auditor (the auditor must be deterministic; AI is for the optional summary layer only).
- ❌ Lodash, moment — use native or date-fns.
- ❌ Any package without TypeScript types.

---

## Performance Budget for the Tool Itself

- **Cold start to first audit event:** <2s
- **Single-URL audit (no stress):** <30s
- **Full audit (5 URLs, stress on):** <3min
- **Memory ceiling:** <1.5GB RSS per audit
- **Output dir size:** <100MB per audit (gzipped traces)

If a module risks blowing these, it must be opt-in.

---

## Error Handling Philosophy

```ts
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

interface VibeError {
  code: VibeErrorCode;
  module: string;
  message: string;
  cause?: unknown;
  recoverable: boolean;
}
```

- **Module failures are isolated.** One module crashing should never tank the audit.
- **Findings degrade gracefully.** If evidence capture fails, the finding is downgraded to lower confidence, not dropped — unless evidence is essential to the claim.
- **Timeouts everywhere.** Default 10s per CDP call, 30s per network request, 60s per flow step.
- **Retries are explicit.** No silent retries. Logged at `warn`.
- **API errors** return structured JSON to the frontend with actionable messages.

---

## Testing Strategy

### Fixture Site (`apps/fixture-site`)
A Next.js app deliberately containing every issue we detect:
- A page rendering 10,000 unvirtualized DOM nodes
- An endpoint with N+1 fetch pattern
- An image at 4000px in a200px container
- A `setInterval` without cleanup
- A `top/left` animation
- A waterfall fetch chain
- An endpoint returning 100 fields when 3 are used
- A search input without debounce
- A bundle with duplicated lodash

**Every finding type must have a corresponding fixture.** No fixture, no finding.

### Test Layers

1. **Unit:** Pure functions — N+1 detection algorithm, scoring, source-map symbolication (when available), etc. Run on every commit.
2. **Module integration:** Each module against a mocked CDP/network stream. No real browser.
3. **End-to-end:** Full audit against the fixture site. Asserts the report contains expected findings with expected severity.
4. **Frontend tests:** React component tests for the results dashboard rendering.

---

## Logging & Observability of the Tool Itself

- Every audit gets a unique `auditId`.
- Logs go to `output/<auditId>/audit.log` in JSON.
- A summary line per module: `module=observer findings=14 duration=4.2s`.
- Frontend can request verbose logs via a separate API endpoint for debugging.

---

## Security & Privacy

- **Auth credentials** are never logged, never written to evidence files.
- **Response bodies** stored in HAR are scrubbed: `Authorization`, `Cookie`, `Set-Cookie` headers stripped; bodies of endpoints flagged as sensitive (`/auth`, `/login`, etc.) replaced with `<redacted>`.
- **Rate limit** audit requests: max 3 concurrent per IP.
- **Never bypass CAPTCHA / bot protection.** If detected, return a clear error to the frontend.
- **Audit output** is ephemeral — cleaned up after 24 hours unless user downloads it.

---

## Extensibility

Modules are loaded by name from a registry. Third parties can publish `vibecheck-module-*` packages that conform to `AnalysisModule`. The engine discovers them via the config's `modules` field.

This means **new finding types ship without core changes**.

---

## Versioning

- The application follows semver.
- The **report schema** has its own version (`reportVersion: "1.0"`) embedded in JSON output, so downstream consumers can pin.
- Findings have stable `type` strings; once published, never renamed (deprecate + alias).

---

## Anti-Goals

To stay focused, this tool **deliberately does not**:

- ❌ Replace Lighthouse for accessibility/SEO/PWA audits.
- ❌ Run synthetic monitoring (it's a one-shot auditor, not a beacon).
- ❌ Modify the target site or attempt fixes on the live URL.
- ❌ Aggregate audits across time (that's a separate dashboard product).
- ❌ Score subjective UX (we measure performance, not design).
- ❌ Provide a CLI — this is a web application, not a command-line tool.
- ❌ Generate auto-fixes, codemods, or "apply fix" features. Report only.
