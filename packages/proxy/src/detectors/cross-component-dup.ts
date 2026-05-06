import type { Finding, AuditEvent } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { ProxyDetector, NetworkRequest } from '../types.js';
import { UrlNormalizer } from '../analysis/url-normalizer.js';

export class CrossComponentDupDetector implements ProxyDetector {
  readonly name = 'cross-component-dup';

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
      const initiatorKeys = new Set(group.map((r) => r.initiator?.stack?.[0]?.url).filter(Boolean));
      if (initiatorKeys.size >= 2) {
        const windowMs = 5000;
        const sorted = [...group].sort((a, b) => a.timestamp - b.timestamp);
        const clusters: NetworkRequest[][] = [];
        let current: NetworkRequest[] = [sorted[0]!];
        for (let i = 1; i < sorted.length; i++) {
          const req = sorted[i];
          const prev = sorted[i - 1];
          if (req && prev && req.timestamp - prev.timestamp < windowMs) {
            current.push(req);
          } else {
            if (current.length >= 2) clusters.push(current);
            current = req ? [req] : [];
          }
        }
        if (current.length >= 2) clusters.push(current);

        for (const cluster of clusters) {
          findings.push({
            id: createFindingId(this.name, 'cross_component_dup', key),
            module: this.name,
            type: 'cross_component_dup',
            category: 'direct_impact',
            severity: 'medium',
            confidence: 'medium',
            title: `Cross-component duplicate fetch: ${key}`,
            description: `The URL ${key} was fetched by ${initiatorKeys.size} different components within 5s.`,
            observedIn: key,
            evidence: cluster.map((r) => ({ kind: 'har_entry' as const, path: r.id, description: `Request from ${r.initiator?.stack?.[0]?.url}` })),
            metrics: { url: key, componentCount: initiatorKeys.size },
            recommendation: 'Implement shared data fetching at a higher component level or use a cache like React Query.',
            scoreImpact: 8,
          });
        }
      }
    }
    return findings;
  }

  async dispose(): Promise<void> {}
}
