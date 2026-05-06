import type { Finding } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { ScriptInfo } from '../../types.js';

export class BundleSizeDetector {
  static readonly name = 'bundle-size';

  private isDevToolScript(url: string): boolean {
    return url.includes('/@vite/') || url.includes('@vite/client') ||
      url.includes('@react-refresh') || url.includes('webpack-dev-server') ||
      url.includes('webpack-hmr') || url.includes('hot-update') ||
      url.includes('.vite/deps/') || url.includes('/@fs/');
  }

  finalize(scripts: ScriptInfo[]): Finding[] {
    const findings: Finding[] = [];

    // Exclude Vite/webpack dev-server scripts — they inflate bundle size in dev mode only
    const appScripts = scripts.filter((s) => !this.isDevToolScript(s.url));
    const totalJS = appScripts.reduce((sum, s) => sum + s.transferSize, 0);

    // Report if total JS > 250KB
    if (totalJS > 250 * 1024) {
      let severity: 'high' | 'medium' | 'low' = 'low';
      let scoreImpact = 10;

      if (totalJS > 1000 * 1024) {
        severity = 'high';
        scoreImpact = 20;
      } else if (totalJS > 500 * 1024) {
        severity = 'medium';
        scoreImpact = 20;
      }

      const largeScripts = appScripts.filter((s) => s.transferSize > 100 * 1024);
      const evidence: string[] = largeScripts.map((s) => `${s.url.split('/').pop()}: ${Math.round(s.transferSize / 1024)}KB`);

      findings.push({
        id: createFindingId('asset-inspector', 'oversized_bundle', 'page'),
        module: 'asset-inspector',
        type: 'oversized_bundle',
        category: 'direct_impact',
        severity,
        confidence: 'high',
        title: `Large JavaScript bundle: ${Math.round(totalJS / 1024)}KB total`,
        description: `Total JavaScript is ${Math.round(totalJS / 1024)}KB. ${largeScripts.length} script(s) exceed 100KB. Large bundles slow page load on slow networks.`,
        observedIn: 'page',
        evidence: largeScripts.map((s) => ({
          kind: 'har_entry' as const,
          path: s.url,
          description: `${s.url.split('/').pop()}: ${Math.round(s.transferSize / 1024)}KB transferred`,
        })),
        metrics: {
          totalJSKB: Math.round(totalJS / 1024),
          scriptCount: scripts.length,
          largeScriptCount: largeScripts.length,
          largeScripts: evidence,
        },
        recommendation: `Reduce JavaScript bundle size through code splitting, tree shaking, or removing unused dependencies. Aim for < 250KB total, < 100KB per route.`,
        scoreImpact,
      });
    }

    return findings;
  }
}
