export const DOM_COUNTER_SCRIPT = `
window.__VIBE_COUNT_CONTAINERS__ = function() {
  var results = [];
  var seen = new WeakSet();

  function isScrollable(el) {
    var style = window.getComputedStyle(el);
    var overflow = style.overflow + style.overflowX + style.overflowY;
    return /auto|scroll/.test(overflow);
  }

  var candidates = Array.from(document.querySelectorAll('*'));
  for (var i = 0; i < candidates.length; i++) {
    var el = candidates[i];
    if (seen.has(el)) continue;
    seen.add(el);
    var childCount = el.children.length;
    if (childCount > 50) {
      var sel = el.id
        ? '#' + el.id
        : (el.getAttribute('data-testid')
          ? '[data-testid="' + el.getAttribute('data-testid') + '"]'
          : el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ')[0] : ''));
      results.push({
        selector: sel,
        childCount: childCount,
        isScrollable: isScrollable(el),
      });
    }
  }
  // Also check body if it has many direct children
  if (document.body && document.body.children.length > 50) {
    results.push({ selector: 'body', childCount: document.body.children.length, isScrollable: false });
  }
  return results;
};
`;
