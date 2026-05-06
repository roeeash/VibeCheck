import type { Finding } from '@vibecheck/core';

export interface RootCauseFinding extends Finding {
  isRootCause: true;
  contributingFindings: string[];
  consolidationConfidence: 'high' | 'medium' | 'low';
}

export interface CorrelatedFindings {
  rootCauses: RootCauseFinding[];
  standalone: Finding[];
  contributingMap: Map<string, string>;
}

export interface ModuleBreakdown {
  weight: number;
  penalty: number;
  score: number;
}

export interface VibeScoreResult {
  value: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  breakdown: Record<string, number>;
  moduleBreakdown: Record<string, ModuleBreakdown>;
  summary: string;
}
