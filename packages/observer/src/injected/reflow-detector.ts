export const REFLOW_DETECTOR_SCRIPT = `
(function() {
  if (window.__vibeReflowInjected) return;
  window.__vibeReflowInjected = true;

  var originalOffsetWidth = Object.getOwnPropertyDescriptor(Element.prototype, 'offsetWidth');
  var originalOffsetHeight = Object.getOwnPropertyDescriptor(Element.prototype, 'offsetHeight');
  var originalScrollHeight = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollHeight');
  var originalClientHeight = Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight');

  function emitReflow(el) {
    window.postMessage({ __vibe: true, type: 'cdp.forced_reflow', selector: el.tagName.toLowerCase(), timestamp: Date.now() }, '*');
  }

  Object.defineProperty(Element.prototype, 'offsetWidth', {
    configurable: true,
    get: function() {
      emitReflow(this);
      return originalOffsetWidth.get.call(this);
    }
  });

  Object.defineProperty(Element.prototype, 'offsetHeight', {
    configurable: true,
    get: function() {
      emitReflow(this);
      return originalOffsetHeight.get.call(this);
    }
  });

  Object.defineProperty(Element.prototype, 'scrollHeight', {
    configurable: true,
    get: function() {
      emitReflow(this);
      return originalScrollHeight.get.call(this);
    }
  });

  Object.defineProperty(Element.prototype, 'clientHeight', {
    configurable: true,
    get: function() {
      emitReflow(this);
      return originalClientHeight.get.call(this);
    }
  });
})();
`;
