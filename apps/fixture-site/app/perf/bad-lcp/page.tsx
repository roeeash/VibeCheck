// ANTI-PATTERN: huge unoptimized hero image, late discovery

export default function BadLcpPage() {
  return (
    <main>
      <h1 style={{ padding: '2rem' }}>Bad LCP</h1>
      <div style={{ height: '100vh' }} />
      <img
        src="https://picsum.photos/seed/lcpbad/2400/1600"
        alt="Huge unoptimized hero"
        style={{ width: '100%' }}
      />
    </main>
  );
}
