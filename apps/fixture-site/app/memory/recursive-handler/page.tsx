'use client';

import { useState } from 'react';

function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

export default function RecursiveHandlerPage() {
  const [value, setValue] = useState('');
  const [result, setResult] = useState<number | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);
    // BUG: heavy synchronous computation on every keystroke — no debounce
    const fib = fibonacci(35);
    setResult(fib);
  };

  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>Heavy Interaction Handler</h1>
      <p>
        Every keystroke in the input below triggers a synchronous <code>fibonacci(35)</code> computation (~50ms on modern
        hardware), blocking the main thread and causing poor INP.
      </p>
      <label>
        Type here:{' '}
        <input
          id="heavy-input"
          name="heavy"
          type="text"
          value={value}
          onChange={handleChange}
          style={{ marginLeft: '0.5rem', padding: '0.25rem' }}
        />
      </label>
      {result !== null && (
        <p>
          fib(35) = <strong>{result}</strong>
        </p>
      )}
      <p style={{ color: 'red', fontSize: '0.85rem' }}>
        ⚠ No debounce — fibonacci(35) runs synchronously on every input event.
      </p>
    </main>
  );
}
