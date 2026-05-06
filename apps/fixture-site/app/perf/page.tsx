export default function PerfIndex() {
  const routes = [
    { path: '/perf/long-task', label: 'Long Task' },
    { path: '/perf/loaf', label: 'Long Animation Frame' },
    { path: '/perf/bad-inp', label: 'Bad INP' },
    { path: '/perf/bad-lcp', label: 'Bad LCP' },
    { path: '/perf/bad-cls', label: 'Bad CLS' },
    { path: '/perf/high-tbt', label: 'High TBT' },
    { path: '/perf/forced-reflow', label: 'Forced Reflow' },
    { path: '/perf/leak-listener', label: 'Leak Listener' },
    { path: '/perf/leak-interval', label: 'Leak Interval' },
    { path: '/perf/leak-detached', label: 'Leak Detached DOM' },
    { path: '/perf/reflow-hover', label: 'Reflow Hover' },
    { path: '/perf/paint-storm', label: 'Paint Storm' },
  ];

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Performance Anti-Pattern Fixtures</h1>
      <ul>
        {routes.map((r) => (
          <li key={r.path} style={{ margin: '8px 0' }}>
            <a href={r.path}>{r.label}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
