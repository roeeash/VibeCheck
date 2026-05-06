export const LISTENER_CENSUS_SCRIPT = `
(function() {
  if (window.__VIBE_LISTENER_CENSUS__) return;

  var addCount = 0;
  var removeCount = 0;
  var byType = {};
  var devStacks = 0; // listeners from known dev tools

  var _origAdd = EventTarget.prototype.addEventListener;
  var _origRemove = EventTarget.prototype.removeEventListener;

  var DEV_PATTERNS = ['/@vite/', '@vite/client', '@react-refresh', 'webpack-dev-server', 'webpack-hmr'];

  function isDevStack(stack) {
    for (var i = 0; i < DEV_PATTERNS.length; i++) {
      if (stack.indexOf(DEV_PATTERNS[i]) !== -1) return true;
    }
    return false;
  }

  EventTarget.prototype.addEventListener = function(type, listener, options) {
    var stack = (new Error().stack || '');
    if (isDevStack(stack)) {
      devStacks++;
    } else {
      addCount++;
      byType[type] = (byType[type] || 0) + 1;
    }
    return _origAdd.call(this, type, listener, options);
  };

  EventTarget.prototype.removeEventListener = function(type, listener, options) {
    removeCount++;
    return _origRemove.call(this, type, listener, options);
  };

  window.__VIBE_LISTENER_CENSUS__ = function() {
    return {
      total: addCount - removeCount,
      addCount: addCount,
      removeCount: removeCount,
      byType: Object.assign({}, byType)
    };
  };
})();
`;
