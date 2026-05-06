export type AuditId = string & { __brand: 'AuditId' };
export type FindingId = string & { __brand: 'FindingId' };

let auditCounter = 0;

export function createAuditId(): AuditId {
  auditCounter += 1;
  return `audit-${Date.now()}-${auditCounter}` as AuditId;
}

export function createFindingId(module: string, type: string, target: string): FindingId {
  const slug = `${module}-${type}-${target}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `finding-${slug}-${Date.now()}` as FindingId;
}
