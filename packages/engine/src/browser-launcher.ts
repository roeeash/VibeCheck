import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import type { Result, VibeError } from '@vibecheck/core';
import type { Logger } from 'pino';

export class BrowserLauncher {
  private browser: Browser | null = null;
  private log: Logger;

  constructor(log: Logger) { this.log = log; }

  async launch(): Promise<Result<{ context: BrowserContext; page: Page }, VibeError>> {
    try {
      this.browser = await chromium.launch({ headless: true });
      const context = await this.browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      return { ok: true, value: { context, page } };
    } catch (err) {
      return { ok: false, error: { code: 'E_ENGINE_ERROR', module: 'engine', message: `Browser launch failed: ${err}`, recoverable: true } };
    }
  }

  async dispose(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
