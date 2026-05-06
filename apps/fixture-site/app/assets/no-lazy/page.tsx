export default function NoLazy() {
  return (
    <div>
      <h1>No Lazy Loading</h1>
      <div style={{ height: '120vh' }}>Scroll down to see images</div>
      {Array.from({ length: 20 }, (_, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={`https://picsum.photos/400/300?random=${i}`} alt={`Image ${i}`} width={400} height={300} />
      ))}
    </div>
  );
}
