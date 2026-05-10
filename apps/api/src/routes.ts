import { Router, type Request, type Response, type NextFunction } from 'express';
import type { Logger } from 'pino';
import type { AuditRunner, AuditRun } from '@vibecheck/engine';
import { classifyError } from '@vibecheck/engine';
import type { AuditConfig } from '@vibecheck/core';
import { auditConfigSchema, createAuditId } from '@vibecheck/core';
import { stat, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { persistRun } from './audit-store.js';

interface IpState {
  concurrent: number;
  hourlyCount: number;
  windowStart: number;
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

  res.on('finish', () => {
    const s = ipState.get(ip);
    if (s) s.concurrent = Math.max(0, s.concurrent - 1);
  });

  next();
}

export function createRouter(runner: AuditRunner, activeAudits: Map<string, AuditRun>, log: Logger): Router {
  const router = Router();

  router.post('/audit', auditRateLimiter, (req: Request, res: Response) => {
    const parseResult = auditConfigSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Invalid config', details: parseResult.error.errors });
    }

    const config: AuditConfig = parseResult.data;
    const id = createAuditId();
    const placeholder: AuditRun = { id, status: 'running', findings: [], startedAt: Date.now() };
    activeAudits.set(id, placeholder);

    runner.run(config, id).then(completedRun => {
      activeAudits.set(id, completedRun);
      persistRun(completedRun, log);
    }).catch(err => {
      log.error({ err, id }, 'audit.backgroundError');
      const existing = activeAudits.get(id);
      if (existing) {
        const failed = { ...existing, status: 'failed' as const, completedAt: Date.now(), userError: classifyError(err) };
        activeAudits.set(id, failed);
        persistRun(failed, log);
      }
    });

    return res.status(202).json({ id, status: 'running' });
  });

  router.get('/audit/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Missing audit id' });

    const run = activeAudits.get(id);
    if (!run) return res.status(404).json({ error: 'Audit not found' });

    return res.json({
      id: run.id,
      status: run.status,
      findings: run.findings,
      score: run.score,
      scoreResult: run.scoreResult,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      error: run.status === 'failed' ? (run.userError?.message ?? '(no error message available)') : undefined,
    });
  });

  router.get('/audit/:id/download', async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Missing audit id' });

    const run = activeAudits.get(id);
    if (!run) return res.status(404).json({ error: 'Audit not found' });
    if (!run.outputDir) return res.status(404).json({ error: 'Evidence not available' });

    const reportPath = join(run.outputDir, 'VIBE_REPORT.md');
    try {
      await stat(reportPath);
    } catch {
      return res.status(404).json({ error: 'Report not available' });
    }

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="VIBE_REPORT_${id}.md"`);
    res.sendFile(reportPath, (err) => {
      if (err && !res.headersSent) next(err);
    });
  });

  router.delete('/audit/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Missing audit id' });

    const run = activeAudits.get(id);
    if (!run) return res.status(404).json({ error: 'Audit not found' });

    if (run.outputDir) {
      try {
        await rm(run.outputDir, { recursive: true, force: true });
      } catch (err) {
        log.warn({ err, outputDir: run.outputDir }, 'failed to delete output directory');
      }
    }

    activeAudits.delete(id);
    return res.json({ deleted: true });
  });

  return router;
}
