import type { NetworkRequest } from './types.js';

interface HarLog {
  log: {
    version: string;
    creator: { name: string; version: string };
    entries: Array<{
      startedDateTime: string;
      time: number;
      request: { method: string; url: string; httpVersion: string; headers: Array<{ name: string; value: string }>; queryString: Array<{ name: string; value: string }>; cookies: unknown[]; headersSize: number; bodySize: number };
      response: { status: number; statusText: string; httpVersion: string; headers: Array<{ name: string; value: string }>; content: { size: number; mimeType: string }; redirectURL: string; headersSize: number; bodySize: number };
      cache: Record<string, never>;
      timings: { dns: number; connect: number; ssl: number; send: number; wait: number; receive: number };
    }>;
  };
}

export class HarBuilder {
  static build(requests: NetworkRequest[]): HarLog {
    const entries = requests.map((req) => ({
      startedDateTime: new Date(req.timestamp).toISOString(),
      time: Math.round(req.timing.duration / 1000),
      request: {
        method: req.method,
        url: req.url,
        httpVersion: req.protocol || 'http/1.1',
        headers: Object.entries(req.requestHeaders).map(([name, value]) => ({ name, value })),
        queryString: Object.entries(Object.fromEntries(new URL(req.url, 'http://example.com').searchParams)).map(([name, value]) => ({ name, value })),
        cookies: [],
        headersSize: -1,
        bodySize: req.bytesTransferred,
      },
      response: {
        status: req.status,
        statusText: '',
        httpVersion: req.protocol || 'http/1.1',
        headers: Object.entries(req.responseHeaders).map(([name, value]) => ({ name, value })),
        content: { size: req.bytesTransferred, mimeType: req.mimeType },
        redirectURL: '',
        headersSize: -1,
        bodySize: req.bytesEncoded,
      },
      cache: {},
      timings: {
        dns: Math.round(req.timing.dns),
        connect: Math.round(req.timing.connect),
        ssl: Math.round(req.timing.ssl),
        send: Math.round(req.timing.send),
        wait: Math.round(req.timing.wait),
        receive: Math.round(req.timing.receive),
      },
    }));

    return {
      log: {
        version: '1.2',
        creator: { name: 'VibeCheck', version: '0.0.1' },
        entries,
      },
    };
  }
}
