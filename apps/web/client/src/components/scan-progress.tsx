import React, { useEffect, useRef, useState } from 'react';
import type { AuditResult } from '../types.js';
import { SCAN_PHASES, PHASE_LOG } from '../types.js';

const ACCENT = 'var(--cyan)';

interface LogLine { phase: string; text: string; ts: number }

interface ScanProgressProps {
  url: string;
  auditPromise: Promise<AuditResult>;
  onComplete: (result: AuditResult) => void;
  onError: (msg: string) => void;
}

export function ScanProgress({ url, auditPromise, onComplete, onError }: ScanProgressProps) {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [logLines, setLogLines] = useState<LogLine[]>([]);
  const [done, setDone] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<AuditResult | null>(null);
  const animDoneRef = useRef(false);
  const auditDoneRef = useRef(false);

  const totalDuration = SCAN_PHASES.reduce((a, p) => a + p.duration, 0);
  const elapsed =
    SCAN_PHASES.slice(0, phaseIdx).reduce((a, p) => a + p.duration, 0) +
    (SCAN_PHASES[phaseIdx]?.duration ?? 0) * phaseProgress;
  const totalPct = Math.min(99, (elapsed / totalDuration) * 100);

  // Resolve audit promise
  useEffect(() => {
    auditPromise
      .then((result) => {
        resultRef.current = result;
        auditDoneRef.current = true;
        if (animDoneRef.current) triggerComplete();
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Audit failed';
        onError(msg);
      });
  }, []);

  function triggerComplete() {
    const result = resultRef.current;
    if (result) {
      setDone(true);
      setTimeout(() => onComplete(result), 400);
    }
  }

  // Phase animation
  useEffect(() => {
    if (phaseIdx >= SCAN_PHASES.length) {
      animDoneRef.current = true;
      if (auditDoneRef.current) triggerComplete();
      return;
    }
    const phase = SCAN_PHASES[phaseIdx]!;
    const lines = PHASE_LOG[phase.id] ?? [];
    let lineIdx = 0;
    const startTime = Date.now();

    const lineInterval = setInterval(() => {
      if (lineIdx < lines.length && lines[lineIdx]) {
        const text = lines[lineIdx]!;
        setLogLines((prev) => [...prev, { phase: phase.label, text, ts: Date.now() }]);
        lineIdx++;
      }
    }, phase.duration / Math.max(lines.length, 1));

    let rafId: number;
    const tick = () => {
      const e = Date.now() - startTime;
      const p = Math.min(1, e / phase.duration);
      setPhaseProgress(p);
      if (p < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        clearInterval(lineInterval);
        setPhaseIdx((i) => i + 1);
        setPhaseProgress(0);
      }
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(lineInterval);
    };
  }, [phaseIdx]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logLines]);

  return (
    <main style={{
      position: 'relative', zIndex: 1,
      minHeight: 'calc(100vh - 78px)',
      padding: '40px 32px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      animation: 'fade-in 300ms ease-out',
    }}>
      {/* eyebrow */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: ACCENT, boxShadow: `0 0 10px var(--cyan)`,
          animation: 'pulse-dot 1s ease-in-out infinite', display: 'inline-block',
        }} />
        <span className="t-label t-label-cyan" style={{ letterSpacing: '0.22em' }}>
          {done ? 'SCAN COMPLETE · PREPARING RESULTS' : 'SCAN IN PROGRESS · DO NOT CLOSE'}
        </span>
      </div>

      <div className="t-mono" style={{ fontSize: 12, color: 'var(--fg-2)', marginBottom: 32, textAlign: 'center' }}>
        target · <span style={{ color: 'var(--fg-0)' }}>{url}</span>
      </div>

      <div style={{ width: '100%', maxWidth: 1100 }}>
        {/* Progress header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 64, fontWeight: 700,
            letterSpacing: '-0.04em', color: ACCENT,
            textShadow: `0 0 24px var(--cyan)`, lineHeight: 1,
          }}>
            <span className="tnum">{Math.floor(done ? 100 : totalPct).toString().padStart(2, '0')}</span>
            <span style={{ fontSize: 32, opacity: 0.5 }}>%</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="t-label" style={{ marginBottom: 6 }}>CURRENT PHASE</div>
            <div className="t-disp" style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg-0)', textTransform: 'uppercase' }}>
              {done ? 'COMPLETE' : (SCAN_PHASES[phaseIdx]?.label ?? 'COMPLETE')}
            </div>
            <div className="t-mono" style={{ fontSize: 11, color: 'var(--fg-2)', marginTop: 4 }}>
              {done ? 'finalizing report…' : (SCAN_PHASES[phaseIdx]?.desc ?? 'finalizing…')}
            </div>
          </div>
        </div>

        {/* Main progress bar */}
        <div style={{
          height: 6, background: 'var(--bg-2)', border: '1px solid var(--line)',
          borderRadius: 1, overflow: 'hidden', marginBottom: 24,
        }}>
          <div style={{
            height: '100%',
            width: `${done ? 100 : totalPct}%`,
            background: 'linear-gradient(90deg, var(--cyan), var(--violet))',
            boxShadow: '0 0 12px var(--cyan)',
            transition: 'width 100ms linear',
          }} />
        </div>

        {/* Phase grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${SCAN_PHASES.length}, 1fr)`,
          gap: 4, marginBottom: 32,
        }}>
          {SCAN_PHASES.map((p, i) => {
            const state = i < phaseIdx ? 'done' : i === phaseIdx ? 'active' : 'pending';
            return (
              <div key={p.id} style={{
                padding: '10px 12px',
                background: state === 'active' ? 'var(--cyan-soft)' : 'var(--bg-1)',
                border: `1px solid ${state === 'active' ? 'var(--cyan)' : 'var(--line)'}`,
                borderRadius: 2, opacity: state === 'pending' ? 0.4 : 1,
                position: 'relative', overflow: 'hidden', transition: 'all 200ms',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
                    color: state === 'done' ? 'var(--good)' : state === 'active' ? 'var(--cyan)' : 'var(--fg-3)',
                  }}>
                    {state === 'done' ? '✓' : state === 'active' ? '▶' : '·'}
                  </span>
                  <span className="t-label" style={{
                    fontSize: 10, color: state === 'pending' ? 'var(--fg-3)' : 'var(--fg-1)',
                  }}>{p.label}</span>
                </div>
                <div className="t-mono" style={{ fontSize: 10, color: 'var(--fg-2)', lineHeight: 1.3 }}>
                  {state === 'done' && 'ok'}
                  {state === 'active' && `${Math.floor(phaseProgress * 100)}%`}
                  {state === 'pending' && 'queued'}
                </div>
                {state === 'active' && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0,
                    height: 2, width: `${phaseProgress * 100}%`,
                    background: 'var(--cyan)', boxShadow: '0 0 8px var(--cyan)',
                    transition: 'width 100ms linear',
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Terminal log */}
        <div style={{
          background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 4, overflow: 'hidden',
        }}>
          <div style={{
            padding: '8px 14px', borderBottom: '1px solid var(--line)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'var(--bg-2)',
          }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {['#ff5f57','#febc2e','#28c840'].map((c) => (
                <span key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />
              ))}
            </div>
            <span className="t-mono" style={{ fontSize: 10, color: 'var(--fg-2)' }}>
              vibecheck@core ~ scanning · {logLines.length} events
            </span>
            <span style={{ width: 60 }} />
          </div>
          <div ref={logRef} style={{
            height: 220, overflowY: 'auto', padding: '12px 14px',
            fontFamily: 'var(--font-mono)', fontSize: 11.5, lineHeight: 1.7, color: 'var(--fg-1)',
          }}>
            {logLines.length === 0 && (
              <div style={{ color: 'var(--fg-3)' }}>$ vibecheck scan {url} --modules=all</div>
            )}
            {logLines.map((line, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, animation: 'drift-up 200ms ease-out' }}>
                <span style={{ color: 'var(--fg-3)', minWidth: 60 }}>[{line.phase.toLowerCase()}]</span>
                <span style={{
                  color: line.text.includes('BLIND') || line.text.includes('unreclaimed')
                    ? 'var(--danger)'
                    : line.text.includes('detected') || line.text.includes('duplicate') || line.text.includes('anomaly')
                    ? 'var(--warn)'
                    : 'var(--fg-1)',
                }}>{line.text}</span>
              </div>
            ))}
            <div style={{ display: 'inline-flex', gap: 6, color: ACCENT }}>
              <span>$</span>
              <span style={{ animation: 'type-cursor 1s step-end infinite' }}>▍</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
