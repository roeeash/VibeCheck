'use client';
// ANTI-PATTERN: setInterval without cleanup

import { useEffect } from 'react';

export default function LeakIntervalPage() {
  useEffect(() => {
    setInterval(() => {
      console.log('leaked interval tick');
    }, 1000);
  }, []);

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Leak Interval</h1>
      <p>setInterval runs without cleanup on unmount.</p>
    </main>
  );
}
