import type { ImageFormatEstimate } from '../types.js';

/**
 * Estimates format conversion savings using simple heuristic ratios.
 * Does NOT perform actual compression — estimates based on typical ratios.
 */
export function estimateFormatSavings(mimeType: string, transferSize: number): ImageFormatEstimate {
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
    // JPEG → WebP: 30% savings, AVIF: 40% savings
    return {
      webpBytes: Math.round(transferSize * 0.7),
      avifBytes: Math.round(transferSize * 0.6),
      savingsPercent: 35, // average of the two
    };
  }

  if (mimeType.includes('png')) {
    // PNG → WebP: 35% savings, AVIF: 45% savings
    return {
      webpBytes: Math.round(transferSize * 0.65),
      avifBytes: Math.round(transferSize * 0.55),
      savingsPercent: 40, // average of the two
    };
  }

  // For other formats (WebP, AVIF, SVG, etc.), assume already optimized
  return {
    webpBytes: transferSize,
    avifBytes: transferSize,
    savingsPercent: 0,
  };
}
