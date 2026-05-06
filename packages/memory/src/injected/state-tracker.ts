export const STATE_TRACKER_SCRIPT = `
(function() {
  if (window.__VIBE_SAMPLE_STATE__) return;

  window.__VIBE_SAMPLE_STATE__ = function() {
    var samples = [];
    var now = performance.now();

    // Check Redux store
    try {
      if (window.__REDUX_STORE__ && typeof window.__REDUX_STORE__.getState === 'function') {
        var state = window.__REDUX_STORE__.getState();
        if (state && typeof state === 'object') {
          Object.keys(state).forEach(function(key) {
            var val = state[key];
            var size = 0;
            if (Array.isArray(val)) {
              size = val.length;
            } else if (val && typeof val === 'object') {
              size = Object.keys(val).length;
            }
            if (size > 0) {
              samples.push({ storeName: 'redux.' + key, size: size, timestamp: now });
            }
          });
        }
      }
    } catch (e) {}

    // Check Zustand stores
    try {
      if (window.__zustand_stores__ && typeof window.__zustand_stores__ === 'object') {
        Object.keys(window.__zustand_stores__).forEach(function(storeName) {
          try {
            var store = window.__zustand_stores__[storeName];
            var stateVal = typeof store.getState === 'function' ? store.getState() : store;
            if (stateVal && typeof stateVal === 'object') {
              Object.keys(stateVal).forEach(function(key) {
                var val = stateVal[key];
                var size = Array.isArray(val) ? val.length : 0;
                if (size > 0) {
                  samples.push({ storeName: 'zustand.' + storeName + '.' + key, size: size, timestamp: now });
                }
              });
            }
          } catch (e) {}
        });
      }
    } catch (e) {}

    // Check window-level arrays that look like logs (length > 100)
    try {
      Object.keys(window).forEach(function(key) {
        try {
          var val = window[key];
          if (Array.isArray(val) && val.length > 100) {
            samples.push({ storeName: 'window.' + key, size: val.length, timestamp: now });
          }
        } catch (e) {}
      });
    } catch (e) {}

    return { samples: samples };
  };
})();
`;
