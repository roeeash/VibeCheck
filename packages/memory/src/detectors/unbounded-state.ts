import type { AuditEvent, Finding } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { Detector, DetectorContext } from '../types.js';

interface StateSample {
  storeName: string;
  size: number;
  timestamp: number;
}

interface StateTrackerResult {
  samples: StateSample[];
}

export class UnboundedStateDetector implements Detector {
  readonly name = 'unbounded-state';
  private ctx: DetectorContext;
  private snapshots: Array<Map<string, number>> = [];

  constructor(ctx: DetectorContext) {
    this.ctx = ctx;
  }

  async onEvent(event: AuditEvent): Promise<void> {
    // Sample state at each flow step to catch growing arrays
    if (event.type === 'flow.step.after') {
      await this.takeSample();
    }
  }

  private async takeSample(): Promise<void> {
    try {
      const result = await this.ctx.page.evaluate(
        () => (window as unknown as { __VIBE_SAMPLE_STATE__?: () => StateTrackerResult }).__VIBE_SAMPLE_STATE__?.() ?? { samples: [] },
      );
      const snapshot = new Map<string, number>();
      for (const s of result.samples) {
        snapshot.set(s.storeName, s.size);
      }
      this.snapshots.push(snapshot);
    } catch {
      // page may not be ready
    }
  }

  async finalize(): Promise<Finding[]> {
    // Take a final sample
    await this.takeSample();

    if (this.snapshots.length === 0) return [];

    const findings: Finding[] = [];
    const finalSnapshot = this.snapshots[this.snapshots.length - 1]!;

    for (const [storeName, finalSize] of finalSnapshot) {
      // Check if this store grew significantly across samples
      const firstSize = this.snapshots[0]?.get(storeName) ?? 0;
      const growth = finalSize - firstSize;
      const isGrowing = this.snapshots.length >= 2 && growth > 20;
      const isLarge = finalSize > 50;

      if (!isLarge && !isGrowing) continue;

      const severity = finalSize > 500 || growth > 100 ? 'high' : 'medium';
      const description = isGrowing
        ? `"${storeName}" grew from ${firstSize} to ${finalSize} entries (+${growth}) during the audit. Unbounded growth indicates a missing eviction policy.`
        : `"${storeName}" contains ${finalSize} entries with no apparent eviction policy. Large state arrays increase serialization cost on every render.`;

      findings.push({
        id: createFindingId('memory', 'unbounded_state', storeName),
        module: 'memory',
        type: 'unbounded_state',
        category: 'direct_impact',
        severity,
        confidence: isGrowing ? 'high' : 'low',
        title: `Unbounded state: "${storeName}" has ${finalSize} entries${isGrowing ? ` (+${growth} during audit)` : ''}`,
        description,
        observedIn: `${storeName} · ${finalSize} entries`,
        evidence: [
          {
            kind: 'console_log',
            path: 'memory/state-tracker',
            description: isGrowing
              ? `"${storeName}" grew from ${firstSize} → ${finalSize} entries over ${this.snapshots.length} samples`
              : `"${storeName}" size=${finalSize} at audit end`,
          },
        ],
        metrics: {
          storeName,
          entryCount: finalSize,
          growth: isGrowing ? growth : 0,
          threshold: 50,
        },
        recommendation: 'Cap the array at a fixed size (e.g. 500) and evict oldest entries. Consider using a circular buffer.',
        scoreImpact: 15,
      });
    }

    return findings;
  }

  async dispose(): Promise<void> {}
}
