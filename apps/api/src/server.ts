import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import pino from 'pino';
import type { AuditRun } from '@vibecheck/engine';
import { AuditRunner } from '@vibecheck/engine';
import { ObserverModule } from '@vibecheck/observer';
import { ProxyModule } from '@vibecheck/proxy';
import { AssetInspectorModule } from '@vibecheck/asset-inspector';
import { RenderModule } from '@vibecheck/render';
import { MemoryModule } from '@vibecheck/memory';
import { createRouter } from './routes.js';
import { loadRuns } from './audit-store.js';

const log = pino({ level: process.env.LOG_LEVEL ?? 'info' });
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(pinoHttp({ logger: log }));

const auditRunner = new AuditRunner(log);
auditRunner.registerModule(new ObserverModule());
auditRunner.registerModule(new ProxyModule());
auditRunner.registerModule(new AssetInspectorModule());
auditRunner.registerModule(new RenderModule());
auditRunner.registerModule(new MemoryModule());

app.get('/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

const port = parseInt(process.env.PORT ?? '4000', 10);

loadRuns(log).then((activeAudits) => {
  app.use('/api', createRouter(auditRunner, activeAudits, log));
  app.listen(port, () => {
    log.info({ port }, 'vibecheck-api.started');
  });
});
