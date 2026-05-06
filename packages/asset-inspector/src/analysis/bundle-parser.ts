import type { LibSignature, DetectedLib } from '../types.js';

/**
 * Detects libraries in bundle text by matching multiple fingerprints.
 * Requires at least 2 fingerprint matches to claim a library is present.
 */
export function detectLibraries(bundleText: string, signatures: LibSignature[]): DetectedLib[] {
  const detected: DetectedLib[] = [];

  for (const sig of signatures) {
    let matches = 0;
    for (const fingerprint of sig.fingerprints) {
      if (bundleText.includes(fingerprint)) {
        matches++;
      }
    }
    // Require at least 2 matches to claim the library
    if (matches >= 2) {
      detected.push({ name: sig.name, urls: [] });
    }
  }

  return detected;
}
