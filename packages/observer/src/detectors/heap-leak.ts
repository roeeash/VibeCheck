import type { Finding, AuditEvent } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { Detector, DetectorContext } from '../types.js';

export class HeapLeakDetector implements Detector {
  readonly name = 'heap-leak';
  private snapshots: Array<{ path: string; size: number; timestamp: number }> = [];

  constructor(private ctx: DetectorContext) {}

  async onEvent(event: AuditEvent): Promise<void> {
    if (event.type === 'heap.snapshot') {
      this.snapshots.push({ path: event.path, size: event.size, timestamp: event.timestamp });
    }
  }

  async finalize(): Promise<Finding[]> {
    const findings: Finding[] = [];
    if (this.snapshots.length >= 2) {
      const first = this.snapshots[0];
      const last = this.snapshots[this.snapshots.length - 1];
      if (!first || !last) return findings;
      const delta = last.size - first.size;
      if (delta > 20 * 1024 * 1024) {
        findings.push({
          id: createFindingId(this.name, 'heap_leak', 'stress-test'),
          module: this.name,
          type: 'heap_leak',
          category: 'direct_impact',
          severity: delta > 50 * 1024 * 1024 ? 'critical' : 'high',
          confidence: 'medium',
          title: `Heap growth detected: +${Math.round(delta / 1024 / 1024)}MB`,
          description: `Heap retained size grew by ${Math.round(delta / 1024 / 1024)}MB across ${this.snapshots.length} stress iterations.`,
          observedIn: this.ctx.url,
          evidence: [
            { kind: 'heap_snapshot', path: first.path, description: `Baseline snapshot (${Math.round(first.size / 1024 / 1024)}MB)` },
            { kind: 'heap_snapshot', path: last.path, description: `Post-stress snapshot (${Math.round(last.size / 1024 / 1024)}MB)` },
          ],
          metrics: { baselineSize: first.size, postStressSize: last.size, delta, iterations: this.snapshots.length },
          recommendation: 'Check for leaked intervals, event listeners, or unbounded state growth during repeated interactions.',
          scoreImpact: 12,
        });
      }
    }
    return findings;
  }

  async dispose(): Promise<void> {}
}
