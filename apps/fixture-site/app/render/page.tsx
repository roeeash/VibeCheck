import Link from 'next/link';

export default function RenderIndexPage() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Render Anti-Pattern Fixtures</h1>
      <p>Each route exercises a specific React render performance anti-pattern for VibeCheck Ultra detection.</p>
      <ul style={{ lineHeight: '2' }}>
        <li><Link href="/render/no-memo">no-memo — Components that re-render constantly without React.memo</Link></li>
        <li><Link href="/render/inline-props">inline-props — Inline object and arrow-function props on every render</Link></li>
        <li><Link href="/render/huge-list">huge-list — 2000-item unvirtualized list</Link></li>
        <li><Link href="/render/missing-keys">missing-keys — List rendered without key props</Link></li>
        <li><Link href="/render/rerender-storm">rerender-storm — 50+ components cascade-re-render on timer</Link></li>
      </ul>
    </main>
  );
}
