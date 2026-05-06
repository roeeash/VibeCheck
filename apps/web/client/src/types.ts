export type FindingCategory = 'direct_impact' | 'theoretical_debt';
export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low';
export type FindingConfidence = 'high' | 'medium' | 'low';

export interface EvidenceRef {
  kind: 'cdp_trace' | 'har_entry' | 'heap_snapshot' | 'screenshot' | 'console_log' | 'mutation_log';
  path: string;
  range?: { start: number; end: number };
  selector?: string;
  description: string;
}

export interface Finding {
  id: string;
  module: string;
  type: string;
  category: FindingCategory;
  severity: FindingSeverity;
  confidence: FindingConfidence;
  title: string;
  description: string;
  observedIn: string;
  evidence: EvidenceRef[];
  metrics: Record<string, number | string>;
  recommendation: string;
  scoreImpact: number;
}

export interface AuditResult {
  id: string;
  status: 'running' | 'completed' | 'failed';
  findings: Finding[];
  score?: number;
  startedAt: number;
  completedAt?: number;
  error?: { code: string; message: string };
}

export interface ModuleProgress {
  module: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  findingsSoFar: number;
  logLine?: string;
}

export interface WsMessage {
  type: 'connected' | 'module.progress' | 'module.complete' | 'audit.complete' | 'audit.error';
  module?: string;
  status?: string;
  findingsSoFar?: number;
  logLine?: string;
  auditId?: string;
}

export type Phase = 'idle' | 'scanning' | 'strike' | 'results';

export const SEVERITY_COLOR: Record<FindingSeverity, string> = {
  critical: '#ff3d6e',
  high: '#ff9f0a',
  medium: '#ffd60a',
  low: '#8e8e93',
};

export const SEVERITY_LABEL: Record<FindingSeverity, string> = {
  critical: 'CRIT',
  high: 'HIGH',
  medium: 'MED',
  low: 'LOW',
};

export const SCAN_PHASES = [
  { id: 'recon',     label: 'RECON',     desc: 'Headless Chromium boot · runtime probe injection',   duration: 1800 },
  { id: 'observer',  label: 'OBSERVER',  desc: 'Performance Timeline · long tasks · heap diff',       duration: 3000 },
  { id: 'proxy',     label: 'PROXY',     desc: 'CDP network intercept · payload introspection',        duration: 2400 },
  { id: 'asset',     label: 'ASSET',     desc: 'Analyzing images, CSS, JS bundles, and fonts for waste and misconfiguration', duration: 2500 },
  { id: 'architect', label: 'ARCHITECT', desc: 'Query pattern inference · index correlation',          duration: 2000 },
  { id: 'render',    label: 'RENDER',    desc: 'React profiler · memo audit · virtualization',         duration: 1900 },
  { id: 'memory',    label: 'MEMORY',    desc: 'leak harness · listener census · interval scan',       duration: 1700 },
  { id: 'score',     label: 'SCORE',     desc: 'Vibe-Score weighting · remediation recommendations',   duration: 1100 },
];

export const PHASE_LOG: Record<string, string[]> = {
  recon:     ['boot · headless chromium', 'inject CDP probes', 'target reachable · 200'],
  observer:  ['PerformanceObserver(longtask) attached', 'frame budget 16.6ms', 'heap snapshot α captured', 'heap snapshot β captured'],
  proxy:     ['network.enable', 'CDP intercept active', 'analyzing request patterns', 'waterfall depth analysis'],
  asset:     ['▶ scanning image dimensions and formats...', '▶ running CSS coverage tracker...', '▶ fingerprinting JS bundles for known libraries...', '▶ checking render-blocking resources...', '✓ asset analysis complete'],
  architect: ['query pattern analysis started', 'index correlation analysis', 'TTFB anomaly detection'],
  render:    ['React profiler attached', 'memo audit running', 'inline allocations scan'],
  memory:    ['interval census started', 'listener census', 'unbounded state check'],
  score:     ['weighting computation', 'computing remediation graph', 'VIBE-SCORE computed', 'report ready'],
};
