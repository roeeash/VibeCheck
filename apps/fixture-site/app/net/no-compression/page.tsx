/* ANTI-PATTERN: Fetches 200KB of text without requesting or receiving compression */
'use client';
import { useState, useEffect } from 'react';

export default function NoCompression() {
  const [data, setData] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/text').then((r) => r.json()).then((d) => setData(d.text));
  }, []);

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Missing Compression</h1>
      <p>Loaded {data ? data.length : 0} characters</p>
    </main>
  );
}
