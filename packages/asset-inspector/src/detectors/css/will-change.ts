import type { Finding } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';

export class WillChangeDetector {
  static readonly name = 'will-change-spam';

  finalize(willChangeCount: number): Finding[] {
    const findings: Finding[] = [];

    if (willChangeCount > 20) {
      let severity: 'high' | 'medium' | 'low' = 'low';
      if (willChangeCount > 100) severity = 'high';
      else if (willChangeCount > 50) severity = 'medium';

      findings.push({
        id: createFindingId('asset-inspector', 'will_change_spam', 'page'),
        module: 'asset-inspector',
        type: 'will_change_spam',
        category: 'theoretical_debt',
        severity,
        confidence: 'high',
        title: `Excessive will-change usage: ${willChangeCount} elements`,
        description: `Found ${willChangeCount} elements with will-change property set. Over-using will-change creates render layer overhead and reduces performance.`,
        observedIn: 'document',
        evidence: [{
          kind: 'console_log',
          path: '',
          description: `getComputedStyle scan: ${willChangeCount} elements have will-change !== "auto"`,
        }],
        metrics: { elementCount: willChangeCount },
        recommendation: `Reduce will-change usage to only elements that actually animate or transform. Typical pages should use will-change on < 10 elements. Consider using it only in JavaScript during active animations, then removing it.`,
        scoreImpact: 6,
      });
    }

    return findings;
  }
}
