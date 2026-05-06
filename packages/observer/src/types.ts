import type { AuditContext, Finding, AuditEvent } from '@vibecheck/core';

export interface DetectorContext extends AuditContext {}

export interface Detector {
  readonly name: string;
  onEvent(event: AuditEvent): Promise<void>;
  finalize(): Promise<Finding[]>;
  dispose(): Promise<void>;
}
