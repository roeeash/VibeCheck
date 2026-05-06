import type { Finding, AuditEvent } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { ProxyDetector, NetworkRequest } from '../types.js';

export class OriginCountDetector implements ProxyDetector {
  readonly name = 'origin-count';

  async onEvent(_event: AuditEvent): Promise<void> {}

  async finalize(requests: NetworkRequest[]): Promise<Finding[]> {
    const findings: Finding[] = [];
    const origins = new Set<string>();

    for (const req of requests) {
      try {
        origins.add(new URL(req.url).origin);
      } catch { /* skip */ }
    }

    if (origins.size > 10) {
      findings.push({
        id: createFindingId(this.name, 'excessive_origins', 'audit'),
        module: this.name,
        type: 'excessive_origins',
        category: 'direct_impact',
        severity: 'medium',
        confidence: 'high',
        title: `Excessive origins: ${origins.size} distinct origins`,
        description: `The page loads from ${origins.size} distinct origins. Each origin requires separate DNS + TLS handshakes.`,
        observedIn: 'audit',
        evidence: [{ kind: 'har_entry' as const, path: '', description: `${origins.size} origins` }],
        metrics: { originCount: origins.size, origins: [...origins] },
        recommendation: 'Consolidate origins and use preconnect hints for required third-party origins.',
        scoreImpact: 5,
      });
    }
    return findings;
  }

  async dispose(): Promise<void> {}
}
