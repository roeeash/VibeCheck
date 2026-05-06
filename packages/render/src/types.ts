import type { AuditContext, Finding, AuditEvent } from '@vibecheck/core';

export type { AuditContext };

export interface DetectorContext extends AuditContext {}

export interface Detector {
  readonly name: string;
  onEvent(event: AuditEvent): Promise<void>;
  finalize(): Promise<Finding[]>;
  dispose(): Promise<void>;
}

export interface RenderUpdate {
  componentName: string;
  reason: 'state-change' | 'parent-render' | 'context-change' | 'initial';
  timestamp: number;
}

export interface DomContainerInfo {
  selector: string;
  childCount: number;
  isScrollable: boolean;
}
