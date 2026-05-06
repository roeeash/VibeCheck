import type { Finding, AuditEvent } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { ProxyDetector, NetworkRequest } from '../types.js';

export class UnderPaginateDetector implements ProxyDetector {
  readonly name = 'under-paginate';

  async onEvent(_event: AuditEvent): Promise<void> {}

  async finalize(requests: NetworkRequest[]): Promise<Finding[]> {
    const findings: Finding[] = [];

    for (const req of requests) {
      if (req.method !== 'GET' || !req.mimeType.includes('json')) continue;
      if (req.bytesTransferred > 1_000_000) {
        findings.push({
          id: createFindingId(this.name, 'under_paginate', req.url),
          module: this.name,
          type: 'under_paginate',
          category: 'direct_impact',
          severity: 'high',
          confidence: 'medium',
          title: `Under-pagination: ${req.url} returned ${Math.round(req.bytesTransferred / 1024)}KB`,
          description: `Response exceeded 1MB without pagination. This suggests the API returns all records in a single response.`,
          observedIn: req.url,
          evidence: [{ kind: 'har_entry' as const, path: req.id, description: `${Math.round(req.bytesTransferred / 1024)}KB response` }],
          metrics: { url: req.url, responseSize: req.bytesTransferred },
          recommendation: 'Implement cursor-based or offset pagination. For chronological data, use cursor pagination.',
          scoreImpact: 8,
        });
      }
    }
    return findings;
  }

  async dispose(): Promise<void> {}
}
