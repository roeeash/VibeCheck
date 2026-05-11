import type { Finding } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { ScriptInfo } from '../../types.js';

export class SyncScriptDetector {
  static readonly name = 'sync-script';

  private isDevToolScript(url: string): boolean {
    if (
      url.includes('/@vite/') || url.includes('@vite/client') ||
      url.includes('@react-refresh') || url.includes('webpack-dev-server') ||
      url.includes('webpack-hmr') || url.includes('hot-update') ||
      url.includes('.vite/deps/') || url.includes('/@fs/')
    ) return true;
    // Vite dev-server serves source files with HMR timestamp params (e.g. App.tsx?t=123456)
    const pathOnly = url.split('?')[0] ?? '';
    if (/\.(tsx?|jsx?)$/.test(pathOnly)) return true;
    if (/[?&]t=\d+/.test(url)) return true;
    return false;
  }

  finalize(scripts: ScriptInfo[]): Finding[] {
    const findings: Finding[] = [];
    const seenUrls = new Set<string>();

    for (const script of scripts) {
      if (seenUrls.has(script.url)) continue;
      seenUrls.add(script.url);
      // Skip Vite/webpack dev-server injected scripts — not part of the app bundle
      if (this.isDevToolScript(script.url)) continue;
      // type="module" is implicitly deferred — skip these
      if (script.hasAsync || script.hasDefer || script.isModule) {
        continue;
      }

      let severity: 'high' | 'medium' = 'medium';
      if (script.isThirdParty) {
        severity = 'high';
      }

      const filename = script.url.split('/').pop() ?? script.url;
      const location = script.inHead ? 'in <head>' : 'in <body>';
      const attr = script.isThirdParty ? 'async' : 'defer';
      findings.push({
        id: createFindingId('asset-inspector', 'sync_script', script.url),
        module: 'asset-inspector',
        type: 'sync_script',
        category: 'direct_impact',
        severity,
        confidence: 'high',
        title: `Sync script blocks parsing: ${filename} (${location})`,
        description: `<script src="${filename}"> ${location} has no async or defer — it pauses HTML parsing until the script downloads and executes.${script.isThirdParty ? ' Third-party scripts without async are especially risky because their load time is outside your control.' : ''}`,
        observedIn: `${location} · ${script.url}`,
        evidence: [{
          kind: 'console_log',
          path: script.url,
          description: `<script src="${filename}"> found ${location} — neither async nor defer attribute present`,
        }],
        metrics: { sizeKB: Math.round(script.transferSize / 1024), isThirdParty: script.isThirdParty ? 1 : 0, inHead: script.inHead ? 1 : 0 },
        recommendation: `Add \`${attr}\` to the <script> tag ${location}: <script src="${filename}" ${attr}>. ${script.inHead ? `Move it before </head> or to end of <body> if possible.` : `This tag is already in <body> — adding defer is the minimal fix.`}`,
        scoreImpact: 15,
      });

    }

    return findings;
  }
}
