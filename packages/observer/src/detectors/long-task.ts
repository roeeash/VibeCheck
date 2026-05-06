import type { Finding, AuditEvent } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { Detector, DetectorContext } from '../types.js';

interface LongTaskEntry {
  duration: number;
  startTime: number;
  url?: string;
  timestamp: number;
}

export class LongTaskDetector implements Detector {
  readonly name = 'long-task';
  private tasks: LongTaskEntry[] = [];
  private route = '';

  constructor(private ctx: DetectorContext) {}

  async onEvent(event: AuditEvent): Promise<void> {
    if (event.type === 'cdp.long_task') {
      this.tasks.push({
        duration: event.duration,
        startTime: event.startTime,
        url: event.url,
        timestamp: Date.now(),
      });
    }
  }

  async finalize(): Promise<Finding[]> {
    const findings: Finding[] = [];
    const significant = this.tasks.filter((t) => t.duration > 50);
    
    for (const task of significant) {
      const severity = this.durationToSeverity(task.duration);
      findings.push({
        id: createFindingId(this.name, 'long_task', `ts-${task.startTime}`),
        module: this.name,
        type: 'long_task',
        category: 'direct_impact',
        severity,
        confidence: 'medium',
        title: `Long task: ${Math.round(task.duration)}ms`,
        description: `A main thread task blocked for ${Math.round(task.duration)}ms, exceeding the 50ms budget.`,
        observedIn: task.url ?? 'unknown',
        evidence: [{
          kind: 'cdp_trace',
          path: '',
          range: { start: task.startTime, end: task.startTime + task.duration },
          description: `Long task trace at ${task.startTime}ms`,
        }],
        metrics: { durationMs: task.duration, startTime: task.startTime },
        recommendation: 'Break up this task with scheduler.yield() or move to a Web Worker.',
        scoreImpact: Math.min(Math.round(task.duration / 30), 18),
      });
    }
    return findings;
  }

  async dispose(): Promise<void> {}

  private durationToSeverity(ms: number): 'critical' | 'high' | 'medium' | 'low' {
    if (ms > 300) return 'critical';
    if (ms > 150) return 'high';
    if (ms > 80) return 'medium';
    return 'low';
  }
}
