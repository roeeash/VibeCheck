export default function UnusedCss() {
  const rules = Array.from({ length: 2000 }, (_, i) =>
    `.never-used-${i} { display: none; color: blue; background: green; }`,
  ).join('\n');

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: rules }} />
      <div>
        <h1>Unused CSS</h1>
        <p>This page has 2000 unused CSS rules.</p>
        <div className="actually-used">Only this class is used</div>
      </div>
      <style>{`.actually-used { color: black; }`}</style>
    </>
  );
}
