export type { Result } from './result.js';
export { ok, err, mapResult, andThen, unwrapOr, tryCatch } from './result.js';

export type { VibeError, VibeErrorCode } from './error.js';
export { createVibeError } from './error.js';

export type { AuditId, FindingId } from './ids.js';
export { createAuditId, createFindingId } from './ids.js';

export type {
  FindingCategory,
  FindingSeverity,
  FindingConfidence,
  FindingType,
  EvidenceRef,
  Finding,
} from './finding.js';

export type {
  LoAFEntry,
  LayoutShiftEntry,
  WebVitalEntry,
  AuditEvent,
} from './audit-event.js';

export type { FlowAction, FlowStep, FlowScript } from './flow.js';

export type { AuditConfig } from './config.js';
export { auditConfigSchema } from './config.js';

export type { AnalysisModule } from './module.js';

export type { AuditContext, EvidenceStore } from './audit-context.js';
