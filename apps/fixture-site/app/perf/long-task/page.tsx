'use client';
// ANTI-PATTERN: 200ms blocking JS on click

export default function LongTaskPage() {
  const block = () => {
    const start = performance.now();
    while (performance.now() - start < 200) {}
  };

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Long Task</h1>
      <button onClick={block}>Run 200ms Blocking Task</button>
    </main>
  );
}
