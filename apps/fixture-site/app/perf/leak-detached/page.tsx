'use client';
// ANTI-PATTERN: detaches DOM but keeps refs in array

import { useRef, useEffect } from 'react';

const detached: Node[] = [];

export default function LeakDetachedPage() {
  const ref = useRef<HTMLDivElement>(null);

  const detach = () => {
    if (ref.current) {
      detached.push(ref.current);
      ref.current.remove();
    }
  };

  useEffect(() => {
    return () => { detached.length = 0; };
  }, []);

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Leak Detached DOM</h1>
      <div ref={ref} style={{ background: '#eee', padding: '1rem' }}>
        Detach me
      </div>
      <button onClick={detach}>Detach (keeps ref)</button>
    </main>
  );
}
