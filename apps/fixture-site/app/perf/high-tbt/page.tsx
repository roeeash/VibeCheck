// ANTI-PATTERN: synchronous third-party script tag

export default function HighTbtPage() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>High TBT</h1>
      <p>Synchronous script below blocks parsing:</p>
      <script src="https://unpkg.com/lodash@4.17.21/lodash.min.js" />
    </main>
  );
}
