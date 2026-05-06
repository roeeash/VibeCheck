'use client';
// ANTI-PATTERN: heavy style recalc on interaction

export default function LoAFPage() {
  const trigger = () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    for (let i = 0; i < 500; i++) {
      el.style.width = `${i}px`;
      el.style.height = `${i}px`;
      el.getBoundingClientRect();
    }
    document.body.removeChild(el);
  };

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Long Animation Frame</h1>
      <button onClick={trigger}>Trigger Style Recalc</button>
    </main>
  );
}
