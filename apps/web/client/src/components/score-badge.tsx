import React from 'react';

interface ScoreBadgeProps {
  score: number;
}

function getGrade(score: number): { letter: string; color: string } {
  if (score >= 90) return { letter: 'A', color: 'var(--good)' };
  if (score >= 75) return { letter: 'B', color: '#7fff00' };
  if (score >= 60) return { letter: 'C', color: 'var(--warn)' };
  if (score >= 40) return { letter: 'D', color: '#ff9f0a' };
  return { letter: 'F', color: 'var(--danger)' };
}

function getTier(score: number): string {
  if (score >= 80) return 'OPTIMIZED';
  if (score >= 65) return 'STABLE';
  if (score >= 40) return 'DEGRADED';
  return 'CRITICAL';
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  const { letter, color } = getGrade(score);
  const tier = getTier(score);
  const r = 110;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);

  return (
    <div style={{
      padding: 32, background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 6,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ position: 'relative', width: 260, height: 260 }}>
        <svg width="260" height="260" viewBox="0 0 260 260" style={{ transform: 'rotate(-90deg)' }}>
          <defs>
            <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#00e5ff" />
              <stop offset="100%" stopColor={color === 'var(--danger)' ? '#ff3d6e' : '#a855ff'} />
            </linearGradient>
          </defs>
          <circle cx="130" cy="130" r={r} stroke="var(--line)" strokeWidth="2" fill="none" />
          {[25, 50, 75].map((t) => {
            const a = (t / 100) * 360 - 90;
            const rad = a * Math.PI / 180;
            return (
              <line key={t}
                x1={130 + (r - 8) * Math.cos(rad)} y1={130 + (r - 8) * Math.sin(rad)}
                x2={130 + (r + 8) * Math.cos(rad)} y2={130 + (r + 8) * Math.sin(rad)}
                stroke="var(--fg-3)" strokeWidth="1"
              />
            );
          })}
          <circle cx="130" cy="130" r={r}
            stroke="url(#ring-grad)" strokeWidth="6" fill="none"
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 8px ${color})`, transition: 'stroke-dashoffset 1.2s ease-out' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div className="t-label" style={{ color, marginBottom: 4 }}>VIBE-SCORE</div>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 84,
            lineHeight: 1, letterSpacing: '-0.04em',
            color, textShadow: `0 0 24px ${color}`,
          }} className="tnum">{score}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-2)', marginTop: 4 }}>/ 100</div>
          <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color }}>
            {letter}
          </div>
        </div>
        <div style={{
          position: 'absolute', bottom: -14, left: '50%', transform: 'translateX(-50%)',
          padding: '4px 14px', background: 'var(--bg-0)',
          border: `1px solid ${color}`, borderRadius: 999,
          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
          letterSpacing: '0.22em', color, textShadow: `0 0 8px ${color}`,
          whiteSpace: 'nowrap',
        }}>{tier}</div>
      </div>
    </div>
  );
}
