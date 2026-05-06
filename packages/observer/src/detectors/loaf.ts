import type { Finding, AuditEvent } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { Detector, DetectorContext } from '../types.js';

interface LoafEntry {
  startTime: number;
  duration: number;
  blockingDuration: number;
  scriptEntries: Array<{ name: string; sourceURL: string; sourceFunctionName: string }>;
  styleAndLayoutDuration: number;
}

export class LoAFDetector implements Detector {
  readonly name = 'loaf';
  private entries: LoafEntry[] = [];

  constructor(private ctx: DetectorContext) {}

  async onEvent(event: AuditEvent): Promise<void> {
    if (event.type === 'cdp.long_animation_frame') {
      this.entries.push(event.entry as LoafEntry);
    }
  }

  async finalize(): Promise<Finding[]> {
    const findings: Finding[] = [];
    const significant = this.entries.filter((e) => e.duration > 50);
    
    if (significant.length > 5) {
      findings.push({
        id: createFindingId(this.name, 'loaf', 'systemic'),
        module: this.name,
        type: 'long_animation_frame',
        category: 'direct_impact',
        severity: 'high',
        confidence: 'medium',
        title: `Systemic long animation frames: ${significant.length} detected`,
        description: `Found ${significant.length} long animation frames exceeding 50ms. This indicates persistent main thread contention.`,
        observedIn: this.ctx.url,
        evidence: [{ kind: 'cdp_trace', path: '', description: `${significant.length} LoAF entries` }],
        metrics: { count: significant.length, avgDuration: significant.reduce((s, e) => s + e.duration, 0) / significant.length },
        recommendation: 'Audit long-running scripts and reduce style/layout work during animation frames.',
        scoreImpact: 30,
      });
    }

    for (const entry of significant.filter((e) => e.duration > 100)) {
      const styleDominated = entry.styleAndLayoutDuration > entry.duration * 0.5;
      findings.push({
        id: createFindingId(this.name, 'loaf', `ts-${entry.startTime}`),
        module: this.name,
        type: 'long_animation_frame',
        category: 'direct_impact',
        severity: entry.duration > 200 ? 'critical' : 'high',
        confidence: styleDominated ? 'medium' : 'medium',
        title: `Long animation frame: ${Math.round(entry.duration)}ms${styleDominated ? ' (style/layout dominated)' : ''}`,
        description: `A frame took ${Math.round(entry.duration)}ms. Blocking duration: ${Math.round(entry.blockingDuration)}ms. Style/layout: ${Math.round(entry.styleAndLayoutDuration)}ms.`,
        observedIn: this.ctx.url,
        evidence: [{ kind: 'cdp_trace', path: '', description: `LoAF at ${entry.startTime}ms` }],
        metrics: { duration: entry.duration, blockingDuration: entry.blockingDuration, styleAndLayoutDuration: entry.styleAndLayoutDuration, scriptCount: entry.scriptEntries.length },
        recommendation: styleDominated
          ? 'Reduce style recalculation by batching DOM reads/writes and avoiding layout-triggering properties in animations.'
          : 'Break up scripts with setTimeout or scheduler.yield() to yield to the main thread.',
        scoreImpact: 30,
      });
    }
    return findings;
  }

  async dispose(): Promise<void> {}
}
