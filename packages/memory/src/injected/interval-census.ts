export const INTERVAL_CENSUS_SCRIPT = `
(function() {
  if (window.__VIBE_INTERVAL_CENSUS__) return;

  var _intervals = {};
  var _origSetInterval = window.setInterval;
  var _origClearInterval = window.clearInterval;
  var _origSetTimeout = window.setTimeout;
  var _origClearTimeout = window.clearTimeout;

  window.setInterval = function(fn, delay) {
    var args = Array.prototype.slice.call(arguments, 2);
    var id = _origSetInterval.apply(window, arguments);
    _intervals[id] = {
      id: id,
      created: performance.now(),
      delay: delay || 0,
      stack: (new Error().stack || '').slice(0, 500)
    };
    return id;
  };

  window.clearInterval = function(id) {
    if (id != null) delete _intervals[id];
    return _origClearInterval.call(window, id);
  };

  window.setTimeout = function(fn, delay) {
    var id;
    var wrappedFn = function() {
      delete _intervals[id];
      if (typeof fn === 'function') fn.apply(this, arguments);
    };
    var newArgs = [wrappedFn, delay].concat(Array.prototype.slice.call(arguments, 2));
    id = _origSetTimeout.apply(window, newArgs);
    _intervals[id] = {
      id: id,
      created: performance.now(),
      delay: delay || 0,
      stack: (new Error().stack || '').slice(0, 500)
    };
    return id;
  };

  window.clearTimeout = function(id) {
    if (id != null) delete _intervals[id];
    return _origClearTimeout.call(window, id);
  };

  window.__VIBE_INTERVAL_CENSUS__ = function() {
    var entries = Object.values(_intervals);
    return { active: entries.length, intervals: entries };
  };
})();
`;
