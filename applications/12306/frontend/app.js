/* Boot the application after all page modules have registered. */
(function () {
  'use strict';
  // Support both hash links and direct entry through a client-side path.
  if (!location.hash && location.pathname && location.pathname !== '/' &&
      !location.pathname.endsWith('.html') && !location.pathname.startsWith('/assets/')) {
    const direct = '/#' + location.pathname.replace(/^\/+/, '/') + location.search;
    history.replaceState(null, '', direct);
  }
  if (window.App) window.App.start();
})();
