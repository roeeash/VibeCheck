import type { Finding, AuditEvent, AuditContext } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { Detector, DomContainerInfo } from '../types.js';

export class VirtualizationGapDetector implements Detector {
  readonly name = 'virtualization-gap';
  private ctx: AuditContext;

  constructor(ctx: AuditContext) {
    this.ctx = ctx;
  }

  async onEvent(_event: AuditEvent): Promise<void> {}

  async finalize(): Promise<Finding[]> {
    let containers: DomContainerInfo[] = [];
    try {
      containers = await this.ctx.page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const w = window as any;
        if (w.__VIBE_COUNT_CONTAINERS__) {
          return w.__VIBE_COUNT_CONTAINERS__() ?? [];
        }
        // Fallback: count DOM nodes directly if injected function not available
        const totalNodes = document.querySelectorAll('*').length;
        if (totalNodes > 1500) {
          return [{
            selector: 'document',
            childCount: totalNodes,
            isScrollable: false,
          }];
        }
        return [];
      }) as DomContainerInfo[];
    } catch {
      return [];
    }

    const largeLists = containers.filter((c) => c.childCount > 50);
    if (largeLists.length === 0) return [];

    let hasVirtualization = false;
    try {
      hasVirtualization = await this.ctx.page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script')).map((s) => s.textContent ?? '');
        const all = scripts.join(' ');
        return /react-window|react-virtuoso|@tanstack\/react-virtual|FixedSizeList|VariableSizeList|VirtualList/.test(all);
      });
    } catch {
      // ignore
    }

    if (hasVirtualization) return [];

    const findings: Finding[] = [];
    for (const container of largeLists) {
      const count = container.childCount;
      const severity =
        count >= 2000 ? 'critical' :
        count >= 500 ? 'high' : 'medium';

      findings.push({
        id: createFindingId('render', 'unvirtualized_list', container.selector),
        module: 'render',
        type: 'unvirtualized_list',
        category: 'direct_impact',
        severity,
        confidence: 'high',
        title: `Unvirtualized list with ${count} DOM nodes (${container.selector})`,
        description: `Container "${container.selector}" renders ${count} child elements directly in the DOM without a virtualization library. This causes excessive layout, style calculation, and painting work.`,
        observedIn: `DOM scan: container "${container.selector}" has ${count} direct children`,
        evidence: [{
          kind: 'console_log' as const,
          path: '',
          description: `Container ${container.selector} has ${count} direct children — no virtualization library detected in page scripts`,
        }],
        metrics: { childCount: count, isScrollable: container.isScrollable ? 1 : 0 },
        recommendation: `Replace the list render with a virtualization library such as react-window (FixedSizeList/VariableSizeList), react-virtuoso, or @tanstack/react-virtual. Only render the ~10–30 items visible in the viewport at any time.`,
        scoreImpact: severity === 'critical' ? 25 : severity === 'high' ? 25 : 25,
      });
    }

    return findings;
  }

  async dispose(): Promise<void> {}
}
