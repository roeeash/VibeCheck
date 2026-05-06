import { describe, it, expect } from 'vitest';
import {
  DuplicateFetchDetector,
  NPlusOneDetector,
  WaterfallDetector,
  UnderPaginateDetector,
  CompressionDetector,
  CacheHeadersDetector,
  HttpVersionDetector,
  OriginCountDetector,
} from '../../packages/proxy/src/detectors/index.js';
import type { NetworkRequest } from '../../packages/proxy/src/types.js';

function makeRequest(overrides: Partial<NetworkRequest> = {}): NetworkRequest {
  return {
    id: `req-${Math.random().toString(36).slice(2, 8)}`,
    url: 'https://example.com/api/data',
    method: 'GET',
    resourceType: 'fetch',
    initiator: { type: 'script' },
    requestHeaders: {},
    responseHeaders: {},
    status: 200,
    protocol: 'h2',
    timing: { startTime: 1000, duration: 50, dns: 5, connect: 10, ssl: 5, send: 2, wait: 20, receive: 8 },
    bytesTransferred: 1024,
    bytesEncoded: 512,
    fromCache: false,
    requestId: '',
    timestamp: 1000,
    mimeType: 'application/json',
    ...overrides,
  };
}

describe('Proxy Detectors', () => {
  describe('CacheHeadersDetector', () => {
    it('flags responses missing cache headers', async () => {
      const detector = new CacheHeadersDetector();
      const requests: NetworkRequest[] = [
        makeRequest({ url: 'https://example.com/assets/logo.png', mimeType: 'image/png', responseHeaders: {} }),
        makeRequest({ url: 'https://example.com/styles.css', mimeType: 'text/css', responseHeaders: { 'cache-control': 'no-store' } }),
      ];
      const findings = await detector.finalize(requests);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings.some((f) => f.type === 'no_cache_headers')).toBe(true);
    });
  });

  describe('CompressionDetector', () => {
    it('flags large text responses without compression', async () => {
      const detector = new CompressionDetector();
      const requests: NetworkRequest[] = [
        makeRequest({ url: 'https://example.com/api/data', mimeType: 'application/json', bytesTransferred: 50_000, responseHeaders: {} }),
        makeRequest({ url: 'https://example.com/data.json', mimeType: 'application/json', bytesTransferred: 50_000, responseHeaders: { 'content-encoding': 'gzip' } }),
      ];
      const findings = await detector.finalize(requests);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings.some((f) => f.type === 'no_compression')).toBe(true);
    });
  });

  describe('HttpVersionDetector', () => {
    it('flags HTTP/1.1 requests', async () => {
      const detector = new HttpVersionDetector();
      const requests: NetworkRequest[] = Array.from({ length: 7 }, (_, i) =>
        makeRequest({ protocol: 'http/1.1', url: `https://example.com/api/data-${i}`, id: `req-${i}` }),
      );
      const findings = await detector.finalize(requests);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings.some((f) => f.type === 'http_version')).toBe(true);
    });
  });

  describe('DuplicateFetchDetector', () => {
    it('flags identical GET requests', async () => {
      const detector = new DuplicateFetchDetector();
      const requests: NetworkRequest[] = [
        makeRequest({ url: 'https://example.com/api/users', id: 'req-1' }),
        makeRequest({ url: 'https://example.com/api/users', id: 'req-2' }),
      ];
      const findings = await detector.finalize(requests);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings.some((f) => f.type === 'duplicate_fetch')).toBe(true);
    });
  });

  describe('NPlusOneDetector', () => {
    it('flags sequential similar API calls', async () => {
      const detector = new NPlusOneDetector();
      const parentEnd = 1050;
      const requests: NetworkRequest[] = [
        makeRequest({ url: 'https://example.com/api/parent', id: 'req-p', timing: { startTime: 1000, duration: 50, dns: 5, connect: 10, ssl: 5, send: 2, wait: 20, receive: 8 } }),
        makeRequest({ url: 'https://example.com/api/child/abc12345', id: 'req-c1', timestamp: parentEnd + 10, timing: { startTime: parentEnd + 10, duration: 30, dns: 2, connect: 5, ssl: 2, send: 1, wait: 15, receive: 5 } }),
        makeRequest({ url: 'https://example.com/api/child/def67890', id: 'req-c2', timestamp: parentEnd + 50, timing: { startTime: parentEnd + 50, duration: 30, dns: 2, connect: 5, ssl: 2, send: 1, wait: 15, receive: 5 } }),
        makeRequest({ url: 'https://example.com/api/child/11112222', id: 'req-c3', timestamp: parentEnd + 100, timing: { startTime: parentEnd + 100, duration: 30, dns: 2, connect: 5, ssl: 2, send: 1, wait: 15, receive: 5 } }),
        makeRequest({ url: 'https://example.com/api/child/33334444', id: 'req-c4', timestamp: parentEnd + 150, timing: { startTime: parentEnd + 150, duration: 30, dns: 2, connect: 5, ssl: 2, send: 1, wait: 15, receive: 5 } }),
        makeRequest({ url: 'https://example.com/api/child/55556666', id: 'req-c5', timestamp: parentEnd + 200, timing: { startTime: parentEnd + 200, duration: 30, dns: 2, connect: 5, ssl: 2, send: 1, wait: 15, receive: 5 } }),
      ];
      const findings = await detector.finalize(requests);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings.some((f) => f.type === 'n_plus_one')).toBe(true);
    });
  });

  describe('WaterfallDetector', () => {
    it('flags sequential resource chains', async () => {
      const detector = new WaterfallDetector();
      // Each request starts exactly when the previous one ends
      // This satisfies both graph building (parent end >= child start) and waterfall (child start >= parent end)
      const requests: NetworkRequest[] = [
        makeRequest({ url: 'https://example.com/a', id: 'req-a', timing: { startTime: 1000, duration: 50, dns: 5, connect: 10, ssl: 5, send: 2, wait: 20, receive: 8 } }),
        makeRequest({ url: 'https://example.com/b', id: 'req-b', timing: { startTime: 1050, duration: 50, dns: 5, connect: 10, ssl: 5, send: 2, wait: 20, receive: 8 } }),
        makeRequest({ url: 'https://example.com/c', id: 'req-c', timing: { startTime: 1100, duration: 50, dns: 5, connect: 10, ssl: 5, send: 2, wait: 20, receive: 8 } }),
        makeRequest({ url: 'https://example.com/d', id: 'req-d', timing: { startTime: 1150, duration: 50, dns: 5, connect: 10, ssl: 5, send: 2, wait: 20, receive: 8 } }),
      ];
      const findings = await detector.finalize(requests);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings.some((f) => f.type === 'waterfall')).toBe(true);
    });
  });

  describe('UnderPaginateDetector', () => {
    it('flags responses exceeding 1MB', async () => {
      const detector = new UnderPaginateDetector();
      const requests: NetworkRequest[] = [
        makeRequest({ url: 'https://example.com/api/items', bytesTransferred: 1_500_000 }),
      ];
      const findings = await detector.finalize(requests);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings.some((f) => f.type === 'under_paginate')).toBe(true);
    });
  });

  describe('OriginCountDetector', () => {
    it('flags excessive unique origins', async () => {
      const detector = new OriginCountDetector();
      const requests: NetworkRequest[] = Array.from({ length: 12 }, (_, i) =>
        makeRequest({ url: `https://cdn-${i}.example.com/script.js`, id: `req-${i}` }),
      );
      const findings = await detector.finalize(requests);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings.some((f) => f.type === 'excessive_origins')).toBe(true);
    });
  });
});
