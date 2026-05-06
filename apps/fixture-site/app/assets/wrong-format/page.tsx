export default function WrongFormat() {
  return (
    <div>
      <h1>Wrong Format</h1>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="https://picsum.photos/800/600.jpg" alt="JPEG" width={800} height={600} />
    </div>
  );
}
