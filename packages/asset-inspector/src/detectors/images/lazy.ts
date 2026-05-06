import type { Finding } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { ImageInfo } from '../../types.js';

export class LazyLoadImageDetector {
  static readonly name = 'lazy-load';

  finalize(images: ImageInfo[]): Finding[] {
    const findings: Finding[] = [];

    for (const img of images) {
      // Report only if: below fold AND not lazy AND not LCP
      if (img.belowFold && !img.hasLazy && !img.isLcp) {
        findings.push({
          id: createFindingId('asset-inspector', 'no_lazy', img.url),
          module: 'asset-inspector',
          type: 'no_lazy',
          category: 'direct_impact',
          severity: 'medium',
          confidence: 'high',
          title: `Image below fold not lazy-loaded: ${img.url.split('/').pop()}`,
          description: `This image is below the fold but not using lazy loading. Consider adding loading="lazy" to defer its loading.`,
          observedIn: img.url,
          evidence: [{
            kind: 'console_log',
            path: img.url,
            selector: img.url,
            description: `Image is below fold (getBoundingClientRect.top > innerHeight) without loading="lazy"`,
          }],
          metrics: {},
          recommendation: `Add loading="lazy" attribute to this <img> tag to defer loading until the image is near the viewport.`,
          scoreImpact: 12,
        });
      }
    }

    return findings;
  }
}
