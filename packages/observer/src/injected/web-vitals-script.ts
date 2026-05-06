export const WEB_VITALS_SCRIPT = `
(function() {
  if (window.__vibeWebVitalsInjected) return;
  window.__vibeWebVitalsInjected = true;

  var emit = function(data) {
    console.info(JSON.stringify({ __vibe: true, type: 'web_vital', metric: data }));
  };

  function reportMetric(name, value, rating, delta) {
    emit({ name: name, value: value, rating: rating, delta: delta, timestamp: Date.now() });
  }

  // LCP — must use 'largest-contentful-paint' entry type, not 'paint'
  try {
    new PerformanceObserver(function(list) {
      var entries = list.getEntries();
      var entry = entries[entries.length - 1];
      if (entry) {
        reportMetric('LCP', entry.startTime, entry.startTime > 4000 ? 'poor' : entry.startTime > 2500 ? 'needs-improvement' : 'good', entry.startTime);
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch(e) {}

  // FCP
  try {
    new PerformanceObserver(function(list) {
      for (var entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          reportMetric('FCP', entry.startTime, entry.startTime > 3000 ? 'poor' : entry.startTime > 1800 ? 'needs-improvement' : 'good', 0);
        }
      }
    }).observe({ type: 'paint', buffered: true });
  } catch(e) {}

  // CLS
  try {
    new PerformanceObserver(function(list) {
      for (var entry of list.getEntries()) {
        reportMetric('CLS', entry.value, entry.value > 0.25 ? 'poor' : entry.value > 0.1 ? 'needs-improvement' : 'good', entry.value);
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch(e) {}

  // TTFB
  try {
    new PerformanceObserver(function(list) {
      var entries = list.getEntries();
      if (entries.length > 0) {
        var entry = entries[0];
        reportMetric('TTFB', entry.startTime, entry.startTime > 1800 ? 'poor' : entry.startTime > 800 ? 'needs-improvement' : 'good', 0);
      }
    }).observe({ type: 'navigation', buffered: true });
  } catch(e) {}

  // INP — interaction next paint
  try {
    new PerformanceObserver(function(list) {
      var entries = list.getEntries();
      var entry = entries[entries.length - 1];
      if (entry) {
        reportMetric('INP', entry.duration, entry.duration > 500 ? 'poor' : entry.duration > 200 ? 'needs-improvement' : 'good', entry.duration);
      }
    }).observe({ type: 'event', durationThreshold: 16, buffered: true });
  } catch(e) {}
})();
`;
