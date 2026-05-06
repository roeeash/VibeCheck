import type { Finding } from '@vibecheck/core';
import { createFindingId } from '@vibecheck/core';
import type { AnimationInfo } from '../../types.js';

const LAYOUT_TRIGGERING_PROPS = ['top', 'left', 'right', 'bottom', 'width', 'height', 'margin', 'padding', 'font-size', 'border-width'];

export class LayoutAnimationDetector {
  static readonly name = 'layout-animations';

  finalize(animations: AnimationInfo[]): Finding[] {
    const findings: Finding[] = [];

    for (const anim of animations) {
      if (LAYOUT_TRIGGERING_PROPS.includes(anim.property)) {
        findings.push({
          id: createFindingId('asset-inspector', 'layout_animation', anim.animationName),
          module: 'asset-inspector',
          type: 'layout_animation',
          category: 'theoretical_debt',
          severity: 'medium',
          confidence: 'high',
          title: `Layout-triggering animation: ${anim.animationName}`,
          description: `Animation "${anim.animationName}" animates "${anim.property}", which triggers layout recalculation on every frame. This causes performance issues.`,
          observedIn: anim.selector,
          evidence: [{
            kind: 'console_log',
            path: '',
            selector: anim.selector,
            description: `getComputedStyle(${anim.selector}).transitionProperty includes "${anim.property}" (layout-triggering)`,
          }],
          metrics: { property: anim.property },
          recommendation: `Use transform or opacity animations instead. For ${anim.property}, consider using transform: translate, scale, or rotate. Or use will-change: transform sparingly.`,
          scoreImpact: 8,
        });
      }
    }

    return findings;
  }
}
