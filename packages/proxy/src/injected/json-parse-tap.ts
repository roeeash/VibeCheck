export const JSON_PARSE_TAP = `
(function() {
  if (window.__vibeJsonTapInjected) return;
  window.__vibeJsonTapInjected = true;

  var originalParse = JSON.parse;
  var originalJson = Response.prototype.json;

  function collectAllKeys(obj, path) {
    var keys = [];
    if (obj === null || typeof obj !== 'object') return keys;
    if (Array.isArray(obj)) {
      for (var i = 0; i < Math.min(obj.length, 10); i++) {
        keys.push.apply(keys, collectAllKeys(obj[i], path + '[' + i + ']'));
      }
      return keys;
    }
    for (var k in obj) {
      if (obj.hasOwnProperty(k)) {
        keys.push(path + '.' + k);
        keys.push.apply(keys, collectAllKeys(obj[k], path + '.' + k));
      }
    }
    return keys;
  }

  var idCounter = 0;
  var idMap = new WeakMap();

  var originalFetch = window.fetch;
  window.fetch = function(input, init) {
    var id = 'vibe-fetch-' + (++idCounter);
    var result = originalFetch.apply(this, arguments);
    result.then(function(resp) {
      idMap.set(resp, id);
      resp.__vibeRequestId = id;
    }).catch(function() {});
    return result;
  };

  Response.prototype.json = function() {
    var id = idMap.get(this) || 'unknown-' + (++idCounter);
    var p = originalJson.call(this);
    var self = this;
    return p.then(function(data) {
      var allKeys = collectAllKeys(data, '$');
      if (window.__VIBE_PARSED__) {
        window.__VIBE_PARSED__(id, allKeys);
      }
      return proxyTrack(data, '$', id);
    });
  };

  function proxyTrack(obj, path, id) {
    if (obj === null || typeof obj !== 'object' || obj instanceof Date) return obj;
    if (Array.isArray(obj)) {
      return obj.map(function(item, i) { return proxyTrack(item, path + '[' + i + ']', id); });
    }
    return new Proxy(obj, {
      get: function(target, prop) {
        if (typeof prop === 'string' && window.__VIBE_KEY_ACCESS__) {
          window.__VIBE_KEY_ACCESS__(id, path + '.' + prop);
        }
        var value = target[prop];
        return (typeof value === 'object' && value !== null) ? proxyTrack(value, path + '.' + prop, id) : value;
      }
    });
  }
})();
`;
