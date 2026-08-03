(function () {
  'use strict';

  var readyMarker = document.getElementById('cold-ready');
  if (!readyMarker || !window.parent || typeof window.parent.postMessage !== 'function') {
    return;
  }

  window.__coldboxColdRealmMarker = 'cold-realm-ready';
  document.documentElement.setAttribute('data-cold-state', 'ready');
  window.parent.postMessage({ type: 'cold.ready' }, '*');
}());
