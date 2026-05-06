'use client';
import { useEffect } from 'react';

export default function FullLodash() {
  useEffect(() => {
    // Simulate full lodash usage patterns that would appear in bundle
    const patterns = ['_.chain', '_.range', '_.partition', '_.groupBy', '_.flatten', '_.uniq'];
    console.log('Full lodash patterns:', patterns.join(', '));
  }, []);

  return (
    <div>
      <h1>Full Lodash Import</h1>
      <p>This page uses the full lodash bundle instead of individual functions.</p>
    </div>
  );
}
