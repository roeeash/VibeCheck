import type { AuditEvent, Finding } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { Detector, DetectorContext, IntervalInfo } from '../types.js';

interface IntervalCensusResult {
  active: number;
  intervals: IntervalInfo[];
}

export class LeakedIntervalDetector implements Detector {
  readonly name = 'leaked-interval';
  private ctx: DetectorContext;

  constructor(ctx: DetectorContext) {
    this.ctx = ctx;
  }

  async onEvent(_event: AuditEvent): Promise<void> {}

  async finalize(): Promise<Finding[]> {
    const census = await this.ctx.page.evaluate(
      () => (window as unknown as { __VIBE_INTERVAL_CENSUS__?: () => IntervalCensusResult }).__VIBE_INTERVAL_CENSUS__?.() ?? { active: 0, intervals: [] },
    );

    // Filter out dev-tool intervals (Vite HMR, webpack-dev-server, etc.)
    const appIntervals = census.intervals.filter((i) => {
      const stack = i.stack ?? '';
      return !stack.includes('/@vite/') && !stack.includes('@vite/client') && !stack.includes('webpack-dev-server');
    });

    if (appIntervals.length < 1) return [];

    // Use filtered count for severity
    const active = appIntervals.length;

    const evidence = appIntervals.slice(0, 5).map((interval) => ({
      kind: 'console_log' as const,
      path: 'memory/interval-census',
      description: `Leaked interval id=${interval.id} delay=${interval.delay}ms stack=${(interval.stack ?? '').slice(0, 200)}`,
    }));

    const finding: Finding = {
      id: createFindingId('memory', 'leaked_interval', 'setInterval'),
      module: 'memory',
      type: 'leaked_interval',
      category: 'direct_impact',
      severity: active >= 10 ? 'critical' : active >= 5 ? 'high' : active >= 2 ? 'medium' : 'low',
      confidence: 'medium',
      title: `Leaked setInterval — ${active} active timer${active !== 1 ? 's' : ''} at audit end`,
      description: `${active} interval${active !== 1 ? 's' : ''} (or self-rescheduling timeouts) remained active at the end of the audit. Leaked timers prevent garbage collection of their captured closures and run indefinitely, increasing CPU usage.`,
      observedIn: `setInterval census · ${active} active timer${active !== 1 ? 's' : ''} at audit end`,
      evidence,
      metrics: {
        activeTimers: active,
        threshold: 1,
      },
      recommendation:
        'Wrap setInterval in useEffect and return a cleanup function: `useEffect(() => { const id = setInterval(...); return () => clearInterval(id); }, [])`',
      scoreImpact: 22,
    };

    return [finding];
  }

  async dispose(): Promise<void> {}
}
