import type { AuditContext, Finding, AuditEvent } from '@vibecheck/core';

export interface DetectorContext extends AuditContext {}

export interface Detector {
  readonly name: string;
  onEvent(event: AuditEvent): Promise<void>;
  finalize(): Promise<Finding[]>;
  dispose(): Promise<void>;
}

export interface IntervalInfo {
  id: number;
  created: number;
  delay: number;
  stack?: string;
}

export interface IntervalCensus {
  active: number;
  intervals: IntervalInfo[];
}

export interface ListenerElementInfo {
  tag: string;
  selector: string;
  count: number;
}

export interface ListenerCensus {
  total: number;
  byElement: ListenerElementInfo[];
}
