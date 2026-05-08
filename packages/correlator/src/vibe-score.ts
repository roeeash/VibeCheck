import type { CorrelatedFindings, VibeScoreResult } from './types.js';

const SEVERITY_MAP = { critical: 1.0, high: 0.7, medium: 0.4, low: 0.2 };
const CONFIDENCE_MAP = { high: 1.0, medium: 0.7, low: 0.4 };

const MODULE_WEIGHTS: Record<string, number> = {
  observer: 25,
  proxy: 18,
  'asset-inspector': 22,
  render: 17,
  memory: 12,
  architect: 18,
};

export function computeVibeScore(correlated: CorrelatedFindings): VibeScoreResult {
  const allFindings = [...correlated.rootCauses, ...correlated.standalone];
  const modulePenalties: Record<string, number> = {};
  const breakdown: Record<string, number> = {};

  for (const finding of allFindings) {
    const severityMult = SEVERITY_MAP[finding.severity] ?? 0;
    const confidenceMult = CONFIDENCE_MAP[finding.confidence] ?? 0;
    const penalty = finding.scoreImpact * severityMult * confidenceMult;
    const mod = finding.module;
    modulePenalties[mod] = (modulePenalties[mod] ?? 0) + penalty;
    const key = `${mod}:${finding.type}`;
    breakdown[key] = (breakdown[key] ?? 0) + penalty;
  }

  let totalPenalty = 0;
  const moduleBreakdown: Record<string, { weight: number; penalty: number; score: number }> = {};

  for (const [mod, penalty] of Object.entries(modulePenalties)) {
    const weight = MODULE_WEIGHTS[mod] ?? 20;
    const capped = Math.min(penalty, weight);
    totalPenalty += capped;
    moduleBreakdown[mod] = { weight, penalty, score: Math.max(0, weight - capped) };
  }

  const score = Math.max(0, Math.min(100, 100 - totalPenalty));
  const roundedScore = Math.round(score);

  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  if (roundedScore >= 90) grade = 'A';
  else if (roundedScore >= 75) grade = 'B';
  else if (roundedScore >= 60) grade = 'C';
  else if (roundedScore >= 40) grade = 'D';
  else grade = 'F';

  const rootCauseCount = correlated.rootCauses.length;
  const standaloneCount = correlated.standalone.length;
  const summary = `${rootCauseCount} root cause${rootCauseCount === 1 ? '' : 's'} and ${standaloneCount} standalone finding${standaloneCount === 1 ? '' : 's'} found. Score: ${roundedScore}/100 (grade ${grade}).`;

  return {
    value: roundedScore,
    grade,
    breakdown,
    moduleBreakdown,
    summary,
  };
}
