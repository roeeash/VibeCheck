import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import pino from 'pino';
import { createServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import type { AuditRun } from '@vibecheck/engine';
import { AuditRunner } from '@vibecheck/engine';
import { ObserverModule } from '@vibecheck/observer';
import { ProxyModule } from '@vibecheck/proxy';
import { AssetInspectorModule } from '@vibecheck/asset-inspector';
import { RenderModule } from '@vibecheck/render';
import { MemoryModule } from '@vibecheck/memory';
import { createRouter } from './routes.js';
import { createWsHandler } from './ws.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const log = pino({ level: process.env.LOG_LEVEL ?? 'info' });
const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());
app.use(pinoHttp({ logger: log }));

const auditRunner = new AuditRunner(log);
// Register analysis modules
auditRunner.registerModule(new ObserverModule());
auditRunner.registerModule(new ProxyModule());
auditRunner.registerModule(new AssetInspectorModule());
auditRunner.registerModule(new RenderModule());
auditRunner.registerModule(new MemoryModule());
const activeAudits = new Map<string, { run: AuditRun; wsClients: Set<WebSocket> }>();

const wss = new WebSocketServer({ server, path: '/ws/audit' });
createWsHandler(wss, activeAudits);

const router = createRouter(auditRunner, activeAudits, log);
app.use('/api', router);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Serve built React frontend in production
const clientDist = join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
// SPA fallback — any non-API route serves index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/ws') || req.path === '/health') {
    return next();
  }
  res.sendFile(join(clientDist, 'index.html'), (err) => {
    if (err) next(); // client not built yet in dev
  });
});

const port = parseInt(process.env.PORT ?? '3000', 10);
server.listen(port, () => {
  log.info({ port }, 'server.started');
});
