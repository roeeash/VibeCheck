import type { CorrelatedFindings, VibeScoreResult } from '@vibecheck/correlator';
import type { Finding } from '@vibecheck/core';

export interface ReportInput {
  auditId: string;
  url: string;
  startedAt: number;
  completedAt: number;
  findings: Finding[];
  outputDir: string;
}

export interface VibeReport {
  reportVersion: '1.0';
  auditId: string;
  url: string;
  timestamp: string;
  duration: string;
  score: VibeScoreResult;
  summary: string;
  correlated: CorrelatedFindings;
  modules: Record<string, ModuleSection>;
}

export interface ModuleSection {
  name: string;
  findings: Finding[];
  criticalCount: number;
  highCount: number;
}
