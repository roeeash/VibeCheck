export default function WillChangeSpam() {
  return (
    <div>
      <h1>will-change Spam</h1>
      {Array.from({ length: 200 }, (_, i) => (
        <div
          key={i}
          style={{ willChange: 'transform', width: 10, height: 10, background: 'blue', display: 'inline-block' }}
        />
      ))}
    </div>
  );
}
