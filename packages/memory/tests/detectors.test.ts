import { describe, it, expect, vi } from 'vitest';
import { LeakedIntervalDetector } from '../src/detectors/leaked-interval.js';
import { LeakedListenerDetector } from '../src/detectors/leaked-listener.js';
import { UnboundedStateDetector } from '../src/detectors/unbounded-state.js';
import type { DetectorContext } from '../src/types.js';

function makeMockCtx(evaluateReturnValue: unknown): DetectorContext {
  return {
    url: 'https://example.com',
    page: {
      evaluate: vi.fn().mockResolvedValue(evaluateReturnValue),
    },
  } as unknown as DetectorContext;
}

describe('LeakedIntervalDetector', () => {
  it('produces a leaked_interval finding when active > 3', async () => {
    const ctx = makeMockCtx({
      active: 5,
      intervals: [
        { id: 1, created: 0, delay: 1000, stack: 'at useEffect' },
        { id: 2, created: 0, delay: 500, stack: 'at useEffect' },
        { id: 3, created: 0, delay: 200, stack: '' },
        { id: 4, created: 0, delay: 100, stack: '' },
        { id: 5, created: 0, delay: 50, stack: '' },
      ],
    });

    const detector = new LeakedIntervalDetector(ctx);
    const findings = await detector.finalize();

    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe('leaked_interval');
    expect(findings[0].category).toBe('direct_impact');
    expect(findings[0].confidence).toBe('medium');
    expect(findings[0].metrics.activeTimers).toBe(5);
  });

  it('produces no finding when active <= 3', async () => {
    const ctx = makeMockCtx({ active: 2, intervals: [] });
    const detector = new LeakedIntervalDetector(ctx);
    const findings = await detector.finalize();
    expect(findings).toHaveLength(0);
  });
});

describe('LeakedListenerDetector', () => {
  it('produces a leaked_listener finding when net listeners > 50', async () => {
    const ctx = makeMockCtx({
      total: 60,
      addCount: 80,
      removeCount: 20,
      byType: { click: 60, scroll: 15, keydown: 5 },
    });

    const detector = new LeakedListenerDetector(ctx);
    const findings = await detector.finalize();

    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe('leaked_listener');
    expect(findings[0].category).toBe('direct_impact');
    expect(findings[0].confidence).toBe('medium');
    expect(findings[0].metrics.netListeners).toBe(60);
    expect(findings[0].metrics.addCount).toBe(80);
    expect(findings[0].metrics.removeCount).toBe(20);
  });

  it('produces no finding when net listeners <= 50', async () => {
    const ctx = makeMockCtx({ total: 10, addCount: 20, removeCount: 10, byType: { click: 20 } });
    const detector = new LeakedListenerDetector(ctx);
    const findings = await detector.finalize();
    expect(findings).toHaveLength(0);
  });
});

describe('UnboundedStateDetector', () => {
  it('produces an unbounded_state finding when store size > 200', async () => {
    const ctx = makeMockCtx({
      samples: [{ storeName: 'activityLog', size: 500, timestamp: 0 }],
    });

    const detector = new UnboundedStateDetector(ctx);
    const findings = await detector.finalize();

    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe('unbounded_state');
    expect(findings[0].category).toBe('direct_impact');
    expect(findings[0].confidence).toBe('low');
    expect(findings[0].metrics.entryCount).toBe(500);
    expect(findings[0].metrics.storeName).toBe('activityLog');
  });

  it('produces no finding when store size <= 200', async () => {
    const ctx = makeMockCtx({ samples: [{ storeName: 'cart', size: 5, timestamp: 0 }] });
    const detector = new UnboundedStateDetector(ctx);
    const findings = await detector.finalize();
    expect(findings).toHaveLength(0);
  });
});
