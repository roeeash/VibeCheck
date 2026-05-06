import type { NetworkRequest } from '../types.js';

interface DependencyNode {
  request: NetworkRequest;
  dependsOn: Set<string>;
  dependents: Set<string>;
}

export class DependencyGraph {
  private nodes = new Map<string, DependencyNode>();

  build(requests: NetworkRequest[]): void {
    this.nodes.clear();
    for (const req of requests) {
      this.nodes.set(req.id, { request: req, dependsOn: new Set(), dependents: new Set() });
    }

    for (const req of requests) {
      if (req.initiator?.type === 'parser') continue;
      const parentRequests = requests.filter((r) => r.id !== req.id && r.timing.startTime < req.timing.startTime && r.timing.startTime + r.timing.duration >= req.timing.startTime);
      for (const parent of parentRequests) {
        const parentNode = this.nodes.get(parent.id);
        const node = this.nodes.get(req.id);
        if (parentNode && node) {
          node.dependsOn.add(parent.id);
          parentNode.dependents.add(req.id);
        }
      }
    }
  }

  findLongestChain(): NetworkRequest[] {
    const visited = new Set<string>();

    const dfs = (id: string): NetworkRequest[] => {
      if (visited.has(id)) return [];
      visited.add(id);
      const node = this.nodes.get(id);
      if (!node) return [];
      let longest: NetworkRequest[] = [];
      for (const depId of node.dependents) {
        const subChain = dfs(depId);
        if (subChain.length > longest.length) longest = subChain;
      }
      return [node.request, ...longest];
    };

    let best: NetworkRequest[] = [];
    for (const id of this.nodes.keys()) {
      const c = dfs(id);
      if (c.length > best.length) best = c;
    }
    return best;
  }

  findWaterfalls(minLength = 3): NetworkRequest[][] {
    const visited = new Set<string>();
    const waterfalls: NetworkRequest[][] = [];

    const dfs = (id: string): NetworkRequest[] => {
      if (visited.has(id)) return [];
      visited.add(id);
      const node = this.nodes.get(id);
      if (!node) return [];
      let longest: NetworkRequest[] = [];
      for (const depId of node.dependents) {
        const depNode = this.nodes.get(depId);
        if (depNode) {
          const parentEnd = node.request.timing.startTime + node.request.timing.duration;
          const childStart = depNode.request.timing.startTime;
          if (childStart >= parentEnd) {
            const subChain = dfs(depId);
            if (subChain.length > longest.length) longest = subChain;
          }
        }
      }
      return [node.request, ...longest];
    };

    for (const id of this.nodes.keys()) {
      const chain = dfs(id);
      if (chain.length >= minLength) waterfalls.push(chain);
    }
    return waterfalls;
  }
}
