import React, { useRef, useState } from 'react';

const ACCENT = 'var(--cyan)';

interface HeroProps {
  url: string;
  setUrl: (u: string) => void;
  onScan: () => void;
  error?: string | undefined;
}

function validateUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return 'Enter a URL to scan.';
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return 'URL must start with http:// or https://';
  }
  try {
    new URL(trimmed);
    return null;
  } catch {
    return 'Enter a valid URL.';
  }
}

export function Hero({ url, setUrl, onScan, error }: HeroProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasUrl = url.trim().length > 0;
  const [localError, setLocalError] = useState<string | null>(null);

  const handleScan = () => {
    const err = validateUrl(url);
    if (err) { setLocalError(err); return; }
    setLocalError(null);
    onScan();
  };

  const displayError = error ?? localError;

  return (
    <main style={{
      position: 'relative', zIndex: 1,
      minHeight: 'calc(100vh - 78px)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 32px',
    }}>
      {/* eyebrow */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <span style={{ width: 32, height: 1, background: `linear-gradient(90deg, transparent, ${ACCENT})` }} />
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase',
          color: ACCENT, textShadow: `0 0 8px ${ACCENT}`,
        }}>BLACK-BOX PERFORMANCE AUDIT</span>
        <span style={{ width: 32, height: 1, background: `linear-gradient(270deg, transparent, ${ACCENT})` }} />
      </div>

      <h1 className="t-disp" style={{
        fontSize: 'clamp(48px, 7vw, 96px)', fontWeight: 700, lineHeight: 1.05,
        letterSpacing: '-0.03em', textAlign: 'center', margin: 0, marginBottom: 18,
      }}>
        <span style={{ color: 'var(--fg-0)', display: 'block' }}>Find the bottlenecks</span>
        <span style={{
          display: 'block', marginTop: 6,
          background: `linear-gradient(95deg, ${ACCENT}, var(--violet))`,
          WebkitBackgroundClip: 'text', backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: `drop-shadow(0 0 14px ${ACCENT}80)`,
        }}>static analysis can't see</span>
      </h1>

      <p style={{
        maxWidth: 640, textAlign: 'center', color: 'var(--fg-2)', fontSize: 15, lineHeight: 1.6,
        margin: '0 0 56px', fontFamily: 'var(--font-sans)',
      }}>
        VibeCheck audits any live web app — no setup, no source code needed.
        It opens your site in a headless browser, traces every frame, network request, and render cycle,
        then delivers a report with prioritized findings and evidence you can replay.
      </p>

      {/* Input zone */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 760 }}>
        <div style={{
          position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: 14,
          padding: 28,
          background: 'rgba(10,12,18,0.85)', backdropFilter: 'blur(8px)',
          border: `1px solid ${ACCENT === 'var(--cyan)' ? 'var(--cyan-line)' : ACCENT}`,
          borderRadius: 8,
          boxShadow: `0 0 0 1px var(--line), 0 0 60px -12px var(--cyan), inset 0 0 60px -20px rgba(0,229,255,0.1)`,
          animation: 'pulse-glow 3.2s ease-in-out infinite',
        }}>
          {/* Corner ticks */}
          {(['tl','tr','bl','br'] as const).map((c) => (
            <div key={c} style={{
              position: 'absolute',
              top: c.startsWith('t') ? -1 : 'auto',
              bottom: c.startsWith('b') ? -1 : 'auto',
              left: c.endsWith('l') ? -1 : 'auto',
              right: c.endsWith('r') ? -1 : 'auto',
              width: 16, height: 16,
              borderTop: c.startsWith('t') ? `2px solid var(--cyan)` : 'none',
              borderBottom: c.startsWith('b') ? `2px solid var(--cyan)` : 'none',
              borderLeft: c.endsWith('l') ? `2px solid var(--cyan)` : 'none',
              borderRight: c.endsWith('r') ? `2px solid var(--cyan)` : 'none',
              filter: 'drop-shadow(0 0 4px var(--cyan))',
            }} />
          ))}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="t-label t-label-cyan" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: ACCENT, fontFamily: 'var(--font-mono)', fontSize: 10 }}>▶</span>
              TARGET URL
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-3)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT, boxShadow: `0 0 6px var(--cyan)` }} />
              probe ready
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 10,
              padding: '0 14px',
              background: 'var(--bg-0)',
              border: `1px solid ${hasUrl ? 'var(--cyan)' : 'var(--line-strong)'}`,
              borderRadius: 4,
              transition: 'border-color 200ms',
            }}>
              <span style={{ color: ACCENT, fontFamily: 'var(--font-mono)', fontSize: 14 }}>$</span>
              <input
                ref={inputRef}
                value={url}
                onChange={(e) => { setUrl(e.target.value); setLocalError(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleScan(); }}
                placeholder="https://your-app.vercel.app"
                aria-label="URL to audit"
                style={{
                  flex: 1, padding: '18px 0',
                  fontFamily: 'var(--font-mono)', fontSize: 15,
                  background: 'transparent', border: 'none', outline: 'none',
                  color: 'var(--fg-0)', letterSpacing: '0.01em',
                }}
              />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: ACCENT, animation: 'type-cursor 1s step-end infinite' }}>▍</span>
            </div>
            <button
              className="btn-cta"
              disabled={!hasUrl}
              onClick={handleScan}
            >
              RUN AUDIT
              <span style={{ opacity: 0.5, fontSize: 10, marginLeft: 4 }}>↵</span>
            </button>
          </div>

          {displayError && (
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--danger)',
              padding: '8px 12px', background: 'var(--danger-soft)',
              border: '1px solid rgba(255,61,110,0.3)', borderRadius: 3,
            }}>
              ⚠ {displayError}
            </div>
          )}

          <div style={{ display: 'flex', gap: 16, justifyContent: 'space-between', flexWrap: 'wrap', paddingTop: 6 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-2)' }}>
              Black-box performance audit · No setup · No source code access
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-2)' }}>
              6 modules · Evidence-backed findings · Confidence-rated
            </div>
          </div>
        </div>
      </div>

      {/* Module cards */}
      <div style={{
        marginTop: 64, width: '100%', maxWidth: 960,
        display: 'flex', flexDirection: 'column', gap: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
          <span style={{ width: 48, height: 1, background: `linear-gradient(90deg, transparent, ${ACCENT})` }} />
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase',
            color: ACCENT, textShadow: `0 0 8px ${ACCENT}`,
          }}>What each of the 6 modules audits</span>
          <span style={{ width: 48, height: 1, background: `linear-gradient(270deg, transparent, ${ACCENT})` }} />
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1,
          background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 6, overflow: 'hidden',
        }}>
        {[
          { sigil: '◉', title: 'Observer', body: 'Traces long tasks (>50ms), layout shifts, forced reflows, and Web Vitals. Pins each issue to the component frame that caused it.' },
          { sigil: '◈', title: 'Proxy', body: 'Intercepts every network call. Detects N+1 request chains, waterfalls, over-fetching, and duplicate requests — mapped to their trigger.' },
          { sigil: '◇', title: 'Architect', body: 'Infers backend behavior from response shape and timing. Flags slow endpoints, wide responses, and patterns consistent with missing indexes.' },
          { sigil: '▣', title: 'Asset Inspector', body: 'Audits images, CSS, and JS bundles. Catches oversized images, unused stylesheets, and bloated bundles that delay first paint.' },
          { sigil: '△', title: 'Render', body: 'Runs the React profiler against the live page. Finds missing memoization, unvirtualized long lists, and inline style allocations.' },
          { sigil: '◎', title: 'Memory', body: 'Stress-tests the page with repeated state churn. Detects leaked intervals, uncleaned listeners, unbounded state, and recursive handlers.' },
        ].map((f, i) => (
          <div key={i} style={{ background: 'var(--bg-1)', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan)', fontSize: 18, fontWeight: 600 }}>{f.sigil}</span>
              <span className="t-label" style={{ color: 'var(--fg-0)', fontSize: 12 }}>{f.title}</span>
            </div>
            <p style={{ margin: 0, color: 'var(--fg-2)', fontSize: 13, lineHeight: 1.55 }}>{f.body}</p>
          </div>
        ))}
        </div>
      </div>
    </main>
  );
}
