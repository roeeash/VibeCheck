import { Router, type Request, type Response, type NextFunction } from 'express';
import type { Logger } from 'pino';
import type { AuditRunner } from '@vibecheck/engine';
import type { AuditRun } from '@vibecheck/engine';
import { WebSocket } from 'ws';
import type { AuditConfig } from '@vibecheck/core';
import { auditConfigSchema, createAuditId } from '@vibecheck/core';
import { stat, rm } from 'node:fs/promises';
import { join } from 'node:path';

interface IpState {
  concurrent: number;
  hourlyCount: number;
  windowStart: number;   // ms timestamp of current 1-hour window
}

const MAX_CONCURRENT = 3;
const MAX_HOURLY = 10;
const ONE_HOUR_MS = 60 * 60 * 1000;

const ipState = new Map<string, IpState>();

function getIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket.remoteAddress ?? 'unknown';
}

function auditRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = getIp(req);
  const now = Date.now();

  let state = ipState.get(ip);
  if (!state || now - state.windowStart > ONE_HOUR_MS) {
    state = { concurrent: 0, hourlyCount: 0, windowStart: now };
    ipState.set(ip, state);
  }

  if (state.concurrent >= MAX_CONCURRENT) {
    res.status(429).json({ error: 'Too many concurrent audits. Max 3 at a time.', code: 'E_RATE_LIMIT' });
    return;
  }
  if (state.hourlyCount >= MAX_HOURLY) {
    res.status(429).json({ error: 'Hourly audit limit reached (10/hour).', code: 'E_RATE_LIMIT' });
    return;
  }

  state.concurrent++;
  state.hourlyCount++;

  // Decrement concurrent when response finishes
  res.on('finish', () => {
    const s = ipState.get(ip);
    if (s) s.concurrent = Math.max(0, s.concurrent - 1);
  });

  next();
}

export function createRouter(runner: AuditRunner, activeAudits: Map<string, { run: AuditRun; wsClients: Set<WebSocket> }>, _log: Logger): Router {
  const router = Router();

  router.post('/audit', auditRateLimiter, (req: Request, res: Response) => {
    const parseResult = auditConfigSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Invalid config', details: parseResult.error.errors });
    }

    const config: AuditConfig = parseResult.data;

    // Generate ID upfront so we can return it immediately (avoids Render's 30s HTTP timeout)
    const id = createAuditId();
    const placeholder: AuditRun = { id, status: 'running', findings: [], startedAt: Date.now() };
    activeAudits.set(id, { run: placeholder, wsClients: new Set() });

    // Fire-and-forget — client polls GET /api/audit/:id
    runner.run(config, id).then(completedRun => {
      const entry = activeAudits.get(id);
      if (entry) entry.run = completedRun;
    }).catch(err => {
      _log.error({ err, id }, 'audit.backgroundError');
      const entry = activeAudits.get(id);
      if (entry) entry.run = { ...entry.run, status: 'failed', completedAt: Date.now(), userError: { message: err instanceof Error ? err.message : String(err) } };
    });

    return res.status(202).json({ id, status: 'running' });
  });

  router.get('/audit/:id', (req: Request, res: Response) => {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: 'Missing audit id' });
    }
    const entry = activeAudits.get(id);
    if (!entry) {
      return res.status(404).json({ error: 'Audit not found' });
    }
    return res.json({
      id: entry.run.id,
      status: entry.run.status,
      findings: entry.run.findings,
      score: entry.run.score,
      startedAt: entry.run.startedAt,
      completedAt: entry.run.completedAt,
      error: entry.run.userError?.message,
    });
  });

  router.get('/audit/:id/download', async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: 'Missing audit id' });
    }

    const entry = activeAudits.get(id);
    if (!entry) {
      return res.status(404).json({ error: 'Audit not found' });
    }

    const { outputDir } = entry.run;
    if (!outputDir) {
      return res.status(404).json({ error: 'Evidence not available' });
    }

    const reportPath = join(outputDir, 'VIBE_REPORT.md');
    try {
      await stat(reportPath);
    } catch {
      return res.status(404).json({ error: 'Report not available' });
    }

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="VIBE_REPORT_${id}.md"`);
    res.sendFile(reportPath);
  });

  router.delete('/audit/:id', async (req: Request, res: Response) => {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: 'Missing audit id' });
    }

    const entry = activeAudits.get(id);
    if (!entry) {
      return res.status(404).json({ error: 'Audit not found' });
    }

    const { outputDir } = entry.run;
    if (outputDir) {
      try {
        await rm(outputDir, { recursive: true, force: true });
      } catch (err) {
        _log.warn({ err, outputDir }, 'failed to delete output directory');
      }
    }

    activeAudits.delete(id);
    return res.json({ deleted: true });
  });

  return router;
}
