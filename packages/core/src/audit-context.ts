import type { Page, CDPSession } from 'playwright';
import type { Logger } from 'pino';
import type { FlowScript } from './flow.js';
import type { AuditConfig } from './config.js';
import type { EvidenceRef } from './finding.js';

export interface EvidenceStore {
  init(): Promise<void>;
  appendHarEntry(entry: Record<string, unknown>): Promise<EvidenceRef>;
  appendTraceEvents(events: Record<string, unknown>[]): Promise<EvidenceRef>;
  saveScreenshot(name: string, png: Buffer, meta?: Record<string, unknown>): Promise<EvidenceRef>;
  saveHeapSnapshot(name: string, snapshotPath: string): Promise<EvidenceRef>;
  appendConsoleLog(msg: Record<string, unknown>): Promise<EvidenceRef>;
  finalize(): Promise<{ rootDir: string; manifest: { entries: Array<Record<string, unknown>>; totalSize: number } }>;
}

export interface AuditContext {
  url: string;
  flow: FlowScript;
  page: Page;
  cdp: CDPSession;
  evidenceStore: EvidenceStore;
  logger: Logger;
  config: AuditConfig;
  signal: AbortSignal;
}
