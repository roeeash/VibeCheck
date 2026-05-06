import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { correlateFindings, computeVibeScore } from '@vibecheck/correlator';
import type { ReportInput, VibeReport, ModuleSection } from './types.js';
import { renderJson } from './renderers/json.js';
import { renderMarkdown } from './renderers/markdown.js';

const MODULE_DISPLAY_NAMES: Record<string, string> = {
  observer: 'Runtime Performance',
  proxy: 'Network Patterns',
  'asset-inspector': 'Assets & Bundle',
  render: 'React Rendering',
  memory: 'Memory Health',
  architect: 'Inferred Backend',
  correlator: 'Root Cause Analysis',
};

export class ReportGenerator {
  async generate(input: ReportInput): Promise<VibeReport> {
    // Correlate findings
    const correlated = correlateFindings(input.findings);

    // Compute Vibe Score
    const score = computeVibeScore(correlated);

    // Group findings by module
    const modules: Record<string, ModuleSection> = {};

    for (const finding of input.findings) {
      if (!modules[finding.module]) {
        modules[finding.module] = {
          name: MODULE_DISPLAY_NAMES[finding.module] || finding.module,
          findings: [],
          criticalCount: 0,
          highCount: 0,
        };
      }

      modules[finding.module]!.findings.push(finding);

      if (finding.severity === 'critical') {
        modules[finding.module]!.criticalCount += 1;
      } else if (finding.severity === 'high') {
        modules[finding.module]!.highCount += 1;
      }
    }

    // Calculate duration
    const durationMs = input.completedAt - input.startedAt;
    const durationStr = formatDuration(durationMs);

    const report: VibeReport = {
      reportVersion: '1.0',
      auditId: input.auditId,
      url: input.url,
      timestamp: new Date(input.startedAt).toISOString(),
      duration: durationStr,
      score,
      summary: score.summary,
      correlated,
      modules,
    };

    return report;
  }

  async writeReport(report: VibeReport, outputDir: string): Promise<void> {
    const jsonPath = join(outputDir, 'VIBE_REPORT.json');
    const markdownPath = join(outputDir, 'VIBE_REPORT.md');

    const jsonContent = renderJson(report);
    const markdownContent = renderMarkdown(report);

    await writeFile(jsonPath, jsonContent, 'utf-8');
    await writeFile(markdownPath, markdownContent, 'utf-8');
  }
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}
