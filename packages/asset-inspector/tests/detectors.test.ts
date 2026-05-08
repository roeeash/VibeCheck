import { describe, it, expect } from 'vitest';
import { OversizedImageDetector } from '../src/detectors/images/oversized.js';
import { ImageFormatDetector } from '../src/detectors/images/format.js';
import { BundleSizeDetector } from '../src/detectors/js/bundle-size.js';
import { LazyLoadImageDetector } from '../src/detectors/images/lazy.js';
import { CLSContributorDetector } from '../src/detectors/images/cls-contributor.js';
import { UnusedCSSDetector } from '../src/detectors/css/unused.js';
import type { ImageInfo, ScriptInfo, StylesheetInfo } from '../src/types.js';

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

  describe('OversizedImageDetector — edge cases', () => {
    it('should skip images with zero rendered dimensions', () => {
      const images: ImageInfo[] = [{
        url: 'https://example.com/hidden.jpg',
        naturalWidth: 2000,
        naturalHeight: 2000,
        renderedWidth: 0,
        renderedHeight: 0,
        transferSize: 500000,
        mimeType: 'image/jpeg',
        hasLazy: false,
        hasFetchPriority: false,
        hasWidthHeight: false,
        hasAspectRatio: false,
        belowFold: false,
        isLcp: false,
      }];

      const findings = new OversizedImageDetector().finalize(images);
      expect(findings.length).toBe(0);
    });

    it('should skip images with zero rendered height only', () => {
      const images: ImageInfo[] = [{
        url: 'https://example.com/hidden.jpg',
        naturalWidth: 2000,
        naturalHeight: 2000,
        renderedWidth: 200,
        renderedHeight: 0,
        transferSize: 500000,
        mimeType: 'image/jpeg',
        hasLazy: false,
        hasFetchPriority: false,
        hasWidthHeight: false,
        hasAspectRatio: false,
        belowFold: false,
        isLcp: false,
      }];

      const findings = new OversizedImageDetector().finalize(images);
      expect(findings.length).toBe(0);
    });

    it('should name the image in description and evidence', () => {
      const images: ImageInfo[] = [{
        url: 'https://example.com/hero-banner.jpg',
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
      }];

      const findings = new OversizedImageDetector().finalize(images);
      expect(findings.length).toBe(1);
      expect(findings[0].description).toContain('hero-banner.jpg');
      expect(findings[0].description).toContain('excess of');
      expect(findings[0].metrics.excessWidth).toBeGreaterThan(0);
      expect(findings[0].metrics.excessHeight).toBeGreaterThan(0);
    });
  });

  describe('CLSContributorDetector', () => {
    it('should skip images with zero natural height', () => {
      const images: ImageInfo[] = [{
        url: 'https://example.com/broken.jpg',
        naturalWidth: 100,
        naturalHeight: 0,
        renderedWidth: 100,
        renderedHeight: 0,
        transferSize: 0,
        mimeType: 'image/jpeg',
        hasLazy: false,
        hasFetchPriority: false,
        hasWidthHeight: false,
        hasAspectRatio: false,
        belowFold: false,
        isLcp: false,
      }];

      const findings = new CLSContributorDetector().finalize(images, 0.25);
      expect(findings.length).toBe(0);
    });
  });

  describe('UnusedCSSDetector', () => {
    it('should skip stylesheets with zero total bytes', () => {
      const sheets: StylesheetInfo[] = [{
        url: 'https://example.com/style.css',
        totalBytes: 0,
        usedBytes: 0,
        mediaAttr: '',
        isRenderBlocking: false,
        isThirdParty: false,
      }];

      const findings = new UnusedCSSDetector().finalize(sheets);
      expect(findings.length).toBe(0);
    });
  });
});
