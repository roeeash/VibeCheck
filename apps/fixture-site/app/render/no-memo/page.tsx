'use client';

import { useState, useEffect } from 'react';

function ChildA({ value }: { value: number }) {
  return <div>ChildA: {value}</div>;
}
function ChildB({ value }: { value: number }) {
  return <div>ChildB: {value * 2}</div>;
}
function ChildC({ value }: { value: number }) {
  return <div>ChildC: {value + 1}</div>;
}
function ChildD({ value }: { value: number }) {
  return <div>ChildD: {value - 1}</div>;
}
function ChildE({ value }: { value: number }) {
  return <div>ChildE: {value % 7}</div>;
}
function ChildF({ value }: { value: number }) {
  return <div>ChildF: {value * 3}</div>;
}
function ChildG({ value }: { value: number }) {
  return <div>ChildG: {value + 10}</div>;
}
function ChildH({ value }: { value: number }) {
  return <div>ChildH: {value - 10}</div>;
}
function ChildI({ value }: { value: number }) {
  return <div>ChildI: {value * value}</div>;
}
function ChildJ({ value }: { value: number }) {
  return <div>ChildJ: {value + value}</div>;
}
function ChildK({ value }: { value: number }) {
  return <div>ChildK: {value}</div>;
}
function ChildL({ value }: { value: number }) {
  return <div>ChildL: {value}</div>;
}

export default function NoMemoPage() {
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCounter((c) => c + 1);
    }, 200);
    return () => clearInterval(id);
  }, []);

  return (
    <main style={{ padding: '2rem' }}>
      <h1>No-Memo Fixture</h1>
      <p>Counter: {counter} — all children re-render on every tick (no React.memo)</p>
      <ChildA value={counter} />
      <ChildB value={counter} />
      <ChildC value={counter} />
      <ChildD value={counter} />
      <ChildE value={counter} />
      <ChildF value={counter} />
      <ChildG value={counter} />
      <ChildH value={counter} />
      <ChildI value={counter} />
      <ChildJ value={counter} />
      <ChildK value={counter} />
      <ChildL value={counter} />
    </main>
  );
}
