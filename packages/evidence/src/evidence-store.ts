import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { EvidenceRef } from '@vibecheck/core';

export type { EvidenceRef } from '@vibecheck/core';

export interface EvidenceManifestEntry {
  kind: string;
  path: string;
  size: number;
  route?: string;
  timestamp: number;
}

export interface EvidenceManifest {
  entries: EvidenceManifestEntry[];
  totalSize: number;
}

export class EvidenceStore {
  private rootDir: string;
  private entries: EvidenceManifestEntry[] = [];
  private totalSize = 0;

  constructor(outputDir: string, auditId: string) {
    this.rootDir = join(outputDir, auditId);
  }

  async init(): Promise<void> {
    await mkdir(this.rootDir, { recursive: true });
    await mkdir(join(this.rootDir, 'har'), { recursive: true });
    await mkdir(join(this.rootDir, 'traces'), { recursive: true });
    await mkdir(join(this.rootDir, 'screenshots'), { recursive: true });
    await mkdir(join(this.rootDir, 'heap'), { recursive: true });
    await mkdir(join(this.rootDir, 'console'), { recursive: true });
    await mkdir(join(this.rootDir, 'mutations'), { recursive: true });
  }

  private addEntry(entry: EvidenceManifestEntry): EvidenceManifestEntry {
    this.entries.push(entry);
    this.totalSize += entry.size;
    return entry;
  }

  async appendHarEntry(entry: Record<string, unknown>): Promise<EvidenceRef> {
    const requestId = entry.requestId as string;
    const method = entry.method as string;
    const url = entry.url as string;
    const filename = `${requestId}.json`;
    const filepath = join(this.rootDir, 'har', filename);
    const content = JSON.stringify(entry, null, 2);
    await writeFile(filepath, content, 'utf8');
    const manifestEntry = this.addEntry({
      kind: 'har',
      path: filepath,
      size: Buffer.byteLength(content),
      route: url,
      timestamp: Date.now(),
    });
    return {
      kind: 'har_entry',
      path: manifestEntry.path,
      description: `HAR entry for ${method} ${url}`,
    };
  }

  async appendTraceEvents(events: Record<string, unknown>[]): Promise<EvidenceRef> {
    const filename = `trace-${Date.now()}.json`;
    const filepath = join(this.rootDir, 'traces', filename);
    const content = JSON.stringify({ traceEvents: events }, null, 2);
    await writeFile(filepath, content, 'utf8');
    const manifestEntry = this.addEntry({
      kind: 'trace',
      path: filepath,
      size: Buffer.byteLength(content),
      timestamp: Date.now(),
    });
    return {
      kind: 'cdp_trace',
      path: manifestEntry.path,
      description: `CDP trace with ${events.length} events`,
    };
  }

  async saveScreenshot(name: string, png: Buffer, meta?: Record<string, unknown>): Promise<EvidenceRef> {
    const filename = `${name}.png`;
    const filepath = join(this.rootDir, 'screenshots', filename);
    await writeFile(filepath, png);
    const manifestEntry = this.addEntry({
      kind: 'screenshot',
      path: filepath,
      size: png.byteLength,
      ...(meta?.route ? { route: meta.route as string } : {}),
      timestamp: (meta?.timestamp as number) ?? Date.now(),
    });
    return {
      kind: 'screenshot',
      path: manifestEntry.path,
      ...(meta?.selector ? { selector: meta.selector as string } : {}),
      description: `Screenshot: ${name}`,
    };
  }

  async saveHeapSnapshot(name: string, snapshotPath: string): Promise<EvidenceRef> {
    const filename = `${name}.heapsnapshot`;
    const destPath = join(this.rootDir, 'heap', filename);
    const content = await readFile(snapshotPath);
    await writeFile(destPath, content);
    const manifestEntry = this.addEntry({
      kind: 'heap',
      path: destPath,
      size: Buffer.byteLength(content),
      timestamp: Date.now(),
    });
    return {
      kind: 'heap_snapshot',
      path: manifestEntry.path,
      description: `Heap snapshot: ${name}`,
    };
  }

  async appendConsoleLog(msg: Record<string, unknown>): Promise<EvidenceRef> {
    const timestamp = msg.timestamp as number;
    const url = msg.url as string | undefined;
    const filename = `console-${timestamp}.json`;
    const filepath = join(this.rootDir, 'console', filename);
    const content = JSON.stringify(msg, null, 2);
    await writeFile(filepath, content, 'utf8');
    const manifestEntry = this.addEntry({
      kind: 'console',
      path: filepath,
      size: Buffer.byteLength(content),
      ...(url ? { route: url } : {}),
      timestamp,
    });
    return {
      kind: 'console_log',
      path: manifestEntry.path,
      description: `Console ${msg.type as string}: ${(msg.text as string).slice(0, 100)}`,
    };
  }

  async finalize(): Promise<{ rootDir: string; manifest: EvidenceManifest }> {
    const manifest: EvidenceManifest = { entries: this.entries, totalSize: this.totalSize };
    await writeFile(join(this.rootDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
    return { rootDir: this.rootDir, manifest };
  }
}

