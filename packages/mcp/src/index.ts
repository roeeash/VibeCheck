#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { spawn, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const API_URL = 'http://localhost:4000';
const DEV_PORT = process.env.DEV_PORT ?? '5173';
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;
const API_BIN = resolve(dirname(fileURLToPath(import.meta.url)), '../../../apps/api/dist/server.js');

let lastAuditId: string | null = null;

interface AuditResult {
  id: string;
  status: 'running' | 'completed' | 'failed';
  findings?: Finding[];
  score?: number;
  scoreResult?: { grade: string; summary: string };
  startedAt: number;
  completedAt?: number;
  error?: string;
}

interface Finding {
  id: string;
  module: string;
  type: string;
  category: string;
  severity: string;
  confidence: string;
  title: string;
  description: string;
  observedIn: string;
  recommendation: string;
  scoreImpact: number;
}

async function isApiReady(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(1000) });
    return res.ok;
  } catch {
    return false;
  }
}

function buildApiIfNeeded(): void {
  if (existsSync(API_BIN)) return;
  process.stderr.write(`apps/api/dist/server.js not found — building API…\n`);
  execSync('pnpm --filter api build', {
    stdio: 'inherit',
    cwd: resolve(dirname(fileURLToPath(import.meta.url)), '../../..'),
  });
  if (!existsSync(API_BIN)) {
    throw new Error('Build succeeded but apps/api/dist/server.js still missing.');
  }
}

async function ensureApiRunning(): Promise<void> {
  buildApiIfNeeded();
  if (await isApiReady()) return;

  process.stderr.write(`VibeCheck API not running — starting ${API_BIN}\n`);
  const child = spawn('node', [API_BIN], {
    detached: true,
    stdio: ['ignore', 'ignore', 'inherit'],
    env: { ...process.env },
  });
  child.unref();

  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 500));
    if (await isApiReady()) return;
  }
  throw new Error('VibeCheck API failed to start within 5 seconds. Check that apps/api/dist/server.js exists (run `pnpm --filter api build`).');
}

function buildDevUrl(path: string): string {
  const normalised = path.startsWith('/') ? path : `/${path}`;
  return `http://localhost:${DEV_PORT}${normalised}`;
}

async function startAudit(url: string): Promise<string> {
  const res = await fetch(`${API_URL}/api/audit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, output: { dir: '/tmp/vibecheck-mcp' } }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to start audit (${res.status}): ${body}`);
  }
  const data = await res.json() as { id: string };
  return data.id;
}

async function pollAudit(id: string): Promise<AuditResult> {
  const res = await fetch(`${API_URL}/api/audit/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch audit ${id}: ${res.status}`);
  return res.json() as Promise<AuditResult>;
}

async function runAuditAndWait(url: string): Promise<AuditResult> {
  const id = await startAudit(url);
  lastAuditId = id;
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    const result = await pollAudit(id);
    if (result.status === 'completed' || result.status === 'failed') {
      return result;
    }
  }
  throw new Error(`Audit timed out after 5 minutes (id: ${id})`);
}

function formatAuditResult(result: AuditResult): string {
  if (result.status === 'failed') {
    return `Audit ID: ${result.id}\nAudit failed: ${result.error ?? 'unknown error'}`;
  }

  const findings = result.findings ?? [];
  const top = [...findings]
    .sort((a, b) => b.scoreImpact - a.scoreImpact)
    .slice(0, 10);

  const lines: string[] = [
    `Audit ID: ${result.id}`,
    `Vibe-Score: ${result.score ?? 'N/A'}/100 (${result.scoreResult?.grade ?? '?'})`,
    `${result.scoreResult?.summary ?? ''}`,
    '',
    `Top findings (${findings.length} total):`,
  ];

  for (const f of top) {
    lines.push(`[${f.severity.toUpperCase()}] ${f.title}`);
    lines.push(`  ${f.description}`);
    lines.push(`  Recommendation: ${f.recommendation}`);
    lines.push('');
  }

  return lines.join('\n');
}

const server = new McpServer({
  name: 'vibecheck',
  version: '0.1.0',
});

server.tool(
  'audit_dev_server',
  `Audit the local dev server running on port ${DEV_PORT}. Starts the VibeCheck API if needed, runs a full performance audit, and returns Vibe-Score and prioritized findings.`,
  { path: z.string().default('/').describe('URL path to audit (e.g. "/dashboard"). Defaults to "/".') },
  async ({ path }) => {
    await ensureApiRunning();
    const url = buildDevUrl(path);
    process.stderr.write(`Auditing ${url}\n`);
    const result = await runAuditAndWait(url);
    return { content: [{ type: 'text', text: formatAuditResult(result) }] };
  },
);

server.tool(
  'get_last_audit',
  'Return the results of the most recently completed audit without re-running it.',
  {},
  async () => {
    if (!lastAuditId) {
      return { content: [{ type: 'text', text: 'No audit has been run yet in this session.' }] };
    }
    const result = await pollAudit(lastAuditId);
    return { content: [{ type: 'text', text: formatAuditResult(result) }] };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write(`VibeCheck MCP server running (dev port: ${DEV_PORT})\n`);
