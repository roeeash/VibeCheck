export const LISTENER_COUNTER_SCRIPT = `
(function() {
  if (window.__vibeListenerInjected) return;
  window.__vibeListenerInjected = true;

  var originalAddEventListener = EventTarget.prototype.addEventListener;
  var originalRemoveEventListener = EventTarget.prototype.removeEventListener;
  var listenerCount = 0;

  EventTarget.prototype.addEventListener = function(type, listener, options) {
    listenerCount++;
    window.postMessage({ __vibe: true, type: 'listener_add', count: listenerCount, listenerType: type, target: this.tagName || 'unknown', timestamp: Date.now() }, '*');
    return originalAddEventListener.call(this, type, listener, options);
  };

  EventTarget.prototype.removeEventListener = function(type, listener, options) {
    listenerCount = Math.max(0, listenerCount - 1);
    window.postMessage({ __vibe: true, type: 'listener_remove', count: listenerCount, listenerType: type, target: this.tagName || 'unknown', timestamp: Date.now() }, '*');
    return originalRemoveEventListener.call(this, type, listener, options);
  };

  window.__vibeGetListenerCount = function() { return listenerCount; };
})();
`;
