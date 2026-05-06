export const REACT_PROFILER_TAP = `
window.__VIBE_RENDER_EVENTS__ = [];

(function installReactProfilerTap() {
  // Create the hook BEFORE React loads so React uses it during initialization.
  // React DevTools works the same way: the extension creates the hook first, then React registers itself.
  if (!window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      renderers: new Map(),
      supportsFiber: true,
      isDisabled: false,
      inject: function() {},
      onScheduleFiberRoot: function() {},
      onCommitFiberRoot: function() {},
      onCommitFiberUnmount: function() {},
      onPostCommitFiberRoot: function() {},
      checkDCE: function() {},
    };
  }

  var hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  var originalOnCommitFiberRoot = hook.onCommitFiberRoot;

  hook.onCommitFiberRoot = function(rendererID, root, priorityLevel) {
    try {
      var fiber = root.current;
      var now = performance.now();
      function visitFiber(f) {
        if (!f) return;
        // Capture any function or class component fiber
        if (f.type && (typeof f.type === 'function' || (typeof f.type === 'object' && f.type !== null))) {
          var name = (typeof f.type === 'function'
            ? f.type.displayName || f.type.name
            : f.type.displayName) || '';
          if (name) {
            window.__VIBE_RENDER_EVENTS__.push({
              componentName: name,
              reason: f.alternate ? 'parent-render' : 'initial',
              timestamp: now,
            });
          }
        }
        visitFiber(f.child);
        visitFiber(f.sibling);
      }
      visitFiber(fiber);
    } catch(e) {}
    if (originalOnCommitFiberRoot) return originalOnCommitFiberRoot.call(this, rendererID, root, priorityLevel);
  };
})();
`;
