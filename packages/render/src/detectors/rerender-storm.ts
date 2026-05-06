import type { Finding, AuditEvent, AuditContext } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { Detector, RenderUpdate } from '../types.js';

export class RerenderStormDetector implements Detector {
  readonly name = 'rerender-storm';
  private ctx: AuditContext;

  constructor(ctx: AuditContext) {
    this.ctx = ctx;
  }

  async onEvent(_event: AuditEvent): Promise<void> {}

  async finalize(): Promise<Finding[]> {
    let renderEvents: RenderUpdate[] = [];
    try {
      renderEvents = await this.ctx.page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (window as any).__VIBE_RENDER_EVENTS__ ?? [];
      }) as RenderUpdate[];
    } catch {
      return [];
    }

    if (renderEvents.length === 0) return [];

    // Find 1000ms windows with more than 20 render events
    const WINDOW_MS = 1000;
    const BURST_THRESHOLD = 20;

    let maxBurst = 0;
    let burstStart = 0;
    let burstComponents: string[] = [];

    for (let i = 0; i < renderEvents.length; i++) {
      const windowStart = renderEvents[i]!.timestamp;
      const windowEnd = windowStart + WINDOW_MS;
      const inWindow = renderEvents.filter(
        (e) => e.timestamp >= windowStart && e.timestamp < windowEnd,
      );
      if (inWindow.length > maxBurst) {
        maxBurst = inWindow.length;
        burstStart = windowStart;
        const names = new Set(inWindow.map((e) => e.componentName));
        burstComponents = [...names].slice(0, 10);
      }
    }

    if (maxBurst < BURST_THRESHOLD) return [];

    return [{
      id: createFindingId('render', 'render_storm', 'page'),
      module: 'render',
      type: 'render_storm',
      category: 'direct_impact',
      severity: 'high',
      confidence: 'medium',
      title: `Re-render storm: ${maxBurst} renders in 1000ms`,
      description: `A burst of ${maxBurst} component renders was observed within a 1000ms window starting at t=${Math.round(burstStart)}ms. Components involved: ${burstComponents.join(', ')}. This indicates cascading state updates propagating through the tree.`,
      observedIn: `React profiler: ${maxBurst} renders in 1000ms window — components: ${burstComponents.slice(0, 3).join(', ')}`,
      evidence: [{
        kind: 'console_log' as const,
        path: '',
        description: `${maxBurst} render events in a 500ms window at t=${Math.round(burstStart)}ms involving ${burstComponents.length} components`,
      }],
      metrics: { burstCount: maxBurst, burstStart: Math.round(burstStart), uniqueComponents: burstComponents.length },
      recommendation: 'Identify the state update triggering the cascade and batch related setState calls using React 18 automatic batching or flushSync. Consider lifting shared state to a context or Zustand/Jotai store to avoid prop-drilling re-renders.',
      scoreImpact: 28,
    }];
  }

  async dispose(): Promise<void> {}
}
