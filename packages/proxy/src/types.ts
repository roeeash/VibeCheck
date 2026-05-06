import type { Finding, AuditEvent } from '@vibecheck/core';

export interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  resourceType: string;
  initiator: { type: string; stack?: Array<{ url: string; lineNumber: number; columnNumber: number; functionName?: string }> };
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  status: number;
  protocol: string;
  timing: { startTime: number; duration: number; dns: number; connect: number; ssl: number; send: number; wait: number; receive: number };
  bytesTransferred: number;
  bytesEncoded: number;
  fromCache: boolean;
  requestId: string;
  timestamp: number;
  mimeType: string;
  parsedKeys?: string[];
  accessedKeys?: string[];
}

export interface ProxyDetector {
  readonly name: string;
  onEvent(event: AuditEvent): Promise<void>;
  finalize(requests: NetworkRequest[]): Promise<Finding[]>;
  dispose(): Promise<void>;
}

export interface NormalizedUrl {
  origin: string;
  pathPattern: string;
  pathRaw: string;
  sortedQuery: string;
  resourceKey: string;
}
