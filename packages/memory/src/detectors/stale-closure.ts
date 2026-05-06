import type { AuditEvent, Finding } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { Detector, DetectorContext, IntervalInfo } from '../types.js';

interface StaleCensusResult {
  staleCandidates: number;
}

export class StaleClosureDetector implements Detector {
  readonly name = 'stale-closure';
  private ctx: DetectorContext;

  constructor(ctx: DetectorContext) {
    this.ctx = ctx;
  }

  async onEvent(_event: AuditEvent): Promise<void> {}

  async finalize(): Promise<Finding[]> {
    const result = await this.ctx.page.evaluate((): StaleCensusResult => {
      const census = (window as unknown as { __VIBE_INTERVAL_CENSUS__?: () => { active: number; intervals: IntervalInfo[] } }).__VIBE_INTERVAL_CENSUS__?.();
      if (!census) return { staleCandidates: 0 };
      const now = performance.now();
      const staleCandidates = census.intervals.filter(
        (i: IntervalInfo) => (now - i.created) > 5000 && i.stack?.includes('useEffect'),
      ).length;
      return { staleCandidates };
    });

    if (result.staleCandidates === 0) return [];

    const finding: Finding = {
      id: createFindingId('memory', 'stale_closure', 'useEffect-interval'),
      module: 'memory',
      type: 'stale_closure',
      category: 'theoretical_debt',
      severity: 'low',
      confidence: 'low',
      title: `Stale closure — ${result.staleCandidates} interval(s) alive >5s, likely from useEffect with empty deps`,
      description: `${result.staleCandidates} setInterval call(s) have been alive for more than 5 seconds and appear to originate from a useEffect. Intervals created inside useEffect with an empty dependency array capture state at mount time and never see updated values (stale closure).`,
      observedIn: 'setInterval census · interval alive >5s, likely created in useEffect with stale closure',
      evidence: [
        {
          kind: 'console_log',
          path: 'memory/stale-closure',
          description: `${result.staleCandidates} interval(s) alive >5s with useEffect in stack trace`,
        },
      ],
      metrics: {
        staleCandidates: result.staleCandidates,
        aliveThresholdMs: 5000,
      },
      recommendation:
        'Add the captured state variable to the useEffect dependency array, or use a ref (`useRef`) to always read the latest value without triggering re-subscription.',
      scoreImpact: 12,
    };

    return [finding];
  }

  async dispose(): Promise<void> {}
}
