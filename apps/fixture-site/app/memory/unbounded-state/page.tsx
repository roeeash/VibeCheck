'use client';

import { useState, useEffect } from 'react';

interface LogEntry {
  id: number;
  timestamp: number;
  value: number;
}

declare global {
  interface Window {
    activityLog: LogEntry[];
    __VIBE_UNBOUNDED_LOG__: LogEntry[];
  }
}

export default function UnboundedStatePage() {
  const [log, setLog] = useState<LogEntry[]>([]);

  useEffect(() => {
    // BUG: appending to array every 200ms with no eviction
    const id = setInterval(() => {
      setLog((prev) => {
        const next = [...prev, { id: prev.length, timestamp: Date.now(), value: Math.random() }];
        // Expose on window so state-tracker script can detect it
        window.activityLog = next;
        window.__VIBE_UNBOUNDED_LOG__ = next;
        return next;
      });
    }, 200);
    return () => clearInterval(id);
  }, []);

  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>Unbounded State Growth</h1>
      <p>
        A log entry is appended every 200ms with no size cap or eviction policy. The array grows indefinitely.
      </p>
      <p>
        Log entries: <strong>{log.length}</strong>
      </p>
      <p style={{ color: 'red', fontSize: '0.85rem' }}>
        ⚠ Also exposed as <code>window.activityLog</code> and <code>window.__VIBE_UNBOUNDED_LOG__</code>.
      </p>
      <ul style={{ maxHeight: '200px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.75rem' }}>
        {log.slice(-20).map((entry) => (
          <li key={entry.id}>
            [{entry.id}] t={entry.timestamp} v={entry.value.toFixed(4)}
          </li>
        ))}
      </ul>
    </main>
  );
}
