'use client';

import { useState, useEffect } from 'react';

function LeakyComponent() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    // BUG: no cleanup returned — interval leaks on every mount
    setInterval(() => {
      setTick((t) => t + 1);
    }, 500);
  });

  return (
    <div style={{ border: '1px solid red', padding: '1rem', margin: '1rem 0' }}>
      <strong>LeakyComponent</strong> — tick: {tick}
      <p style={{ color: 'red', fontSize: '0.85rem' }}>
        ⚠ This component creates a new setInterval on every render and never clears it.
      </p>
    </div>
  );
}

export default function LeakedIntervalPage() {
  const [show, setShow] = useState(true);

  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>Leaked setInterval</h1>
      <p>
        The component below calls <code>setInterval</code> inside <code>useEffect</code> but never returns a cleanup
        function. A new interval is created on every render, compounding over time.
      </p>
      <button onClick={() => setShow((s) => !s)}>
        {show ? 'Unmount component' : 'Mount component'}
      </button>
      {show && <LeakyComponent />}
    </main>
  );
}
