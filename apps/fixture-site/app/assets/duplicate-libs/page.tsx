'use client';
import { useEffect } from 'react';

export default function DuplicateLibs() {
  useEffect(() => {
    // Simulate having duplicate library signatures in bundle text
    // The detector looks for signature strings in script bodies
    console.log('lodash.VERSION', '_.chain', '_.groupBy', '_.partition');
    console.log('moment.fn.isUtc', 'moment.locale');
  }, []);

  return (
    <div>
      <h1>Duplicate Libraries</h1>
      <p>This page would load duplicate versions of lodash and moment.</p>
    </div>
  );
}
