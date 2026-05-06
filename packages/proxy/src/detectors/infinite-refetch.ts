import type { Finding, AuditEvent } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { ProxyDetector, NetworkRequest } from '../types.js';
import { UrlNormalizer } from '../analysis/url-normalizer.js';

// Fires when the same normalized URL is fetched ≥ 4 times across the entire audit session.
// This catches useEffect with missing/wrong deps causing infinite re-fetch loops.
export class InfiniteRefetchDetector implements ProxyDetector {
  readonly name = 'infinite-refetch';

  async onEvent(_event: AuditEvent): Promise<void> {}

  async finalize(requests: NetworkRequest[]): Promise<Finding[]> {
    const findings: Finding[] = [];
    const counts = new Map<string, NetworkRequest[]>();

    for (const req of requests) {
      if (req.method === 'OPTIONS') continue;
      const normalized = UrlNormalizer.normalize(req.url);
      const key = `${normalized.origin}${normalized.pathPattern}`;
      const group = counts.get(key) ?? [];
      group.push(req);
      counts.set(key, group);
    }

    for (const [pattern, group] of counts) {
      if (group.length < 3) continue;

      const severity = group.length >= 10 ? 'critical' : group.length >= 6 ? 'high' : 'medium';

      findings.push({
        id: createFindingId(this.name, 'infinite_refetch', pattern),
        module: 'proxy',
        type: 'infinite_refetch',
        category: 'direct_impact',
        severity,
        confidence: 'high',
        title: `Infinite re-fetch: ${pattern} called ${group.length} times`,
        description: `The endpoint "${pattern}" was fetched ${group.length} times during the audit. This pattern is characteristic of a useEffect with missing or unstable dependencies causing an infinite fetch loop.`,
        observedIn: pattern,
        evidence: group.slice(0, 5).map((r) => ({
          kind: 'har_entry' as const,
          path: r.id,
          description: `Fetch ${r.id} at t=${Math.round(r.timestamp)}ms`,
        })),
        metrics: { url: pattern, count: group.length },
        recommendation: 'Audit useEffect dependencies. Stabilize object/array deps with useMemo or useRef. Use React Query or SWR for data fetching to avoid manual effect-based fetching.',
        scoreImpact: 18,
      });
    }

    return findings;
  }

  async dispose(): Promise<void> {}
}
