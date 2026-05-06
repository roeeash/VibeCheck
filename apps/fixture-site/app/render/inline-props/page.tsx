'use client';

import { useState, useEffect } from 'react';

function InlineChild({ style, onClick, label }: { style: React.CSSProperties; onClick: () => void; label: string }) {
  return (
    <div style={style} onClick={onClick}>
      {label}
    </div>
  );
}

export default function InlinePropsPage() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 300);
    return () => clearInterval(id);
  }, []);

  const items = Array.from({ length: 25 }, (_, i) => i);

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Inline Props Fixture</h1>
      <p>Tick: {tick} — each child receives fresh inline object and arrow-function props every render</p>
      {items.map((i) => (
        <InlineChild
          key={i}
          style={{ color: 'red', margin: '4px', padding: '4px' }}
          onClick={() => console.log('clicked', i)}
          label={`Item ${i} — tick ${tick}`}
        />
      ))}
    </main>
  );
}
