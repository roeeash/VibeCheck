import type { Finding, AuditEvent } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { ProxyDetector, NetworkRequest } from '../types.js';

export class CacheHeadersDetector implements ProxyDetector {
  readonly name = 'cache-headers';

  async onEvent(_event: AuditEvent): Promise<void> {}

  async finalize(requests: NetworkRequest[]): Promise<Finding[]> {
    const findings: Finding[] = [];
    const CACHEABLE_TYPES = ['image/', 'font/', 'application/javascript', 'text/css', 'application/json'];

    for (const req of requests) {
      if (req.method !== 'GET' || ![200, 203, 300].includes(req.status)) continue;
      const isCacheable = CACHEABLE_TYPES.some((t) => req.mimeType.startsWith(t));
      if (!isCacheable) continue;

      const cc = req.responseHeaders['cache-control']?.toLowerCase() ?? '';
      const hasEtag = !!req.responseHeaders['etag'] || !!req.responseHeaders['last-modified'];
      const isApiPath = req.url.includes('/api/');

      if (!cc && !hasEtag) {
        findings.push({
          id: createFindingId(this.name, 'no_cache_headers', req.url),
          module: this.name,
          type: 'no_cache_headers',
          category: 'direct_impact',
          severity: isApiPath ? 'medium' : 'high',
          confidence: 'high',
          title: `Missing cache headers: ${req.url}`,
          description: `Cacheable response (${req.mimeType}) has no Cache-Control or ETag headers.`,
          observedIn: req.url,
          evidence: [{ kind: 'har_entry' as const, path: req.id, description: `No cache headers for ${req.mimeType}` }],
          metrics: { url: req.url, mimeType: req.mimeType, isApi: isApiPath },
          recommendation: isApiPath
            ? 'Consider adding short cache headers (e.g., Cache-Control: max-age=60) for stable API responses.'
            : 'Add Cache-Control and ETag headers for cacheable static assets.',
          scoreImpact: 8,
        });
      }
    }
    return findings;
  }

  async dispose(): Promise<void> {}
}
