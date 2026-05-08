import type { Finding, AuditEvent } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { Detector, DetectorContext } from '../types.js';

interface ReflowEntry {
  selector: string | undefined;
  timestamp: number;
}

export class ForcedReflowDetector implements Detector {
  readonly name = 'forced-reflow';
  private events: ReflowEntry[] = [];
  private bySelector = new Map<string, number>();

  constructor(private ctx: DetectorContext) {}

  async onEvent(event: AuditEvent): Promise<void> {
    if (event.type === 'cdp.forced_reflow') {
      this.events.push({ selector: event.selector, timestamp: event.timestamp });
      const key = event.selector ?? 'unknown';
      this.bySelector.set(key, (this.bySelector.get(key) ?? 0) + 1);
    }
  }

  async finalize(): Promise<Finding[]> {
    const findings: Finding[] = [];
    for (const [selector, count] of this.bySelector) {
      if (count >= 3) {
        findings.push({
          id: createFindingId(this.name, 'forced_reflow', selector),
          module: this.name,
          type: 'forced_reflow',
          category: 'direct_impact',
          severity: count > 20 ? 'high' : 'medium',
          confidence: 'medium',
          title: `Forced synchronous layout on ${selector} (${count} times)`,
          description: `Reading layout properties (${selector}) forced the browser to recalculate layout ${count} times.`,
          observedIn: selector,
          evidence: [{ kind: 'cdp_trace', path: '', description: `${count} forced reflows on ${selector}` }],
          metrics: { count, selector },
          recommendation: 'Batch DOM reads and writes. Read layout properties before any writes to avoid forcing synchronous layout.',
          scoreImpact: 15,
        });
      }
    }
    return findings;
  }

  async dispose(): Promise<void> {}
}
