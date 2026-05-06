import type { VibeReport } from '../types.js';
import type { RootCauseFinding } from '@vibecheck/correlator';

export function renderMarkdown(report: VibeReport): string {
  const { score, correlated, modules, timestamp, url, duration } = report;

  let markdown = '';

  // Header
  markdown += `# VibeCheck Ultra — Performance Audit Report\n\n`;
  markdown += `**URL:** ${url}\n`;
  markdown += `**Timestamp:** ${timestamp}\n`;
  markdown += `**Duration:** ${duration}\n\n`;

  // Score and Grade
  markdown += `## Score & Grade\n\n`;
  markdown += `**Score:** ${score.value}/100 | **Grade:** ${score.grade}\n\n`;
  markdown += `${score.summary}\n\n`;

  // Summary table by module
  markdown += `## Summary by Module\n\n`;
  markdown += `| Module | Critical | High | Medium | Low |\n`;
  markdown += `|--------|----------|------|--------|-----|\n`;

  for (const section of Object.values(modules)) {
    const mediumCount = section.findings.filter((f) => f.severity === 'medium').length;
    const lowCount = section.findings.filter((f) => f.severity === 'low').length;
    markdown += `| ${section.name} | ${section.criticalCount} | ${section.highCount} | ${mediumCount} | ${lowCount} |\n`;
  }

  markdown += `\n`;

  // Root Causes
  markdown += `## Root Causes\n\n`;
  markdown += `The following issues represent fundamental performance problems that should be addressed first.\n\n`;

  if (correlated.rootCauses.length === 0) {
    markdown += `No root causes identified.\n\n`;
  } else {
    for (const rootCause of correlated.rootCauses) {
      markdown += `### ${rootCause.title}\n\n`;
      markdown += `**Severity:** ${rootCause.severity} | **Confidence:** ${rootCause.confidence}\n`;
      markdown += `**Impact:** ${rootCause.scoreImpact} points\n\n`;

      markdown += `${rootCause.description}\n\n`;

      if (rootCause.evidence && rootCause.evidence.length > 0) {
        markdown += `**Evidence:**\n`;
        for (const ev of rootCause.evidence) {
          markdown += `- ${ev.kind}: ${ev.description}\n`;
        }
        markdown += `\n`;
      }

      if ((rootCause as RootCauseFinding).contributingFindings && (rootCause as RootCauseFinding).contributingFindings.length > 0) {
        markdown += `**Contributing Findings:** ${(rootCause as RootCauseFinding).contributingFindings.join(', ')}\n\n`;
      }

      markdown += `**Recommendation:** ${rootCause.recommendation}\n\n`;

      markdown += `---\n\n`;
    }
  }

  // Standalone Findings
  markdown += `## Standalone Findings\n\n`;

  const directImpact = correlated.standalone.filter((f) => f.category === 'direct_impact');
  const theoreticalDebt = correlated.standalone.filter((f) => f.category === 'theoretical_debt');

  if (directImpact.length > 0) {
    markdown += `### Direct Impact\n\n`;
    for (const finding of directImpact) {
      markdown += `#### ${finding.title}\n\n`;
      markdown += `**Type:** ${finding.type} | **Severity:** ${finding.severity} | **Confidence:** ${finding.confidence}\n`;
      markdown += `**Module:** ${finding.module} | **Impact:** ${finding.scoreImpact} points\n\n`;
      markdown += `${finding.description}\n\n`;

      if (finding.observedIn) {
        markdown += `**Observed In:** ${finding.observedIn}\n\n`;
      }

      if (finding.evidence && finding.evidence.length > 0) {
        markdown += `**Evidence:**\n`;
        for (const ev of finding.evidence) {
          markdown += `- ${ev.kind}: ${ev.description}\n`;
        }
        markdown += `\n`;
      }

      markdown += `**Recommendation:** ${finding.recommendation}\n\n`;
    }
  }

  if (theoreticalDebt.length > 0) {
    markdown += `### Theoretical Debt\n\n`;
    for (const finding of theoreticalDebt) {
      markdown += `#### ${finding.title}\n\n`;
      markdown += `**Type:** ${finding.type} | **Severity:** ${finding.severity} | **Confidence:** ${finding.confidence}\n`;
      markdown += `**Module:** ${finding.module} | **Impact:** ${finding.scoreImpact} points\n\n`;
      markdown += `${finding.description}\n\n`;

      if (finding.observedIn) {
        markdown += `**Observed In:** ${finding.observedIn}\n\n`;
      }

      if (finding.evidence && finding.evidence.length > 0) {
        markdown += `**Evidence:**\n`;
        for (const ev of finding.evidence) {
          markdown += `- ${ev.kind}: ${ev.description}\n`;
        }
        markdown += `\n`;
      }

      markdown += `**Recommendation:** ${finding.recommendation}\n\n`;
    }
  }

  // Score Breakdown
  markdown += `## Score Breakdown\n\n`;
  markdown += `| Finding Type | Points Docked |\n`;
  markdown += `|--------------|---------------|\n`;

  const sortedBreakdown = Object.entries(score.breakdown).sort((a, b) => b[1] - a[1]);
  for (const [type, points] of sortedBreakdown) {
    markdown += `| ${type} | ${points.toFixed(2)} |\n`;
  }

  markdown += `\n`;

  // Audit Metadata
  markdown += `## Audit Metadata\n\n`;
  markdown += `- **Audit ID:** ${report.auditId}\n`;
  markdown += `- **Report Version:** ${report.reportVersion}\n`;
  markdown += `- **Generated:** ${new Date().toISOString()}\n`;

  return markdown;
}
