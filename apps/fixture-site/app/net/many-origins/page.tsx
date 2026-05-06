/* ANTI-PATTERN: Loads 12 external CDN scripts from different origins */
'use client';
import { useEffect, useState } from 'react';

const CDN_SCRIPTS = [
  'https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js',
  'https://unpkg.com/moment@2.29.4/min/moment.min.js',
  'https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js',
  'https://unpkg.com/uuid@9.0.0/dist/umd/uuidv4.min.js',
  'https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js',
  'https://unpkg.com/qs@6.11.2/dist/qs.min.js',
  'https://cdn.jsdelivr.net/npm/chroma-js@2.4.2/chroma.min.js',
  'https://unpkg.com/decimal.js@10.4.3/decimal.min.js',
  'https://cdn.jsdelivr.net/npm/immutability-helper@3.1.1/index.min.js',
  'https://unpkg.com/classnames@2.3.2/index.min.js',
  'https://cdn.jsdelivr.net/npm/deepmerge@4.3.1/dist/umd.min.js',
  'https://unpkg.com/serialize-javascript@6.0.2/index.min.js',
];

export default function ManyOrigins() {
  const [loaded, setLoaded] = useState(0);

  useEffect(() => {
    CDN_SCRIPTS.forEach((src) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => setLoaded((n) => n + 1);
      document.head.appendChild(script);
    });
  }, []);

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Excessive Origins</h1>
      <p>Loaded {loaded}/{CDN_SCRIPTS.length} scripts</p>
    </main>
  );
}
