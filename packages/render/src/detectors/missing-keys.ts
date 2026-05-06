import type { Finding, AuditEvent, AuditContext } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { Detector } from '../types.js';

export class MissingKeysDetector implements Detector {
  readonly name = 'missing-keys';
  private ctx: AuditContext;

  constructor(ctx: AuditContext) {
    this.ctx = ctx;
  }

  async onEvent(_event: AuditEvent): Promise<void> {}

  async finalize(): Promise<Finding[]> {
    let keylessList = 0;
    try {
      keylessList = await this.ctx.page.evaluate(() => {
        // Find list containers (ul, ol, or divs/sections with many same-tag children)
        const candidates = Array.from(document.querySelectorAll('ul, ol, [data-list], .list, .items'));
        let count = 0;
        for (const parent of candidates) {
          const children = Array.from(parent.children);
          if (children.length < 5) continue;
          const tags = new Set(children.map((c) => c.tagName));
          if (tags.size !== 1) continue; // mixed tags = probably not a list render

          // Check if none of the children have key-indicative attributes
          const hasKeyAttr = children.some(
            (c) => c.hasAttribute('data-key') || c.hasAttribute('data-id') || c.hasAttribute('data-reactid'),
          );
          if (!hasKeyAttr) {
            count += 1;
          }
        }

        // Also check generic divs with many same-tag children
        const divContainers = Array.from(document.querySelectorAll('div, section, main'));
        for (const parent of divContainers) {
          const children = Array.from(parent.children);
          if (children.length < 6) continue;
          const tags = new Set(children.map((c) => c.tagName));
          if (tags.size !== 1) continue;
          const tag = [...tags][0];
          if (!tag || tag === 'DIV' && children.length < 10) continue; // skip trivial divs
          const hasKeyAttr = children.some(
            (c) => c.hasAttribute('data-key') || c.hasAttribute('data-id') || c.hasAttribute('data-reactid'),
          );
          if (!hasKeyAttr && children.length >= 6) {
            count += 1;
          }
        }

        return count;
      });
    } catch {
      return [];
    }

    if (keylessList === 0) return [];

    return [{
      id: createFindingId('render', 'missing_keys', 'list'),
      module: 'render',
      // 'render_storm' is the closest available type; using a valid FindingType
      type: 'wasted_mutation',
      category: 'theoretical_debt',
      severity: 'low',
      confidence: 'low',
      title: `${keylessList} list container(s) may render items without stable keys`,
      description: `${keylessList} list container(s) contain uniform sibling elements with no key-indicative attributes (data-key, data-id, data-reactid). Missing React list keys cause full subtree reconciliation on reorder or insert.`,
      observedIn: `DOM scan: ${keylessList} list container(s) with uniform children lacking key attributes`,
      evidence: [{
        kind: 'console_log' as const,
        path: '',
        description: `${keylessList} container(s) with 5+ same-tag children and no key attributes found`,
      }],
      metrics: { keylessList },
      recommendation: 'Add a stable unique key prop to every item in .map() renders — use item.id or a stable content hash, never the array index.',
      scoreImpact: 5,
    }];
  }

  async dispose(): Promise<void> {}
}
