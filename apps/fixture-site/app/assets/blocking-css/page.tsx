import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Blocking CSS' };

export default function BlockingCss() {
  const rules = Array.from({ length: 500 }, (_, i) =>
    `.unused-rule-${i} { color: red; font-size: ${i}px; margin: ${i}px; padding: ${i}px; }`,
  ).join('\n');

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: rules }} />
      <div>
        <h1>Blocking CSS</h1>
        <p>This page has a large blocking stylesheet with mostly unused rules.</p>
      </div>
    </>
  );
}
