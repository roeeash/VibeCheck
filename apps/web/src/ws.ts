import type { WebSocketServer, WebSocket } from 'ws';
import type { AuditRun } from '@vibecheck/engine';

export function createWsHandler(wss: WebSocketServer, activeAudits: Map<string, { run: AuditRun; wsClients: Set<WebSocket> }>) {
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url ?? '', `http://${req.headers.host}`);
    const auditId = url.searchParams.get('auditId');
    if (!auditId) {
      ws.close(1008, 'Missing auditId');
      return;
    }

    const entry = activeAudits.get(auditId);
    if (!entry) {
      ws.close(1008, 'Audit not found');
      return;
    }

    entry.wsClients.add(ws);
    ws.send(JSON.stringify({ type: 'connected', auditId }));

    ws.on('close', () => {
      entry.wsClients.delete(ws);
    });
  });

  return {
    broadcast(auditId: string, message: Record<string, unknown>): void {
      const entry = activeAudits.get(auditId);
      if (!entry) return;
      const payload = JSON.stringify(message);
      for (const client of entry.wsClients) {
        if (client.readyState === 1) {
          client.send(payload);
        }
      }
    },
  };
}
