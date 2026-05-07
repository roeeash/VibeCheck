import type { Page } from 'playwright';
import type { FlowScript, FlowStep, Result, VibeError } from '@vibecheck/core';
import type { Logger } from 'pino';
import { EventBus } from './event-bus.js';

export class FlowRunner {
  private page: Page;
  private log: Logger;
  private bus: EventBus;

  constructor(page: Page, log: Logger, bus: EventBus) {
    this.page = page;
    this.log = log;
    this.bus = bus;
  }

  async run(flow: FlowScript, signal: AbortSignal): Promise<Result<void, VibeError>> {
    for (const step of flow.steps) {
      if (signal.aborted) return { ok: false, error: { code: 'E_TIMEOUT', module: 'engine', message: 'Audit aborted', recoverable: false } };
      this.bus.emit({ type: 'flow.step.before', step, url: this.page.url(), timestamp: Date.now() });
      try {
        await this.executeStep(step);
        this.bus.emit({ type: 'flow.step.after', step, url: this.page.url(), timestamp: Date.now(), success: true });
      } catch (err) {
        this.bus.emit({ type: 'flow.step.after', step, url: this.page.url(), timestamp: Date.now(), success: false });
        return { ok: false, error: { code: 'E_ENGINE_ERROR', module: 'engine', message: `Step failed: ${(err as Error).message}`, recoverable: true } };
      }
    }
    return { ok: true, value: undefined };
  }

  private async executeStep(step: FlowStep): Promise<void> {
    switch (step.action) {
      case 'goto':
        if (step.url) {
          await this.page.goto(step.url, { waitUntil: 'load', timeout: 30000 });
          // Soft-wait for network quiet; non-throwing so polling/SSE sites don't fail
          await this.page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
        }
        break;
      case 'click':
        if (step.selector) await this.page.click(step.selector, { timeout: 10000 });
        break;
      case 'type':
        if (step.selector && step.text) await this.page.fill(step.selector, step.text);
        break;
      case 'wait':
        if (step.ms) await this.page.waitForTimeout(step.ms);
        break;
      case 'scroll':
        if (step.to) {
          await this.page.evaluate(() => { (window as unknown as Record<string, unknown>).__vibeScrolling = true; }).catch(() => {});
          await this.page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ behavior: 'smooth' }), step.to)
            .catch(() => {});
          await this.page.evaluate(() => { (window as unknown as Record<string, unknown>).__vibeScrolling = false; }).catch(() => {});
        }
        break;
      case 'scroll_bottom':
        await this.page.evaluate(() => { (window as unknown as Record<string, unknown>).__vibeScrolling = true; }).catch(() => {});
        await this.page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }))
          .catch(() => {});
        await this.page.evaluate(() => { (window as unknown as Record<string, unknown>).__vibeScrolling = false; }).catch(() => {});
        await this.page.waitForTimeout(800);
        break;
      case 'screenshot':
        break;
    }
  }
}
