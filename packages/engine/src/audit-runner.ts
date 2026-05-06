import type { AuditConfig, AuditId, Finding, VibeError } from '@vibecheck/core';
import { createAuditId } from '@vibecheck/core';
import { EvidenceStore } from '@vibecheck/evidence';
import { buildInjectorScript, attachEventCollector } from '@vibecheck/injector';
import { ReportGenerator } from '@vibecheck/reporter';
import type { VibeReport } from '@vibecheck/reporter';
import type { VibeScoreResult } from '@vibecheck/correlator';
import type { Logger } from 'pino';
import pino from 'pino';
import { join } from 'node:path';
import { BrowserLauncher } from './browser-launcher.js';
import { CDPBridge } from './cdp-bridge.js';
import { FlowRunner } from './flow-runner.js';
import { EventBus } from './event-bus.js';
import { ModuleRegistry } from './module-registry.js';
import type { AuditContext } from '@vibecheck/core';
import { classifyError } from './errors/catalog.js';
import type { AuditError } from './errors/catalog.js';

export interface AuditRun {
  id: AuditId;
  status: 'running' | 'completed' | 'failed';
  findings: Finding[];
  startedAt: number;
  completedAt?: number;
  error?: VibeError;
  userError?: AuditError;
  score?: number;
  scoreResult?: VibeScoreResult;
  report?: VibeReport;
  outputDir?: string;
}

export class AuditRunner {
  private log: Logger;
  private launcher: BrowserLauncher;
  private registry: ModuleRegistry;

  constructor(log?: Logger) {
    this.log = log ?? pino({ level: 'info' });
    this.launcher = new BrowserLauncher(this.log);
    this.registry = new ModuleRegistry();
  }

  registerModule(mod: import('@vibecheck/core').AnalysisModule): void {
    this.registry.register(mod);
  }

  async run(config: AuditConfig): Promise<AuditRun> {
    const id = createAuditId();
    const run: AuditRun = { id, status: 'running', findings: [], startedAt: Date.now() };
    this.log.info({ id, url: config.url }, 'audit.start');

    const launcherResult = await this.launcher.launch();
    if (!launcherResult.ok) {
      const userError = classifyError(launcherResult.error);
      return { ...run, status: 'failed', error: launcherResult.error, userError, completedAt: Date.now() };
    }

    const { page } = launcherResult.value;
    const bus = new EventBus(this.log);
    const cdpBridge = new CDPBridge(page, this.log, bus);
    const cdpResult = await cdpBridge.initialize();
    if (!cdpResult.ok) {
      await this.launcher.dispose();
      const userError = classifyError(cdpResult.error);
      return { ...run, status: 'failed', error: cdpResult.error, userError, completedAt: Date.now() };
    }

    const evidenceStore = new EvidenceStore(config.output.dir, id);
    await evidenceStore.init();
    run.outputDir = join(config.output.dir, id);

    const flow = typeof config.flow === 'string' ? { name: 'default', steps: [{ action: 'goto', url: config.url }] } : config.flow ?? {
      name: 'default',
      steps: [
        { action: 'goto', url: config.url },
        { action: 'wait', ms: 3000 },
        { action: 'scroll_bottom' },
        { action: 'wait', ms: 3000 },
      ],
    };

    const controller = new AbortController();
    const ctx: AuditContext = { url: config.url, flow, page, cdp: cdpBridge.getSession()!, evidenceStore: evidenceStore as unknown as import('@vibecheck/core').EvidenceStore, logger: this.log, config, signal: controller.signal };

    // Register message bridge FIRST so it's available before any other init script emits postMessage
    await page.context().addInitScript(`(function(){if(window.__vibeMessageBridgeInjected)return;window.__vibeMessageBridgeInjected=true;window.addEventListener('message',function(e){var d=e.data;if(d&&d.__vibe){var r={};for(var k in d){if(k!=='__vibe')r[k]=d[k];}console.info(JSON.stringify(Object.assign({__vibe:true},r)));}});})()`);

    const modResult = await this.registry.initializeAll(ctx);
    if (!modResult.ok) {
      await this.launcher.dispose();
      const userError = classifyError(modResult.error);
      return { ...run, status: 'failed', error: modResult.error, userError, completedAt: Date.now() };
    }

    bus.on((event) => this.registry.dispatchEvent(event));
    attachEventCollector(page, (event) => bus.emit(event));

    // Use addInitScript so perf-observer.ts survives navigation (page.evaluate is cleared on goto)
    await page.context().addInitScript(buildInjectorScript());

    const flowRunner = new FlowRunner(page, this.log, bus);
    const flowResult = await flowRunner.run(flow, controller.signal);

    if (!flowResult.ok) {
      await this.launcher.dispose();
      const userError = classifyError(flowResult.error);
      return { ...run, status: 'failed', error: flowResult.error, userError, completedAt: Date.now() };
    }

    const findings = await this.registry.finalizeAll();
    await this.registry.disposeAll();
    await evidenceStore.finalize();
    await this.launcher.dispose();

    const completedAt = Date.now();

    // Generate report
    const generator = new ReportGenerator();
    const report = await generator.generate({
      auditId: id,
      url: config.url,
      startedAt: run.startedAt,
      completedAt,
      findings,
      outputDir: config.output.dir,
    });

    await generator.writeReport(report, run.outputDir!);

    this.log.info({ id, findings: findings.length, score: report.score.value }, 'audit.end');
    return { ...run, status: 'completed', findings, score: report.score.value, scoreResult: report.score, report, completedAt };
  }
}
