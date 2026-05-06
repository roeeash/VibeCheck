'use client';

import { useState, useEffect } from 'react';

function StormChild({ sharedValue, index }: { sharedValue: number; index: number }) {
  return <div>Child {index}: value={sharedValue}</div>;
}

const CHILD_COUNT = 52;

export default function RerenderStormPage() {
  const [sharedValue, setSharedValue] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setSharedValue((v) => v + 1);
    }, 300);
    return () => clearInterval(id);
  }, []);

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Re-render Storm Fixture</h1>
      <p>
        {CHILD_COUNT} children all re-render on every state tick (no memo, shared parent state).
        Shared value: {sharedValue}
      </p>
      <div>
        {Array.from({ length: CHILD_COUNT }, (_, i) => (
          <StormChild key={i} sharedValue={sharedValue} index={i} />
        ))}
      </div>
    </main>
  );
}
