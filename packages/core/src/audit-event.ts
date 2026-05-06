import type { FlowStep } from './flow.js';

export interface LoAFEntry {
  startTime: number;
  duration: number;
  blockingDuration: number;
  scriptEntries: Array<{
    name: string;
    sourceURL: string;
    sourceFunctionName: string;
    startTime: number;
    executionStart: number;
    executionDuration: number;
  }>;
  styleAndLayoutDuration: number;
}

export interface LayoutShiftEntry {
  value: number;
  hadRecentInput: boolean;
  sources: Array<{
    node?: string;
    previousRect: Record<string, number>;
    currentRect: Record<string, number>;
  }>;
  timestamp: number;
}

export interface WebVitalEntry {
  name: 'LCP' | 'INP' | 'CLS' | 'TTFB' | 'FCP' | 'FID';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  entries?: Array<Record<string, unknown>>;
  navigationType?: string;
  url?: string;
  timestamp: number;
}

export type AuditEvent =
  | { type: 'audit.start'; url: string; timestamp: number }
  | { type: 'audit.end'; url: string; timestamp: number }
  | { type: 'flow.step.before'; step: FlowStep; url: string; timestamp: number }
  | { type: 'flow.step.after'; step: FlowStep; url: string; timestamp: number; success: boolean }
  | { type: 'network.request'; requestId: string; url: string; method: string; resourceType: string; timestamp: number }
  | { type: 'network.response'; requestId: string; url: string; status: number; mimeType: string; timestamp: number }
  | { type: 'cdp.long_task'; duration: number; startTime: number; url?: string }
  | { type: 'cdp.long_animation_frame'; entry: LoAFEntry }
  | { type: 'cdp.layout_shift'; shift: LayoutShiftEntry }
  | { type: 'cdp.forced_reflow'; selector?: string; timestamp: number }
  | { type: 'web_vital'; metric: WebVitalEntry }
  | { type: 'dom.mutation_burst'; count: number; timestamp: number }
  | { type: 'heap.snapshot'; path: string; size: number; timestamp: number }
  | { type: 'console.message'; level: 'log' | 'warn' | 'error' | 'info'; text: string; url?: string; timestamp: number }
  | { type: 'injector.binding'; kind: string; payload: Record<string, unknown>; timestamp: number }
  | { type: 'listener_add'; count: number; listenerType: string; target: string; timestamp: number }
  | { type: 'listener_remove'; count: number; listenerType: string; target: string; timestamp: number };
