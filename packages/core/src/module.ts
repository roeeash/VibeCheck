import type { AuditContext } from './audit-context.js';
import type { Result } from './result.js';
import type { VibeError } from './error.js';
import type { Finding } from './finding.js';
import type { AuditEvent } from './audit-event.js';

export interface AnalysisModule {
  readonly name: string;
  readonly weight: number;
  initialize(ctx: AuditContext): Promise<Result<void, VibeError>>;
  onEvent(event: AuditEvent): Promise<void>;
  finalize(): Promise<Finding[]>;
  dispose(): Promise<void>;
}
