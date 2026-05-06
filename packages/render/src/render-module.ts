import type { AuditContext, AuditEvent, Finding, Result, VibeError } from '@vibecheck/core';
import { ok } from '@vibecheck/core';
import type { AnalysisModule } from '@vibecheck/core';
import type { Detector } from './types.js';
import {
  MemoizationGapDetector,
  InlineAllocationsDetector,
  VirtualizationGapDetector,
  MissingKeysDetector,
  RerenderStormDetector,
} from './detectors/index.js';
import { REACT_PROFILER_TAP, DOM_COUNTER_SCRIPT } from './injected/index.js';

export class RenderModule implements AnalysisModule {
  readonly name = 'render';
  readonly weight = 17;

  private detectors: Detector[] = [];

  async initialize(ctx: AuditContext): Promise<Result<void, VibeError>> {
    this.detectors = [
      new MemoizationGapDetector(ctx),
      new InlineAllocationsDetector(ctx),
      new VirtualizationGapDetector(ctx),
      new MissingKeysDetector(ctx),
      new RerenderStormDetector(ctx),
    ];

    try {
      await ctx.page.context().addInitScript(REACT_PROFILER_TAP + '\n' + DOM_COUNTER_SCRIPT);
    } catch (err) {
      ctx.logger.warn({ err }, 'Failed to inject render scripts');
    }

    return ok(undefined);
  }

  async onEvent(event: AuditEvent): Promise<void> {
    await Promise.all(this.detectors.map((d) => d.onEvent(event)));
  }

  async finalize(): Promise<Finding[]> {
    const all = await Promise.all(this.detectors.map((d) => d.finalize()));
    return all.flat();
  }

  async dispose(): Promise<void> {
    await Promise.all(this.detectors.map((d) => d.dispose()));
  }
}
