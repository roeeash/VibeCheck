/* ANTI-PATTERN: Fetches 50 fields from API but only uses 3 */
'use client';
import { useState, useEffect } from 'react';

export default function Overfetch() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch('/api/overfetch-data').then((r) => r.json()).then(setData);
  }, []);

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Over-fetching</h1>
      <p>Name: {data ? String((data as any).name) : 'loading...'}</p>
      <p>Age: {data ? String((data as any).age) : 'loading...'}</p>
      <p>City: {data ? String((data as any).city) : 'loading...'}</p>
    </main>
  );
}
