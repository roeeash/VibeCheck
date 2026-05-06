import type { Finding } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { ImageInfo } from '../../types.js';

export class LCPPriorityDetector {
  static readonly name = 'lcp-priority';

  finalize(images: ImageInfo[], lcpTime: number): Finding[] {
    const findings: Finding[] = [];

    // Find the LCP image
    const lcpImage = images.find((img) => img.isLcp);
    if (!lcpImage) {
      return findings;
    }

    // If LCP is slow and image doesn't have fetchPriority or preload, report it
    if (lcpTime > 2000 && !lcpImage.hasFetchPriority) {
      findings.push({
        id: createFindingId('asset-inspector', 'bad_lcp_priority', lcpImage.url),
        module: 'asset-inspector',
        type: 'bad_lcp_priority',
        category: 'direct_impact',
        severity: 'high',
        confidence: 'high',
        title: `LCP image not prioritized`,
        description: `The Largest Contentful Paint (LCP) image loads in ${Math.round(lcpTime)}ms without high fetch priority. Consider adding fetchpriority="high" or a link preload.`,
        observedIn: lcpImage.url,
        evidence: [{
          kind: 'console_log',
          path: lcpImage.url,
          description: `LCP entry observed at ${Math.round(lcpTime)}ms; fetchpriority="high" not set on this image`,
        }],
        metrics: { lcpTimeMs: Math.round(lcpTime) },
        recommendation: `Add fetchpriority="high" to the <img> tag or use <link rel="preload" as="image" href="${lcpImage.url}" fetchpriority="high"> to prioritize loading.`,
        scoreImpact: 1,
      });
    }

    return findings;
  }
}
