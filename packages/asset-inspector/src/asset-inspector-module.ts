import type { AuditContext, AuditEvent, Finding, Result, VibeError } from '@vibecheck/core';
import { ok, createFindingId } from '@vibecheck/core';
import type { AnalysisModule } from '@vibecheck/core';
import type { ImageInfo, ScriptInfo, StylesheetInfo, AnimationInfo, LibSignature } from './types.js';
import {
  OversizedImageDetector,
  ImageFormatDetector,
  LazyLoadImageDetector,
  LCPPriorityDetector,
  CLSContributorDetector,
  LayoutAnimationDetector,
  WillChangeDetector,
  BlockingCSSDetector,
  UnusedCSSDetector,
  SyncScriptDetector,
  BundleSizeDetector,
  DuplicateLibsDetector,
  TreeShakingDetector,
  CodeSplittingDetector,
  ThirdPartyCostDetector,
} from './detectors/index.js';
import { processCSSCoverage } from './analysis/css-coverage.js';
import libSignatures from './fixtures/lib-signatures.json' assert { type: 'json' };

const ASSET_COLLECTION_SCRIPT = `
window.__vibecheck_assets = {
  images: [],
  willChangeCount: 0,
  animations: []
};
window.__vibecheck_collect_assets = function() {
  const imgs = [...document.querySelectorAll('img')];
  const vp = { w: window.innerWidth, h: window.innerHeight };
  window.__vibecheck_assets.images = imgs.map(img => {
    const r = img.getBoundingClientRect();
    return {
      src: img.src,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      renderedWidth: r.width,
      renderedHeight: r.height,
      hasLazy: img.loading === 'lazy',
      hasFetchPriority: img.fetchPriority === 'high',
      hasWidthHeight: img.hasAttribute('width') && img.hasAttribute('height'),
      hasAspectRatio: getComputedStyle(img).aspectRatio !== 'auto',
      belowFold: r.top > vp.h
    };
  });
  const wc = [...document.querySelectorAll('*')].filter(el => {
    const v = getComputedStyle(el).willChange;
    return v && v !== 'auto';
  });
  window.__vibecheck_assets.willChangeCount = wc.length;

  // Collect animated elements with layout-triggering properties
  const layoutProps = new Set(['top','left','right','bottom','width','height','margin','padding','font-size','border-width']);
  const animatedEls = [...document.querySelectorAll('*')].filter(el => {
    const s = getComputedStyle(el);
    return s.animationName !== 'none' || s.transitionProperty !== 'all';
  });
  const animations = [];
  for (const el of animatedEls.slice(0, 100)) {
    const s = getComputedStyle(el);
    const animProps = s.transitionProperty.split(',').map(p => p.trim());
    for (const prop of animProps) {
      if (layoutProps.has(prop)) {
        animations.push({
          selector: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className ? '.' + [...el.classList].join('.') : ''),
          property: prop,
          animationName: s.animationName
        });
      }
    }
  }
  window.__vibecheck_assets.animations = animations;
};
`;

export class AssetInspectorModule implements AnalysisModule {
  readonly name = 'asset-inspector';
  readonly weight = 22;

  private ctx: AuditContext | null = null;
  private imageInfos: ImageInfo[] = [];
  private scriptInfos: ScriptInfo[] = [];
  private stylesheetInfos: StylesheetInfo[] = [];
  private animationInfos: AnimationInfo[] = [];
  private cssUsage: unknown[] = [];
  private lcpTime = 0;
  private clsValue = 0;
  private lcpImageUrl = '';

  // Network data: requestId → URL (from network.request events)
  private requestIdToUrl = new Map<string, string>();
  // URL → mimeType (from network.response events)
  private imageUrlToMimeType = new Map<string, string>();
  // requestId → transferSize (from CDP Network.loadingFinished)
  private transferSizes = new Map<string, number>();

  async initialize(ctx: AuditContext): Promise<Result<void, VibeError>> {
    this.ctx = ctx;

    try {
      // DOM agent must be enabled before CSS agent
      await ctx.cdp.send('DOM.enable', {});
      await ctx.cdp.send('CSS.enable', {});
      await ctx.cdp.send('CSS.startRuleUsageTracking', {});
      ctx.logger.debug('CSS coverage tracking started');
    } catch (err) {
      ctx.logger.warn({ err }, 'Failed to start CSS coverage tracking');
    }

    // Capture transfer sizes from CDP directly — network.response event doesn't include body size
    try {
      ctx.cdp.on('Network.loadingFinished', (params: { requestId: string; encodedDataLength: number }) => {
        this.transferSizes.set(params.requestId, params.encodedDataLength);
      });
    } catch (err) {
      ctx.logger.warn({ err }, 'Failed to register Network.loadingFinished listener');
    }

    try {
      await ctx.cdp.send('Animation.enable', {});
    } catch (err) {
      ctx.logger.debug({ err }, 'Animation CDP domain not available');
    }

    try {
      await ctx.page.context().addInitScript(ASSET_COLLECTION_SCRIPT);
      ctx.logger.debug('Asset collection script injected');
    } catch (err) {
      ctx.logger.warn({ err }, 'Failed to inject asset collection script');
    }

    return ok(undefined);
  }

  async onEvent(event: AuditEvent): Promise<void> {
    // Build requestId → URL map for transfer size lookups
    if (event.type === 'network.request') {
      this.requestIdToUrl.set(event.requestId, event.url);
    }

    if (event.type === 'network.response') {
      const { url, mimeType, requestId } = event;

      // Keep requestId→url mapping up-to-date (response URL may differ from request URL after redirects)
      this.requestIdToUrl.set(requestId, url);

      if (mimeType?.includes('image')) {
        this.imageUrlToMimeType.set(url, mimeType);
      } else if ((mimeType?.includes('javascript') || url.endsWith('.js') || url.endsWith('.mjs')) &&
                 !url.endsWith('.tsx') && !url.endsWith('.ts') && !url.endsWith('.css')) {
        if (!this.scriptInfos.some((s) => s.url === url)) {
          this.scriptInfos.push({
            url,
            transferSize: 0, // filled in finalize() once loadingFinished fires
            isThirdParty: false, // filled in finalize() with proper hostname comparison
            hasAsync: false, // filled in finalize() from DOM
            hasDefer: false, // filled in finalize() from DOM
            isModule: mimeType?.includes('module') ?? false,
            inHead: false, // filled in finalize() from DOM
          });
        }
      } else if (mimeType?.includes('css') || url.endsWith('.css')) {
        if (!this.stylesheetInfos.some((s) => s.url === url)) {
          this.stylesheetInfos.push({
            url,
            transferSize: 0, // filled in finalize()
            isRenderBlocking: false, // filled in finalize() from DOM
            mediaAttr: '',
            usedBytes: 0,
            totalBytes: 0,
          });
        }
      }
    }

    if (event.type === 'web_vital') {
      if (event.metric.name === 'LCP') {
        this.lcpTime = event.metric.value;
        // Extract LCP image URL from entries
        const entries = event.metric.entries;
        if (Array.isArray(entries) && entries.length > 0) {
          const lcpEntry = entries[entries.length - 1] as Record<string, unknown>;
          const lcpUrl = lcpEntry?.url as string | undefined;
          if (lcpUrl) this.lcpImageUrl = lcpUrl;
        }
      } else if (event.metric.name === 'CLS') {
        this.clsValue = event.metric.value;
      }
    }
  }

  async finalize(): Promise<Finding[]> {
    if (!this.ctx) return [];

    const findings: Finding[] = [];

    // Resolve transfer sizes by matching requestId → url → transferSize
    const urlToTransferSize = new Map<string, number>();
    for (const [requestId, transferSize] of this.transferSizes) {
      const url = this.requestIdToUrl.get(requestId);
      if (url) urlToTransferSize.set(url, transferSize);
    }

    // Enrich script infos with transfer sizes and third-party flag
    let auditHostname = '';
    try {
      auditHostname = new URL(this.ctx.url).hostname;
    } catch { /* ignore */ }

    for (const script of this.scriptInfos) {
      script.transferSize = urlToTransferSize.get(script.url) ?? 0;
      try {
        const scriptHostname = new URL(script.url).hostname;
        script.isThirdParty = scriptHostname !== auditHostname;
      } catch { script.isThirdParty = false; }
    }

    // Enrich stylesheet infos with transfer sizes
    for (const sheet of this.stylesheetInfos) {
      sheet.transferSize = urlToTransferSize.get(sheet.url) ?? 0;
    }

    // Get CSS coverage
    try {
      const coverageResult = await this.ctx.cdp.send('CSS.stopRuleUsageTracking', {});
      // CDP returns { ruleUsage: CSSRuleUsage[] }
      const ruleUsage = (coverageResult as Record<string, unknown>)?.ruleUsage;
      if (Array.isArray(ruleUsage)) {
        this.cssUsage = ruleUsage;
        const coverage = processCSSCoverage(this.cssUsage);
        for (const cov of coverage) {
          const sheet = this.stylesheetInfos.find((s) => s.url === cov.url);
          if (sheet) {
            sheet.usedBytes = cov.usedBytes;
            sheet.totalBytes = cov.totalBytes;
          }
        }
      }
    } catch (err) {
      this.ctx.logger.debug({ err }, 'Failed to get CSS coverage');
    }

    // Collect DOM-based data: image dimensions, script attrs, stylesheet media
    try {
      const assetData = await this.ctx.page.evaluate(() => {
        const w = window as unknown as { __vibecheck_collect_assets?: () => void };
        if (typeof w.__vibecheck_collect_assets === 'function') {
          w.__vibecheck_collect_assets();
        }
        return (window as unknown as Record<string, unknown>).__vibecheck_assets as {
          images: Array<{
            src: string; naturalWidth: number; naturalHeight: number;
            renderedWidth: number; renderedHeight: number; hasLazy: boolean;
            hasFetchPriority: boolean; hasWidthHeight: boolean; hasAspectRatio: boolean;
            belowFold: boolean;
          }>;
          willChangeCount: number;
          animations: Array<{ selector: string; property: string; animationName: string }>;
        } | null;
      });

      if (assetData?.images && Array.isArray(assetData.images)) {
        const seenImageUrls = new Set<string>();
        for (const imgData of assetData.images) {
          if (!imgData.src) continue;
          if (seenImageUrls.has(imgData.src)) continue;
          seenImageUrls.add(imgData.src);
          const mimeType = this.imageUrlToMimeType.get(imgData.src) ?? 'image/jpeg';
          const transferSize = urlToTransferSize.get(imgData.src) ?? 0;
          const imageInfo: ImageInfo = {
            url: imgData.src,
            naturalWidth: imgData.naturalWidth,
            naturalHeight: imgData.naturalHeight,
            renderedWidth: imgData.renderedWidth,
            renderedHeight: imgData.renderedHeight,
            transferSize,
            mimeType,
            hasLazy: imgData.hasLazy,
            hasFetchPriority: imgData.hasFetchPriority,
            hasWidthHeight: imgData.hasWidthHeight,
            hasAspectRatio: imgData.hasAspectRatio,
            belowFold: imgData.belowFold,
            isLcp: !!this.lcpImageUrl && imgData.src === this.lcpImageUrl,
          };
          this.imageInfos.push(imageInfo);
        }
      }

      if (assetData?.animations && Array.isArray(assetData.animations)) {
        this.animationInfos = assetData.animations;
      }

      const willChangeCount = assetData?.willChangeCount ?? 0;

      // Get script async/defer from DOM
      const scriptDomData = await this.ctx.page.evaluate(() => {
        return [...document.querySelectorAll('script[src]')].map((el) => {
          const s = el as HTMLScriptElement;
          return { src: s.src, async: s.async, defer: s.defer, type: s.type, inHead: document.head.contains(s) };
        });
      });
      for (const domScript of scriptDomData) {
        const info = this.scriptInfos.find((s) => s.url === domScript.src || domScript.src.includes(new URL(s.url).pathname));
        if (info) {
          info.hasAsync = domScript.async;
          info.hasDefer = domScript.defer;
          info.isModule = domScript.type === 'module';
          info.inHead = domScript.inHead;
        }
      }

      // Get stylesheet media from DOM
      const sheetDomData = await this.ctx.page.evaluate(() => {
        return [...document.querySelectorAll('link[rel="stylesheet"]')].map((el) => {
          const l = el as HTMLLinkElement;
          // render-blocking: in head, media is all/screen/empty
          const media = l.media ?? '';
          const isBlocking = media === '' || media === 'all' || media === 'screen';
          return { href: l.href, media, isBlocking };
        });
      });
      for (const domSheet of sheetDomData) {
        const info = this.stylesheetInfos.find((s) => s.url === domSheet.href);
        if (info) {
          info.mediaAttr = domSheet.media;
          info.isRenderBlocking = domSheet.isBlocking;
        }
      }

      // Run all detectors
      try { findings.push(...new OversizedImageDetector().finalize(this.imageInfos)); } catch (err) { this.ctx.logger.warn({ err }, 'OversizedImageDetector failed'); }

      // HAR-based fallback: flag large image responses not caught by DOM dimension check (e.g. CORS blocks naturalWidth)
      const detectedImageUrls = new Set(this.imageInfos.map((i) => i.url));
      for (const [url, mimeType] of this.imageUrlToMimeType) {
        if (!mimeType.includes('image')) continue;
        const transferSize = urlToTransferSize.get(url) ?? 0;
        if (transferSize > 200_000 && !detectedImageUrls.has(url)) {
          findings.push({
            id: createFindingId('asset-inspector', 'oversized_image', url),
            module: 'asset-inspector',
            type: 'oversized_image',
            category: 'theoretical_debt',
            severity: transferSize > 1_000_000 ? 'high' : 'medium',
            confidence: 'medium',
            title: `Large image transfer: ${url.split('/').pop()} (${Math.round(transferSize / 1024)}KB)`,
            description: `Image transferred ${Math.round(transferSize / 1024)}KB over the network. Serving images at full resolution wastes bandwidth and increases decode time.`,
            observedIn: url,
            evidence: [{ kind: 'har_entry' as const, path: url, description: `${Math.round(transferSize / 1024)}KB image response` }],
            metrics: { transferSize, threshold: 200_000 },
            recommendation: 'Resize and compress images. Use modern formats (WebP/AVIF). Serve responsive sizes with srcset.',
            scoreImpact: transferSize > 1_000_000 ? 8 : 4,
          });
        }
      }
      try { findings.push(...new ImageFormatDetector().finalize(this.imageInfos)); } catch (err) { this.ctx.logger.warn({ err }, 'ImageFormatDetector failed'); }
      try { findings.push(...new LazyLoadImageDetector().finalize(this.imageInfos)); } catch (err) { this.ctx.logger.warn({ err }, 'LazyLoadImageDetector failed'); }
      try { findings.push(...new LCPPriorityDetector().finalize(this.imageInfos, this.lcpTime)); } catch (err) { this.ctx.logger.warn({ err }, 'LCPPriorityDetector failed'); }
      try { findings.push(...new CLSContributorDetector().finalize(this.imageInfos, this.clsValue)); } catch (err) { this.ctx.logger.warn({ err }, 'CLSContributorDetector failed'); }
      try { findings.push(...new LayoutAnimationDetector().finalize(this.animationInfos)); } catch (err) { this.ctx.logger.warn({ err }, 'LayoutAnimationDetector failed'); }
      try { findings.push(...new WillChangeDetector().finalize(willChangeCount)); } catch (err) { this.ctx.logger.warn({ err }, 'WillChangeDetector failed'); }
      try { findings.push(...new BlockingCSSDetector().finalize(this.stylesheetInfos, this.ctx.url)); } catch (err) { this.ctx.logger.warn({ err }, 'BlockingCSSDetector failed'); }
      try { findings.push(...new UnusedCSSDetector().finalize(this.stylesheetInfos)); } catch (err) { this.ctx.logger.warn({ err }, 'UnusedCSSDetector failed'); }
      try { findings.push(...new SyncScriptDetector().finalize(this.scriptInfos)); } catch (err) { this.ctx.logger.warn({ err }, 'SyncScriptDetector failed'); }
      try { findings.push(...new BundleSizeDetector().finalize(this.scriptInfos)); } catch (err) { this.ctx.logger.warn({ err }, 'BundleSizeDetector failed'); }
      try { findings.push(...new DuplicateLibsDetector().finalize(this.scriptInfos, libSignatures as unknown as LibSignature[])); } catch (err) { this.ctx.logger.warn({ err }, 'DuplicateLibsDetector failed'); }
      try { findings.push(...new TreeShakingDetector().finalize(this.scriptInfos)); } catch (err) { this.ctx.logger.warn({ err }, 'TreeShakingDetector failed'); }
      try { findings.push(...new CodeSplittingDetector().finalize(this.scriptInfos)); } catch (err) { this.ctx.logger.warn({ err }, 'CodeSplittingDetector failed'); }
      try { findings.push(...new ThirdPartyCostDetector().finalize(this.scriptInfos, this.ctx.url)); } catch (err) { this.ctx.logger.warn({ err }, 'ThirdPartyCostDetector failed'); }

    } catch (err) {
      this.ctx.logger.error({ err }, 'Error in asset inspector finalize');
    }

    return findings;
  }

  async dispose(): Promise<void> {
    // Nothing to clean up
  }
}
