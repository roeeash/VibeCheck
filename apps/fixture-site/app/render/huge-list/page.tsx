'use client';

const ITEMS = Array.from({ length: 2000 }, (_, i) => ({
  id: i,
  label: `Item ${i + 1}`,
  description: `This is item number ${i + 1} in an unvirtualized list.`,
}));

export default function HugeListPage() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Huge List Fixture (2000 items, no virtualization)</h1>
      <div id="item-list">
        {ITEMS.map((item) => (
          <div key={item.id} style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
            <strong>{item.label}</strong>
            <span style={{ marginLeft: '1rem', color: '#666' }}>{item.description}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
