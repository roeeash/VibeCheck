export default function OversizedImg() {
  return (
    <div>
      <h1>Oversized Image</h1>
      <div style={{ width: 200, height: 200, overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://picsum.photos/4000/3000"
          alt="Oversized"
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
}
