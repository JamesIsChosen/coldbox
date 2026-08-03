
(function () {
  'use strict';

  var coldRealmDocument = __COLDBOX_COLD_REALM_DOCUMENT__;
  var root = document.documentElement;
  var app = document.getElementById('app');
  var main = document.getElementById('main-content');
  var currentSection = document.getElementById('current-section');
  var announcement = document.getElementById('route-announcement');
  var themeToggle = document.getElementById('theme-toggle');
  var themeLabel = document.getElementById('theme-toggle-label');
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var moreMenu = document.getElementById('mobile-more-menu');
  var moreTab = document.getElementById('mobile-more-tab');
  var moreClose = document.getElementById('mobile-more-close');
  var coldRealmStatus = document.getElementById('cold-realm-status');
  var coldRealmStatusTitle = document.getElementById('cold-realm-status-title');
  var coldRealmStatusCopy = document.getElementById('cold-realm-status-copy');
  var coldRealmStatusLabel = document.getElementById('cold-realm-status-label');
  var coldRealmFailure = document.getElementById('cold-realm-failure');
  var coldRealmHost = document.getElementById('cold-realm-host');
  var coldFrame = null;
  var coldBootTimer = null;
  var coldRealmReady = false;
  var coldRealmFailed = false;
  var pages = Array.prototype.slice.call(document.querySelectorAll('[data-page]'));
  var routeLinks = Array.prototype.slice.call(document.querySelectorAll('[data-route]'));

  if (!app || !main) {
    return;
  }

  var routeDetails = Object.freeze({
    vault: Object.freeze({ label: 'Vault', title: 'Vault', group: 'Workspace' }),
    dashboard: Object.freeze({ label: 'Dashboard', title: 'Dashboard', group: 'Workspace' }),
    portfolio: Object.freeze({ label: 'Portfolio', title: 'Portfolio', group: 'Workspace' }),
    prices: Object.freeze({ label: 'Prices', title: 'Prices', group: 'Workspace' }),
    registry: Object.freeze({ label: 'Registry', title: 'Registry', group: 'Workspace' }),
    devices: Object.freeze({ label: 'Devices', title: 'Devices', group: 'Workspace' }),
    entropy: Object.freeze({ label: 'Entropy Lab', title: 'Entropy Lab', group: 'Tools' }),
    'seed-forge': Object.freeze({ label: 'Seed Forge', title: 'Seed Forge', group: 'Tools' }),
    derivation: Object.freeze({ label: 'Derivation', title: 'Derivation', group: 'Tools' }),
    backup: Object.freeze({ label: 'Backup Lab', title: 'Backup Lab', group: 'Tools' }),
    qr: Object.freeze({ label: 'QR Studio', title: 'QR Studio', group: 'Tools' }),
    recovery: Object.freeze({ label: 'Recovery', title: 'Recovery', group: 'Tools' }),
    verify: Object.freeze({ label: 'Verify Bench', title: 'Verify Bench', group: 'Reference' }),
    reference: Object.freeze({ label: 'Reference', title: 'Reference', group: 'Reference' }),
    learn: Object.freeze({ label: 'Learn', title: 'Learn', group: 'Reference' })
  });

  function readStoredTheme() {
    try {
      var stored = window.localStorage.getItem('coldbox-theme');
      return stored === 'light' || stored === 'dark' ? stored : 'dark';
    } catch (error) {
      return 'dark';
    }
  }

  function setTheme(theme, persist) {
    var normalized = theme === 'light' ? 'light' : 'dark';
    root.setAttribute('data-theme', normalized);
    if (themeToggle) {
      themeToggle.setAttribute('aria-pressed', String(normalized === 'light'));
    }
    if (themeLabel) {
      themeLabel.textContent = normalized === 'dark' ? 'Light mode' : 'Dark mode';
    }
    if (themeMeta) {
      themeMeta.setAttribute('content', normalized === 'dark' ? '#0b1020' : '#f4f7fb');
    }
    if (persist) {
      try {
        window.localStorage.setItem('coldbox-theme', normalized);
      } catch (error) {
        // UI preferences are optional on file:// and must not block the shell.
      }
    }
  }

  function routeFromLocation() {
    var hash = window.location.hash.replace(/^#/, '').trim();
    var route = hash.split('/')[0];
    return Object.prototype.hasOwnProperty.call(routeDetails, route) ? route : 'dashboard';
  }

  function normalizeLocation(route) {
    if (window.location.hash === '#' + route) {
      return;
    }
    try {
      window.history.replaceState(null, '', '#' + route);
    } catch (error) {
      window.location.hash = route;
    }
  }

  function closeMoreMenu() {
    if (!moreMenu) {
      return;
    }
    var focusInsideMenu = document.activeElement && moreMenu.contains(document.activeElement);
    moreMenu.hidden = true;
    if (moreTab) {
      moreTab.setAttribute('aria-expanded', 'false');
    }
    if (focusInsideMenu && moreTab) {
      moreTab.focus();
    }
  }

  function toggleMoreMenu() {
    if (!moreMenu) {
      return;
    }
    var willOpen = moreMenu.hidden;
    moreMenu.hidden = !willOpen;
    if (moreTab) {
      moreTab.setAttribute('aria-expanded', String(willOpen));
    }
    if (willOpen) {
      var firstLink = moreMenu.querySelector('a');
      if (firstLink) {
        firstLink.focus();
      }
    }
  }

  function setColdRealmFailure() {
    if (coldBootTimer !== null) {
      window.clearTimeout(coldBootTimer);
      coldBootTimer = null;
    }
    coldRealmReady = false;
    coldRealmFailed = true;
    window.removeEventListener('message', handleColdRealmMessage);
    if (coldFrame && coldFrame.parentNode) {
      coldFrame.parentNode.removeChild(coldFrame);
    }
    coldFrame = null;
    if (coldRealmStatus) {
      coldRealmStatus.setAttribute('data-cold-state', 'failed');
    }
    if (coldRealmStatusTitle) {
      coldRealmStatusTitle.textContent = 'The sealed realm is unavailable';
    }
    if (coldRealmStatusCopy) {
      coldRealmStatusCopy.textContent = 'The isolated frame did not establish its boot signal. Coldbox refuses to continue as a single-realm app.';
    }
    if (coldRealmStatusLabel) {
      coldRealmStatusLabel.textContent = 'Locked down';
    }
    if (coldRealmFailure) {
      coldRealmFailure.hidden = false;
    }
    app.setAttribute('data-cold-state', 'failed');
  }

  function setColdRealmReady() {
    if (coldRealmFailed) {
      return;
    }
    if (coldBootTimer !== null) {
      window.clearTimeout(coldBootTimer);
      coldBootTimer = null;
    }
    coldRealmReady = true;
    if (coldRealmStatus) {
      coldRealmStatus.setAttribute('data-cold-state', 'ready');
    }
    if (coldRealmStatusTitle) {
      coldRealmStatusTitle.textContent = 'The sealed realm is active';
    }
    if (coldRealmStatusCopy) {
      coldRealmStatusCopy.textContent = 'Secret-capable work will remain inside this sandbox. The warm shell cannot read its DOM or variables.';
    }
    if (coldRealmStatusLabel) {
      coldRealmStatusLabel.textContent = 'Ready';
    }
    if (coldRealmFailure) {
      coldRealmFailure.hidden = true;
    }
    app.setAttribute('data-cold-state', 'ready');
  }

  function handleColdRealmMessage(event) {
    if (coldRealmReady || coldRealmFailed || !coldFrame || event.source !== coldFrame.contentWindow) {
      return;
    }
    if (!event.data || event.data.type !== 'cold.ready') {
      return;
    }
    setColdRealmReady();
    window.removeEventListener('message', handleColdRealmMessage);
  }

  function startColdRealm() {
    if (!coldRealmHost) {
      setColdRealmFailure();
      return;
    }

    window.addEventListener('message', handleColdRealmMessage);
    try {
      coldFrame = document.createElement('iframe');
      coldFrame.id = 'cold-frame';
      coldFrame.className = 'cold-frame';
      coldFrame.setAttribute('sandbox', 'allow-scripts allow-downloads');
      coldFrame.setAttribute('title', 'Opaque sealed realm');
      coldFrame.setAttribute('aria-label', 'Opaque sealed realm');
      if (!('srcdoc' in coldFrame)) {
        throw new Error('srcdoc is unavailable');
      }
      coldRealmHost.appendChild(coldFrame);
      coldBootTimer = window.setTimeout(function () {
        if (!coldRealmReady) {
          setColdRealmFailure();
        }
      }, 1500);
      coldFrame.srcdoc = coldRealmDocument;
    } catch (error) {
      setColdRealmFailure();
    }
  }

  function renderRoute(shouldFocus) {
    var route = routeFromLocation();
    var detail = routeDetails[route];
    normalizeLocation(route);

    pages.forEach(function (page) {
      var isCurrent = page.getAttribute('data-page') === route;
      page.hidden = !isCurrent;
      page.setAttribute('aria-hidden', String(!isCurrent));
    });

    routeLinks.forEach(function (link) {
      var isCurrent = link.getAttribute('data-route') === route;
      if (isCurrent) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });

    if (currentSection) {
      currentSection.textContent = detail.label;
    }
    document.title = detail.title + ' · Coldbox';
    if (announcement) {
      announcement.textContent = detail.group + ', ' + detail.label;
    }
    closeMoreMenu();

    if (shouldFocus) {
      try {
        main.focus({ preventScroll: true });
      } catch (error) {
        main.focus();
      }
    }
  }

  setTheme(readStoredTheme(), false);
  app.setAttribute('data-build-state', 'warm-shell');
  app.setAttribute('data-routing-ready', 'true');
  app.setAttribute('data-cold-state', 'starting');
  renderRoute(false);

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var nextTheme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      setTheme(nextTheme, true);
    });
  }

  if (moreTab) {
    moreTab.addEventListener('click', toggleMoreMenu);
  }
  if (moreClose) {
    moreClose.addEventListener('click', closeMoreMenu);
  }
  routeLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      closeMoreMenu();
    });
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeMoreMenu();
    }
  });
  window.addEventListener('hashchange', function () {
    renderRoute(true);
  });
  startColdRealm();
}());
