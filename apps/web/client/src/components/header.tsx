import React from 'react';

const ACCENT = 'var(--cyan)';

export function Header() {
  return (
    <header style={{
      position: 'relative', zIndex: 2,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '20px 32px',
      borderBottom: '1px solid var(--line)',
      background: 'rgba(5,6,10,0.6)',
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{
          fontFamily: 'var(--font-mono)', color: ACCENT, fontSize: 22, fontWeight: 600,
          textShadow: `0 0 8px ${ACCENT}`, lineHeight: 1,
        }}>▎</span>
        <div className="t-disp" style={{
          fontSize: 18, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
        }}>
          <span style={{ color: 'var(--fg-0)' }}>VIBECHECK</span>
          <span style={{ color: ACCENT, marginLeft: 6, textShadow: `0 0 10px ${ACCENT}` }}>ULTRA</span>
        </div>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.1em',
          padding: '2px 6px', border: '1px solid var(--line)', borderRadius: 2, marginLeft: 10,
        }}>v0.5.0-alpha</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="status-dot" />
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', color: 'var(--fg-1)',
          }}>SYSTEM · READY TO SCAN</span>
        </div>
        <div style={{ display: 'flex', gap: 18, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-2)' }}>
          <a href="https://github.com/roeeash/VibeCheck" style={{ color: 'inherit', textDecoration: 'none' }}>github</a>
        </div>
      </div>
    </header>
  );
}
