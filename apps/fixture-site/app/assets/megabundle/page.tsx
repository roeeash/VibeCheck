export default function Megabundle() {
  const bigData = Array.from({ length: 5000 }, (_, i) => ({
    id: i,
    name: `item-${i}`,
    value: Math.random(),
  }));

  return (
    <div>
      <h1>Megabundle</h1>
      <p>This page has a large JavaScript bundle.</p>
      <p>Items count: {bigData.length}</p>
    </div>
  );
}
