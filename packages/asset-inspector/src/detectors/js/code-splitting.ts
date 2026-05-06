import type { Finding } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { ScriptInfo } from '../../types.js';

export class CodeSplittingDetector {
  static readonly name = 'code-splitting';

  finalize(scripts: ScriptInfo[]): Finding[] {
    const findings: Finding[] = [];

    // For single-route audit, check if there's only 1 script and it's huge
    if (scripts.length === 1) {
      const script = scripts[0];
      if (script.transferSize > 200 * 1024) {
        findings.push({
          id: createFindingId('asset-inspector', 'no_code_splitting', script.url),
          module: 'asset-inspector',
          type: 'no_code_splitting',
          category: 'theoretical_debt',
          severity: 'medium',
          confidence: 'medium',
          title: `No code splitting detected`,
          description: `Single ${Math.round(script.transferSize / 1024)}KB JavaScript bundle suggests no route-based code splitting. Users download all code on first load.`,
          observedIn: script.url,
          evidence: [{
            kind: 'har_entry',
            path: script.url,
            description: `Single bundle ${Math.round(script.transferSize / 1024)}KB — no code splitting detected`,
          }],
          metrics: { totalSizeKB: Math.round(script.transferSize / 1024), scriptCount: scripts.length },
          recommendation: `Implement code splitting with dynamic imports or route-based splitting. Use Webpack/Vite/Next.js built-in code splitting to load only necessary code per page.`,
          scoreImpact: 10,
        });
      }
    }

    return findings;
  }
}
