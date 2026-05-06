import type { Finding } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { ImageInfo } from '../../types.js';

export class CLSContributorDetector {
  static readonly name = 'cls-contributor';

  finalize(images: ImageInfo[], clsValue: number): Finding[] {
    const findings: Finding[] = [];

    // Only report if CLS > 0.1
    if (clsValue <= 0.1) {
      return findings;
    }

    for (const img of images) {
      // Report images without width/height or aspect-ratio that might be contributing to CLS
      if (!img.hasWidthHeight && !img.hasAspectRatio) {
        findings.push({
          id: createFindingId('asset-inspector', 'img_cls', img.url),
          module: 'asset-inspector',
          type: 'img_cls',
          category: 'direct_impact',
          severity: 'medium',
          confidence: 'medium',
          title: `Image without dimensions contributing to CLS: ${img.url.split('/').pop()}`,
          description: `This image (${img.naturalWidth}x${img.naturalHeight}) lacks width/height or aspect-ratio attributes, likely contributing to layout shifts.`,
          observedIn: img.url,
          evidence: [{
            kind: 'console_log',
            path: img.url,
            description: `CLS = ${clsValue.toFixed(3)}; image missing width/height and aspect-ratio attributes`,
          }],
          metrics: { clsValue: parseFloat(clsValue.toFixed(3)) },
          recommendation: `Add width="${img.naturalWidth}" height="${img.naturalHeight}" or CSS aspect-ratio: ${(img.naturalWidth / img.naturalHeight).toFixed(2)} to reserve space and prevent shifts.`,
          scoreImpact: 1,
        });
      }
    }

    return findings;
  }
}
