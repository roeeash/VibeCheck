/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
(function () {
  if ((window as any).__vibeInjected) return;
  (window as any).__vibeInjected = true;

  const emit = (event: Record<string, unknown>) => {
    // Use console.info directly — avoids message bridge ordering issues with postMessage
    console.info(JSON.stringify({ __vibe: true, ...event, timestamp: Date.now() }));
  };

  try {
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        emit({ type: 'cdp.long_task', duration: entry.duration, startTime: entry.startTime, name: entry.name });
      }
    });
    longTaskObserver.observe({ type: 'longtask', buffered: true });
  } catch { /* not supported */ }

  try {
    const loafObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const loafEntry = entry as any;
        emit({
          type: 'cdp.long_animation_frame',
          entry: {
            startTime: loafEntry.startTime,
            duration: loafEntry.duration,
            blockingDuration: loafEntry.blockingDuration,
            scriptEntries: (loafEntry.scripts || []).map((s: any) => ({
              name: s.name,
              sourceURL: s.sourceURL,
              sourceFunctionName: s.sourceFunctionName,
              startTime: s.startTime,
              executionStart: s.executionStart,
              executionDuration: s.duration,
            })),
            styleAndLayoutDuration: loafEntry.styleAndLayoutDuration || 0,
          },
        });
      }
    });
    loafObserver.observe({ type: 'long-animation-frame', buffered: true });
  } catch { /* not supported */ }

  try {
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const clsEntry = entry as any;
        emit({
          type: 'cdp.layout_shift',
          shift: {
            value: clsEntry.value,
            hadRecentInput: clsEntry.hadRecentInput,
            sources: (clsEntry.sources || []).map((s: any) => ({
              node: s.node ? s.node.toString() : undefined,
              previousRect: s.previousRect || {},
              currentRect: s.currentRect || {},
            })),
            timestamp: Date.now(),
          },
        });
      }
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch { /* not supported */ }

  try {
    const paintObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        emit({ type: 'cdp.paint', name: entry.name, startTime: entry.startTime, duration: entry.duration });
      }
    });
    paintObserver.observe({ type: 'paint', buffered: true });
  } catch { /* not supported */ }

  // Forced reflow detection is handled by REFLOW_DETECTOR_SCRIPT (injected earlier via addInitScript).
  // Redefining offsetWidth/Height here would conflict with that script's property descriptor.

  let mutationCount = 0;
  let mutationTimer: ReturnType<typeof setTimeout> | null = null;

  const mo = new MutationObserver((mutations) => {
    mutationCount += mutations.length;
    if (mutationTimer) clearTimeout(mutationTimer);
    mutationTimer = setTimeout(() => {
      if (mutationCount > 50) {
        emit({ type: 'dom.mutation_burst', count: mutationCount });
      }
      mutationCount = 0;
    }, 100);
  });

  mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
})();
