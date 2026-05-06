import type { AuditEvent, Finding } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { Detector, DetectorContext } from '../types.js';

interface ListenerCensusResult {
  total: number;
  addCount: number;
  removeCount: number;
  byType: Record<string, number>;
}

export class LeakedListenerDetector implements Detector {
  readonly name = 'leaked-listener';
  private ctx: DetectorContext;

  constructor(ctx: DetectorContext) {
    this.ctx = ctx;
  }

  async onEvent(_event: AuditEvent): Promise<void> {}

  async finalize(): Promise<Finding[]> {
    // Skip on localhost/dev environments — HMR and dev tooling always add listeners
    if (this.ctx.url.includes('localhost') || this.ctx.url.includes('127.0.0.1')) {
      return [];
    }

    const census = await this.ctx.page.evaluate(
      () =>
        (window as unknown as { __VIBE_LISTENER_CENSUS__?: () => ListenerCensusResult }).__VIBE_LISTENER_CENSUS__?.() ?? {
          total: 0,
          addCount: 0,
          removeCount: 0,
          byType: {},
        },
    );

    const net = census.addCount - census.removeCount;
    if (net <= 30) return [];

    const topTypes = Object.entries(census.byType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    const evidence = topTypes.map(([type, count]) => ({
      kind: 'console_log' as const,
      path: 'memory/listener-census',
      description: `Event type "${type}": ${count} add calls`,
    }));

    if (evidence.length === 0) {
      evidence.push({
        kind: 'console_log',
        path: 'memory/listener-census',
        description: `Net listeners: ${net} (${census.addCount} added, ${census.removeCount} removed)`,
      });
    }

    const finding: Finding = {
      id: createFindingId('memory', 'leaked_listener', 'addEventListener'),
      module: 'memory',
      type: 'leaked_listener',
      category: 'direct_impact',
      severity: 'medium',
      confidence: 'medium',
      title: `Leaked event listeners — ${net} net listeners`,
      description: `${net} more addEventListener calls than removeEventListener calls were observed (${census.addCount} added, ${census.removeCount} removed). Leaked listeners hold references to DOM nodes and closures, preventing garbage collection.`,
      observedIn: `addEventListener census · ${net} net listeners (${census.addCount} added, ${census.removeCount} removed)`,
      evidence,
      metrics: {
        netListeners: net,
        addCount: census.addCount,
        removeCount: census.removeCount,
        threshold: 50,
      },
      recommendation:
        'Match every addEventListener with a removeEventListener in cleanup. In React: `useEffect(() => { el.addEventListener(\'click\', handler); return () => el.removeEventListener(\'click\', handler); }, [])`',
      scoreImpact: 22,
    };

    return [finding];
  }

  async dispose(): Promise<void> {}
}
