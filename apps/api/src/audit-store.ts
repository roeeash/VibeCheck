import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { AuditRun } from '@vibecheck/engine';
import type { Logger } from 'pino';

const STORE_DIR = join(tmpdir(), 'vibecheck-runs');

export function runMetaPath(outputDir: string): string {
  return join(outputDir, 'run.json');
}

export async function persistRun(run: AuditRun, log: Logger): Promise<void> {
  if (!run.outputDir) return;
  try {
    // report field can be large — omit from the persisted meta
    const { report: _report, ...meta } = run;
    await writeFile(runMetaPath(run.outputDir), JSON.stringify(meta), 'utf-8');
  } catch (err) {
    log.warn({ err, id: run.id }, 'audit-store.persistFailed');
  }
}

export async function loadRuns(log: Logger): Promise<Map<string, AuditRun>> {
  const map = new Map<string, AuditRun>();
  let dirs: string[];
  try {
    dirs = await readdir(STORE_DIR);
  } catch {
    return map;
  }

  await Promise.all(
    dirs.map(async (dir) => {
      const metaPath = join(STORE_DIR, dir, 'run.json');
      try {
        const raw = await readFile(metaPath, 'utf-8');
        const run = JSON.parse(raw) as AuditRun;
        // skip runs that never completed — they can't be resumed
        if (run.status !== 'running') {
          map.set(run.id, run);
        }
      } catch {
        // missing or corrupt meta — ignore
      }
    })
  );

  log.info({ count: map.size }, 'audit-store.loaded');
  return map;
}
