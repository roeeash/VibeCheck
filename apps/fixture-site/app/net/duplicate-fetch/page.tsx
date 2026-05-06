/* ANTI-PATTERN: Two identical fetches to the same endpoint with no caching */
'use client';
import { useState, useEffect } from 'react';

export default function DuplicateFetch() {
  const [dataA, setDataA] = useState<Record<string, unknown> | null>(null);
  const [dataB, setDataB] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch('/api/data').then((r) => r.json()).then(setDataA);
  }, []);

  useEffect(() => {
    fetch('/api/data').then((r) => r.json()).then(setDataB);
  }, []);

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Duplicate Fetch</h1>
      <p>Fetch A: {dataA ? String((dataA as any).message) : 'loading...'}</p>
      <p>Fetch B: {dataB ? String((dataB as any).message) : 'loading...'}</p>
    </main>
  );
}
