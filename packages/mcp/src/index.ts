#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_URL = (process.env.VIBECHECK_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

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
    return `Audit failed: ${result.error ?? 'unknown error'}`;
  }

  const findings = result.findings ?? [];
  const top = [...findings]
    .sort((a, b) => b.scoreImpact - a.scoreImpact)
    .slice(0, 10);

  const lines: string[] = [
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
  version: '0.0.1',
});

server.tool(
  'run_audit',
  'Run a full black-box performance audit on a URL. Polls until done (up to 5 minutes). Returns Vibe-Score, grade, and prioritized findings.',
  { url: z.string().url().describe('The URL to audit (must be publicly accessible)') },
  async ({ url }) => {
    const result = await runAuditAndWait(url);
    return { content: [{ type: 'text', text: formatAuditResult(result) }] };
  },
);

server.tool(
  'get_audit',
  'Fetch the current status and results of a previously started audit by ID.',
  { id: z.string().describe('Audit ID returned by run_audit or a prior get_audit call') },
  async ({ id }) => {
    const result = await pollAudit(id);
    return { content: [{ type: 'text', text: formatAuditResult(result) }] };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write('VibeCheck MCP server running on stdio\n');
