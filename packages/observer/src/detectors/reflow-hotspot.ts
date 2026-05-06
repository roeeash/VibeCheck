import type { Finding, AuditEvent } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { Detector, DetectorContext } from '../types.js';

export class ReflowHotspotDetector implements Detector {
  readonly name = 'reflow-hotspot';
  private reflowCount = 0;

  constructor(private ctx: DetectorContext) {}

  async onEvent(event: AuditEvent): Promise<void> {
    if (event.type === 'cdp.forced_reflow') {
      this.reflowCount++;
    }
  }

  async finalize(): Promise<Finding[]> {
    const findings: Finding[] = [];
    if (this.reflowCount > 10) {
      findings.push({
        id: createFindingId(this.name, 'reflow_hotspot', 'hot'),
        module: this.name,
        type: 'direct_impact',
        category: 'direct_impact',
        severity: 'medium',
        confidence: 'medium',
        title: `Reflow hotspot: ${this.reflowCount} forced layouts`,
        description: `Detected ${this.reflowCount} forced synchronous layouts, indicating a reflow hotspot during interaction.`,
        observedIn: this.ctx.url,
        evidence: [{ kind: 'cdp_trace', path: '', description: `${this.reflowCount} reflows` }],
        metrics: { reflowCount: this.reflowCount },
        recommendation: 'Batch DOM reads and writes. Use requestAnimationFrame for visual updates and avoid reading layout properties after writes.',
        scoreImpact: 6,
      });
    }
    return findings;
  }

  async dispose(): Promise<void> {}
}
