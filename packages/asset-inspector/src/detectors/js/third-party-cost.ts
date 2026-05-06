import type { Finding } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { ScriptInfo, ThirdPartyCategory } from '../../types.js';
import { classifyOrigin } from '../../analysis/third-party-classifier.js';

export class ThirdPartyCostDetector {
  static readonly name = 'third-party-cost';

  finalize(scripts: ScriptInfo[], auditUrl: string): Finding[] {
    const findings: Finding[] = [];

    const totalJS = scripts.reduce((sum, s) => sum + s.transferSize, 0);
    let thirdPartyBytes = 0;
    const breakdown: Record<ThirdPartyCategory | 'first_party', number> = {
      first_party: 0,
      analytics: 0,
      ads: 0,
      ab_testing: 0,
      cdn: 0,
      tag_manager: 0,
      other_third_party: 0,
    };

    for (const script of scripts) {
      const category = classifyOrigin(script.url, auditUrl);
      if (category === 'first_party') {
        breakdown.first_party += script.transferSize;
      } else {
        thirdPartyBytes += script.transferSize;
        (breakdown[category] as number) += script.transferSize;
      }
    }

    const thirdPartyPercent = totalJS > 0 ? (thirdPartyBytes / totalJS) * 100 : 0;

    // Report if > 30% or > 200KB
    if (thirdPartyPercent > 30 || thirdPartyBytes > 200 * 1024) {
      let severity: 'high' | 'medium' | 'low' = 'low';
      if (thirdPartyPercent > 50) severity = 'high';
      else if (thirdPartyPercent > 40) severity = 'medium';

      findings.push({
        id: createFindingId('asset-inspector', 'heavy_third_party', 'page'),
        module: 'asset-inspector',
        type: 'heavy_third_party',
        category: 'direct_impact',
        severity,
        confidence: 'high',
        title: `Heavy third-party JavaScript: ${Math.round(thirdPartyPercent)}% of bundle`,
        description: `Third-party scripts account for ${Math.round(thirdPartyBytes / 1024)}KB (${Math.round(thirdPartyPercent)}% of total). This includes analytics, ads, and other external scripts.`,
        observedIn: 'page',
        evidence: scripts
          .filter((s) => classifyOrigin(s.url, auditUrl) !== 'first_party' && s.transferSize > 0)
          .map((s) => ({
            kind: 'har_entry' as const,
            path: s.url,
            description: `${classifyOrigin(s.url, auditUrl)}: ${Math.round(s.transferSize / 1024)}KB`,
          })),
        metrics: {
          thirdPartyBytes,
          totalBytes: totalJS,
          thirdPartyPercent: parseFloat(thirdPartyPercent.toFixed(1)),
          breakdown: {
            analytics: Math.round(breakdown.analytics / 1024),
            ads: Math.round(breakdown.ads / 1024),
            ab_testing: Math.round(breakdown.ab_testing / 1024),
            cdn: Math.round(breakdown.cdn / 1024),
            tag_manager: Math.round(breakdown.tag_manager / 1024),
            other: Math.round(breakdown.other_third_party / 1024),
          },
        },
        recommendation: `Evaluate necessity of each third-party script. Consider lazy-loading analytics, deferring non-critical tracking, or finding lighter alternatives. Aim for < 30% third-party JS.`,
        scoreImpact: 15,
      });
    }

    return findings;
  }
}
