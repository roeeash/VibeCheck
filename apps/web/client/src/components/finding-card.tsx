import React, { memo, useState } from 'react';
import type { Finding } from '../types.js';
import { SEVERITY_COLOR, SEVERITY_LABEL } from '../types.js';

const ACCENT = 'var(--cyan)';

interface FindingCardProps {
  finding: Finding;
}

export const FindingCard = memo(function FindingCard({ finding }: FindingCardProps) {
  const [open, setOpen] = useState(true);
  const sevColor = SEVERITY_COLOR[finding.severity];
  const sevLabel = SEVERITY_LABEL[finding.severity];
  const isDirect = finding.category === 'direct_impact';

  const primaryMetric = Object.values(finding.metrics)[0];
  const metricStr = primaryMetric !== undefined ? String(primaryMetric) : null;

  return (
    <div style={{ borderTop: '1px solid var(--line)' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', textAlign: 'left', padding: '14px 18px',
          background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'grid',
          gridTemplateColumns: '60px 1fr auto auto auto',
          gap: 14, alignItems: 'center', color: 'var(--fg-0)',
        }}
      >
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
          letterSpacing: '0.12em', color: sevColor,
          padding: '3px 6px', border: `1px solid ${sevColor}`, borderRadius: 2,
          textAlign: 'center', textShadow: `0 0 6px ${sevColor}`,
        }}>{sevLabel}</span>

        <div>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{finding.title}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-2)' }}>
            <span style={{ color: ACCENT }}>→</span> {finding.observedIn}
          </div>
        </div>

        {metricStr && (
          <span className="t-mono" style={{
            fontSize: 12, color: 'var(--fg-0)',
            padding: '4px 8px', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 2,
          }}>{metricStr}</span>
        )}

        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px',
          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          background: isDirect ? 'var(--danger-soft)' : 'var(--warn-soft)',
          color: isDirect ? 'var(--danger)' : 'var(--warn)',
          border: `1px solid ${isDirect ? 'rgba(255,61,110,0.32)' : 'rgba(255,181,71,0.32)'}`,
          borderRadius: 2,
        }}>
          {isDirect ? '⚡ direct' : '◇ theoretical'}
        </span>

        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-3)',
          userSelect: 'none',
        }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          padding: '0 18px 18px 92px', fontSize: 13, color: 'var(--fg-1)', lineHeight: 1.6,
        }}>
          {finding.description && (
            <div style={{ marginBottom: 12 }}>
              <span className="t-label" style={{ marginRight: 8 }}>WHY</span>
              <span style={{ color: 'var(--fg-1)' }}>{finding.description}</span>
            </div>
          )}
          <div style={{
            padding: 12, background: 'var(--bg-0)',
            border: '1px dashed var(--cyan-line)', borderRadius: 3,
            fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.5,
          }}>
            <span style={{ color: ACCENT, marginRight: 8 }}>$ fix →</span>
            <span style={{ color: 'var(--fg-0)' }}>{finding.recommendation}</span>
          </div>
          {finding.evidence.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {finding.evidence.map((ev, i) => (
                <span key={i} style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-2)',
                  padding: '3px 8px', border: '1px solid var(--line)', borderRadius: 2,
                }}>
                  {ev.kind} · {ev.description}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
