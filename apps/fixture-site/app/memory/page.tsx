import Link from 'next/link';

export default function MemoryPage() {
  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>Memory Anti-Pattern Fixtures</h1>
      <p>Each route deliberately implements a memory-related performance anti-pattern for VibeCheck auditing.</p>
      <ul style={{ lineHeight: 2 }}>
        <li>
          <Link href="/memory/leaked-interval">Leaked setInterval — interval never cleared on unmount</Link>
        </li>
        <li>
          <Link href="/memory/leaked-listener">Leaked event listener — addEventListener without removeEventListener</Link>
        </li>
        <li>
          <Link href="/memory/unbounded-state">Unbounded state growth — array appended forever with no eviction</Link>
        </li>
        <li>
          <Link href="/memory/recursive-handler">Heavy interaction handler — synchronous fibonacci on every keystroke</Link>
        </li>
        <li>
          <Link href="/memory/stale-closure">Stale closure — setInterval captures stale state from useEffect([], [])</Link>
        </li>
      </ul>
    </main>
  );
}
