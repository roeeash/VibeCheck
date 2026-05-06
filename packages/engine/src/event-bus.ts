import type { AuditEvent } from '@vibecheck/core';
import type { Logger } from 'pino';

export class EventBus {
  private listeners: Array<(event: AuditEvent) => void> = [];
  private log: Logger;

  constructor(log: Logger) {
    this.log = log;
  }

  on(fn: (event: AuditEvent) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  emit(event: AuditEvent): void {
    this.log.trace({ type: event.type }, 'event');
    for (const fn of this.listeners) {
      fn(event);
    }
  }
}
