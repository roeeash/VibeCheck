import type { AuditResult } from '../types.js';

export async function startAudit(url: string): Promise<AuditResult> {
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
  return res.json() as Promise<AuditResult>;
}

export async function getAudit(id: string): Promise<AuditResult> {
  const res = await fetch(`/api/audit/${id}`);
  if (!res.ok) throw new Error(`Audit not found: ${id}`);
  return res.json() as Promise<AuditResult>;
}

export function downloadReportUrl(id: string): string {
  return `/api/audit/${id}/download`;
}
