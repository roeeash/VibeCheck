/* ANTI-PATTERN: Fetch /api/users then /api/users/{id}/profile for each user */
'use client';
import { useState, useEffect } from 'react';

export default function NPlusOne() {
  const [users, setUsers] = useState<Array<{ id: number; name: string }>>([]);
  const [profiles, setProfiles] = useState<Record<number, { bio: string }>>({});

  useEffect(() => {
    fetch('/api/users').then((r) => r.json()).then((data) => {
      setUsers(data);
      data.forEach((u: { id: number }) => {
        fetch(`/api/users/${u.id}/profile`).then((r) => r.json()).then((p) => {
          setProfiles((prev) => ({ ...prev, [u.id]: p }));
        });
      });
    });
  }, []);

  return (
    <main style={{ padding: '2rem' }}>
      <h1>N+1 Pattern</h1>
      <p>Users: {users.length}</p>
      <ul>
        {users.map((u: { id: number; name: string }) => (
          <li key={u.id}>
            {u.name} — {profiles[u.id] ? profiles[u.id].bio : 'loading...'}
          </li>
        ))}
      </ul>
    </main>
  );
}
