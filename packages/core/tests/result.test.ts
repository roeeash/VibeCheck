import { describe, it, expect } from 'vitest';
import { ok, err, mapResult, andThen, unwrapOr, tryCatch } from '../src/result.js';

describe('Result', () => {
  describe('ok/err', () => {
    it('ok returns success result', () => {
      const r = ok(42);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(42);
    });

    it('err returns failure result', () => {
      const r = err('boom');
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toBe('boom');
    });
  });

  describe('mapResult', () => {
    it('maps ok value', () => {
      const r = mapResult(ok(5), (n) => n * 2);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(10);
    });

    it('passes through err', () => {
      const r = mapResult(err<string, string>('fail'), (n) => n.toUpperCase());
      expect(r.ok).toBe(false);
    });
  });

  describe('andThen', () => {
    it('chains ok results', () => {
      const r = andThen(ok(5), (n) => ok(n * 2));
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(10);
    });

    it('short-circuits on err', () => {
      const r = andThen(err<string, string>('fail'), (n) => ok(n.toUpperCase()));
      expect(r.ok).toBe(false);
    });
  });

  describe('unwrapOr', () => {
    it('returns value for ok', () => {
      expect(unwrapOr(ok(42), 0)).toBe(42);
    });

    it('returns default for err', () => {
      expect(unwrapOr(err<string, string>('fail'), 'default')).toBe('default');
    });
  });

  describe('tryCatch', () => {
    it('captures success', () => {
      const r = tryCatch(() => 42, () => 'error');
      expect(r.ok).toBe(true);
    });

    it('captures error', () => {
      const r = tryCatch(() => { throw new Error('boom'); }, (e) => (e as Error).message);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toBe('boom');
    });
  });
});
