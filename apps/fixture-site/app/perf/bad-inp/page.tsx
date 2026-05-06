'use client';
// ANTI-PATTERN: search input with 400ms blocking handler

export default function BadInpPage() {
  const handleInput = () => {
    const start = performance.now();
    while (performance.now() - start < 400) {}
  };

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Bad INP</h1>
      <input
        type="text"
        placeholder="Type here (400ms block on input)"
        onInput={handleInput}
        style={{ padding: '8px', width: '300px' }}
      />
    </main>
  );
}
