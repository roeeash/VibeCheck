import React, { useMemo } from 'react';
import type { AuditResult, Finding } from '../types.js';
import { ScoreBadge } from './score-badge.js';
import { ModuleSection } from './module-section.js';
import { DownloadButton } from './download-button.js';

interface ResultsDashboardProps {
  result: AuditResult;
  url: string;
  onReset: () => void;
}

function groupByModule(findings: Finding[]): Map<string, Finding[]> {
  const map = new Map<string, Finding[]>();
  for (const f of findings) {
    const key = f.module || 'unknown';
    const list = map.get(key);
    if (list) list.push(f);
    else map.set(key, [f]);
  }
  return map;
}

function getCritCount(findings: Finding[]): number {
  return findings.filter((f) => f.severity === 'critical').length;
}

export function ResultsDashboard({ result, url, onReset }: ResultsDashboardProps) {
  const score = result.score ?? 100;
  const moduleGroups = useMemo(() => groupByModule(result.findings), [result.findings]);

  // Sort modules by critical count descending
  const sortedModules = useMemo(() => {
    return [...moduleGroups.entries()].sort(
      ([, a], [, b]) => getCritCount(b) - getCritCount(a),
    );
  }, [moduleGroups]);

  const duration = result.completedAt
    ? ((result.completedAt - result.startedAt) / 1000).toFixed(1)
    : '—';

  const critCount = getCritCount(result.findings);
  const totalFindings = result.findings.length;

  return (
    <main style={{
      position: 'relative', zIndex: 1,
      padding: '32px',
      maxWidth: 1440, margin: '0 auto',
      animation: 'fade-in 400ms ease-out',
    }}>
      {/* Meta strip */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px', marginBottom: 24,
        background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 4,
        fontFamily: 'var(--font-mono)', fontSize: 11,
        flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', gap: 24, color: 'var(--fg-2)', flexWrap: 'wrap' }}>
          <span><span style={{ color: 'var(--fg-3)' }}>audit</span> · {result.id}</span>
          <span><span style={{ color: 'var(--fg-3)' }}>target</span> · <span style={{ color: 'var(--fg-0)' }}>{url}</span></span>
          <span><span style={{ color: 'var(--fg-3)' }}>duration</span> · {duration}s</span>
          <span><span style={{ color: 'var(--fg-3)' }}>findings</span> · {totalFindings}</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onReset} className="btn">↻ new scan</button>
          <DownloadButton auditId={result.id} />
        </div>
      </div>

      {/* Score + KPIs */}
      <div style={{
        display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, marginBottom: 32,
      }}>
        <ScoreBadge score={score} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Verdict callout */}
          {critCount > 0 && (
            <div style={{
              padding: '16px 20px', background: 'var(--bg-1)',
              border: '1px solid var(--danger)', borderLeft: '4px solid var(--danger)',
              borderRadius: 4, display: 'flex', gap: 16, alignItems: 'center',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--danger)', fontSize: 20, fontWeight: 600 }}>⚠</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-0)' }}>
                  {critCount} critical finding{critCount !== 1 ? 's' : ''} detected
                </div>
                <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 4 }}>
                  Address the critical findings first to recover the most score points.
                </div>
              </div>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px',
                fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                background: 'var(--danger-soft)', color: 'var(--danger)',
                border: '1px solid rgba(255,61,110,0.32)', borderRadius: 2,
                boxShadow: '0 0 12px -2px var(--danger)',
              }}>{critCount} CRIT</span>
            </div>
          )}

          {result.findings.length === 0 && (
            <div style={{
              padding: '24px 20px', background: 'var(--bg-1)',
              border: '1px solid var(--good-soft)', borderLeft: '4px solid var(--good)',
              borderRadius: 4, display: 'flex', gap: 16, alignItems: 'center',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--good)', fontSize: 20 }}>✓</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-0)' }}>No findings detected</div>
                <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 4 }}>
                  The audit completed without detecting performance issues. Try scanning a more complex page or flow.
                </div>
              </div>
            </div>
          )}

          {/* Module summary grid */}
          {sortedModules.length > 0 && (
            <div>
              <div className="t-label" style={{ marginBottom: 8 }}>MODULE SUMMARY</div>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8,
              }}>
                {sortedModules.map(([mod, findings]) => {
                  const crit = getCritCount(findings);
                  const color = crit > 0 ? 'var(--danger)' : findings.some((f) => f.severity === 'high') ? '#ff9f0a' : 'var(--fg-2)';
                  return (
                    <div key={mod} style={{
                      padding: '10px 14px', background: 'var(--bg-2)',
                      border: '1px solid var(--line)', borderRadius: 4,
                    }}>
                      <div className="t-label" style={{ fontSize: 10, color, marginBottom: 4 }}>{mod.toUpperCase()}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color }}>
                        {findings.length}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-3)' }}>finding{findings.length !== 1 ? 's' : ''}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Module sections */}
      {sortedModules.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <div>
              <div className="t-label t-label-cyan" style={{ marginBottom: 4 }}>MODULE BREAKDOWN</div>
              <div className="t-disp" style={{ fontSize: 24, fontWeight: 700 }}>Findings by module</div>
            </div>
            <div className="t-mono" style={{ fontSize: 11, color: 'var(--fg-2)' }}>
              <span style={{ color: 'var(--danger)' }}>⚡ direct impact</span>
              <span style={{ marginLeft: 12, color: 'var(--warn)' }}>◇ theoretical debt</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sortedModules.map(([mod, findings], i) => (
              <ModuleSection
                key={mod}
                moduleName={mod}
                findings={findings}
                defaultOpen={i === 0}
              />
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: 48, paddingTop: 24,
        borderTop: '1px solid var(--line)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        color: 'var(--fg-3)', fontFamily: 'var(--font-mono)', fontSize: 11,
        flexWrap: 'wrap', gap: 8,
      }}>
        <span>vibecheck-ultra · v0.5.0-alpha · headless-chromium</span>
        <span>audit {result.id} · {new Date(result.startedAt).toUTCString()}</span>
      </div>
    </main>
  );
}
