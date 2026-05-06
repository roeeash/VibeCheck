import type { Finding, AuditEvent, AuditContext } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { Detector } from '../types.js';

export class InlineAllocationsDetector implements Detector {
  readonly name = 'inline-allocations';
  private ctx: AuditContext;

  constructor(ctx: AuditContext) {
    this.ctx = ctx;
  }

  async onEvent(_event: AuditEvent): Promise<void> {}

  async finalize(): Promise<Finding[]> {
    let inlineStyleCount = 0;
    let hotElementCount = 0;

    try {
      const result = await this.ctx.page.evaluate(() => {
        const allElements = Array.from(document.querySelectorAll('[style]'));
        const withManyChildren = allElements.filter((el) => el.children.length > 5);
        return { inlineStyleCount: allElements.length, hotElementCount: withManyChildren.length };
      });
      inlineStyleCount = result.inlineStyleCount;
      hotElementCount = result.hotElementCount;
    } catch {
      return [];
    }

    if (inlineStyleCount < 100) return [];

    return [{
      id: createFindingId('render', 'inline_allocations', 'page'),
      module: 'render',
      type: 'inline_allocations',
      category: 'theoretical_debt',
      severity: inlineStyleCount > 500 ? 'medium' : 'low',
      confidence: 'low',
      title: `${inlineStyleCount} elements use inline style objects`,
      description: `${inlineStyleCount} elements with inline style attributes detected (${hotElementCount} on hot components with children). Inline style objects and arrow-function props create new allocations on every render, preventing memoization from working.`,
      observedIn: `DOM scan: ${inlineStyleCount} elements with style attribute`,
      evidence: [{
        kind: 'console_log' as const,
        path: '',
        description: `DOM scan found ${inlineStyleCount} elements with inline style attributes; ${hotElementCount} on parent elements`,
      }],
      metrics: { inlineStyleCount, hotElementCount },
      recommendation: 'Move inline style objects to module-level constants or CSS classes. Replace inline arrow-function props with stable useCallback references to allow React.memo() to work effectively.',
      scoreImpact: 12,
    }];
  }

  async dispose(): Promise<void> {}
}
