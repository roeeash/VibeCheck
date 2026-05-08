import { describe, it, expect } from 'vitest';
import type { Finding } from '@vibecheck/core';
import { correlateFindings } from '../src/correlation-engine.js';
import { computeVibeScore } from '../src/vibe-score.js';

function makeFinding(overrides?: Partial<Finding>): Finding {
  const defaults: Finding = {
    id: `finding_${Math.random().toString(36).slice(2, 9)}`,
    module: 'observer',
    type: 'long_task',
    category: 'direct_impact',
    severity: 'high',
    confidence: 'high',
    title: 'Test finding',
    description: 'A test finding for unit tests',
    observedIn: 'test-component',
    evidence: [],
    metrics: {},
    recommendation: 'Fix this test finding',
    scoreImpact: 8,
  };

  return { ...defaults, ...overrides };
}

describe('correlateFindings', () => {
  it('returns empty result for no findings', () => {
    const result = correlateFindings([]);
    expect(result.rootCauses).toEqual([]);
    expect(result.standalone).toEqual([]);
    expect(result.contributingMap.size).toBe(0);
  });

  it('puts two unrelated findings into standalone', () => {
    const f1 = makeFinding({ id: 'f1', type: 'long_task' });
    const f2 = makeFinding({ id: 'f2', type: 'bad_cls' });

    const result = correlateFindings([f1, f2]);

    expect(result.rootCauses).toEqual([]);
    expect(result.standalone).toHaveLength(2);
    expect(result.standalone.map((f) => f.id).sort()).toEqual(['f1', 'f2']);
    expect(result.contributingMap.size).toBe(0);
  });

  it('correlates unvirtualized_list with bad_inp to list-virtualization root cause', () => {
    const unvirt = makeFinding({
      id: 'unvirt_1',
      module: 'render',
      type: 'unvirtualized_list',
      severity: 'high',
      confidence: 'high',
      scoreImpact: 8,
    });
    const badInp = makeFinding({
      id: 'inp_1',
      type: 'bad_inp',
      severity: 'high',
      confidence: 'high',
      scoreImpact: 8,
    });

    const result = correlateFindings([unvirt, badInp]);

    expect(result.rootCauses).toHaveLength(1);
    expect(result.rootCauses[0].type).toBe('unvirtualized_list');
    expect(result.rootCauses[0].severity).toBe('critical');
    expect(result.rootCauses[0].contributingFindings).toContain('unvirt_1');
    expect(result.standalone).toHaveLength(1);
    expect(result.standalone[0].id).toBe('inp_1');
    expect(result.contributingMap.has('unvirt_1')).toBe(true);
    expect(result.contributingMap.has('inp_1')).toBe(false);
  });

  it('correlates leaked_interval and leaked_listener to timer-leak root cause', () => {
    const interval = makeFinding({
      id: 'interval_1',
      module: 'memory',
      type: 'leaked_interval',
      severity: 'high',
      confidence: 'high',
      scoreImpact: 8,
    });
    const listener = makeFinding({
      id: 'listener_1',
      module: 'memory',
      type: 'leaked_listener',
      severity: 'high',
      confidence: 'medium',
      scoreImpact: 6,
    });

    const result = correlateFindings([interval, listener]);

    expect(result.rootCauses).toHaveLength(1);
    expect(result.rootCauses[0].type).toBe('leaked_interval');
    expect(result.rootCauses[0].consolidationConfidence).toBe('medium');
    expect(result.rootCauses[0].contributingFindings).toEqual(['interval_1', 'listener_1']);
    expect(result.standalone).toEqual([]);
  });

  it('correlates heavy_third_party and long_task to third-party-blocker root cause', () => {
    const heavy = makeFinding({
      id: 'third_1',
      module: 'asset-inspector',
      type: 'heavy_third_party',
      severity: 'high',
      confidence: 'high',
      scoreImpact: 8,
    });
    const task = makeFinding({
      id: 'task_1',
      type: 'long_task',
      severity: 'high',
      confidence: 'high',
      scoreImpact: 6,
    });

    const result = correlateFindings([heavy, task]);

    expect(result.rootCauses).toHaveLength(1);
    expect(result.rootCauses[0].type).toBe('heavy_third_party');
    expect(result.rootCauses[0].contributingFindings).toContain('third_1');
    expect(result.rootCauses[0].contributingFindings).toContain('task_1');
    expect(result.standalone).toEqual([]);
  });

  it('correlates two waterfall findings to waterfall-parallel root cause', () => {
    const w1 = makeFinding({
      id: 'waterfall_1',
      module: 'proxy',
      type: 'waterfall',
      severity: 'high',
      confidence: 'high',
      scoreImpact: 6,
    });
    const w2 = makeFinding({
      id: 'waterfall_2',
      module: 'proxy',
      type: 'waterfall',
      severity: 'high',
      confidence: 'high',
      scoreImpact: 6,
    });

    const result = correlateFindings([w1, w2]);

    expect(result.rootCauses).toHaveLength(1);
    expect(result.rootCauses[0].type).toBe('waterfall');
    expect(result.rootCauses[0].contributingFindings).toEqual(['waterfall_1', 'waterfall_2']);
    expect(result.standalone).toEqual([]);
  });

  it('handles mixed: one rule match + two unrelated findings', () => {
    const unvirt = makeFinding({
      id: 'unvirt_1',
      module: 'render',
      type: 'unvirtualized_list',
      severity: 'high',
      confidence: 'high',
      scoreImpact: 8,
    });
    const unrelated1 = makeFinding({
      id: 'unrelated_1',
      type: 'bad_cls',
      severity: 'medium',
      confidence: 'high',
      scoreImpact: 4,
    });
    const unrelated2 = makeFinding({
      id: 'unrelated_2',
      type: 'high_tbt',
      severity: 'medium',
      confidence: 'high',
      scoreImpact: 4,
    });

    const result = correlateFindings([unvirt, unrelated1, unrelated2]);

    expect(result.rootCauses).toHaveLength(1);
    expect(result.rootCauses[0].contributingFindings).toContain('unvirt_1');
    expect(result.standalone).toHaveLength(2);
    expect(result.standalone.map((f) => f.id).sort()).toEqual(['unrelated_1', 'unrelated_2']);
  });

  it('sorts root causes by scoreImpact descending', () => {
    const w1 = makeFinding({
      id: 'waterfall_1',
      module: 'proxy',
      type: 'waterfall',
      scoreImpact: 5,
    });
    const w2 = makeFinding({
      id: 'waterfall_2',
      module: 'proxy',
      type: 'waterfall',
      scoreImpact: 10,
    });
    const interval = makeFinding({
      id: 'interval_1',
      module: 'memory',
      type: 'leaked_interval',
      scoreImpact: 10,
      observedIn: 'hook-cleanup',
    });
    const listener = makeFinding({
      id: 'listener_1',
      module: 'memory',
      type: 'leaked_listener',
      scoreImpact: 6,
      observedIn: 'hook-cleanup',
    });

    const result = correlateFindings([w1, w2, interval, listener]);

    expect(result.rootCauses).toHaveLength(2);
    expect(result.rootCauses[0].scoreImpact).toBeGreaterThanOrEqual(result.rootCauses[1].scoreImpact);
  });

  it('sorts standalone findings by severity then scoreImpact', () => {
    const low = makeFinding({
      id: 'low_1',
      type: 'bad_cls',
      severity: 'low',
      scoreImpact: 10,
    });
    const critical = makeFinding({
      id: 'crit_1',
      type: 'bad_lcp',
      severity: 'critical',
      scoreImpact: 5,
    });
    const medium = makeFinding({
      id: 'med_1',
      type: 'high_tbt',
      severity: 'medium',
      scoreImpact: 8,
    });

    const result = correlateFindings([low, critical, medium]);

    expect(result.standalone).toHaveLength(3);
    expect(result.standalone[0].severity).toBe('critical');
    expect(result.standalone[1].severity).toBe('medium');
    expect(result.standalone[2].severity).toBe('low');
  });
});

describe('computeVibeScore', () => {
  it('returns score 100 and grade A for no findings', () => {
    const correlated = {
      rootCauses: [],
      standalone: [],
      contributingMap: new Map(),
    };

    const result = computeVibeScore(correlated);

    expect(result.value).toBe(100);
    expect(result.grade).toBe('A');
    expect(result.summary).toContain('0 root causes');
    expect(result.summary).toContain('0 standalone findings');
    expect(result.moduleBreakdown).toEqual({});
  });

  it('calculates score correctly with module capping: single observer finding', () => {
    const finding = makeFinding({
      id: 'f1',
      type: 'long_task',
      severity: 'high',
      confidence: 'high',
      scoreImpact: 10,
    });

    const correlated = {
      rootCauses: [],
      standalone: [finding],
      contributingMap: new Map(),
    };

    const result = computeVibeScore(correlated);
    // penalty = 10 * 0.7 (high severity) * 1.0 (high confidence) = 7
    // module: observer, weight=25, penalty=7, capped=7
    // totalWeight = 112 (sum of all 6 modules), totalPenalty = 7
    // score = (112 - 7) / 112 * 100 ≈ 94
    expect(result.value).toBe(94);
    expect(result.grade).toBe('A');
    expect(result.moduleBreakdown.observer).toEqual({ weight: 25, penalty: 7, score: 18 });
  });

  it('caps penalty at module weight: many observer findings', () => {
    const findings = Array.from({ length: 20 }, (_, i) =>
      makeFinding({
        id: `f${i}`,
        type: 'long_task',
        severity: 'high',
        confidence: 'high',
        scoreImpact: 10,
      }),
    );

    const correlated = {
      rootCauses: [],
      standalone: findings,
      contributingMap: new Map(),
    };

    const result = computeVibeScore(correlated);
    // raw penalty = 20 * (10 * 0.7 * 1.0) = 140
    // observer weight = 25, capped at 25
    // totalWeight = 112, totalPenalty = 25
    // score = (112 - 25) / 112 * 100 ≈ 78
    expect(result.value).toBe(78);
    expect(result.grade).toBe('B');
    expect(result.moduleBreakdown.observer.penalty).toBeGreaterThanOrEqual(25);
    expect(result.moduleBreakdown.observer.score).toBe(0);
  });

  it('produces grade F when all modules are fully penalized', () => {
    const findings = [
      ...Array.from({ length: 15 }, (_, i) => makeFinding({ id: `obs-${i}`, type: 'long_task', severity: 'critical', scoreImpact: 10 })),
      ...Array.from({ length: 10 }, (_, i) => makeFinding({ id: `proxy-${i}`, module: 'proxy', type: 'waterfall', severity: 'critical', scoreImpact: 10 })),
      ...Array.from({ length: 15 }, (_, i) => makeFinding({ id: `asset-${i}`, module: 'asset-inspector', type: 'oversized_image', severity: 'critical', scoreImpact: 10 })),
      ...Array.from({ length: 10 }, (_, i) => makeFinding({ id: `render-${i}`, module: 'render', type: 'unvirtualized_list', severity: 'critical', scoreImpact: 10 })),
      ...Array.from({ length: 10 }, (_, i) => makeFinding({ id: `mem-${i}`, module: 'memory', type: 'leaked_interval', severity: 'critical', scoreImpact: 10 })),
    ];

    const correlated = {
      rootCauses: [],
      standalone: findings,
      contributingMap: new Map(),
    };

    const result = computeVibeScore(correlated);
    // Each module fully penalized: 25+18+22+17+12 = 94 capped
    // totalWeight = 112, totalPenalty = 94
    // score = (112 - 94) / 112 * 100 ≈ 16 (grade F)
    expect(result.value).toBe(16);
    expect(result.grade).toBe('F');
  });

  it('includes moduleBreakdown for each module with findings', () => {
    const findings = [
      makeFinding({ id: 'f1', type: 'long_task', severity: 'high', confidence: 'high', scoreImpact: 10 }),
      makeFinding({ id: 'f2', module: 'proxy', type: 'waterfall', severity: 'high', confidence: 'high', scoreImpact: 8 }),
      makeFinding({ id: 'f3', module: 'render', type: 'unvirtualized_list', severity: 'medium', confidence: 'high', scoreImpact: 6 }),
    ];

    const correlated = {
      rootCauses: [],
      standalone: findings,
      contributingMap: new Map(),
    };

    const result = computeVibeScore(correlated);

    expect(result.moduleBreakdown.observer).toBeDefined();
    expect(result.moduleBreakdown.proxy).toBeDefined();
    expect(result.moduleBreakdown.render).toBeDefined();
    expect(result.moduleBreakdown.observer.weight).toBe(25);
    expect(result.moduleBreakdown.proxy.weight).toBe(18);
    expect(result.moduleBreakdown.render.weight).toBe(17);
  });

  it('produces grade B for single critical finding', () => {
    const finding = makeFinding({
      id: 'f1',
      type: 'bad_lcp',
      severity: 'critical',
      confidence: 'high',
      scoreImpact: 12,
    });

    const correlated = {
      rootCauses: [{ ...finding, isRootCause: true, contributingFindings: [], consolidationConfidence: 'high' as const }],
      standalone: [],
      contributingMap: new Map(),
    };

    const result = computeVibeScore(correlated);
    // penalty = 12 * 1.0 * 1.0 = 12, observer weight=25, capped=12
    // totalWeight = 112, totalPenalty = 12
    // score = (112 - 12) / 112 * 100 ≈ 89
    expect(result.value).toBe(89);
    expect(result.grade).toBe('B');
  });

  it('produces grade A for single high severity finding', () => {
    const finding = makeFinding({
      id: 'f1',
      type: 'long_task',
      severity: 'high',
      confidence: 'high',
      scoreImpact: 12,
    });

    const correlated = {
      rootCauses: [],
      standalone: [finding],
      contributingMap: new Map(),
    };

    const result = computeVibeScore(correlated);
    // penalty = 12 * 0.7 * 1.0 = 8.4, observer weight=25, capped=8.4
    // totalWeight = 112, totalPenalty = 8.4
    // score = (112 - 8.4) / 112 * 100 ≈ 93
    expect(result.value).toBe(93);
    expect(result.grade).toBe('A');
  });

  it('includes breakdown of penalties by type', () => {
    const findings = [
      makeFinding({
        id: 'f1',
        type: 'bad_lcp',
        severity: 'high',
        confidence: 'high',
        scoreImpact: 10,
      }),
      makeFinding({
        id: 'f2',
        type: 'long_task',
        severity: 'high',
        confidence: 'medium',
        scoreImpact: 8,
      }),
    ];

    const correlated = {
      rootCauses: [],
      standalone: findings,
      contributingMap: new Map(),
    };

    const result = computeVibeScore(correlated);

    expect(result.breakdown).toBeDefined();
    expect(result.breakdown['observer:bad_lcp']).toBe(7);
    expect(result.breakdown['observer:long_task']).toBeCloseTo(3.92, 2);
  });

  it('includes summary text with finding counts', () => {
    const f1 = makeFinding({
      id: 'f1',
      type: 'bad_lcp',
      severity: 'high',
      confidence: 'high',
      scoreImpact: 5,
    });
    const f2 = makeFinding({
      id: 'f2',
      type: 'long_task',
      severity: 'high',
      confidence: 'high',
      scoreImpact: 3,
    });

    const correlated = {
      rootCauses: [{ ...f1, isRootCause: true, contributingFindings: [], consolidationConfidence: 'high' as const }],
      standalone: [f2],
      contributingMap: new Map([['f1', 'root_1']]),
    };

    const result = computeVibeScore(correlated);

    expect(result.summary).toContain('1 root cause');
    expect(result.summary).toContain('1 standalone finding');
    expect(result.summary).toContain('Score:');
  });

  it('handles mixed root causes and standalone findings with module capping', () => {
    const rootCauseFinding = makeFinding({
      id: 'f1',
      module: 'render',
      type: 'unvirtualized_list',
      severity: 'critical',
      confidence: 'high',
      scoreImpact: 12,
    });
    const standaloneFinding = makeFinding({
      id: 'f2',
      type: 'bad_cls',
      severity: 'medium',
      confidence: 'high',
      scoreImpact: 8,
    });

    const correlated = {
      rootCauses: [
        {
          ...rootCauseFinding,
          isRootCause: true,
          contributingFindings: [],
          consolidationConfidence: 'high',
        },
      ],
      standalone: [standaloneFinding],
      contributingMap: new Map(),
    };

    const result = computeVibeScore(correlated);
    // render penalty = 12 * 1.0 * 1.0 = 12, weight=17, capped=12
    // observer penalty = 8 * 0.4 * 1.0 = 3.2, weight=25, capped=3.2
    // total = 12 + 3.2 = 15.2
    // totalWeight = 112, totalPenalty = 15.2
    // score = (112 - 15.2) / 112 * 100 ≈ 86
    expect(result.value).toBe(86);
    expect(result.grade).toBe('B');
  });

  it('handles low confidence findings with reduced impact', () => {
    const finding = makeFinding({
      id: 'f1',
      type: 'long_task',
      severity: 'high',
      confidence: 'low',
      scoreImpact: 10,
    });

    const correlated = {
      rootCauses: [],
      standalone: [finding],
      contributingMap: new Map(),
    };

    const result = computeVibeScore(correlated);
    // penalty = 10 * 0.7 (high) * 0.4 (low confidence) = 2.8
    // totalWeight = 112, totalPenalty = 2.8
    // score = (112 - 2.8) / 112 * 100 ≈ 98
    expect(result.value).toBe(98);
    expect(result.grade).toBe('A');
  });
});
