import type { Finding } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { StylesheetInfo } from '../../types.js';

export class UnusedCSSDetector {
  static readonly name = 'unused-css';

  finalize(stylesheets: StylesheetInfo[]): Finding[] {
    const findings: Finding[] = [];

    for (const sheet of stylesheets) {
      const unused = sheet.totalBytes - sheet.usedBytes;

      // Report if > 50KB unused AND less than 30% used
      if (unused > 50 * 1024 && sheet.usedBytes / sheet.totalBytes < 0.3) {
        findings.push({
          id: createFindingId('asset-inspector', 'unused_css', sheet.url),
          module: 'asset-inspector',
          type: 'unused_css',
          category: 'theoretical_debt',
          severity: unused > 200 * 1024 ? 'high' : unused > 100 * 1024 ? 'medium' : 'low',
          confidence: 'medium',
          title: `Unused CSS: ${sheet.url.split('/').pop()}`,
          description: `${Math.round(unused / 1024)}KB of ${Math.round(sheet.totalBytes / 1024)}KB CSS is unused. Only ${(sheet.usedBytes / sheet.totalBytes * 100).toFixed(0)}% of this stylesheet is actually used on the page.`,
          observedIn: sheet.url,
          evidence: [{
            kind: 'cdp_trace',
            path: sheet.url,
            description: `CSS.stopRuleUsageTracking: ${sheet.usedBytes} of ${sheet.totalBytes} bytes used (${(sheet.usedBytes / sheet.totalBytes * 100).toFixed(0)}%)`,
          }],
          metrics: {
            unusedBytes: unused,
            totalBytes: sheet.totalBytes,
            usedRatio: parseFloat((sheet.usedBytes / sheet.totalBytes).toFixed(2)),
          },
          recommendation: `Review and remove unused CSS. Consider splitting critical styles from optional ones. Use PurgeCSS, Tailwind, or similar tools to automatically remove unused styles.`,
          scoreImpact: 6,
        });
      }
    }

    return findings;
  }
}
