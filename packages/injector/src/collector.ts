/* eslint-disable no-console */
import type { Page, ConsoleMessage } from 'playwright';
import type { AuditEvent } from '@vibecheck/core';

export function attachEventCollector(page: Page, onEvent: (event: AuditEvent) => void): () => void {
  const messageHandler = (msg: ConsoleMessage) => {
    if (msg.type() !== 'info') return;
    try {
      const payload = JSON.parse(msg.text());
      if (payload && payload.__vibe) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { __vibe, ...rest } = payload;
        onEvent(rest as AuditEvent);
      }
    } catch { /* ignore non-json messages */ }
  };

  page.on('console', messageHandler);

  return () => page.off('console', messageHandler);
}
