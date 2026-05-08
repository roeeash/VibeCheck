import type { Finding } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { ImageInfo } from '../../types.js';

const DEVICE_PIXEL_RATIO = 2;

export class OversizedImageDetector {
  static readonly name = 'oversized-image';

  finalize(images: ImageInfo[]): Finding[] {
    const findings: Finding[] = [];

    for (const img of images) {
      if (!Number.isFinite(img.renderedWidth) || !Number.isFinite(img.renderedHeight) || img.renderedWidth < 1 || img.renderedHeight < 1) continue;

      const targetWidth = img.renderedWidth * DEVICE_PIXEL_RATIO;
      const targetHeight = img.renderedHeight * DEVICE_PIXEL_RATIO;

      const excessWidth = img.naturalWidth - targetWidth;
      const excessHeight = img.naturalHeight - targetHeight;

      if (excessWidth <= targetWidth * 0.5 && excessHeight <= targetHeight * 0.5) continue;
      if (!Number.isFinite(excessWidth) || !Number.isFinite(excessHeight)) continue;

      const name = img.url.split('/').pop() ?? img.url;
      const maxExcessRatio = Math.max(
        img.naturalWidth / targetWidth,
        img.naturalHeight / targetHeight,
      );
      if (!Number.isFinite(maxExcessRatio)) continue;

      let severity: 'high' | 'medium' | 'low' = 'low';
      if (maxExcessRatio > 4) severity = 'high';
      else if (maxExcessRatio > 2) severity = 'medium';

      findings.push({
        id: createFindingId('asset-inspector', 'oversized_image', img.url),
        module: 'asset-inspector',
        type: 'oversized_image',
        category: 'direct_impact',
        severity,
        confidence: 'high',
        title: `Oversized image: ${name} (${img.naturalWidth}×${img.naturalHeight} → ${Math.round(img.renderedWidth)}×${Math.round(img.renderedHeight)})`,
        description: `${name}: natural ${img.naturalWidth}×${img.naturalHeight}px, rendered ${Math.round(img.renderedWidth)}×${Math.round(img.renderedHeight)}px — excess of ${Math.round(excessWidth)}×${Math.round(excessHeight)}px. Serving the full-size image wastes bandwidth and decode time.`,
        observedIn: `<img src="${name}"> · rendered ${Math.round(img.renderedWidth)}×${Math.round(img.renderedHeight)}px`,
        evidence: [{
          kind: 'har_entry',
          path: img.url,
          description: `${name}: natural ${img.naturalWidth}x${img.naturalHeight} rendered ${Math.round(img.renderedWidth)}x${Math.round(img.renderedHeight)} — excess ${Math.round(excessWidth)}x${Math.round(excessHeight)}px`,
        }],
        metrics: {
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          renderedWidth: img.renderedWidth,
          renderedHeight: img.renderedHeight,
          excessWidth: Math.round(excessWidth),
          excessHeight: Math.round(excessHeight),
        },
        recommendation: `Resize ${name} to ${Math.round(targetWidth)}×${Math.round(targetHeight)}px to eliminate waste.`,
        scoreImpact: 12,
      });
    }

    return findings;
  }
}
