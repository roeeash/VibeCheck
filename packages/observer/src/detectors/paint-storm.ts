import type { Finding, AuditEvent } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { Detector, DetectorContext } from '../types.js';

export class PaintStormDetector implements Detector {
  readonly name = 'paint-storm';
  private paintCount = 0;
  private paintTimestamps: number[] = [];

  constructor(private ctx: DetectorContext) {}

  async onEvent(event: AuditEvent): Promise<void> {
    if (event.type === 'cdp.paint') {
      this.paintCount++;
      this.paintTimestamps.push(event.startTime);
    }
  }

  async finalize(): Promise<Finding[]> {
    const findings: Finding[] = [];
    if (this.paintTimestamps.length > 10) {
      const sorted = [...this.paintTimestamps].sort((a, b) => a - b);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      if (first !== undefined && last !== undefined && last > first) {
        const durationSec = (last - first) / 1000;
        const rate = this.paintCount / durationSec;
        if (rate > 5 && durationSec > 2) {
          findings.push({
            id: createFindingId(this.name, 'paint_storm', 'analysis'),
            module: this.name,
            type: 'direct_impact',
            category: 'direct_impact',
            severity: 'medium',
            confidence: 'medium',
            title: `Paint storm: ${Math.round(rate)} paints/sec over ${Math.round(durationSec)}s`,
            description: `Layer painted ${this.paintCount} times over ${Math.round(durationSec)}s (${Math.round(rate)} paints/sec), exceeding the 5 paints/sec threshold.`,
            observedIn: this.ctx.url,
            evidence: [{ kind: 'cdp_trace', path: '', description: `${this.paintCount} paint events` }],
            metrics: { paintCount: this.paintCount, rate, durationSec },
            recommendation: 'Avoid triggering paints in animation loops. Use transform and opacity for animations instead of properties that trigger repaint.',
            scoreImpact: 6,
          });
        }
      }
    }
    return findings;
  }

  async dispose(): Promise<void> {}
}
