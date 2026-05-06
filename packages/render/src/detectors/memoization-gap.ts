import type { Finding, AuditEvent, AuditContext } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { Detector, RenderUpdate } from '../types.js';

export class MemoizationGapDetector implements Detector {
  static readonly detectorName = 'memoization-gap';
  readonly name = 'memoization-gap';
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

    const counts = new Map<string, number>();
    for (const ev of renderEvents) {
      counts.set(ev.componentName, (counts.get(ev.componentName) ?? 0) + 1);
    }

    const hotComponents = [...counts.entries()]
      .filter(([, c]) => c > 3)
      .sort((a, b) => b[1] - a[1]);

    if (hotComponents.length === 0) return [];

    const totalComponents = counts.size;
    const worstComponent = hotComponents[0]!;

    return [{
      id: createFindingId('render', 'memoization_gap', worstComponent[0]),
      module: 'render',
      type: 'memoization_gap',
      category: 'direct_impact',
      severity: hotComponents.length > 20 ? 'high' : 'medium',
      confidence: 'medium',
      title: `"${worstComponent[0]}" and ${hotComponents.length - 1} other component${hotComponents.length > 2 ? 's' : ''} re-render without memoization`,
      description: `"${worstComponent[0]}" re-rendered ${worstComponent[1]} times during the audit. ${hotComponents.length} components total lack React.memo/useMemo/useCallback, causing cascading re-renders on every parent state change.`,
      observedIn: `React profiler · "${worstComponent[0]}" × ${worstComponent[1]} renders (worst offender of ${hotComponents.length})`,
      evidence: hotComponents.slice(0, 5).map(([name, count]) => ({
        kind: 'console_log' as const,
        path: '',
        description: `Component "${name}" re-rendered ${count} times during audit`,
      })),
      metrics: {
        componentsWithoutMemo: hotComponents.length,
        totalComponents,
        worstComponent: worstComponent[0],
        worstCount: worstComponent[1],
      },
      recommendation: `Wrap leaf components in React.memo(). Stabilize callbacks with useCallback() and computed values with useMemo(). Focus first on "${worstComponent[0]}" (${worstComponent[1]} re-renders).`,
      scoreImpact: Math.min(Math.ceil(hotComponents.length / 5) * 2, 15),
    }];
  }

  async dispose(): Promise<void> {}
}
