import type { Finding } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { ScriptInfo } from '../../types.js';

const FULL_LODASH_SIGS = ['_.chain', '_.range', '_.partition', '_.groupBy'];
const FULL_MOMENT_SIGS = ['moment.locale', 'moment.utcOffset', 'moment.isoWeekday'];

export class TreeShakingDetector {
  static readonly name = 'tree-shaking';

  finalize(scripts: ScriptInfo[]): Finding[] {
    const findings: Finding[] = [];

    for (const script of scripts) {
      if (!script.body) {
        continue;
      }

      // Check for full lodash usage
      const lodashMatches = FULL_LODASH_SIGS.filter((sig) => script.body!.includes(sig)).length;
      if (lodashMatches === FULL_LODASH_SIGS.length) {
        findings.push({
          id: createFindingId('asset-inspector', 'tree_shaking_fail', `${script.url}-lodash`),
          module: 'asset-inspector',
          type: 'tree_shaking_fail',
          category: 'theoretical_debt',
          severity: 'medium',
          confidence: 'medium',
          title: `Appears to bundle full lodash`,
          description: `This bundle contains multiple lodash utilities (${FULL_LODASH_SIGS.slice(0, 2).join(', ')}, etc.), suggesting the full lodash library is included rather than individual utilities.`,
          observedIn: script.url,
          evidence: [{
            kind: 'har_entry' as const,
            path: script.url,
            description: `Full lodash signatures found: ${FULL_LODASH_SIGS.filter((sig) => script.body!.includes(sig)).join(', ')}`,
          }],
          metrics: { detectedSignatures: FULL_LODASH_SIGS.filter((sig) => script.body!.includes(sig)) },
          recommendation: `Use lodash-es or import only needed utilities: import { chain, groupBy } from 'lodash-es'; to enable tree-shaking.`,
          scoreImpact: 1,
        });
      }

      // Check for full moment usage
      const momentMatches = FULL_MOMENT_SIGS.filter((sig) => script.body!.includes(sig)).length;
      if (momentMatches === FULL_MOMENT_SIGS.length) {
        findings.push({
          id: createFindingId('asset-inspector', 'tree_shaking_fail', `${script.url}-moment`),
          module: 'asset-inspector',
          type: 'tree_shaking_fail',
          category: 'theoretical_debt',
          severity: 'medium',
          confidence: 'medium',
          title: `Appears to bundle full moment.js`,
          description: `This bundle contains multiple moment.js features (locales, utilities), suggesting the full library is included. moment.js is large and mostly unused in modern apps.`,
          observedIn: script.url,
          evidence: [{
            kind: 'har_entry' as const,
            path: script.url,
            description: `Full moment.js signatures found: ${FULL_MOMENT_SIGS.filter((sig) => script.body!.includes(sig)).join(', ')}`,
          }],
          metrics: { detectedSignatures: FULL_MOMENT_SIGS.filter((sig) => script.body!.includes(sig)) },
          recommendation: `Replace moment.js with a lighter alternative like date-fns, Day.js, or native Intl API for modern browsers.`,
          scoreImpact: 1,
        });
      }
    }

    return findings;
  }
}
