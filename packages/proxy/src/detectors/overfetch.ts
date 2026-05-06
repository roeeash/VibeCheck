import type { Finding, AuditEvent } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { ProxyDetector, NetworkRequest } from '../types.js';

export class OverFetchDetector implements ProxyDetector {
  readonly name = 'overfetch';

  async onEvent(_event: AuditEvent): Promise<void> {}

  async finalize(requests: NetworkRequest[]): Promise<Finding[]> {
    const findings: Finding[] = [];

    for (const req of requests) {
      if (!req.parsedKeys || req.parsedKeys.length === 0) continue;
      if (req.bytesTransferred < 5000) continue;

      const parsedSet = new Set(req.parsedKeys);
      const accessedSet = new Set(req.accessedKeys ?? []);
      const unusedKeys = [...parsedSet].filter((k) => !accessedSet.has(k));
      const unusedRatio = unusedKeys.length / parsedSet.length;

      if (unusedRatio > 0.3) {
        findings.push({
          id: createFindingId(this.name, 'overfetch', req.url),
          module: this.name,
          type: 'overfetch',
          category: 'direct_impact',
          severity: unusedRatio > 0.7 ? 'high' : 'medium',
          confidence: 'medium',
          title: `Over-fetching on ${req.url}: ${Math.round(unusedRatio * 100)}% unused`,
          description: `${Math.round(unusedRatio * 100)}% of response keys were parsed but never accessed. ${unusedKeys.length} of ${parsedSet.size} keys.`,
          observedIn: req.url,
          evidence: [{ kind: 'har_entry' as const, path: req.id, description: `${req.bytesTransferred} bytes, ${parsedSet.size} keys` }],
          metrics: { url: req.url, parsedKeys: parsedSet.size, accessedKeys: accessedSet.size, unusedKeys: unusedKeys.length, unusedRatio, responseSize: req.bytesTransferred },
          recommendation: 'Request only the fields you need. Consider implementing GraphQL or field selection parameters.',
          scoreImpact: 8,
        });
      }
    }
    return findings;
  }

  async dispose(): Promise<void> {}
}
