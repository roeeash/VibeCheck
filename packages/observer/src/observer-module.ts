import type { AuditContext, AuditEvent, Finding, Result, VibeError } from '@vibecheck/core';
import { ok } from '@vibecheck/core';
import type { AnalysisModule } from '@vibecheck/core';
import type { Detector, DetectorContext } from './types.js';
import {
  LongTaskDetector,
  LoAFDetector,
  WebVitalsDetector,
  ForcedReflowDetector,
  HeapLeakDetector,
  DetachedDomDetector,
  ListenerGrowthDetector,
  ReflowHotspotDetector,
  PaintStormDetector,
} from './detectors/index.js';
import { WEB_VITALS_SCRIPT, REFLOW_DETECTOR_SCRIPT, LISTENER_COUNTER_SCRIPT } from './injected/index.js';

export class ObserverModule implements AnalysisModule {
  readonly name = 'observer';
  readonly weight = 25;

  private detectors: Detector[] = [];
  private ctx: DetectorContext | null = null;

  async initialize(ctx: AuditContext): Promise<Result<void, VibeError>> {
    this.ctx = ctx;
    this.detectors = [
      new LongTaskDetector(ctx),
      new LoAFDetector(ctx),
      new WebVitalsDetector(ctx),
      new ForcedReflowDetector(ctx),
      new HeapLeakDetector(ctx),
      new DetachedDomDetector(ctx),
      new ListenerGrowthDetector(ctx),
      new ReflowHotspotDetector(ctx),
      new PaintStormDetector(ctx),
    ];

    try {
      await ctx.page.context().addInitScript(WEB_VITALS_SCRIPT + REFLOW_DETECTOR_SCRIPT + LISTENER_COUNTER_SCRIPT);
    } catch (err) {
      ctx.logger.warn({ err }, 'Failed to inject observer scripts');
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
