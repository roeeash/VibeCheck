import React, { useEffect, useRef } from 'react';

interface LightningStrikeProps {
  onDone: () => void;
}

function jaggedPath(x1: number, y1: number, x2: number, y2: number, segments = 14, jitter = 60): string {
  const pts: [number, number][] = [[x1, y1]];
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const px = x1 + (x2 - x1) * t + (Math.random() - 0.5) * jitter * (1 - Math.abs(t - 0.5) * 2);
    const py = y1 + (y2 - y1) * t + (Math.random() - 0.5) * jitter * 0.4;
    pts.push([px, py]);
  }
  pts.push([x2, y2]);
  return 'M ' + pts.map((p) => p.join(' ')).join(' L ');
}

export function LightningStrike({ onDone }: LightningStrikeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const overlay = overlayRef.current;
    const flash = flashRef.current;
    if (!svg || !overlay || !flash) return;

    const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const W = window.innerWidth;
    const H = window.innerHeight;
    const toX = W / 2;
    const toY = H / 2;
    const fromX = W / 2;
    const fromY = 0;

    const BOLTS = 5;
    const DURATION = prefersReduced ? 0 : 700;
    const NS = 'http://www.w3.org/2000/svg';

    if (!prefersReduced) {
      for (let i = 0; i < BOLTS; i++) {
        const ox = (Math.random() - 0.5) * 80;
        const oy = (Math.random() - 0.5) * 30;
        const d = jaggedPath(fromX + ox, fromY, toX + ox * 0.3, toY + oy, 18, 90);

        const glow = document.createElementNS(NS, 'path');
        glow.setAttribute('d', d);
        glow.setAttribute('stroke', i % 2 === 0 ? '#00e5ff' : '#a855ff');
        glow.setAttribute('stroke-width', String(8 + Math.random() * 4));
        glow.setAttribute('fill', 'none');
        glow.setAttribute('opacity', '0.6');
        glow.setAttribute('stroke-linecap', 'round');
        glow.setAttribute('filter', 'blur(6px)');
        svg.appendChild(glow);

        const core = document.createElementNS(NS, 'path');
        core.setAttribute('d', d);
        core.setAttribute('stroke', '#ffffff');
        core.setAttribute('stroke-width', '1.6');
        core.setAttribute('fill', 'none');
        core.setAttribute('stroke-linecap', 'round');
        svg.appendChild(core);

        const branchCount = 2 + Math.floor(Math.random() * 3);
        for (let b = 0; b < branchCount; b++) {
          const t = 0.2 + Math.random() * 0.6;
          const bx = fromX + ox + (toX + ox * 0.3 - fromX - ox) * t;
          const by = fromY + (toY + oy - fromY) * t;
          const bex = bx + (Math.random() - 0.5) * 200;
          const bey = by + (Math.random() - 0.5) * 120 + 40;
          const bd = jaggedPath(bx, by, bex, bey, 8, 40);

          const bglow = document.createElementNS(NS, 'path');
          bglow.setAttribute('d', bd);
          bglow.setAttribute('stroke', '#00e5ff');
          bglow.setAttribute('stroke-width', '3');
          bglow.setAttribute('fill', 'none');
          bglow.setAttribute('opacity', '0.5');
          bglow.setAttribute('filter', 'blur(3px)');
          svg.appendChild(bglow);

          const bcore = document.createElementNS(NS, 'path');
          bcore.setAttribute('d', bd);
          bcore.setAttribute('stroke', '#ffffff');
          bcore.setAttribute('stroke-width', '1');
          bcore.setAttribute('fill', 'none');
          bcore.setAttribute('opacity', '0.85');
          svg.appendChild(bcore);
        }
      }

      requestAnimationFrame(() => { flash.style.opacity = '1'; });
    } else {
      // Immediately hide overlay when prefers-reduced-motion
      overlay.style.opacity = '0';
    }

    let t = 0;
    const flickerInterval = setInterval(() => {
      t += 50;
      if (!prefersReduced) {
        svg.style.opacity = String(Math.random() > 0.4 ? 1 : 0.3);
        if (t > DURATION - 200) flash.style.opacity = '0';
      }
    }, 50);

    const doneTimer = setTimeout(() => {
      clearInterval(flickerInterval);
      if (!prefersReduced) {
        overlay.style.transition = 'opacity 250ms ease-out';
        overlay.style.opacity = '0';
        setTimeout(onDone, 260);
      } else {
        onDone();
      }
    }, DURATION === 0 ? 0 : DURATION);

    return () => {
      clearInterval(flickerInterval);
      clearTimeout(doneTimer);
    };
  }, []);

  return (
    <div ref={overlayRef} style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      pointerEvents: 'none', mixBlendMode: 'screen',
    }}>
      <div ref={flashRef} style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 50% 50%, rgba(0,229,255,0.35), transparent 40%)',
        opacity: 0, transition: 'opacity 80ms ease-out',
      }} />
      <svg
        ref={svgRef}
        width="100%" height="100%"
        viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`}
        style={{ position: 'absolute', inset: 0 }}
      />
    </div>
  );
}
