import type { NormalizedUrl } from '../types.js';

const CACHE_BUST_PARAMS = new Set(['_t', '_', 'v', 'cb', 'noCache', 'nocache', 't', 'timestamp']);

export class UrlNormalizer {
  static normalize(url: string): NormalizedUrl {
    try {
      const parsed = new URL(url);
      const origin = parsed.origin;
      const pathRaw = parsed.pathname;
      const pathPattern = pathRaw.replace(/\/[a-f0-9]{8,}(\b|\/)/g, '/{id}$1').replace(/\/\d+(\b|\/)/g, '/{id}$1');

      const queryParams = new URLSearchParams(parsed.search);
      const sortedEntries = Array.from(queryParams.entries())
        .filter(([key]) => !CACHE_BUST_PARAMS.has(key.toLowerCase()))
        .sort(([a], [b]) => a.localeCompare(b));
      const sortedQuery = new URLSearchParams(sortedEntries).toString();

      const resourceKey = `${origin}${pathPattern}?${sortedQuery}`;
      return { origin, pathPattern, pathRaw, sortedQuery, resourceKey };
    } catch {
      return { origin: '', pathPattern: url, pathRaw: url, sortedQuery: '', resourceKey: url };
    }
  }

  static matchPattern(url: string, pattern: string): boolean {
    const a = this.normalize(url);
    const b = this.normalize(pattern);
    return a.origin === b.origin && a.pathPattern === b.pathPattern;
  }
}
