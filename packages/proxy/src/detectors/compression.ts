import type { Finding, AuditEvent } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { ProxyDetector, NetworkRequest } from '../types.js';

export class CompressionDetector implements ProxyDetector {
  readonly name = 'compression';

  async onEvent(_event: AuditEvent): Promise<void> {}

  async finalize(requests: NetworkRequest[]): Promise<Finding[]> {
    const findings: Finding[] = [];
    const TEXT_TYPES = ['text/', 'application/json', 'application/javascript', 'application/xml', 'text/html'];

    for (const req of requests) {
      if (req.bytesTransferred < 10_000) continue;
      const isText = TEXT_TYPES.some((t) => req.mimeType.startsWith(t));
      if (!isText) continue;

      const encoding = req.responseHeaders['content-encoding']?.toLowerCase() ?? '';
      if (['gzip', 'br', 'deflate', 'zstd'].includes(encoding)) continue;

      findings.push({
        id: createFindingId(this.name, 'no_compression', req.url),
        module: this.name,
        type: 'no_compression',
        category: 'direct_impact',
        severity: req.bytesTransferred > 100_000 ? 'high' : 'medium',
        confidence: 'high',
        title: `Missing compression: ${req.url} (${Math.round(req.bytesTransferred / 1024)}KB)`,
        description: `Response is ${Math.round(req.bytesTransferred / 1024)}KB without compression (gzip/br).`,
        observedIn: req.url,
        evidence: [{ kind: 'har_entry' as const, path: req.id, description: `Uncompressed ${req.mimeType}` }],
        metrics: { url: req.url, size: req.bytesTransferred, mimeType: req.mimeType },
        recommendation: 'Enable gzip or Brotli compression on the server for text-based responses.',
        scoreImpact: 15,
      });
    }
    return findings;
  }

  async dispose(): Promise<void> {}
}
