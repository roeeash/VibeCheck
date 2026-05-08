import React, { useState } from 'react';
import type { Finding } from '../types.js';
import { FindingCard } from './finding-card.js';

interface ModuleSectionProps {
  moduleName: string;
  findings: Finding[];
  defaultOpen?: boolean;
}

const MODULE_SIGILS: Record<string, string> = {
  observer: '◉',
  proxy: '◈',
  architect: '◇',
  'asset-inspector': '◆',
  asset: '◆',
  render: '◐',
  memory: '◯',
};

function getModuleSeverityColor(findings: Finding[]): string {
  if (findings.some((f) => f.severity === 'critical')) return 'var(--danger)';
  if (findings.some((f) => f.severity === 'high')) return '#ff9f0a';
  if (findings.some((f) => f.severity === 'medium')) return 'var(--warn)';
  return 'var(--fg-2)';
}

export function ModuleSection({ moduleName, findings, defaultOpen = false }: ModuleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const sevColor = getModuleSeverityColor(findings);
  const sigil = MODULE_SIGILS[moduleName.toLowerCase()] ?? '◎';
  const directCount = findings.filter((f) => f.category === 'direct_impact').length;
  const theoCount = findings.filter((f) => f.category === 'theoretical_debt').length;
  const critCount = findings.filter((f) => f.severity === 'critical').length;

  const MODULE_WEIGHTS: Record<string, number> = {
    observer: 25, proxy: 18, 'asset-inspector': 22,
    render: 17, memory: 12, architect: 18,
  };
  const SEVERITY_MAP: Record<string, number> = { critical: 1.0, high: 0.7, medium: 0.4, low: 0.2 };
  const CONFIDENCE_MAP: Record<string, number> = { high: 1.0, medium: 0.7, low: 0.4 };
  const weight = MODULE_WEIGHTS[moduleName.toLowerCase()] ?? 20;
  const rawPenalty = findings.reduce((acc, f) =>
    acc + (f.scoreImpact || 0) * (SEVERITY_MAP[f.severity] ?? 0) * (CONFIDENCE_MAP[f.confidence] ?? 0), 0);
  const capped = Math.min(rawPenalty, weight);
  const moduleScore = Math.round(Math.max(0, (weight - capped) / weight * 100));

  return (
    <div style={{
      background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 6, overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', textAlign: 'left', cursor: 'pointer',
          padding: '18px 22px', background: 'transparent', border: 'none',
          display: 'flex', alignItems: 'center', gap: 18, color: 'var(--fg-0)',
        }}
      >
        <span style={{ fontFamily: 'var(--font-mono)', color: sevColor, fontSize: 22, fontWeight: 600 }}>{sigil}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span className="t-disp" style={{ fontSize: 18, fontWeight: 700, letterSpacing: '0.04em' }}>
              {moduleName.toUpperCase()}
            </span>
            <span className="t-mono" style={{ fontSize: 12, color: 'var(--fg-2)' }}>
              {findings.length} finding{findings.length !== 1 ? 's' : ''}
              {critCount > 0 && <span style={{ color: 'var(--danger)', marginLeft: 8 }}>{critCount} critical</span>}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span className="t-mono" style={{ fontSize: 11, color: 'var(--fg-2)' }}>
            {directCount}<span style={{ color: 'var(--danger)', marginLeft: 3 }}>⚡</span>
            &nbsp;·&nbsp;
            {theoCount}<span style={{ color: 'var(--warn)', marginLeft: 3 }}>◇</span>
          </span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', background: 'var(--bg-0)',
            border: `1px solid ${sevColor}`, borderRadius: 2,
          }}>
            <span className="t-mono" style={{ fontSize: 10, color: sevColor, letterSpacing: '0.1em' }}>SCORE</span>
            <span className="tnum" style={{
              fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700,
              color: sevColor, textShadow: `0 0 8px ${sevColor}`,
            }}>{moduleScore}</span>
          </div>
          <span style={{
            color: 'var(--fg-2)',
            transform: open ? 'rotate(90deg)' : 'none',
            transition: 'transform 200ms', display: 'inline-block',
          }}>›</span>
        </div>
      </button>
      {open && (
        <div style={{ borderTop: '1px solid var(--line)' }}>
          {findings.map((f) => <FindingCard key={f.id} finding={f} />)}
        </div>
      )}
    </div>
  );
}
