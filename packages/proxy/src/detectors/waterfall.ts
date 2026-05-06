import type { Finding, AuditEvent } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { ProxyDetector, NetworkRequest } from '../types.js';
import { DependencyGraph } from '../analysis/dependency-graph.js';

export class WaterfallDetector implements ProxyDetector {
  readonly name = 'waterfall';

  async onEvent(_event: AuditEvent): Promise<void> {}

  async finalize(requests: NetworkRequest[]): Promise<Finding[]> {
    const findings: Finding[] = [];
    const graph = new DependencyGraph();
    graph.build(requests);

    const waterfalls = graph.findWaterfalls(3);
    for (const chain of waterfalls) {
      const totalDuration = chain.reduce((s, r) => s + r.timing.duration, 0);
      const urls = chain.map((r) => r.url);
      findings.push({
        id: createFindingId(this.name, 'waterfall', urls.join('->')),
        module: this.name,
        type: 'waterfall',
        category: 'direct_impact',
        severity: chain.length > 4 ? 'high' : 'medium',
        confidence: 'medium',
        title: `Request waterfall: ${chain.length} sequential requests`,
        description: `${chain.length} requests were executed sequentially when they could potentially be parallelized.`,
        observedIn: urls[0] ?? '',
        evidence: chain.map((r) => ({ kind: 'har_entry' as const, path: r.id, description: r.url })),
        metrics: { chainLength: chain.length, totalDuration, urls },
        recommendation: 'Evaluate whether these requests can be parallelized or combined into a single batched request.',
        scoreImpact: 15,
      });
    }
    return findings;
  }

  async dispose(): Promise<void> {}
}
