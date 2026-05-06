import type { Finding, AuditEvent } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { ProxyDetector, NetworkRequest } from '../types.js';

export class HttpVersionDetector implements ProxyDetector {
  readonly name = 'http-version';

  async onEvent(_event: AuditEvent): Promise<void> {}

  async finalize(requests: NetworkRequest[]): Promise<Finding[]> {
    const findings: Finding[] = [];
    const origins = new Map<string, { h1: number; h2: number; h3: number }>();

    for (const req of requests) {
      try {
        const origin = new URL(req.url).origin;
        const stats = origins.get(origin) ?? { h1: 0, h2: 0, h3: 0 };
        const proto = req.protocol.toLowerCase();
        if (proto === 'h2') stats.h2++;
        else if (proto === 'h3') stats.h3++;
        else stats.h1++;
        origins.set(origin, stats);
      } catch { /* skip */ }
    }

    for (const [origin, stats] of origins) {
      if (stats.h1 > 5) {
        findings.push({
          id: createFindingId(this.name, 'http_version', origin),
          module: this.name,
          type: 'http_version',
          category: 'theoretical_debt',
          severity: 'medium',
          confidence: 'high',
          title: `HTTP/1.1 on ${origin} (${stats.h1} requests)`,
          description: `${stats.h1} requests to ${origin} used HTTP/1.1, missing out on multiplexing benefits.`,
          observedIn: origin,
          evidence: [{ kind: 'har_entry' as const, path: '', description: `${stats.h1} HTTP/1.1 requests` }],
          metrics: { origin, h1: stats.h1, h2: stats.h2, h3: stats.h3 },
          recommendation: 'Upgrade the origin to HTTP/2 or HTTP/3 for multiplexed connections and header compression.',
          scoreImpact: 5,
        });
      }
    }
    return findings;
  }

  async dispose(): Promise<void> {}
}
