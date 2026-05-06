import type { Finding, AuditEvent } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { ProxyDetector, NetworkRequest } from '../types.js';
import { UrlNormalizer } from '../analysis/url-normalizer.js';

export class DuplicateFetchDetector implements ProxyDetector {
  readonly name = 'duplicate-fetch';

  async onEvent(_event: AuditEvent): Promise<void> {}

  async finalize(requests: NetworkRequest[]): Promise<Finding[]> {
    const findings: Finding[] = [];
    const groups = new Map<string, NetworkRequest[]>();

    for (const req of requests) {
      if (req.method === 'OPTIONS') continue;
      const normalized = UrlNormalizer.normalize(req.url);
      const key = `${normalized.resourceKey}-${req.method}`;
      const group = groups.get(key) ?? [];
      group.push(req);
      groups.set(key, group);
    }

    for (const [key, group] of groups) {
      if (group.length < 2) continue;
      const sorted = [...group].sort((a, b) => a.timestamp - b.timestamp);
      for (let i = 0; i < sorted.length - 1; i++) {
        const current = sorted[i];
        const next = sorted[i + 1];
        if (!current || !next) continue;
        if (next.timestamp - current.timestamp < 2000) {
          const duplicates = group.filter((r) => r.timestamp >= current.timestamp && r.timestamp <= current.timestamp + 2000);
          findings.push({
            id: createFindingId(this.name, 'duplicate_fetch', key),
            module: this.name,
            type: 'duplicate_fetch',
            category: 'direct_impact',
            severity: duplicates.length > 3 ? 'high' : 'medium',
            confidence: 'high',
            title: `Duplicate fetch: ${key} (${duplicates.length} times in 2s)`,
            description: `The URL ${key} was fetched ${duplicates.length} times within 2 seconds.`,
            observedIn: key,
            evidence: duplicates.map((r) => ({ kind: 'har_entry' as const, path: r.id, description: `Request ${r.id} at ${r.timestamp}ms` })),
            metrics: { url: key, count: duplicates.length, windowMs: 2000 },
            recommendation: 'Deduplicate requests using a shared cache or AbortController.',
            scoreImpact: 12,
          });
          break;
        }
      }
    }
    return findings;
  }

  async dispose(): Promise<void> {}
}
