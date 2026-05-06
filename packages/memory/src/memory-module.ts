import type { AuditContext, AuditEvent, Finding, Result, VibeError } from '@vibecheck/core';
import { ok } from '@vibecheck/core';
import type { AnalysisModule } from '@vibecheck/core';
import type { Detector, DetectorContext } from './types.js';
import {
  LeakedIntervalDetector,
  LeakedListenerDetector,
  UnboundedStateDetector,
  RecursiveHandlerDetector,
  StaleClosureDetector,
} from './detectors/index.js';
import { INTERVAL_CENSUS_SCRIPT, LISTENER_CENSUS_SCRIPT, STATE_TRACKER_SCRIPT } from './injected/index.js';

export class MemoryModule implements AnalysisModule {
  readonly name = 'memory';
  readonly weight = 12;

  private detectors: Detector[] = [];
  private ctx: DetectorContext | null = null;

  async initialize(ctx: AuditContext): Promise<Result<void, VibeError>> {
    this.ctx = ctx;
    this.detectors = [
      new LeakedIntervalDetector(ctx),
      new LeakedListenerDetector(ctx),
      new UnboundedStateDetector(ctx),
      new RecursiveHandlerDetector(ctx),
      new StaleClosureDetector(ctx),
    ];

    try {
      await ctx.page.context().addInitScript(INTERVAL_CENSUS_SCRIPT + '\n' + LISTENER_CENSUS_SCRIPT + '\n' + STATE_TRACKER_SCRIPT);
    } catch (err) {
      ctx.logger.warn({ err }, 'Failed to inject memory scripts');
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
