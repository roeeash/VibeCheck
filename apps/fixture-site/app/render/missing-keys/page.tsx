'use client';

import { useState } from 'react';

const INITIAL_ITEMS = Array.from({ length: 20 }, (_, i) => ({ label: `Item ${i + 1}` }));

export default function MissingKeysPage() {
  const [items, setItems] = useState(INITIAL_ITEMS);

  function shuffle() {
    setItems((prev) => [...prev].sort(() => Math.random() - 0.5));
  }

  function prepend() {
    setItems((prev) => [{ label: `New Item ${Date.now()}` }, ...prev]);
  }

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Missing Keys Fixture</h1>
      <p>List items rendered without key props — React must reconcile all children on shuffle/prepend.</p>
      <div style={{ marginBottom: '1rem' }}>
        <button onClick={shuffle} style={{ marginRight: '0.5rem' }}>Shuffle</button>
        <button onClick={prepend}>Prepend item</button>
      </div>
      <ul>
        {/* Intentionally no key prop */}
        {items.map((item) => (
          <li style={{ padding: '4px 0' }}>{item.label}</li>
        ))}
      </ul>
    </main>
  );
}
