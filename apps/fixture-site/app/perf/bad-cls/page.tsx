'use client';
// ANTI-PATTERN: async-loaded banner pushing content

import { useEffect } from 'react';

export default function BadClsPage() {
  useEffect(() => {
    const timer = setTimeout(() => {
      const banner = document.createElement('div');
      banner.style.cssText = 'background:red;color:white;padding:16px;text-align:center';
      banner.textContent = 'Async Banner!';
      document.body.prepend(banner);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Bad CLS</h1>
      <p>Content will shift when banner loads.</p>
    </main>
  );
}
