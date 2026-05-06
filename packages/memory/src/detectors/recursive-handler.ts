import type { AuditEvent, Finding } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { Detector, DetectorContext } from '../types.js';

interface HandlerTimingResult {
  heavyHandlerMs: number;
  selector: string;
}

export class RecursiveHandlerDetector implements Detector {
  readonly name = 'recursive-handler';
  private ctx: DetectorContext;

  constructor(ctx: DetectorContext) {
    this.ctx = ctx;
  }

  async onEvent(_event: AuditEvent): Promise<void> {}

  async finalize(): Promise<Finding[]> {
    const result = await this.ctx.page.evaluate((): HandlerTimingResult => {
      const inputs = document.querySelectorAll('input');
      if (inputs.length === 0) return { heavyHandlerMs: 0, selector: '' };
      const input = inputs[0] as HTMLInputElement;
      const start = performance.now();
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('keyup', { bubbles: true }));
      const elapsed = performance.now() - start;
      let selector = 'input';
      if (input.id) selector = `#${input.id}`;
      else if (input.name) selector = `input[name="${input.name}"]`;
      return { heavyHandlerMs: elapsed, selector };
    });

    if (result.heavyHandlerMs <= 10) return [];

    const finding: Finding = {
      id: createFindingId('memory', 'recursive_handler', result.selector),
      module: 'memory',
      type: 'recursive_handler',
      category: 'direct_impact',
      severity: 'medium',
      confidence: 'medium',
      title: `Heavy interaction handler — ${result.heavyHandlerMs.toFixed(1)}ms on synthetic input event`,
      description: `Dispatching a synthetic input/keyup event on "${result.selector}" took ${result.heavyHandlerMs.toFixed(1)}ms synchronously. Heavy handlers on user input events block the main thread, causing poor INP scores.`,
      observedIn: `${result.selector} · ${result.heavyHandlerMs.toFixed(1)}ms on synthetic input event`,
      evidence: [
        {
          kind: 'console_log',
          path: 'memory/recursive-handler',
          description: `Synthetic input event on ${result.selector} took ${result.heavyHandlerMs.toFixed(1)}ms`,
        },
      ],
      metrics: {
        handlerMs: Math.round(result.heavyHandlerMs * 10) / 10,
        selector: result.selector,
        threshold: 10,
      },
      recommendation:
        'Debounce or throttle input handlers. Use `lodash.debounce(handler, 200)` or `useCallback` with a debounce wrapper.',
      scoreImpact: 12,
    };

    return [finding];
  }

  async dispose(): Promise<void> {}
}
