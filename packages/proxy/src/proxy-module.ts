import type { AuditContext, AuditEvent, Finding, Result, VibeError } from '@vibecheck/core';
import { ok } from '@vibecheck/core';
import type { AnalysisModule } from '@vibecheck/core';
import type { ProxyDetector } from './types.js';
import { NetworkRecorder } from './network-recorder.js';
import {
  DuplicateFetchDetector,
  CrossComponentDupDetector,
  NPlusOneDetector,
  WaterfallDetector,
  CriticalPathDetector,
  OverFetchDetector,
  UnderPaginateDetector,
  CompressionDetector,
  CacheHeadersDetector,
  HttpVersionDetector,
  OriginCountDetector,
  InfiniteRefetchDetector,
} from './detectors/index.js';
import { JSON_PARSE_TAP } from './injected/index.js';

export class ProxyModule implements AnalysisModule {
  readonly name = 'proxy';
  readonly weight = 18;

  private recorder = new NetworkRecorder();
  private detectors: ProxyDetector[] = [];

  getRecorder(): NetworkRecorder {
    return this.recorder;
  }

  async initialize(ctx: AuditContext): Promise<Result<void, VibeError>> {
    this.detectors = [
      new DuplicateFetchDetector(),
      new CrossComponentDupDetector(),
      new NPlusOneDetector(),
      new WaterfallDetector(),
      new CriticalPathDetector(),
      new OverFetchDetector(),
      new UnderPaginateDetector(),
      new CompressionDetector(),
      new CacheHeadersDetector(),
      new HttpVersionDetector(),
      new OriginCountDetector(),
      new InfiniteRefetchDetector(),
    ];

    try {
      await ctx.page.context().addInitScript(JSON_PARSE_TAP);
    } catch (err) {
      ctx.logger.warn({ err }, 'Failed to inject JSON parse tap');
    }

    return ok(undefined);
  }

  async onEvent(event: AuditEvent): Promise<void> {
    if (event.type === 'network.request') {
      this.recorder.onRequestStart(event.requestId, event.url, event.method, event.resourceType, {}, { type: 'other' }, event.timestamp);
    }
    if (event.type === 'network.response') {
      this.recorder.onResponse(event.requestId, event.status, event.mimeType, {}, 'http/1.1', event.timestamp);
    }
    await Promise.all(this.detectors.map((d) => d.onEvent(event)));
  }

  async finalize(): Promise<Finding[]> {
    const requests = this.recorder.getCompletedRequests();
    const all = await Promise.all(this.detectors.map((d) => d.finalize(requests)));
    return all.flat();
  }

  async dispose(): Promise<void> {
    this.recorder.reset();
  }
}
