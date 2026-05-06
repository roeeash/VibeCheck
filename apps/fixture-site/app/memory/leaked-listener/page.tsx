'use client';

import { useState, useEffect } from 'react';

let globalClickCount = 0;

function LeakyListenerComponent() {
  const [clicks, setClicks] = useState(0);

  useEffect(() => {
    const handler = () => {
      globalClickCount++;
      setClicks(globalClickCount);
    };
    // BUG: addEventListener without removeEventListener cleanup
    document.addEventListener('click', handler);
    // intentionally NOT returning: () => document.removeEventListener('click', handler)
  }, []);

  return (
    <div style={{ border: '1px solid orange', padding: '1rem', margin: '1rem 0' }}>
      <strong>LeakyListenerComponent</strong> — global click count: {clicks}
      <p style={{ color: 'orange', fontSize: '0.85rem' }}>
        ⚠ Each mount adds a click listener that is never removed on unmount.
      </p>
    </div>
  );
}

export default function LeakedListenerPage() {
  const [key, setKey] = useState(0);
  const [show, setShow] = useState(true);

  const remount = () => {
    setShow(false);
    setTimeout(() => {
      setKey((k) => k + 1);
      setShow(true);
    }, 100);
  };

  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>Leaked Event Listener</h1>
      <p>
        The component below attaches a <code>document.addEventListener</code> click handler without removing it on
        unmount. Click &quot;Remount&quot; repeatedly to accumulate listeners.
      </p>
      <button onClick={remount} style={{ marginRight: '0.5rem' }}>
        Remount (accumulate listeners)
      </button>
      <button onClick={() => setShow((s) => !s)}>
        {show ? 'Unmount' : 'Mount'}
      </button>
      {show && <LeakyListenerComponent key={key} />}
    </main>
  );
}
