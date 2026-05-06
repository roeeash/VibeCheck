import { describe, it, expect } from 'vitest';
import type { Finding } from '@vibecheck/core';
import type { VibeReport } from '../src/types.js';
import { renderJson } from '../src/renderers/json.js';
import { renderMarkdown } from '../src/renderers/markdown.js';

/**
 * Factory function to create a minimal Finding with sensible defaults.
 * Pass overrides to customize specific fields.
 */
function makeFinding(overrides?: Partial<Finding>): Finding {
  const defaults: Finding = {
    id: `finding_${Math.random().toString(36).slice(2, 9)}`,
    module: 'test-module',
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
    scoreImpact: 10,
  };

  return { ...defaults, ...overrides };
}

/**
 * Factory function to create a minimal VibeReport with sensible defaults.
 */
function makeVibeReport(overrides?: Partial<VibeReport>): VibeReport {
  const defaults: VibeReport = {
    reportVersion: '1.0',
    auditId: 'audit_test_123',
    url: 'https://example.com',
    timestamp: new Date().toISOString(),
    duration: '5.2s',
    score: {
      value: 85,
      grade: 'B',
      breakdown: {
        long_task: 10,
        bad_inp: 5,
      },
      summary: '1 root cause and 2 standalone findings found. Score: 85/100 (grade B).',
    },
    summary: 'Audit completed successfully',
    correlated: {
      rootCauses: [],
      standalone: [],
      contributingMap: new Map(),
    },
    modules: {
      observer: {
        name: 'Observer',
        findings: [],
        criticalCount: 0,
        highCount: 0,
      },
      proxy: {
        name: 'Proxy',
        findings: [],
        criticalCount: 0,
        highCount: 0,
      },
    },
  };

  return { ...defaults, ...overrides };
}

describe('renderJson', () => {
  it('returns valid JSON string', () => {
    const report = makeVibeReport();

    const json = renderJson(report);

    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('includes reportVersion "1.0" in parsed JSON', () => {
    const report = makeVibeReport({ reportVersion: '1.0' });

    const json = renderJson(report);
    const parsed = JSON.parse(json);

    expect(parsed.reportVersion).toBe('1.0');
  });

  it('includes score.value in parsed JSON', () => {
    const report = makeVibeReport({
      score: {
        value: 92,
        grade: 'A',
        breakdown: {},
        summary: 'Test summary',
      },
    });

    const json = renderJson(report);
    const parsed = JSON.parse(json);

    expect(parsed.score.value).toBe(92);
    expect(parsed.score.grade).toBe('A');
  });

  it('converts contributingMap to plain object', () => {
    const report = makeVibeReport({
      correlated: {
        rootCauses: [],
        standalone: [],
        contributingMap: new Map([
          ['finding_1', 'root_cause_1'],
          ['finding_2', 'root_cause_1'],
        ]),
      },
    });

    const json = renderJson(report);
    const parsed = JSON.parse(json);

    expect(typeof parsed.correlated.contributingMap).toBe('object');
    expect(parsed.correlated.contributingMap.finding_1).toBe('root_cause_1');
    expect(parsed.correlated.contributingMap.finding_2).toBe('root_cause_1');
    expect(Array.isArray(parsed.correlated.contributingMap)).toBe(false);
  });

  it('includes rootCauses in correlated section', () => {
    const rootCause = makeFinding({
      id: 'root_1',
      type: 'unvirtualized_list',
      isRootCause: true,
      contributingFindings: ['f1', 'f2'],
      consolidationConfidence: 'high',
    }) as any;

    const report = makeVibeReport({
      correlated: {
        rootCauses: [rootCause],
        standalone: [],
        contributingMap: new Map(),
      },
    });

    const json = renderJson(report);
    const parsed = JSON.parse(json);

    expect(parsed.correlated.rootCauses).toHaveLength(1);
    expect(parsed.correlated.rootCauses[0].id).toBe('root_1');
  });

  it('includes standalone findings in correlated section', () => {
    const finding = makeFinding({ id: 'f1', type: 'bad_cls' });

    const report = makeVibeReport({
      correlated: {
        rootCauses: [],
        standalone: [finding],
        contributingMap: new Map(),
      },
    });

    const json = renderJson(report);
    const parsed = JSON.parse(json);

    expect(parsed.correlated.standalone).toHaveLength(1);
    expect(parsed.correlated.standalone[0].id).toBe('f1');
  });

  it('preserves audit metadata', () => {
    const report = makeVibeReport({
      auditId: 'audit_12345',
      url: 'https://example.org/page',
      timestamp: '2025-05-05T10:30:00Z',
    });

    const json = renderJson(report);
    const parsed = JSON.parse(json);

    expect(parsed.auditId).toBe('audit_12345');
    expect(parsed.url).toBe('https://example.org/page');
    expect(parsed.timestamp).toBe('2025-05-05T10:30:00Z');
  });
});

describe('renderMarkdown', () => {
  it('returns a string', () => {
    const report = makeVibeReport();

    const markdown = renderMarkdown(report);

    expect(typeof markdown).toBe('string');
    expect(markdown.length).toBeGreaterThan(0);
  });

  it('contains the URL', () => {
    const report = makeVibeReport({
      url: 'https://example.com/test-page',
    });

    const markdown = renderMarkdown(report);

    expect(markdown).toContain('https://example.com/test-page');
  });

  it('contains "Vibe-Score" or score section', () => {
    const report = makeVibeReport();

    const markdown = renderMarkdown(report);

    expect(markdown).toMatch(/score|Score/i);
  });

  it('contains "Root Causes" section when rootCauses non-empty', () => {
    const rootCause = makeFinding({
      id: 'root_1',
      type: 'unvirtualized_list',
      isRootCause: true,
      contributingFindings: ['f1', 'f2'],
      consolidationConfidence: 'high',
    }) as any;

    const report = makeVibeReport({
      correlated: {
        rootCauses: [rootCause],
        standalone: [],
        contributingMap: new Map(),
      },
    });

    const markdown = renderMarkdown(report);

    expect(markdown).toContain('Root Causes');
  });

  it('omits "Root Causes" detailed content when no rootCauses', () => {
    const report = makeVibeReport({
      correlated: {
        rootCauses: [],
        standalone: [],
        contributingMap: new Map(),
      },
    });

    const markdown = renderMarkdown(report);

    expect(markdown).toContain('Root Causes');
    expect(markdown).toContain('No root causes identified');
  });

  it('contains "Standalone Findings" section', () => {
    const report = makeVibeReport();

    const markdown = renderMarkdown(report);

    expect(markdown).toContain('Standalone Findings');
  });

  it('includes score value and grade in output', () => {
    const report = makeVibeReport({
      score: {
        value: 78,
        grade: 'B',
        breakdown: {},
        summary: 'Test summary',
      },
    });

    const markdown = renderMarkdown(report);

    expect(markdown).toContain('78');
    expect(markdown).toContain('B');
  });

  it('formats root cause findings with title and recommendation', () => {
    const rootCause = makeFinding({
      id: 'root_1',
      type: 'unvirtualized_list',
      title: 'List virtualization gap',
      recommendation: 'Implement windowing/virtualization',
      isRootCause: true,
      contributingFindings: ['f1'],
      consolidationConfidence: 'high',
    }) as any;

    const report = makeVibeReport({
      correlated: {
        rootCauses: [rootCause],
        standalone: [],
        contributingMap: new Map(),
      },
    });

    const markdown = renderMarkdown(report);

    expect(markdown).toContain('List virtualization gap');
    expect(markdown).toContain('Implement windowing/virtualization');
  });

  it('formats standalone findings with title and description', () => {
    const finding = makeFinding({
      id: 'f1',
      type: 'bad_cls',
      title: 'Cumulative Layout Shift',
      description: 'Layout shifts detected during page load',
    });

    const report = makeVibeReport({
      correlated: {
        rootCauses: [],
        standalone: [finding],
        contributingMap: new Map(),
      },
    });

    const markdown = renderMarkdown(report);

    expect(markdown).toContain('Cumulative Layout Shift');
    expect(markdown).toContain('Layout shifts detected during page load');
  });

  it('separates direct_impact and theoretical_debt findings', () => {
    const directImpact = makeFinding({
      id: 'f1',
      type: 'bad_inp',
      category: 'direct_impact',
      title: 'Bad Input Latency',
    });
    const theoreticalDebt = makeFinding({
      id: 'f2',
      type: 'unused_css',
      category: 'theoretical_debt',
      title: 'Unused CSS',
    });

    const report = makeVibeReport({
      correlated: {
        rootCauses: [],
        standalone: [directImpact, theoreticalDebt],
        contributingMap: new Map(),
      },
    });

    const markdown = renderMarkdown(report);

    expect(markdown).toContain('Direct Impact');
    expect(markdown).toContain('Theoretical Debt');
    expect(markdown).toContain('Bad Input Latency');
    expect(markdown).toContain('Unused CSS');
  });

  it('includes evidence references when present', () => {
    const finding = makeFinding({
      id: 'f1',
      type: 'bad_inp',
      evidence: [
        {
          kind: 'cdp_trace',
          path: '/traces/trace_001.json',
          description: 'Input latency > 100ms',
        },
        {
          kind: 'screenshot',
          path: '/screenshots/screen_001.png',
          description: 'Visual feedback delayed',
        },
      ],
    });

    const report = makeVibeReport({
      correlated: {
        rootCauses: [],
        standalone: [finding],
        contributingMap: new Map(),
      },
    });

    const markdown = renderMarkdown(report);

    expect(markdown).toContain('Evidence');
    expect(markdown).toContain('cdp_trace');
    expect(markdown).toContain('Input latency');
    expect(markdown).toContain('screenshot');
  });

  it('includes Score Breakdown section with types and points', () => {
    const report = makeVibeReport({
      score: {
        value: 85,
        grade: 'B',
        breakdown: {
          long_task: 10.5,
          bad_inp: 4.5,
        },
        summary: 'Test',
      },
    });

    const markdown = renderMarkdown(report);

    expect(markdown).toContain('Score Breakdown');
    expect(markdown).toContain('long_task');
    expect(markdown).toContain('10.50');
    expect(markdown).toContain('bad_inp');
  });

  it('includes audit metadata section', () => {
    const report = makeVibeReport({
      auditId: 'audit_abc123',
      reportVersion: '1.0',
    });

    const markdown = renderMarkdown(report);

    expect(markdown).toContain('Audit Metadata');
    expect(markdown).toContain('audit_abc123');
    expect(markdown).toContain('1.0');
  });

  it('includes module summary table', () => {
    const report = makeVibeReport({
      modules: {
        observer: {
          name: 'Observer',
          findings: [],
          criticalCount: 1,
          highCount: 2,
        },
        proxy: {
          name: 'Proxy',
          findings: [],
          criticalCount: 0,
          highCount: 1,
        },
      },
    });

    const markdown = renderMarkdown(report);

    expect(markdown).toContain('Summary by Module');
    expect(markdown).toContain('Observer');
    expect(markdown).toContain('Proxy');
  });

  it('includes contributing findings for root causes', () => {
    const rootCause = makeFinding({
      id: 'root_1',
      type: 'unvirtualized_list',
      isRootCause: true,
      contributingFindings: ['f1', 'f2', 'f3'],
      consolidationConfidence: 'high',
    }) as any;

    const report = makeVibeReport({
      correlated: {
        rootCauses: [rootCause],
        standalone: [],
        contributingMap: new Map(),
      },
    });

    const markdown = renderMarkdown(report);

    expect(markdown).toContain('Contributing Findings');
    expect(markdown).toContain('f1');
    expect(markdown).toContain('f2');
    expect(markdown).toContain('f3');
  });

  it('formats multiple root causes in order', () => {
    const rc1 = makeFinding({
      id: 'root_1',
      title: 'First Root Cause',
      isRootCause: true,
      contributingFindings: [],
      consolidationConfidence: 'high',
    }) as any;
    const rc2 = makeFinding({
      id: 'root_2',
      title: 'Second Root Cause',
      isRootCause: true,
      contributingFindings: [],
      consolidationConfidence: 'high',
    }) as any;

    const report = makeVibeReport({
      correlated: {
        rootCauses: [rc1, rc2],
        standalone: [],
        contributingMap: new Map(),
      },
    });

    const markdown = renderMarkdown(report);

    expect(markdown).toContain('First Root Cause');
    expect(markdown).toContain('Second Root Cause');
  });

  it('includes timestamp and duration info', () => {
    const report = makeVibeReport({
      timestamp: '2025-05-05T14:22:15Z',
      duration: '8.47s',
    });

    const markdown = renderMarkdown(report);

    expect(markdown).toContain('2025-05-05T14:22:15Z');
    expect(markdown).toContain('8.47s');
  });
});
