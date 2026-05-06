import type { Finding, AuditEvent } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { ProxyDetector, NetworkRequest } from '../types.js';
import { UrlNormalizer } from '../analysis/url-normalizer.js';

export class NPlusOneDetector implements ProxyDetector {
  readonly name = 'n-plus-one';

  async onEvent(_event: AuditEvent): Promise<void> {}

  async finalize(requests: NetworkRequest[]): Promise<Finding[]> {
    const findings: Finding[] = [];
    const fetchRequests = requests.filter((r) => r.method === 'GET' && r.mimeType.includes('json'));

    for (const parent of fetchRequests) {
      const parentEnd = parent.timing.startTime + parent.timing.duration;
      const childWindow = 2000;
      const children = fetchRequests.filter((r) => {
        if (r.id === parent.id) return false;
        return r.timestamp > parentEnd && r.timestamp < parentEnd + childWindow;
      });

      const childPatterns = new Map<string, NetworkRequest[]>();
      for (const child of children) {
        const normalized = UrlNormalizer.normalize(child.url);
        // Accept any parameterized path (contains {id}/{uuid} placeholder from normalizer)
        // or any path with 2+ segments (catches /api/resource/123 patterns)
        const pathPattern = normalized.pathPattern;
        const hasIdPattern = pathPattern.includes('{id}') || pathPattern.includes('{uuid}');
        const isParameterized = (pathPattern.match(/\//g) || []).length >= 2;
        if (hasIdPattern || isParameterized) {
          const pattern = `${normalized.origin}${pathPattern}`;
          const group = childPatterns.get(pattern) ?? [];
          group.push(child);
          childPatterns.set(pattern, group);
        }
      }

      for (const [pattern, group] of childPatterns) {
        if (group.length >= 4) {
          findings.push({
            id: createFindingId(this.name, 'n_plus_one', `${parent.url}->${pattern}`),
            module: this.name,
            type: 'n_plus_one',
            category: 'direct_impact',
            severity: 'high',
            confidence: 'high',
            title: `N+1 pattern: ${parent.url} → ${pattern} (${group.length} requests)`,
            description: `After fetching ${parent.url}, the app made ${group.length} individual requests matching ${pattern}.`,
            observedIn: parent.url,
            evidence: [{ kind: 'har_entry' as const, path: parent.id, description: 'Parent request' }, ...group.slice(0, 5).map((r) => ({ kind: 'har_entry' as const, path: r.id, description: `Child ${r.id}` }))],
            metrics: { parentRequest: parent.url, childPattern: pattern, childCount: group.length, totalDuration: group.reduce((s, r) => s + r.timing.duration, 0) },
            recommendation: 'Use batched fetching (e.g., ?include=profile or /api/users/profiles?ids=...).',
            scoreImpact: 20,
          });
        }
      }
    }
    return findings;
  }

  async dispose(): Promise<void> {}
}
