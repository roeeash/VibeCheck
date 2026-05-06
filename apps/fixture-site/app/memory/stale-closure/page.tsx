'use client';

import { useState, useEffect } from 'react';

export default function StaleClosurePage() {
  const [count, setCount] = useState(0);
  const [logged, setLogged] = useState<string[]>([]);

  useEffect(() => {
    // BUG: classic stale closure — captures `count` at 0, never sees updates
    const id = setInterval(() => {
      const msg = `[stale closure] count seen by interval = ${count}`;
      console.log(msg);
      setLogged((prev) => [...prev, msg]);
    }, 1000);
    // Note: cleanup IS returned here (the interval isn't leaked),
    // but the stale closure means it always logs count=0
    return () => clearInterval(id);
  }, []); // empty deps — count is captured at 0 forever

  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>Stale Closure</h1>
      <p>
        The <code>setInterval</code> below was created with an empty dependency array. It captures{' '}
        <code>count</code> at its initial value of 0 and never sees the updated value, even as the counter increments.
      </p>
      <p>
        Current count: <strong>{count}</strong>
      </p>
      <button onClick={() => setCount((c) => c + 1)} style={{ marginBottom: '1rem' }}>
        Increment count
      </button>
      <p style={{ color: 'orange', fontSize: '0.85rem' }}>
        ⚠ The interval logs &quot;count = 0&quot; forever regardless of how many times you click Increment.
      </p>
      <ul style={{ maxHeight: '200px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.75rem' }}>
        {logged.map((msg, i) => (
          <li key={i}>{msg}</li>
        ))}
      </ul>
    </main>
  );
}
