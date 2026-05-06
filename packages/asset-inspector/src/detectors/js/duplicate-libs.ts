import type { Finding } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { ScriptInfo, LibSignature } from '../../types.js';
import { detectLibraries } from '../../analysis/bundle-parser.js';

export class DuplicateLibsDetector {
  static readonly name = 'duplicate-libs';

  finalize(scripts: ScriptInfo[], signatures: LibSignature[]): Finding[] {
    const findings: Finding[] = [];
    const libsByName = new Map<string, string[]>();

    // For each script, detect libraries
    for (const script of scripts) {
      if (!script.body) {
        continue;
      }

      const detected = detectLibraries(script.body, signatures);
      for (const lib of detected) {
        const urls = libsByName.get(lib.name) || [];
        urls.push(script.url);
        libsByName.set(lib.name, urls);
      }
    }

    // Report duplicates
    for (const [libName, urls] of libsByName) {
      if (urls.length > 1) {
        findings.push({
          id: createFindingId('asset-inspector', 'duplicate_lib', libName),
          module: 'asset-inspector',
          type: 'duplicate_lib',
          category: 'theoretical_debt',
          severity: 'medium',
          confidence: 'medium',
          title: `Duplicate library: ${libName} in ${urls.length} bundles`,
          description: `Library "${libName}" appears in ${urls.length} different bundles, increasing page weight unnecessarily.`,
          observedIn: urls[0],
          evidence: urls.map((u) => ({
            kind: 'har_entry' as const,
            path: u,
            description: `"${libName}" signature detected in ${u.split('/').pop()}`,
          })),
          metrics: { libraryName: libName, bundleCount: urls.length, bundles: urls },
          recommendation: `Deduplicate "${libName}" across bundles. Extract it to a shared vendor bundle or consolidate into a single entry point.`,
          scoreImpact: 1,
        });
      }
    }

    return findings;
  }
}
