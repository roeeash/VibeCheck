import type { Page, CDPSession } from 'playwright';
import type { Result, VibeError } from '@vibecheck/core';
import type { Logger } from 'pino';
import { EventBus } from './event-bus.js';

export class CDPBridge {
  private cdp: CDPSession | null = null;
  private log: Logger;
  private bus: EventBus;
  private page: Page;

  constructor(page: Page, log: Logger, bus: EventBus) {
    this.page = page;
    this.log = log;
    this.bus = bus;
  }

  async initialize(): Promise<Result<CDPSession, VibeError>> {
    try {
      this.cdp = await this.page.context().newCDPSession(this.page);
      await this.cdp.send('Network.enable');
      await this.cdp.send('Performance.enable');

      this.cdp.on('Network.requestWillBeSent', (params) => {
        this.bus.emit({ type: 'network.request', requestId: params.requestId, url: params.request.url, method: params.request.method, resourceType: params.type || 'Other', timestamp: params.timestamp * 1000 });
      });

      this.cdp.on('Network.responseReceived', (params) => {
        this.bus.emit({ type: 'network.response', requestId: params.requestId, url: params.response.url, status: params.response.status, mimeType: params.response.mimeType, timestamp: params.timestamp * 1000 });
      });

      return { ok: true, value: this.cdp };
    } catch (err) {
      return { ok: false, error: { code: 'E_ENGINE_ERROR', module: 'engine', message: `CDP init failed: ${err}`, recoverable: true } };
    }
  }

  getSession(): CDPSession | null { return this.cdp; }

  async dispose(): Promise<void> {
    if (this.cdp) {
      await this.cdp.detach();
      this.cdp = null;
    }
  }
}
