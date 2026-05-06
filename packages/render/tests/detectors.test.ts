import { describe, it, expect, vi } from 'vitest';
import { VirtualizationGapDetector } from '../src/detectors/virtualization-gap.js';
import { MemoizationGapDetector } from '../src/detectors/memoization-gap.js';
import { RerenderStormDetector } from '../src/detectors/rerender-storm.js';
import type { AuditContext } from '@vibecheck/core';

function makeCtx(evaluateFn: (fn: () => unknown) => Promise<unknown>): AuditContext {
  return {
    page: {
      evaluate: evaluateFn,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any as AuditContext;
}

describe('VirtualizationGapDetector', () => {
  it('emits unvirtualized_list finding when containers exceed 100 children and no virtualization lib found', async () => {
    const evaluate = vi.fn()
      .mockResolvedValueOnce([{ selector: '#list', childCount: 500, isScrollable: true }])
      .mockResolvedValueOnce(false); // no virtualization lib

    const ctx = makeCtx(evaluate);
    const detector = new VirtualizationGapDetector(ctx);
    const findings = await detector.finalize();

    expect(findings).toHaveLength(1);
    expect(findings[0]!.type).toBe('unvirtualized_list');
    expect(findings[0]!.metrics['childCount']).toBe(500);
  });
});

describe('MemoizationGapDetector', () => {
  it('emits memoization_gap finding when a component re-renders more than 10 times', async () => {
    const events = Array.from({ length: 50 }, (_, i) => ({
      componentName: 'HotComponent',
      reason: 'parent-render',
      timestamp: i * 100,
    }));

    const evaluate = vi.fn().mockResolvedValueOnce(events);
    const ctx = makeCtx(evaluate);
    const detector = new MemoizationGapDetector(ctx);
    const findings = await detector.finalize();

    expect(findings).toHaveLength(1);
    expect(findings[0]!.type).toBe('memoization_gap');
    expect(findings[0]!.metrics['worstComponent']).toBe('HotComponent');
    expect(findings[0]!.metrics['worstCount']).toBe(50);
  });
});

describe('RerenderStormDetector', () => {
  it('emits render_storm finding when 60 events occur within a 500ms window', async () => {
    // 60 events all within 400ms
    const events = Array.from({ length: 60 }, (_, i) => ({
      componentName: `Child${i % 10}`,
      reason: 'parent-render',
      timestamp: 1000 + i * 5, // spread over 300ms
    }));

    const evaluate = vi.fn().mockResolvedValueOnce(events);
    const ctx = makeCtx(evaluate);
    const detector = new RerenderStormDetector(ctx);
    const findings = await detector.finalize();

    expect(findings).toHaveLength(1);
    expect(findings[0]!.type).toBe('render_storm');
    expect(findings[0]!.metrics['burstCount']).toBeGreaterThanOrEqual(50);
  });
});
