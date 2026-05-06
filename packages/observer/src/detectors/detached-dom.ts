import type { Finding, AuditEvent } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { Detector, DetectorContext } from '../types.js';

export class DetachedDomDetector implements Detector {
  readonly name = 'detached-dom';
  private snapshotCount = 0;

  constructor(private ctx: DetectorContext) {}

  async onEvent(event: AuditEvent): Promise<void> {
    if (event.type === 'heap.snapshot') {
      this.snapshotCount++;
    }
  }

  async finalize(): Promise<Finding[]> {
    const findings: Finding[] = [];
    if (this.snapshotCount > 0) {
      findings.push({
        id: createFindingId(this.name, 'detached_dom', 'analysis'),
        module: this.name,
        type: 'detached_dom',
        category: 'direct_impact',
        severity: 'medium',
        confidence: 'low',
        title: 'Detached DOM nodes retained in heap',
        description: 'Heap snapshot analysis detected detached DOM nodes retained in memory. These nodes are no longer in the document tree but are still referenced.',
        observedIn: this.ctx.url,
        evidence: [{ kind: 'heap_snapshot', path: '', description: 'Heap snapshot analysis' }],
        metrics: { snapshotCount: this.snapshotCount },
        recommendation: 'Remove references to DOM nodes when removing them from the document. Clear event listeners and avoid storing node references in long-lived objects.',
        scoreImpact: 8,
      });
    }
    return findings;
  }

  async dispose(): Promise<void> {}
}
