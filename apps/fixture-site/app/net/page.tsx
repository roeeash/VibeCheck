'use client';
import Link from 'next/link';

export default function NetIndex() {
  const routes = [
    { href: '/net/duplicate-fetch', label: 'Duplicate Fetch' },
    { href: '/net/cross-cache-miss', label: 'Cross-Component Cache Miss' },
    { href: '/net/n-plus-one', label: 'N+1 Pattern' },
    { href: '/net/waterfall', label: 'Waterfall' },
    { href: '/net/overfetch', label: 'Over-fetching' },
    { href: '/net/under-paginate', label: 'Under-pagination' },
    { href: '/net/no-compression', label: 'Missing Compression' },
    { href: '/net/no-cache-headers', label: 'Missing Cache Headers' },
    { href: '/net/many-origins', label: 'Excessive Origins' },
  ];
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Network Anti-Patterns</h1>
      <ul>{routes.map((r) => (<li key={r.href}><Link href={r.href}>{r.label}</Link></li>))}</ul>
    </main>
  );
}
