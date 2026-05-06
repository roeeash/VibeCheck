import { describe, it, expect } from 'vitest';
import { OversizedImageDetector } from '../src/detectors/images/oversized.js';
import { ImageFormatDetector } from '../src/detectors/images/format.js';
import { BundleSizeDetector } from '../src/detectors/js/bundle-size.js';
import { LazyLoadImageDetector } from '../src/detectors/images/lazy.js';
import type { ImageInfo, ScriptInfo } from '../src/types.js';

describe('Detectors', () => {
  describe('OversizedImageDetector', () => {
    it('should detect oversized images', () => {
      const images: ImageInfo[] = [
        {
          url: 'https://example.com/large.jpg',
          naturalWidth: 2000,
          naturalHeight: 2000,
          renderedWidth: 200,
          renderedHeight: 200,
          transferSize: 500000,
          mimeType: 'image/jpeg',
          hasLazy: false,
          hasFetchPriority: false,
          hasWidthHeight: false,
          hasAspectRatio: false,
          belowFold: false,
          isLcp: false,
        },
      ];

      const findings = new OversizedImageDetector().finalize(images);
      expect(findings.length).toBe(1);
      expect(findings[0].type).toBe('oversized_image');
      expect(findings[0].severity).toBe('high');
    });

    it('should not report small oversized images', () => {
      const images: ImageInfo[] = [
        {
          url: 'https://example.com/small.jpg',
          naturalWidth: 300,
          naturalHeight: 300,
          renderedWidth: 200,
          renderedHeight: 200,
          transferSize: 50000,
          mimeType: 'image/jpeg',
          hasLazy: false,
          hasFetchPriority: false,
          hasWidthHeight: false,
          hasAspectRatio: false,
          belowFold: false,
          isLcp: false,
        },
      ];

      const findings = new OversizedImageDetector().finalize(images);
      expect(findings.length).toBe(0);
    });
  });

  describe('ImageFormatDetector', () => {
    it('should detect format inefficiencies', () => {
      const images: ImageInfo[] = [
        {
          url: 'https://example.com/large.jpg',
          naturalWidth: 100,
          naturalHeight: 100,
          renderedWidth: 100,
          renderedHeight: 100,
          transferSize: 100 * 1024, // 100KB
          mimeType: 'image/jpeg',
          hasLazy: false,
          hasFetchPriority: false,
          hasWidthHeight: false,
          hasAspectRatio: false,
          belowFold: false,
          isLcp: false,
        },
      ];

      const findings = new ImageFormatDetector().finalize(images);
      expect(findings.length).toBe(1);
      expect(findings[0].type).toBe('wrong_format');
    });
  });

  describe('BundleSizeDetector', () => {
    it('should detect large JS bundles', () => {
      const scripts: ScriptInfo[] = [
        {
          url: 'https://example.com/app.js',
          transferSize: 300 * 1024,
          isThirdParty: false,
          hasAsync: false,
          hasDefer: false,
          isModule: false,
        },
      ];

      const findings = new BundleSizeDetector().finalize(scripts);
      expect(findings.length).toBe(1);
      expect(findings[0].type).toBe('oversized_bundle');
    });

    it('should not report small bundles', () => {
      const scripts: ScriptInfo[] = [
        {
          url: 'https://example.com/app.js',
          transferSize: 100 * 1024,
          isThirdParty: false,
          hasAsync: false,
          hasDefer: false,
          isModule: false,
        },
      ];

      const findings = new BundleSizeDetector().finalize(scripts);
      expect(findings.length).toBe(0);
    });
  });

  describe('LazyLoadImageDetector', () => {
    it('should detect unoptimized below-fold images', () => {
      const images: ImageInfo[] = [
        {
          url: 'https://example.com/below-fold.jpg',
          naturalWidth: 100,
          naturalHeight: 100,
          renderedWidth: 100,
          renderedHeight: 100,
          transferSize: 50000,
          mimeType: 'image/jpeg',
          hasLazy: false,
          hasFetchPriority: false,
          hasWidthHeight: false,
          hasAspectRatio: false,
          belowFold: true,
          isLcp: false,
        },
      ];

      const findings = new LazyLoadImageDetector().finalize(images);
      expect(findings.length).toBe(1);
      expect(findings[0].type).toBe('no_lazy');
    });

    it('should not report lazy-loaded images', () => {
      const images: ImageInfo[] = [
        {
          url: 'https://example.com/below-fold.jpg',
          naturalWidth: 100,
          naturalHeight: 100,
          renderedWidth: 100,
          renderedHeight: 100,
          transferSize: 50000,
          mimeType: 'image/jpeg',
          hasLazy: true,
          hasFetchPriority: false,
          hasWidthHeight: false,
          hasAspectRatio: false,
          belowFold: true,
          isLcp: false,
        },
      ];

      const findings = new LazyLoadImageDetector().finalize(images);
      expect(findings.length).toBe(0);
    });
  });
});
