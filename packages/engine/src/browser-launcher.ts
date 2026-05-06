import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import type { Result, VibeError } from '@vibecheck/core';
import type { Logger } from 'pino';

// Flags required for running Chromium inside Docker / containers with limited RAM
const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-software-rasterizer',
  '--no-zygote',
  '--single-process',            // eliminates zygote+renderer overhead (~150MB saved on Render free tier)
  '--js-flags=--max-old-space-size=96',
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-default-apps',
  '--disable-sync',
  '--disable-translate',
  '--metrics-recording-only',
  '--no-first-run',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
];

export class BrowserLauncher {
  private browser: Browser | null = null;
  private log: Logger;

  constructor(log: Logger) { this.log = log; }

  async launch(): Promise<Result<{ context: BrowserContext; page: Page }, VibeError>> {
    try {
      this.browser = await chromium.launch({
        headless: true,
        args: BROWSER_ARGS,
      });
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
