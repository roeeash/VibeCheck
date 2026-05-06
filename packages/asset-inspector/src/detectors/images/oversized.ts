import type { Finding } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { ImageInfo } from '../../types.js';

const DEVICE_PIXEL_RATIO = 2; // assume retina by default

export class OversizedImageDetector {
  static readonly name = 'oversized-image';

  finalize(images: ImageInfo[]): Finding[] {
    const findings: Finding[] = [];

    for (const img of images) {
      const naturalPixels = img.naturalWidth * img.naturalHeight;
      const renderedPixels = img.renderedWidth * img.renderedHeight * DEVICE_PIXEL_RATIO * DEVICE_PIXEL_RATIO;

      // If natural size > rendered size * 1.5 (with device pixel ratio), it's oversized
      if (naturalPixels > renderedPixels * 1.5) {
        const wasteFactor = naturalPixels / renderedPixels;
        let severity: 'high' | 'medium' | 'low' = 'low';
        if (wasteFactor > 4) severity = 'high';
        else if (wasteFactor > 2) severity = 'medium';

        findings.push({
          id: createFindingId('asset-inspector', 'oversized_image', img.url),
          module: 'asset-inspector',
          type: 'oversized_image',
          category: 'direct_impact',
          severity,
          confidence: 'high',
          title: `Oversized image: ${img.url.split('/').pop()} (${img.naturalWidth}×${img.naturalHeight} → ${Math.round(img.renderedWidth)}×${Math.round(img.renderedHeight)})`,
          description: `Image is ${img.naturalWidth}×${img.naturalHeight}px but rendered at ${Math.round(img.renderedWidth)}×${Math.round(img.renderedHeight)}px — ${(wasteFactor).toFixed(1)}× more pixels than needed. Serving the full-size image wastes bandwidth and decode time.`,
          observedIn: `<img src="${img.url.split('/').pop()}"> · rendered ${Math.round(img.renderedWidth)}×${Math.round(img.renderedHeight)}px`,
          evidence: [{
            kind: 'har_entry',
            path: img.url,
            description: `Image natural size ${img.naturalWidth}x${img.naturalHeight} rendered at ${Math.round(img.renderedWidth)}x${Math.round(img.renderedHeight)} (${(wasteFactor).toFixed(1)}x waste)`,
          }],
          metrics: {
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            renderedWidth: img.renderedWidth,
            renderedHeight: img.renderedHeight,
            wasteFactor: parseFloat(wasteFactor.toFixed(2)),
          },
          recommendation: `Resize the image to ${Math.round(img.renderedWidth * DEVICE_PIXEL_RATIO)}x${Math.round(img.renderedHeight * DEVICE_PIXEL_RATIO)}px to eliminate waste.`,
          scoreImpact: 12,
        });
      }
    }

    return findings;
  }
}
