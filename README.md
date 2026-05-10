# VibeCheck Ultra

> Black-box web performance auditor. Give it any live URL and get a detailed report of runtime, network, memory, and rendering issues — with reproducible evidence — without ever touching source code.

## How It Works

```
Paste URL → Headless Chromium scan → 6 modules analyze → Correlated report with evidence
```

1. Audit engine launches headless Chromium via Playwright and attaches CDP
2. Six independent modules initialize, each attaching CDP listeners and page-side injectors
3. Flow script runs — page load, scroll, interactions — while modules collect evidence
4. Modules finalize and return findings
5. Correlator joins related findings, identifies root causes, computes the Vibe-Score (0–100)
6. Report Generator returns JSON + downloadable `VIBE_REPORT.md`

## Audit Modules

| Module | Detects |
|---|---|
| **Observer** | Long tasks, LoAF, CLS, forced reflows, paint storms, Web Vitals (LCP, FCP, CLS) |
| **Proxy** | N+1 chains, waterfall deps, over-fetching, duplicate fetches, missing cache headers |
| **Architect** | Slow endpoints, wide responses, under-pagination (inferred from network behavior) |
| **Asset Inspector** | Oversized images, blocking scripts, unused CSS, bloated JS bundles, heavy third-parties |
| **Render** | React re-render storms, missing memoization, unvirtualized lists, inline allocations |
| **Memory** | Leaked intervals/listeners, unbounded state growth, stale closures |

## Interfaces

### Web App (`apps/web`)

React frontend + Express backend on port **3000**.

```bash
pnpm dev   # starts API + Vite UI concurrently
```

Paste a URL → live scan progress → results dashboard → download `VIBE_REPORT.md`.

### REST API (`apps/api`)

Standalone Express server on port **4000**. No UI, no WebSocket — JSON only, CORS open. Deploy independently of the web app.

```bash
pnpm --filter @vibecheck/api dev    # start locally
pnpm --filter @vibecheck/api start  # production
```

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness probe |
| `POST` | `/api/audit` | Start audit — body `{ "url": "https://..." }` — returns 202 `{ id, status }` |
| `GET` | `/api/audit/:id` | Poll status / fetch results |
| `GET` | `/api/audit/:id/download` | Download `VIBE_REPORT.md` |
| `DELETE` | `/api/audit/:id` | Delete audit and artifacts |

Rate limited: 3 concurrent audits / 10 per hour per IP.

```bash
# Example
curl -X POST http://localhost:4000/api/audit \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com"}'
# → {"id":"...","status":"running"}

curl http://localhost:4000/api/audit/<id>
# → {"status":"completed","score":82,"findings":[...]}
```

### MCP Server (`packages/mcp`)

[Model Context Protocol](https://modelcontextprotocol.io) server — lets Claude (and any MCP-compatible LLM) run audits directly as tools.

**Prerequisites:**
- Build the MCP server: `pnpm --filter @vibecheck/mcp build`
- Either the REST API server is running locally on port 4000, or you configure a remote API URL

**Tools exposed:**

- `run_audit(url)` — starts an audit, polls until complete (up to 5 min), returns score + top findings
- `get_audit(id)` — fetch a previously started audit by ID

**Configuration:**

Create or edit `.mcp.json` at the project root:

```json
{
  "mcpServers": {
    "vibecheck": {
      "command": "node",
      "args": [
        "packages/mcp/dist/index.js"
      ],
      "env": {
        "VIBECHECK_API_URL": "https://your-api-server.com"
      }
    }
  }
}
```

- `VIBECHECK_API_URL` — optional. Defaults to `http://localhost:4000` if unset. Point to your deployed API server.
- In Claude Desktop or Claude Code, the MCP server is loaded from this `.mcp.json` file automatically.

## Monorepo Structure

```
apps/
  web/             — Express API + React frontend
  api/             — Standalone REST API server (port 4000)
  fixture-site/    — Deliberately broken Next.js app for E2E testing

packages/
  engine/          — Playwright launcher, CDP bridge, module coordinator
  observer/        — Web Vitals, long tasks, LoAF, reflow
  proxy/           — Network forensics: N+1, waterfall, over-fetching
  architect/       — Inferred backend: DB time, pagination, wide responses
  asset-inspector/ — Images, CSS, bundle composition
  render/          — React profiler, memoization, virtualization
  memory/          — Leaked intervals/listeners, unbounded state
  correlator/      — Joins findings, computes Vibe-Score
  core/            — Shared types: Finding, AuditEvent, Result
  evidence/        — Evidence store + serialization
  reporter/        — JSON + Markdown report rendering
  injector/        — Page-side instrumentation scripts
  mcp/             — MCP server (stdio) wrapping the REST API
```

## Quick Start

```bash
pnpm install
pnpm dev           # Web app (UI + API on port 3000)
pnpm test          # Vitest across workspace
pnpm typecheck     # TypeScript check
pnpm build         # Build all packages
```

## Core Principles

- **Black-box only** — no source code access; everything inferred from CDP, network, DOM, heap snapshots
- **Evidence-based** — every finding includes reproducible proof (trace, HAR, snapshot, screenshot)
- **Report only** — diagnoses, never patches or auto-fixes
- **Direct Impact vs Theoretical Debt** — runtime-measured findings vs. static patterns; never mixed
- **Honest about inference** — backend findings are inferred and always labeled with a confidence level
