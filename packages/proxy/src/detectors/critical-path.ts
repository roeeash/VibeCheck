import type { Finding, AuditEvent } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { ProxyDetector, NetworkRequest } from '../types.js';
import { DependencyGraph } from '../analysis/dependency-graph.js';

export class CriticalPathDetector implements ProxyDetector {
  readonly name = 'critical-path';

  async onEvent(_event: AuditEvent): Promise<void> {}

  async finalize(requests: NetworkRequest[]): Promise<Finding[]> {
    const graph = new DependencyGraph();
    graph.build(requests);
    const chain = graph.findLongestChain();

    if (chain.length === 0) return [];

    const totalDuration = chain.reduce((s, r) => s + r.timing.duration, 0);
    return [{
      id: createFindingId(this.name, 'critical_path', 'root'),
      module: this.name,
      type: 'direct_impact',
      category: 'direct_impact',
      severity: 'low',
      confidence: 'medium',
      title: `Critical path: ${chain.length} requests, ${Math.round(totalDuration)}ms total`,
      description: `The longest request dependency chain has ${chain.length} steps totaling ${Math.round(totalDuration)}ms.`,
      observedIn: chain[0]?.url ?? '',
      evidence: chain.map((r) => ({ kind: 'har_entry' as const, path: r.id, description: r.url })),
      metrics: { chainLength: chain.length, totalDuration },
      recommendation: 'Reduce the critical path by parallelizing independent requests or inlining critical data.',
      scoreImpact: 5,
    }];
  }

  async dispose(): Promise<void> {}
}
