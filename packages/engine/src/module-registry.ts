import type { AnalysisModule, AuditContext, AuditEvent, Result, VibeError, Finding } from '@vibecheck/core';

export class ModuleRegistry {
  private modules: AnalysisModule[] = [];

  register(mod: AnalysisModule): void {
    this.modules.push(mod);
  }

  async initializeAll(ctx: AuditContext): Promise<Result<void, VibeError>> {
    for (const mod of this.modules) {
      const result = await mod.initialize(ctx);
      if (!result.ok) return result;
    }
    return { ok: true, value: undefined };
  }

  async dispatchEvent(event: AuditEvent): Promise<void> {
    for (const mod of this.modules) {
      await mod.onEvent(event);
    }
  }

  async finalizeAll(): Promise<Finding[]> {
    const findings: Finding[] = [];
    for (const mod of this.modules) {
      findings.push(...(await mod.finalize()));
    }
    return findings;
  }

  async disposeAll(): Promise<void> {
    for (const mod of this.modules) {
      await mod.dispose();
    }
  }

  getWeights(): Record<string, number> {
    const w: Record<string, number> = {};
    for (const mod of this.modules) {
      w[mod.name] = mod.weight;
    }
    return w;
  }
}
