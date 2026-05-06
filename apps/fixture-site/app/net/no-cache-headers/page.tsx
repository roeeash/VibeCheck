/* ANTI-PATTERN: Fetches config JSON that is served without any cache headers */
'use client';
import { useState, useEffect } from 'react';

export default function NoCacheHeaders() {
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch('/api/static-config').then((r) => r.json()).then(setConfig);
  }, []);

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Missing Cache Headers</h1>
      <pre>{config ? JSON.stringify(config, null, 2) : 'loading...'}</pre>
    </main>
  );
}
