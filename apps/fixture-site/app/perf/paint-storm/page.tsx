'use client';
// ANTI-PATTERN: animation triggering constant paints

import { useEffect, useRef } from 'react';

export default function PaintStormPage() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      if (ref.current) {
        ref.current.style.transform = `translateX(${i++ % 500}px)`;
        ref.current.style.backgroundColor = `hsl(${i % 360}, 80%, 60%)`;
      }
    }, 16);
    return () => clearInterval(id);
  }, []);

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Paint Storm</h1>
      <div
        ref={ref}
        style={{ width: '100px', height: '100px', background: 'blue' }}
      />
    </main>
  );
}
