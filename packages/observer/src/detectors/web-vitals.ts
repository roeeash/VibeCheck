import type { Finding, AuditEvent } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { Detector, DetectorContext } from '../types.js';

interface VitalReport {
  name: 'LCP' | 'INP' | 'CLS' | 'TTFB' | 'FCP' | 'FID';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

const THRESHOLDS: Record<string, { poor: number; needsImprovement: number }> = {
  LCP: { poor: 4000, needsImprovement: 2500 },
  INP: { poor: 500, needsImprovement: 200 },
  CLS: { poor: 0.25, needsImprovement: 0.1 },
  TTFB: { poor: 1800, needsImprovement: 800 },
  FCP: { poor: 3000, needsImprovement: 1800 },
};

export class WebVitalsDetector implements Detector {
  readonly name = 'web-vitals';
  private reports: VitalReport[] = [];

  constructor(private ctx: DetectorContext) {}

  async onEvent(event: AuditEvent): Promise<void> {
    if (event.type === 'web_vital') {
      this.reports.push(event.metric);
    }
  }

  async finalize(): Promise<Finding[]> {
    const findings: Finding[] = [];
    const byName = new Map<string, VitalReport[]>();
    for (const r of this.reports) {
      const list = byName.get(r.name) ?? [];
      list.push(r);
      byName.set(r.name, list);
    }

    for (const [name, reports] of byName) {
      const threshold = THRESHOLDS[name];
      if (!threshold) continue;
      const poor = reports.filter((r) => r.value > threshold.poor);
      const needsImprovement = reports.filter((r) => r.value > threshold.needsImprovement && r.value <= threshold.poor);
      
      if (poor.length > 0 || needsImprovement.length > 0) {
        const worst = [...reports].sort((a, b) => b.value - a.value)[0];
        if (!worst) continue;
        const severity = worst.value > threshold.poor ? 'high' : 'medium';
        const findingType = `bad_${name.toLowerCase()}` as const;
        findings.push({
          id: createFindingId(this.name, findingType, name),
          module: this.name,
          type: findingType,
          category: 'direct_impact',
          severity,
          confidence: 'medium',
          title: `Poor ${name}: ${Math.round(worst.value)}ms`,
          description: `${name} measured at ${Math.round(worst.value)}ms (poor threshold: ${threshold.poor}ms). ${reports.length} sample(s) collected.`,
          observedIn: this.ctx.url,
          evidence: [{ kind: 'console_log', path: '', description: `${name} = ${worst.value}` }],
          metrics: { value: worst.value, rating: worst.rating, samples: reports.length },
          recommendation: this.getRecommendation(name),
          scoreImpact: 25,
        });
      }
    }
    return findings;
  }

  async dispose(): Promise<void> {}

  private getRecommendation(metric: string): string {
    switch (metric) {
      case 'LCP': return 'Optimize the largest contentful element: preload images, reduce server response time, and eliminate render-blocking resources.';
      case 'INP': return 'Reduce JavaScript execution time during interactions. Use event delegation and avoid synchronous work in event handlers.';
      case 'CLS': return 'Reserve space for dynamic content, use size attributes on images, and avoid inserting content above existing content.';
      case 'TTFB': return 'Optimize server response time: use caching, CDN, and optimize backend queries.';
      case 'FCP': return 'Eliminate render-blocking resources, preload critical fonts, and reduce critical rendering path.';
      default: return 'Optimize this metric using Web Vitals best practices.';
    }
  }
}
