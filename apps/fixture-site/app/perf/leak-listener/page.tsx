'use client';
// ANTI-PATTERN: mounts adding listeners w/o removal

import { useEffect } from 'react';

export default function LeakListenerPage() {
  useEffect(() => {
    const handler = () => console.log('leaked listener');
    window.addEventListener('resize', handler);
  }, []);

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Leak Listener</h1>
      <p>Each mount adds a resize listener without cleanup.</p>
      <button onClick={() => window.location.reload()}>Remount Component</button>
    </main>
  );
}
