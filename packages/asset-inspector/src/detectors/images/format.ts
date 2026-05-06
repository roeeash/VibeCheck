import type { Finding } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { ImageInfo } from '../../types.js';
import { estimateFormatSavings } from '../../analysis/image-format-estimator.js';

export class ImageFormatDetector {
  static readonly name = 'image-format';

  finalize(images: ImageInfo[]): Finding[] {
    const findings: Finding[] = [];

    for (const img of images) {
      // Only check JPEG and PNG — they have the most savings potential
      if (!img.mimeType.includes('jpeg') && !img.mimeType.includes('jpg') && !img.mimeType.includes('png')) {
        continue;
      }

      if (img.transferSize < 30 * 1024) {
        // Skip small images — not worth converting
        continue;
      }

      const estimate = estimateFormatSavings(img.mimeType, img.transferSize);

      // If estimated savings > 30% of original, report it
      if (estimate.savingsPercent > 30) {
        const avgSavings = Math.round((img.transferSize - (estimate.webpBytes + estimate.avifBytes) / 2) / 1024);

        findings.push({
          id: createFindingId('asset-inspector', 'wrong_format', img.url),
          module: 'asset-inspector',
          type: 'wrong_format',
          category: 'direct_impact',
          severity: avgSavings > 100 ? 'high' : avgSavings > 50 ? 'medium' : 'low',
          confidence: 'medium',
          title: `Image format inefficiency: ${img.url.split('/').pop()}`,
          description: `${img.mimeType.toUpperCase()} image could save ~${avgSavings}KB by converting to WebP or AVIF.`,
          observedIn: img.url,
          evidence: [{
            kind: 'har_entry',
            path: img.url,
            description: `${Math.round(img.transferSize / 1024)}KB ${img.mimeType} — estimated WebP: ${Math.round(estimate.webpBytes / 1024)}KB, AVIF: ${Math.round(estimate.avifBytes / 1024)}KB`,
          }],
          metrics: {
            originalBytes: img.transferSize,
            estimatedWebPBytes: estimate.webpBytes,
            estimatedAVIFBytes: estimate.avifBytes,
            estimatedSavingsPercent: estimate.savingsPercent,
            estimatedSavingsKB: avgSavings,
          },
          recommendation: `Convert this image to WebP (~${Math.round(estimate.webpBytes / 1024)}KB) or AVIF (~${Math.round(estimate.avifBytes / 1024)}KB) format for better compression. Provide fallback for older browsers.`,
          scoreImpact: 6,
        });
      }
    }

    return findings;
  }
}
