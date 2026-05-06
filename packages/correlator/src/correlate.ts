import type { Finding } from '@vibecheck/core';

export function correlateFindings(findings: Finding[]): Finding[] {
  return findings.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4);
  });
}
