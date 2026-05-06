import { describe, it, expect } from 'vitest';
import { estimateFormatSavings } from '../../../packages/asset-inspector/src/analysis/image-format-estimator.js';
import { classifyOrigin } from '../../../packages/asset-inspector/src/analysis/third-party-classifier.js';
import { detectLibraries } from '../../../packages/asset-inspector/src/analysis/bundle-parser.js';

describe('image-format-estimator', () => {
  it('estimates WebP savings for JPEG', () => {
    const result = estimateFormatSavings('image/jpeg', 100_000);
    expect(result.webpBytes).toBe(70_000);
    expect(result.savingsPercent).toBeGreaterThan(25);
  });

  it('estimates AVIF savings for PNG', () => {
    const result = estimateFormatSavings('image/png', 100_000);
    expect(result.avifBytes).toBe(55_000);
    expect(result.savingsPercent).toBeGreaterThan(30);
  });

  it('returns 0 for already-optimal format', () => {
    const result = estimateFormatSavings('image/webp', 100_000);
    expect(result.savingsPercent).toBe(0);
  });
});

describe('third-party-classifier', () => {
  it('classifies Google Analytics as analytics', () => {
    expect(classifyOrigin('https://www.google-analytics.com/analytics.js', 'https://myapp.com')).toBe('analytics');
  });

  it('classifies GTM as tag_manager', () => {
    expect(classifyOrigin('https://www.googletagmanager.com/gtm.js', 'https://myapp.com')).toBe('tag_manager');
  });

  it('classifies same-origin as first_party', () => {
    expect(classifyOrigin('https://myapp.com/bundle.js', 'https://myapp.com')).toBe('first_party');
  });

  it('classifies unknown third party as other_third_party', () => {
    expect(classifyOrigin('https://some-cdn.net/lib.js', 'https://myapp.com')).toBe('other_third_party');
  });
});

describe('bundle-parser', () => {
  it('detects lodash when multiple fingerprints match', () => {
    const signatures = [
      {
        name: 'lodash',
        fingerprints: ['lodash.VERSION', '_.chain', '_.groupBy'],
        duplicateRiskWeight: 1.0,
      },
    ];
    const bundle =
      'some code... lodash.VERSION = "4.17.21"; function chain() {}; _.chain = chain; _.groupBy = gb;';
    const detected = detectLibraries(bundle, signatures);
    expect(detected.some((d) => d.name === 'lodash')).toBe(true);
  });

  it('does not detect library with only one fingerprint', () => {
    const signatures = [
      {
        name: 'lodash',
        fingerprints: ['lodash.VERSION', '_.chain', '_.groupBy'],
        duplicateRiskWeight: 1.0,
      },
    ];
    const bundle = 'some code... lodash.VERSION = "4.17.21";'; // only 1 of 3 fingerprints
    const detected = detectLibraries(bundle, signatures);
    expect(detected.some((d) => d.name === 'lodash')).toBe(false);
  });
});
