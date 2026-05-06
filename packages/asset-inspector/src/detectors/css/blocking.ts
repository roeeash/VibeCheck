import type { Finding } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { StylesheetInfo } from '../../types.js';

export class BlockingCSSDetector {
  static readonly name = 'blocking-css';

  finalize(stylesheets: StylesheetInfo[], auditUrl?: string): Finding[] {
    const findings: Finding[] = [];

    // Skip on localhost/dev environments — dev servers always inject stylesheets
    if (auditUrl && (auditUrl.includes('localhost') || auditUrl.includes('127.0.0.1'))) {
      return [];
    }

    for (const sheet of stylesheets) {
      if (!sheet.isRenderBlocking) continue;
      // Font CDNs loaded via preload+onload appear as stylesheet after load — not truly blocking
      if (sheet.url.includes('fonts.googleapis.com') || sheet.url.includes('fonts.gstatic.com')) continue;
      // Skip dev tool stylesheets (Vite, webpack, etc.)
      if (sheet.url.includes('/@vite/') || sheet.url.includes('@vite/client') ||
          sheet.url.includes('webpack-dev-server') || sheet.url.includes('/@fs/')) continue;

      let severity: 'high' | 'medium' | 'low' = 'low';
      if (sheet.transferSize > 50 * 1024) {
        severity = 'high';
      } else if (sheet.transferSize > 10 * 1024) {
        severity = 'medium';
      }

      findings.push({
        id: createFindingId('asset-inspector', 'blocking_css', sheet.url),
        module: 'asset-inspector',
        type: 'blocking_css',
        category: 'direct_impact',
        severity,
        confidence: 'high',
        title: `Render-blocking stylesheet: ${sheet.url.split('/').pop()}`,
        description: `${Math.round(sheet.transferSize / 1024)}KB stylesheet blocks rendering. Consider using critical CSS or media queries to unblock the page.`,
        observedIn: sheet.url,
        evidence: [{
          kind: 'har_entry',
          path: sheet.url,
          description: `${Math.round(sheet.transferSize / 1024)}KB stylesheet in <head> with media="${sheet.mediaAttr || 'all'}" — blocks first render`,
        }],
        metrics: { sizeKB: Math.round(sheet.transferSize / 1024) },
        recommendation: `Inline critical CSS, defer non-critical styles using media queries or rel="print", or use a critical CSS extractor. Keep above-the-fold CSS < 14KB.`,
        scoreImpact: 15,
      });
    }

    return findings;
  }
}
