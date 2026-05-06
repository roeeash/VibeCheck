'use client';
// ANTI-PATTERN: read-write-read offsetHeight loop

import { useRef } from 'react';

export default function ForcedReflowPage() {
  const ref = useRef<HTMLDivElement>(null);

  const trigger = () => {
    if (!ref.current) return;
    for (let i = 0; i < 100; i++) {
      const h = ref.current.offsetHeight;
      ref.current.style.height = `${h + 10}px`;
      ref.current.offsetHeight;
    }
  };

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Forced Reflow</h1>
      <div ref={ref} style={{ background: '#eee', padding: '1rem' }}>
        Measured element
      </div>
      <button onClick={trigger}>Trigger Reflow Loop</button>
    </main>
  );
}
