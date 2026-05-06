'use client';
import { useState, useEffect } from 'react';

export default function FixturePage() {
  const [count, setCount] = useState(0);
  const [data, setData] = useState<string[]>([]);

  useEffect(() => {
    const id = setInterval(() => {
      setCount((c) => c + 1);
    }, 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const items = Array.from({ length: 2000 }, (_, i) => `item-${i}`);
    setData(items);
  }, []);

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Fixture Site</h1>
      <p>Counter: {count}</p>
      <ul>
        {data.map((item) => (
          <li key={item} style={{ padding: '4px' }}>{item}</li>
        ))}
      </ul>
      <img
        src="https://picsum.photos/seed/vibecheck/2000/2000"
        alt="Large unoptimized image"
      />
      <button onClick={() => setCount(0)}>Reset</button>
    </main>
  );
}
