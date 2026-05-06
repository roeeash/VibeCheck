import type { AuditResult } from '../types.js';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes max

export async function startAudit(url: string): Promise<AuditResult> {
  // POST returns 202 immediately with {id, status:'running'}
  const res = await fetch('/api/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      output: { dir: '/tmp/vibecheck' },
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `Audit failed: HTTP ${res.status}`);
  }
  const { id } = await res.json() as { id: string; status: string };

  // Poll until completed or failed
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    const result = await getAudit(id);
    if (result.status === 'completed') return result;
    if (result.status === 'failed') throw new Error((result as unknown as { error?: string }).error ?? 'Audit failed');
  }
  throw new Error('Audit timed out after 5 minutes');
}

export async function getAudit(id: string): Promise<AuditResult> {
  const res = await fetch(`/api/audit/${id}`);
  if (!res.ok) throw new Error(`Audit not found: ${id}`);
  return res.json() as Promise<AuditResult>;
}

export function downloadReportUrl(id: string): string {
  return `/api/audit/${id}/download`;
}
