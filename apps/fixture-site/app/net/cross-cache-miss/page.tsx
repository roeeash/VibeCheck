/* ANTI-PATTERN: Two sibling components each fetch /api/me independently with no shared cache */
'use client';
import { useState, useEffect } from 'react';

function ProfileCard() {
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    fetch('/api/me').then((r) => r.json()).then(setUser);
  }, []);
  return <div>Profile: {user ? String((user as any).name) : 'loading...'}</div>;
}

function UserBadge() {
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    fetch('/api/me').then((r) => r.json()).then(setUser);
  }, []);
  return <div>Badge: {user ? String((user as any).role) : 'loading...'}</div>;
}

export default function CrossCacheMiss() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Cross-Component Cache Miss</h1>
      <ProfileCard />
      <UserBadge />
    </main>
  );
}
