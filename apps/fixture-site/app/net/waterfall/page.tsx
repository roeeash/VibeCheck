/* ANTI-PATTERN: Parent → child → grandchild sequential fetch chain */
'use client';
import { useState, useEffect } from 'react';

function Grandchild({ grandchildId }: { grandchildId: number }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    fetch(`/api/child/${grandchildId}/grandchild`).then((r) => r.json()).then(setData);
  }, [grandchildId]);
  return <div>Grandchild: {data ? (data as any).name : 'loading...'}</div>;
}

function Child({ childId }: { childId: number }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    fetch(`/api/parent/${childId}/child`).then((r) => r.json()).then(setData);
  }, [childId]);
  return (
    <div>
      Child: {data ? (data as any).name : 'loading...'}
      {data && <Grandchild grandchildId={(data as any).grandchildId} />}
    </div>
  );
}

export default function Waterfall() {
  const [parent, setParent] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch('/api/parent').then((r) => r.json()).then(setParent);
  }, []);

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Waterfall</h1>
      <div>Parent: {parent ? String((parent as any).name) : 'loading...'}</div>
      {parent && <Child childId={(parent as any).childId} />}
    </main>
  );
}
