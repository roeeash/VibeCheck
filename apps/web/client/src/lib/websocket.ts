import type { WsMessage } from '../types.js';

export interface WsOptions {
  onMessage: (msg: WsMessage) => void;
  onError?: (err: Event) => void;
  onClose?: () => void;
}

export function connectAuditWs(auditId: string, opts: WsOptions): () => void {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${proto}//${window.location.host}/ws/audit?auditId=${encodeURIComponent(auditId)}`;

  let ws: WebSocket | null = null;
  let closed = false;

  try {
    ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as WsMessage;
        opts.onMessage(msg);
      } catch {
        // ignore malformed frames
      }
    };

    ws.onerror = (err) => {
      opts.onError?.(err);
    };

    ws.onclose = () => {
      if (!closed) opts.onClose?.();
    };
  } catch {
    // WebSocket not available — caller falls back to polling
  }

  return () => {
    closed = true;
    ws?.close();
  };
}
