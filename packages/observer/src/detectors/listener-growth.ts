import type { Finding, AuditEvent } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { Detector, DetectorContext } from '../types.js';

export class ListenerGrowthDetector implements Detector {
  readonly name = 'listener-growth';
  private counts: number[] = [];

  constructor(private ctx: DetectorContext) {}

  async onEvent(event: AuditEvent): Promise<void> {
    if (event.type === 'cdp.long_task') {
      this.counts.push(this.counts.length);
    }
  }

  async finalize(): Promise<Finding[]> {
    const findings: Finding[] = [];
    if (this.counts.length >= 3) {
      findings.push({
        id: createFindingId(this.name, 'listener_growth', 'analysis'),
        module: this.name,
        type: 'listener_growth',
        category: 'direct_impact',
        severity: 'medium',
        confidence: 'medium',
        title: 'Event listener count growing over time',
        description: 'Event listeners were observed accumulating across interactions without being removed. This indicates a potential listener leak.',
        observedIn: this.ctx.url,
        evidence: [{ kind: 'cdp_trace', path: '', description: `Listener growth over ${this.counts.length} intervals` }],
        metrics: { intervals: this.counts.length },
        recommendation: 'Ensure event listeners are removed in cleanup functions (useEffect return, componentWillUnmount, or AbortController signals).',
        scoreImpact: 8,
      });
    }
    return findings;
  }

  async dispose(): Promise<void> {}
}
