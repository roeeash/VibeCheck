# VibeCheck Ultra

> Black-box web performance auditor. Give it any live URL and get a detailed report of runtime, network, memory, and rendering issues — with reproducible evidence — without ever touching source code.

**[Try it now →](https://vibecheck-ujc4.onrender.com/)** · [GitHub](https://github.com/roeeash/VibeCheck)

---

## What It Does

VibeCheck Ultra runs a headless Chromium browser against any publicly accessible URL, attaches Chrome DevTools Protocol instrumentation across six analysis modules, exercises the page through a realistic interaction flow, then produces a correlated findings report with a 0–100 Vibe-Score.

Every finding includes:
- **What was observed** — the exact CDP event, network entry, or DOM measurement that triggered it
- **Where it was observed** — component name, network endpoint, DOM selector, or stack trace
- **Confidence level** — `high` (directly measured), `medium` (strongly inferred), `low` (heuristic)
- **Recommendation** — specific guidance on how to address it

No source code access needed. VibeCheck works entirely from what the browser sees.

---

## Audit Modules

| Module | Detects |
|---|---|
| **Observer** | Long tasks, LoAF, CLS, forced reflows, paint storms, Web Vitals (LCP, FCP, CLS, INP) |
| **Proxy** | N+1 request chains, waterfall dependencies, over-fetching, duplicate fetches, missing cache headers |
| **Architect** | Slow endpoints, wide JSON responses, under-pagination (inferred from network timing) |
| **Asset Inspector** | Oversized images, render-blocking scripts, unused CSS, bloated JS bundles, heavy third-party payloads |
| **Render** | React re-render storms, missing memoization, unvirtualized long lists, inline object allocations |
| **Memory** | Leaked intervals and event listeners, unbounded state growth, stale closures |

---

## Quickest Start — Use the Hosted API

A public API instance is already running. No setup required.

```bash
# Start an audit
curl -X POST https://vibecheck-api-yixe.onrender.com/api/audit \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://yoursite.com"}'
# → {"id":"audit-...","status":"running"}

# Poll until done, then fetch results
curl https://vibecheck-api-yixe.onrender.com/api/audit/<id>

# Download the full report
curl -O https://vibecheck-api-yixe.onrender.com/api/audit/<id>/download
```

Rate limits: **3 concurrent audits / 10 per hour** per IP. For higher limits, deploy your own instance (see below).

---

## Ways to Use VibeCheck

| Interface | Best for |
|---|---|
| [**REST API**](#rest-api) | Scripts, CI pipelines, custom tooling |
| [**MCP Server**](#mcp-server) | Running audits directly inside Claude or another LLM agent |
| [**Web App**](#web-app) | Interactive browser UI with a live results dashboard |

---

## REST API

### Option A — Use the hosted instance

Base URL: **`https://vibecheck-api-yixe.onrender.com`**

No setup. Just make requests. See [endpoints](#endpoints) and [examples](#examples) below.

### Option B — Run your own instance

**Requirements:** Node.js 20+, pnpm, Playwright Chromium

```bash
git clone https://github.com/roeeash/VibeCheck
cd VibeCheck
pnpm install
pnpm --filter @vibecheck/engine exec playwright install chromium
pnpm --filter @vibecheck/api dev      # dev mode, auto-reload on port 4000
# or
pnpm --filter @vibecheck/api start    # production mode
```

Set `PORT` to change the default port 4000.

**Or run with Docker:**

```bash
docker build -f apps/api/Dockerfile -t vibecheck-api .
docker run -p 4000:4000 vibecheck-api
```

The Dockerfile builds the full monorepo, installs Playwright's Chromium, and runs the standalone API server. No other services needed.

**Or deploy to Render:**

`render.yaml` is included. Connect your fork to [Render](https://render.com), select "New Blueprint", and it will deploy the API automatically. Set the `PORT` env var to `4000` on the `vibecheck-api` service.

Once deployed, replace `http://localhost:4000` with your Render URL everywhere below.

---

### Endpoints

All examples use the hosted URL. Replace with `http://localhost:4000` when running locally.

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness check |
| `POST` | `/api/audit` | Start an audit |
| `GET` | `/api/audit/:id` | Poll status and fetch results |
| `GET` | `/api/audit/:id/download` | Download `VIBE_REPORT.md` |
| `DELETE` | `/api/audit/:id` | Delete audit and all artifacts |

---

### Examples

#### Start an audit

```bash
curl -X POST https://vibecheck-api-yixe.onrender.com/api/audit \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://example.com"}'
```

Response `202 Accepted`:
```json
{ "id": "audit-1778410876483-4", "status": "running" }
```

#### Poll for results

Audits are asynchronous. Poll `GET /api/audit/:id` until `status` is `"completed"` or `"failed"`.

```bash
curl https://vibecheck-api-yixe.onrender.com/api/audit/audit-1778410876483-4
```

While running:
```json
{ "id": "audit-1778410876483-4", "status": "running", "startedAt": 1778410876483 }
```

When complete:
```json
{
  "id": "audit-1778410876483-4",
  "status": "completed",
  "score": 82,
  "scoreResult": { "grade": "B", "summary": "Good overall, some render-blocking assets detected." },
  "startedAt": 1778410876483,
  "completedAt": 1778410934210,
  "findings": [
    {
      "module": "asset-inspector",
      "severity": "high",
      "confidence": "high",
      "title": "Render-blocking script in <head>",
      "description": "A synchronous script tag is blocking HTML parsing before first paint.",
      "observedIn": "<script src='/vendor.js'> in <head>",
      "recommendation": "Move non-critical scripts to the end of <body> or add defer/async.",
      "scoreImpact": 8
    }
  ]
}
```

When failed:
```json
{ "id": "...", "status": "failed", "error": "Navigation timeout after 30s" }
```

#### Download the report

```bash
curl -O https://vibecheck-api-yixe.onrender.com/api/audit/audit-1778410876483-4/download
# saves as VIBE_REPORT_audit-1778410876483-4.md
```

#### Delete an audit

```bash
curl -X DELETE https://vibecheck-api-yixe.onrender.com/api/audit/audit-1778410876483-4
# → { "deleted": true }
```

Removes the audit record and all artifacts (traces, screenshots, heap snapshots) from disk.

#### Full polling script

```bash
#!/bin/bash
API="https://vibecheck-api-yixe.onrender.com"   # or http://localhost:4000
URL="https://yoursite.com"

ID=$(curl -s -X POST "$API/api/audit" \
  -H 'Content-Type: application/json' \
  -d "{\"url\": \"$URL\"}" | jq -r '.id')

echo "Started: $ID"

while true; do
  STATUS=$(curl -s "$API/api/audit/$ID" | jq -r '.status')
  echo "Status: $STATUS"
  [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ] && break
  sleep 5
done

curl -s "$API/api/audit/$ID" | jq '{ score, grade: .scoreResult.grade, findings: [.findings[].title] }'
curl -s -O "$API/api/audit/$ID/download"
```

---

## MCP Server

The MCP server wraps the REST API and exposes two tools that Claude (or any MCP-compatible agent) can call directly. It polls for completion automatically — no manual polling loop needed.

**Tools:**
- `run_audit(url)` — runs a full audit, waits up to 5 minutes, returns Vibe-Score + top findings
- `get_audit(id)` — fetches a previously started audit by ID

### Option A — Point at the hosted API (recommended)

**Step 1 — Clone the repo and build the MCP server:**

```bash
git clone https://github.com/roeeash/VibeCheck
cd VibeCheck
pnpm install
pnpm --filter @vibecheck/mcp build
```

**Step 2 — Create `.mcp.json` at the project root:**

```json
{
  "mcpServers": {
    "vibecheck": {
      "command": "node",
      "args": ["packages/mcp/dist/index.js"],
      "env": {
        "VIBECHECK_API_URL": "https://vibecheck-api-yixe.onrender.com"
      }
    }
  }
}
```

The MCP process runs locally on your machine but sends audit requests to the hosted API — no local Playwright or Chromium required.

**Step 3 — Open the project in Claude Code.** The MCP server loads automatically from `.mcp.json`. Then just call:

```
run_audit(https://yoursite.com)
```

### Option B — Point at your own API instance

Same steps as above, but set `VIBECHECK_API_URL` to your own server:

```json
{
  "mcpServers": {
    "vibecheck": {
      "command": "node",
      "args": ["packages/mcp/dist/index.js"],
      "env": {
        "VIBECHECK_API_URL": "http://localhost:4000"
      }
    }
  }
}
```

Omit `VIBECHECK_API_URL` entirely to default to `http://localhost:4000`.

### Using it

In Claude Code, call tools by name:

```
run_audit(https://yoursite.com)
get_audit(audit-1778410876483-4)
```

Claude Code and Claude Desktop auto-load MCP servers from `.mcp.json` at the project root — no manual registration step.

---

## Web App

A React UI with a live scan progress view and interactive results dashboard.

**Hosted:** [https://vibecheck-ujc4.onrender.com/](https://vibecheck-ujc4.onrender.com/) — no setup, open and go.

**Run locally:**

```bash
git clone https://github.com/roeeash/VibeCheck
cd VibeCheck
pnpm install
pnpm --filter @vibecheck/engine exec playwright install chromium
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Paste a URL → audit runs live → explore findings by module → download `VIBE_REPORT.md`.

---

## Output Artifacts

Every completed audit produces a `VIBE_REPORT.md` — a full Markdown report with all findings, scores, and recommendations.

Download it via `GET /api/audit/:id/download`.

---

## Core Principles

- **Black-box only** — no source code access; all evidence comes from CDP events, network responses, DOM observation, and heap snapshots
- **Evidence-based** — every finding has a reproducible proof artifact; nothing is reported without observed data
- **Report only** — VibeCheck diagnoses, it never patches or modifies the target site
- **Direct Impact vs. Theoretical Debt** — runtime-measured findings and static-pattern findings are always in separate sections, never mixed
- **Honest about inference** — backend findings (DB latency, N+1 query patterns) are inferred from network behavior and always carry a confidence label
