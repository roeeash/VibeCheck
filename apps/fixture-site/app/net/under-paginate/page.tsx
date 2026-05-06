/* ANTI-PATTERN: Fetches 5000 items in a single request instead of paginating */
'use client';
import { useState, useEffect } from 'react';

export default function UnderPaginate() {
  const [records, setRecords] = useState([]);

  useEffect(() => {
    fetch('/api/all-records').then((r) => r.json()).then(setRecords);
  }, []);

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Under-pagination</h1>
      <p>Total records: {records.length}</p>
      <ul>
        {records.slice(0, 20).map((r: { id: number; value: string }) => (
          <li key={r.id}>{r.value}</li>
        ))}
      </ul>
      {records.length > 20 && <p>...and {records.length - 20} more</p>}
    </main>
  );
}
