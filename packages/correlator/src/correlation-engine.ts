import type { Finding, FindingConfidence, FindingSeverity } from '@vibecheck/core';
import type { RootCauseFinding, CorrelatedFindings } from './types.js';

interface MatchInfo {
  matchedFindings: Finding[];
}

interface CorrelationRule {
  id: string;
  match(findings: Finding[]): MatchInfo | null;
  synthesize(match: MatchInfo, allFindings: Finding[]): RootCauseFinding;
}

function getLowestConfidence(findings: Finding[]): FindingConfidence {
  const confidenceOrder: Record<FindingConfidence, number> = { high: 0, medium: 1, low: 2 };
  let lowest: FindingConfidence = 'high';
  let lowestValue = 0;
  for (const finding of findings) {
    const value = confidenceOrder[finding.confidence] ?? 0;
    if (value > lowestValue) {
      lowestValue = value;
      lowest = finding.confidence;
    }
  }
  return lowest;
}

function sumScoreImpact(findings: Finding[]): number {
  return findings.reduce((sum, f) => sum + f.scoreImpact, 0);
}

function mergeMetrics(findings: Finding[]): Record<string, number | string> {
  const merged: Record<string, number | string> = {};
  for (const finding of findings) {
    for (const [key, value] of Object.entries(finding.metrics)) {
      merged[key] = value;
    }
  }
  return merged;
}

function flattenEvidence(findings: Finding[]) {
  const evidence: typeof findings[0]['evidence'] = [];
  for (const finding of findings) {
    evidence.push(...finding.evidence);
  }
  return evidence;
}

const rules: CorrelationRule[] = [
  {
    id: 'list-virtualization',
    match(findings) {
      const unvirtualized = findings.find((f) => f.type === 'unvirtualized_list');
      if (unvirtualized) {
        return { matchedFindings: [unvirtualized] };
      }

      const excessiveDom = findings.find((f) => f.type === 'excessive_dom_size');
      const wastedMutation = findings.find((f) => f.type === 'wasted_mutation');
      if (excessiveDom && wastedMutation) {
        return { matchedFindings: [excessiveDom, wastedMutation] };
      }

      return null;
    },
    synthesize(match, allFindings) {
      const badInp = allFindings.find((f) => f.type === 'bad_inp');
      const contributing = match.matchedFindings.map((f) => f.id);
      const confidence = getLowestConfidence(match.matchedFindings);
      const severity = badInp ? 'critical' : 'high';

      return {
        id: `root_cause_list-virtualization_${match.matchedFindings[0]?.id || 'unknown'}`,
        module: 'correlator',
        type: 'unvirtualized_list',
        category: 'direct_impact',
        severity: severity as FindingSeverity,
        confidence,
        title: 'List virtualization gap — rendering full list without recycling',
        description: 'A list or scrollable container renders all items without recycling DOM nodes, causing excessive DOM size and costly mutations. This is reinforced by input latency issues.',
        observedIn: 'Scrollable list rendering',
        evidence: flattenEvidence(match.matchedFindings),
        metrics: mergeMetrics(match.matchedFindings),
        recommendation: 'Implement windowing/virtualization using libraries like react-window or react-virtualized. Render only visible items in the viewport.',
        scoreImpact: sumScoreImpact(match.matchedFindings),
        isRootCause: true,
        contributingFindings: contributing,
        consolidationConfidence: confidence,
      };
    },
  },

  {
    id: 'timer-leak',
    match(findings) {
      const leakedInterval = findings.find((f) => f.type === 'leaked_interval');
      if (!leakedInterval) return null;

      const leakedListener = findings.find((f) => f.type === 'leaked_listener');
      const heapLeak = findings.find((f) => f.type === 'heap_leak');

      if (leakedListener || heapLeak) {
        const matching = [leakedInterval];
        if (leakedListener) matching.push(leakedListener);
        if (heapLeak) matching.push(heapLeak);
        return { matchedFindings: matching };
      }

      return null;
    },
    synthesize(match) {
      const confidence = getLowestConfidence(match.matchedFindings);

      return {
        id: `root_cause_timer-leak_${match.matchedFindings[0]?.id || 'unknown'}`,
        module: 'correlator',
        type: 'leaked_interval',
        category: 'direct_impact',
        severity: 'high',
        confidence,
        title: 'Timer/listener leak — likely missing cleanup in a custom hook',
        description: 'An interval or listener is created without proper cleanup, either missing from useEffect dependency arrays or not properly unsubscribed. This causes memory growth over time.',
        observedIn: match.matchedFindings.map((f) => f.observedIn).join(', '),
        evidence: flattenEvidence(match.matchedFindings),
        metrics: mergeMetrics(match.matchedFindings),
        recommendation: 'Review useEffect cleanup functions and event listener subscriptions. Ensure all timers are cleared and listeners are removed on unmount or when dependencies change.',
        scoreImpact: sumScoreImpact(match.matchedFindings),
        isRootCause: true,
        contributingFindings: match.matchedFindings.map((f) => f.id),
        consolidationConfidence: confidence,
      };
    },
  },

  {
    id: 'waterfall-parallel',
    match(findings) {
      const waterfalls = findings.filter((f) => f.type === 'waterfall');
      if (waterfalls.length >= 2) {
        return { matchedFindings: waterfalls };
      }
      return null;
    },
    synthesize(match) {
      const confidence = getLowestConfidence(match.matchedFindings);

      return {
        id: `root_cause_waterfall-parallel_${match.matchedFindings[0]?.id || 'unknown'}`,
        module: 'correlator',
        type: 'waterfall',
        category: 'direct_impact',
        severity: 'high',
        confidence,
        title: 'Fetch waterfall — sequential requests that could parallelize',
        description: `${match.matchedFindings.length} fetch operations are executing sequentially when they could be parallelized, unnecessarily extending the critical path.`,
        observedIn: 'Network waterfall pattern',
        evidence: flattenEvidence(match.matchedFindings),
        metrics: mergeMetrics(match.matchedFindings),
        recommendation: 'Identify which requests have no dependency on each other and fire them in parallel. Use Promise.all() to initiate multiple fetches simultaneously.',
        scoreImpact: sumScoreImpact(match.matchedFindings),
        isRootCause: true,
        contributingFindings: match.matchedFindings.map((f) => f.id),
        consolidationConfidence: confidence,
      };
    },
  },

  {
    id: 'search-input-storm',
    match(findings) {
      const badInp = findings.find((f) => f.type === 'bad_inp');
      const renderStorm = findings.find((f) => f.type === 'render_storm');

      if (badInp && renderStorm) {
        return { matchedFindings: [badInp, renderStorm] };
      }
      return null;
    },
    synthesize(match) {
      const confidence = getLowestConfidence(match.matchedFindings);

      return {
        id: `root_cause_search-input-storm_${match.matchedFindings[0]?.id || 'unknown'}`,
        module: 'correlator',
        type: 'bad_inp',
        category: 'direct_impact',
        severity: 'high',
        confidence,
        title: 'Search/filter input causes full-tree re-render per keystroke',
        description: 'Input handlers trigger full tree re-renders on every keystroke without debouncing, creating a storm of renders and blocking user input.',
        observedIn: match.matchedFindings.map((f) => f.observedIn).join(', '),
        evidence: flattenEvidence(match.matchedFindings),
        metrics: mergeMetrics(match.matchedFindings),
        recommendation: 'Add debouncing to input handlers using a utility like lodash.debounce or a custom hook. Debounce search/filter requests by 300-500ms.',
        scoreImpact: sumScoreImpact(match.matchedFindings),
        isRootCause: true,
        contributingFindings: match.matchedFindings.map((f) => f.id),
        consolidationConfidence: confidence,
      };
    },
  },

  {
    id: 'bundle-megamonolith',
    match(findings) {
      const oversizedBundle = findings.find((f) => f.type === 'oversized_bundle');
      const noCodeSplitting = findings.find((f) => f.type === 'no_code_splitting');

      if (oversizedBundle && noCodeSplitting) {
        return { matchedFindings: [oversizedBundle, noCodeSplitting] };
      }
      return null;
    },
    synthesize(match, allFindings) {
      const badLcp = allFindings.find((f) => f.type === 'bad_lcp');
      const confidence = getLowestConfidence(match.matchedFindings);
      const severity = badLcp ? 'critical' : 'high';

      return {
        id: `root_cause_bundle-megamonolith_${match.matchedFindings[0]?.id || 'unknown'}`,
        module: 'correlator',
        type: 'oversized_bundle',
        category: 'direct_impact',
        severity: severity as FindingSeverity,
        confidence,
        title: 'Single megabundle blocking initial render',
        description: 'JavaScript is bundled into a single large file without code splitting, causing the entire bundle to block initial render and increasing time to interactive.',
        observedIn: 'Initial script loading',
        evidence: flattenEvidence(match.matchedFindings),
        metrics: mergeMetrics(match.matchedFindings),
        recommendation: 'Implement code splitting at route and component boundaries. Use dynamic imports (React.lazy) to load code only when needed.',
        scoreImpact: sumScoreImpact(match.matchedFindings),
        isRootCause: true,
        contributingFindings: match.matchedFindings.map((f) => f.id),
        consolidationConfidence: confidence,
      };
    },
  },

  {
    id: 'n-plus-one-list',
    match(findings) {
      const nPlusOne = findings.find((f) => f.type === 'n_plus_one');
      if (!nPlusOne) return null;

      const listPatterns = ['/list', '/search', '/products', '/items'];
      const isListUrl = listPatterns.some((pattern) => (nPlusOne.observedIn || '').toLowerCase().includes(pattern));

      if (isListUrl) {
        return { matchedFindings: [nPlusOne] };
      }

      return null;
    },
    synthesize(match) {
      const confidence = getLowestConfidence(match.matchedFindings);

      return {
        id: `root_cause_n-plus-one-list_${match.matchedFindings[0]?.id || 'unknown'}`,
        module: 'correlator',
        type: 'n_plus_one',
        category: 'direct_impact',
        severity: 'high',
        confidence,
        title: 'Listing page N+1 — fetches details per item row',
        description: 'A listing page fetches a list of items then fires individual requests for each item details, creating an N+1 query pattern.',
        observedIn: match.matchedFindings[0]?.observedIn || 'List endpoint',
        evidence: flattenEvidence(match.matchedFindings),
        metrics: mergeMetrics(match.matchedFindings),
        recommendation: 'Ask the backend to include detail data in the list response, or use a batch endpoint to fetch multiple item details in one request.',
        scoreImpact: sumScoreImpact(match.matchedFindings),
        isRootCause: true,
        contributingFindings: match.matchedFindings.map((f) => f.id),
        consolidationConfidence: confidence,
      };
    },
  },

  {
    id: 'lcp-sabotaged',
    match(findings) {
      const badLcp = findings.find((f) => f.type === 'bad_lcp');
      const syncScript = findings.find((f) => f.type === 'sync_script');

      if (badLcp && syncScript) {
        return { matchedFindings: [badLcp, syncScript] };
      }
      return null;
    },
    synthesize(match) {
      const confidence = getLowestConfidence(match.matchedFindings);

      return {
        id: `root_cause_lcp-sabotaged_${match.matchedFindings[0]?.id || 'unknown'}`,
        module: 'correlator',
        type: 'bad_lcp',
        category: 'direct_impact',
        severity: 'critical',
        confidence,
        title: 'LCP delayed by render-blocking JS',
        description: 'Synchronous scripts in the head or early body are blocking the main thread, delaying the rendering of the largest contentful paint element.',
        observedIn: 'Critical rendering path',
        evidence: flattenEvidence(match.matchedFindings),
        metrics: mergeMetrics(match.matchedFindings),
        recommendation: 'Move scripts to the end of the document or mark as async. Consider deferring non-critical script initialization until after LCP.',
        scoreImpact: sumScoreImpact(match.matchedFindings),
        isRootCause: true,
        contributingFindings: match.matchedFindings.map((f) => f.id),
        consolidationConfidence: confidence,
      };
    },
  },

  {
    id: 'third-party-blocker',
    match(findings) {
      const heavyThirdParty = findings.find((f) => f.type === 'heavy_third_party');
      if (!heavyThirdParty) return null;

      const highTbt = findings.find((f) => f.type === 'high_tbt');
      const longTask = findings.find((f) => f.type === 'long_task');

      if (highTbt || longTask) {
        const matching = [heavyThirdParty];
        if (highTbt) matching.push(highTbt);
        if (longTask) matching.push(longTask);
        return { matchedFindings: matching };
      }

      return null;
    },
    synthesize(match) {
      const confidence = getLowestConfidence(match.matchedFindings);

      return {
        id: `root_cause_third-party-blocker_${match.matchedFindings[0]?.id || 'unknown'}`,
        module: 'correlator',
        type: 'heavy_third_party',
        category: 'direct_impact',
        severity: 'high',
        confidence,
        title: 'Third-party scripts dominate main thread',
        description: 'Third-party scripts (analytics, ads, widgets) are consuming significant CPU time and blocking the main thread, degrading user interactivity.',
        observedIn: match.matchedFindings.map((f) => f.observedIn).join(', '),
        evidence: flattenEvidence(match.matchedFindings),
        metrics: mergeMetrics(match.matchedFindings),
        recommendation: 'Defer third-party script loading using async or defer attributes. Use web workers for non-blocking computation. Consider sandboxing with iframes.',
        scoreImpact: sumScoreImpact(match.matchedFindings),
        isRootCause: true,
        contributingFindings: match.matchedFindings.map((f) => f.id),
        consolidationConfidence: confidence,
      };
    },
  },
];

export function correlateFindings(findings: Finding[]): CorrelatedFindings {
  const contributingMap = new Map<string, string>();
  const rootCauses: RootCauseFinding[] = [];

  for (const rule of rules) {
    const match = rule.match(findings);
    if (match) {
      const rootCause = rule.synthesize(match, findings);
      rootCauses.push(rootCause);

      for (const finding of match.matchedFindings) {
        if (!contributingMap.has(finding.id)) {
          contributingMap.set(finding.id, rootCause.id);
        }
      }
    }
  }

  const standalone = findings.filter((f) => !contributingMap.has(f.id));

  rootCauses.sort((a, b) => b.scoreImpact - a.scoreImpact);

  const severityOrder: Record<FindingSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  standalone.sort((a, b) => {
    const severityDiff = (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4);
    if (severityDiff !== 0) return severityDiff;
    return b.scoreImpact - a.scoreImpact;
  });

  return {
    rootCauses,
    standalone,
    contributingMap,
  };
}
