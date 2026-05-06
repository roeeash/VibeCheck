import type { NetworkRequest } from './types.js';

export class NetworkRecorder {
  private requests = new Map<string, NetworkRequest>();
  private completed: NetworkRequest[] = [];

  onRequestStart(id: string, url: string, method: string, resourceType: string, requestHeaders: Record<string, string>, initiator: { type: string }, timestamp: number): void {
    this.requests.set(id, {
      id, url, method, resourceType, initiator, requestHeaders,
      responseHeaders: {}, status: 0, protocol: '', timing: { startTime: timestamp, duration: 0, dns: 0, connect: 0, ssl: 0, send: 0, wait: 0, receive: 0 },
      bytesTransferred: 0, bytesEncoded: 0, fromCache: false, requestId: id, timestamp, mimeType: '',
    });
  }

  onResponse(id: string, status: number, mimeType: string, responseHeaders: Record<string, string>, protocol: string, _timestamp: number): void {
    const req = this.requests.get(id);
    if (req) {
      req.status = status;
      req.mimeType = mimeType;
      req.responseHeaders = responseHeaders;
      req.protocol = protocol;
    }
  }

  onDataReceived(id: string, dataLength: number, encodedDataLength: number): void {
    const req = this.requests.get(id);
    if (req) {
      req.bytesTransferred += dataLength;
      req.bytesEncoded += encodedDataLength;
    }
  }

  onLoadingFinished(id: string, encodedDataLength: number, timestamp: number): void {
    const req = this.requests.get(id);
    if (req) {
      req.bytesEncoded = encodedDataLength;
      req.timing.duration = (timestamp - req.timing.startTime) * 1000;
      this.completed.push(req);
      this.requests.delete(id);
    }
  }

  onLoadingFailed(id: string): void {
    this.requests.delete(id);
  }

  onServedFromCache(id: string): void {
    const req = this.requests.get(id);
    if (req) req.fromCache = true;
  }

  setParsedKeys(id: string, keys: string[]): void {
    const req = this.requests.get(id);
    if (req) req.parsedKeys = keys;
  }

  setAccessedKeys(id: string, keys: string[]): void {
    const req = this.requests.get(id);
    if (req) req.accessedKeys = keys;
  }

  getCompletedRequests(): NetworkRequest[] {
    return [...this.completed];
  }

  reset(): void {
    this.requests.clear();
    this.completed = [];
  }
}
