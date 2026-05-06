'use client';
// ANTI-PATTERN: :hover triggering full-doc reflow

import { useState } from 'react';

export default function ReflowHoverPage() {
  const [items] = useState(() =>
    Array.from({ length: 500 }, (_, i) => `Item ${i}`)
  );

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Reflow Hover</h1>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {items.map((item) => (
          <li
            key={item}
            style={{ padding: '8px', borderBottom: '1px solid #ccc' }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.width = `${el.offsetWidth + 1}px`;
            }}
          >
            {item}
          </li>
        ))}
      </ul>
    </main>
  );
}
