
__COLDBOX_PROTOCOL__
__COLDBOX_AIRGAP__
__COLDBOX_CAPABILITIES__
(function () {
  'use strict';

  var coldRealmDocument = __COLDBOX_COLD_REALM_DOCUMENT__;
  var protocol = window.__coldboxProtocol;
  var airgap = window.__coldboxAirgap;
  var capabilities = window.__coldboxCapabilities;
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
  var protocolWarning = document.getElementById('protocol-warning');
  var coldRealmHost = document.getElementById('cold-realm-host');
  var airgapBanner = document.getElementById('airgap-banner');
  var airgapBannerTitle = document.getElementById('airgap-banner-title');
  var airgapBannerCopy = document.getElementById('airgap-banner-copy');
  var airgapBannerLabel = document.getElementById('airgap-banner-label');
  var capabilityPanel = document.getElementById('capability-panel');
  var capabilityPanelLabel = document.getElementById('capability-panel-label');
  var capabilitySummary = document.getElementById('capability-summary');
  var capabilityRows = {
    randomValues: document.getElementById('capability-row-random-values'),
    cryptoSubtle: document.getElementById('capability-row-crypto-subtle'),
    wasm: document.getElementById('capability-row-wasm'),
    workers: document.getElementById('capability-row-workers'),
    camera: document.getElementById('capability-row-camera'),
    savePaths: document.getElementById('capability-row-save-paths')
  };
  var capabilityStatuses = {
    randomValues: document.getElementById('capability-status-random-values'),
    cryptoSubtle: document.getElementById('capability-status-crypto-subtle'),
    wasm: document.getElementById('capability-status-wasm'),
    workers: document.getElementById('capability-status-workers'),
    camera: document.getElementById('capability-status-camera'),
    savePaths: document.getElementById('capability-status-save-paths')
  };
  var capabilityDetails = {
    randomValues: document.getElementById('capability-detail-random-values'),
    cryptoSubtle: document.getElementById('capability-detail-crypto-subtle'),
    wasm: document.getElementById('capability-detail-wasm'),
    workers: document.getElementById('capability-detail-workers'),
    camera: document.getElementById('capability-detail-camera'),
    savePaths: document.getElementById('capability-detail-save-paths')
  };
  var coldFrame = null;
  var coldBootTimer = null;
  var coldRealmFailed = false;
  var coldMessagePort = null;
  var handshakeState = 'starting';
  var globalAnomalyCount = 0;
  var channelAnomalyCount = 0;
  var airgapFailure = false;
  var capabilityFailure = false;
  var lockdownTitle = 'CSP failure / locked down';
  var lockdownCopy = 'The CSP canary or runtime network guard failed. Vault operations are refused until a verified build is loaded.';
  var warmCanaryPassed = false;
  var coldCanaryPassed = false;
  var warmCapabilityReport = null;
  var coldCapabilityReport = null;
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

  function capabilityBoolean(report, name) {
    if (!report || typeof report[name] !== 'boolean') {
      return null;
    }
    return report[name];
  }

  function capabilityWord(value) {
    if (value === true) {
      return 'available';
    }
    if (value === false) {
      return 'unavailable';
    }
    return 'checking';
  }

  function setCapabilityRootAttributes(report, realm) {
    if (!report) {
      return;
    }
    [
      'randomValues',
      'cryptoSubtle',
      'wasm',
      'workers',
      'camera',
      'fileSystemAccess',
      'blobDownload',
      'manualExport'
    ].forEach(function (name) {
      var value = capabilityBoolean(report, name);
      root.setAttribute(
        'data-capability-' + realm + '-' + name,
        value === null ? 'unknown' : String(value)
      );
    });
  }

  function setCapabilityPanelState(state, label, summary) {
    root.setAttribute('data-capability-state', state);
    app.setAttribute('data-capability-state', state);
    if (capabilityPanel) {
      capabilityPanel.setAttribute('data-capability-state', state);
    }
    if (capabilityPanelLabel) {
      capabilityPanelLabel.textContent = label;
    }
    if (capabilitySummary) {
      capabilitySummary.textContent = summary;
    }
  }

  function setCapabilityRow(name, state, label, detail) {
    var row = capabilityRows[name];
    if (row) {
      row.setAttribute('data-state', state);
    }
    if (capabilityStatuses[name]) {
      capabilityStatuses[name].textContent = label;
    }
    if (capabilityDetails[name]) {
      capabilityDetails[name].textContent = detail;
    }
  }

  function renderRealmCapability(name, warmValue, coldValue) {
    if (warmValue === null || coldValue === null) {
      setCapabilityRow(name, 'checking', 'Checking', 'Checking the warm shell and cold realm.');
      return false;
    }
    if (warmValue === true && coldValue === true) {
      setCapabilityRow(name, 'available', 'Available', 'Warm shell: available · Cold realm: available.');
      return false;
    }
    if (warmValue === false && coldValue === false) {
      setCapabilityRow(name, 'unavailable', 'Unavailable', 'Warm shell: unavailable · Cold realm: unavailable.');
      return true;
    }
    setCapabilityRow(
      name,
      'partial',
      'Mixed',
      'Warm shell: ' + capabilityWord(warmValue) + ' · Cold realm: ' + capabilityWord(coldValue) + '.'
    );
    return true;
  }

  function renderCapabilityPanel() {
    setCapabilityRootAttributes(warmCapabilityReport, 'warm');
    setCapabilityRootAttributes(coldCapabilityReport, 'cold');
    if (capabilityFailure) {
      setCapabilityPanelState(
        'failed',
        'Locked down',
        'A required boot capability is unavailable. Vault operations are refused until a verified build is loaded.'
      );
      return;
    }
    if (!warmCapabilityReport || !coldCapabilityReport) {
      setCapabilityPanelState(
        'checking',
        'Checking',
        'Coldbox is checking the platform capabilities needed for safe secret work and portable saves.'
      );
      setCapabilityRow('randomValues', 'checking', 'Checking', 'Checking both realms.');
      setCapabilityRow('cryptoSubtle', 'checking', 'Checking', 'Checking the warm shell and cold realm.');
      setCapabilityRow('wasm', 'checking', 'Checking', 'Checking the warm shell and cold realm.');
      setCapabilityRow('workers', 'checking', 'Checking', 'Checking the warm shell and cold realm.');
      setCapabilityRow('camera', 'checking', 'Checking', 'Checking the warm shell.');
      setCapabilityRow('savePaths', 'checking', 'Checking', 'Checking the warm shell.');
      return;
    }

    var warmRandom = capabilityBoolean(warmCapabilityReport, 'randomValues');
    var coldRandom = capabilityBoolean(coldCapabilityReport, 'randomValues');
    var randomReady = warmRandom === true && coldRandom === true;
    if (randomReady) {
      setCapabilityRow('randomValues', 'available', 'Ready', 'Warm shell: available · Cold realm: available.');
    } else if (warmRandom === false || coldRandom === false) {
      setCapabilityRow('randomValues', 'unavailable', 'Missing', 'Required in both realms; no Math.random fallback is permitted.');
    } else {
      setCapabilityRow('randomValues', 'checking', 'Checking', 'Checking both realms.');
    }

    var optionalWarnings = 0;
    optionalWarnings += renderRealmCapability(
      'cryptoSubtle',
      capabilityBoolean(warmCapabilityReport, 'cryptoSubtle'),
      capabilityBoolean(coldCapabilityReport, 'cryptoSubtle')
    ) ? 1 : 0;
    optionalWarnings += renderRealmCapability(
      'wasm',
      capabilityBoolean(warmCapabilityReport, 'wasm'),
      capabilityBoolean(coldCapabilityReport, 'wasm')
    ) ? 1 : 0;
    optionalWarnings += renderRealmCapability(
      'workers',
      capabilityBoolean(warmCapabilityReport, 'workers'),
      capabilityBoolean(coldCapabilityReport, 'workers')
    ) ? 1 : 0;

    var camera = capabilityBoolean(warmCapabilityReport, 'camera');
    if (camera === true) {
      setCapabilityRow('camera', 'available', 'API available', 'Permission is requested only when a camera workflow starts.');
    } else {
      setCapabilityRow('camera', 'unavailable', 'Unavailable', 'No camera API is exposed; QR generation and manual entry remain separate paths.');
      optionalWarnings += 1;
    }

    var savePathDefinitions = [
      { key: 'fileSystemAccess', label: 'File System Access' },
      { key: 'blobDownload', label: 'Blob download' },
      { key: 'manualExport', label: 'Manual export' }
    ];
    var availableSavePaths = savePathDefinitions.filter(function (path) {
      return capabilityBoolean(warmCapabilityReport, path.key) === true;
    });
    if (availableSavePaths.length > 0) {
      setCapabilityRow(
        'savePaths',
        'available',
        String(availableSavePaths.length) + '/3 available',
        availableSavePaths.map(function (path) { return path.label; }).join(' · ')
      );
    } else {
      setCapabilityRow('savePaths', 'unavailable', 'None detected', 'No save path API is exposed in the warm shell.');
      optionalWarnings += 1;
    }

    if (!randomReady) {
      setCapabilityFailure('Required crypto.getRandomValues is unavailable in every required realm. Coldbox refuses all vault operations and never substitutes Math.random.');
      return;
    }
    if (optionalWarnings > 0) {
      setCapabilityPanelState(
        'ready-with-warnings',
        'Ready with limits',
        'Required randomness is available. Optional platform limits are shown above and do not change the cold-realm boundary.'
      );
      return;
    }
    setCapabilityPanelState(
      'ready',
      'Ready',
      'Required randomness and all detected optional capability checks are available in this browser.'
    );
  }

  function setCapabilityFailure(reason) {
    if (capabilityFailure || airgapFailure) {
      return;
    }
    capabilityFailure = true;
    lockdownTitle = 'Capability failure / locked down';
    lockdownCopy = 'A required boot capability is unavailable. Vault operations are refused until a verified build is loaded.';
    root.setAttribute('data-capability-state', 'failed');
    app.setAttribute('data-capability-state', 'failed');
    setCapabilityPanelState('failed', 'Locked down', lockdownCopy);
    setAirgapFailure(reason);
    if (coldRealmStatusTitle) {
      coldRealmStatusTitle.textContent = 'Required capability unavailable';
    }
    if (coldRealmStatusCopy) {
      coldRealmStatusCopy.textContent = reason;
    }
    if (coldRealmFailure) {
      coldRealmFailure.textContent = reason;
    }
  }

  function setAirgapBanner(state, title, copy, label) {
    root.setAttribute('data-airgap-state', state);
    app.setAttribute('data-airgap-state', state);
    if (!airgapBanner) {
      return;
    }
    airgapBanner.setAttribute('data-airgap-state', state);
    if (airgapBannerTitle) {
      airgapBannerTitle.textContent = title;
    }
    if (airgapBannerCopy) {
      airgapBannerCopy.textContent = copy;
    }
    if (airgapBannerLabel) {
      airgapBannerLabel.textContent = label;
    }
  }

  function updateAirgapBanner() {
    if (!airgap) {
      return;
    }
    var snapshot = airgap.getNetworkSnapshot();
    root.setAttribute(
      'data-network-online',
      snapshot.online === null ? 'unknown' : String(snapshot.online)
    );
    root.setAttribute('data-network-connection', snapshot.connection);
    if (airgapFailure) {
      setAirgapBanner(
        'red',
        lockdownTitle,
        lockdownCopy,
        'Locked down'
      );
      return;
    }
    if (!warmCapabilityReport || !coldCapabilityReport) {
      setAirgapBanner(
        'checking',
        'Checking the capability panel',
        'Coldbox is confirming required randomness and optional platform capabilities before vault operations can be considered.',
        'Checking'
      );
      return;
    }
    if (capabilityBoolean(warmCapabilityReport, 'randomValues') !== true
      || capabilityBoolean(coldCapabilityReport, 'randomValues') !== true) {
      setCapabilityFailure('Required crypto.getRandomValues is unavailable in every required realm. Coldbox refuses all vault operations and never substitutes Math.random.');
      return;
    }
    if (!warmCanaryPassed || !coldCanaryPassed || handshakeState !== 'ready') {
      setAirgapBanner(
        'checking',
        'Checking the airgap guard',
        'Coldbox is confirming both CSP policies and the private cold-realm channel before vault operations can be considered.',
        'Checking'
      );
      return;
    }
    root.setAttribute('data-lockdown-state', 'none');
    root.setAttribute('data-vault-operations', 'guarded');
    app.setAttribute('data-lockdown-state', 'none');
    app.setAttribute('data-vault-operations', 'guarded');
    if (snapshot.online === false) {
      setAirgapBanner(
        'green',
        'Airgapped / guard verified',
        'No network interface is reported. The cold realm remains sealed by CSP and its runtime network guard.',
        'Airgapped'
      );
      return;
    }
    setAirgapBanner(
      'amber',
      snapshot.online === true ? 'Online / secrets sealed' : 'Network state unknown / secrets sealed',
      snapshot.online === true
        ? 'The warm shell may use its documented public network allowlist. Secret-capable work remains inside the airgapped cold realm.'
        : 'The browser did not expose a definitive network state. The cold realm remains sealed by CSP and its runtime network guard.',
      snapshot.online === true ? 'Online' : 'Unknown'
    );
  }

  function setAirgapFailure(reason, keepColdFrame) {
    if (airgapFailure) {
      return;
    }
    airgapFailure = true;
    coldRealmFailed = true;
    handshakeState = 'failed';
    root.setAttribute('data-lockdown-state', 'full');
    root.setAttribute('data-vault-operations', 'refused');
    root.setAttribute('data-cold-state', 'failed');
    root.setAttribute('data-handshake-state', 'failed');
    app.setAttribute('data-lockdown-state', 'full');
    app.setAttribute('data-vault-operations', 'refused');
    app.setAttribute('data-cold-state', 'failed');
    app.setAttribute('data-handshake-state', 'failed');
    if (coldBootTimer !== null) {
      window.clearTimeout(coldBootTimer);
      coldBootTimer = null;
    }
    if (coldMessagePort) {
      try {
        coldMessagePort.close();
      } catch (error) {
        // Lockdown remains terminal even if the port is already closed.
      }
      coldMessagePort = null;
    }
    window.removeEventListener('message', handleColdRealmMessage);
    if (!keepColdFrame && coldFrame && coldFrame.parentNode) {
      coldFrame.parentNode.removeChild(coldFrame);
      coldFrame = null;
    }
    if (coldRealmStatus) {
      coldRealmStatus.setAttribute('data-cold-state', 'failed');
    }
    if (coldRealmStatusTitle) {
      coldRealmStatusTitle.textContent = 'The airgap guard is unavailable';
    }
    if (coldRealmStatusCopy) {
      coldRealmStatusCopy.textContent = reason;
    }
    if (coldRealmStatusLabel) {
      coldRealmStatusLabel.textContent = 'Locked down';
    }
    if (coldRealmFailure) {
      coldRealmFailure.textContent = 'Coldbox is locked down because its airgap guarantee could not be established. No vault operation is available in this state.';
      coldRealmFailure.hidden = false;
    }
    setAirgapBanner(
      'red',
      lockdownTitle,
      lockdownCopy,
      'Locked down'
    );
  }

  function setColdRealmFailure(reason) {
    setAirgapFailure(
      reason === 'handshake-timeout'
        ? 'The sealed realm started, but its private channel did not complete. Coldbox refuses to continue without a validated protocol.'
        : 'The isolated frame did not establish its boot signal. Coldbox refuses to continue as a single-realm app.'
    );
  }

  function setColdRealmReady() {
    if (coldRealmFailed) {
      return;
    }
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
    updateAirgapBanner();
    if (coldRealmFailure) {
      coldRealmFailure.hidden = true;
    }
    app.setAttribute('data-cold-state', 'ready');
  }

  function recordGlobalMessageAnomaly() {
    globalAnomalyCount += 1;
    root.setAttribute('data-global-message-anomalies', String(globalAnomalyCount));
    if (protocolWarning) {
      protocolWarning.hidden = false;
    }
    console.warn('Coldbox discarded a global message after handshake.');
  }

  function recordChannelAnomaly() {
    channelAnomalyCount += 1;
    root.setAttribute('data-channel-anomalies', String(channelAnomalyCount));
    if (protocolWarning) {
      protocolWarning.hidden = false;
    }
    console.warn('Coldbox discarded an invalid channel message.');
  }

  function setHandshakePending() {
    handshakeState = 'pending';
    app.setAttribute('data-handshake-state', 'pending');
    if (coldRealmStatusTitle) {
      coldRealmStatusTitle.textContent = 'Opening the private message channel';
    }
    if (coldRealmStatusCopy) {
      coldRealmStatusCopy.textContent = 'The sealed realm is active. Coldbox is completing its private channel before any protocol message is accepted.';
    }
    if (coldRealmStatusLabel) {
      coldRealmStatusLabel.textContent = 'Connecting';
    }
  }

  function setHandshakeReady() {
    if (coldRealmFailed || handshakeState !== 'pending') {
      return;
    }
    if (coldBootTimer !== null) {
      window.clearTimeout(coldBootTimer);
      coldBootTimer = null;
    }
    handshakeState = 'ready';
    app.setAttribute('data-handshake-state', 'ready');
    if (coldRealmStatusTitle) {
      coldRealmStatusTitle.textContent = 'The private channel is established';
    }
    if (coldRealmStatusCopy) {
      coldRealmStatusCopy.textContent = 'Secret-capable work will remain inside this sandbox. Only validated public protocol messages may cross the private channel.';
    }
    if (coldRealmStatusLabel) {
      coldRealmStatusLabel.textContent = 'Ready';
    }
  }

  function handleProtocolPortMessage(event) {
    var message = protocol.validateMessage('cold-to-warm', event.data);
    if (!message) {
      recordChannelAnomaly();
      return;
    }
    if (handshakeState === 'pending' && message.type === 'ready') {
      var capabilities = message.payload.capabilities;
      if (!capabilities.cspCanary || !capabilities.runtimeNeutering) {
        setAirgapFailure('The cold realm airgap guard did not pass its CSP canary or runtime-neutering check. Vault operations are refused.');
        return;
      }
      coldCapabilityReport = {
        randomValues: capabilities.randomValues === true,
        cryptoSubtle: capabilities.cryptoSubtle === true,
        wasm: capabilities.wasm === true,
        workers: capabilities.workers === true,
        camera: capabilities.camera === true,
        fileSystemAccess: capabilities.fileSystemAccess === true,
        blobDownload: capabilities.blobDownload === true,
        manualExport: capabilities.manualExport === true
      };
      setCapabilityRootAttributes(coldCapabilityReport, 'cold');
      if (coldCapabilityReport.randomValues !== true) {
        setCapabilityFailure('Required crypto.getRandomValues is unavailable in the cold realm. Coldbox refuses all vault operations and never substitutes Math.random.');
        return;
      }
      coldCanaryPassed = true;
      root.setAttribute('data-cold-csp-canary', 'passed');
      root.setAttribute('data-cold-runtime-neutering', 'installed');
      renderCapabilityPanel();
      setHandshakeReady();
      updateAirgapBanner();
      return;
    }
    if (handshakeState === 'ready'
      && message.type === 'status'
      && message.payload.locked
      && message.payload.warnings.indexOf('airgap-violation') !== -1) {
      setAirgapFailure('The cold realm runtime network guard blocked an unexpected request. Vault operations are refused.', true);
      return;
    }
    recordChannelAnomaly();
  }

  function beginHandshake() {
    if (airgapFailure
      || handshakeState !== 'starting'
      || typeof window.MessageChannel !== 'function') {
      setColdRealmFailure('handshake-unavailable');
      return;
    }
    setHandshakePending();
    try {
      var channel = new MessageChannel();
      coldMessagePort = channel.port1;
      coldMessagePort.addEventListener('message', handleProtocolPortMessage);
      coldMessagePort.start();
      coldFrame.contentWindow.postMessage(protocol.handshakeMessage(), '*', [channel.port2]);
    } catch (error) {
      setColdRealmFailure('handshake-failed');
    }
  }

  function handleWarmCapabilityResult(result) {
    warmCapabilityReport = result || {};
    setCapabilityRootAttributes(warmCapabilityReport, 'warm');
    renderCapabilityPanel();
    if (capabilityBoolean(warmCapabilityReport, 'randomValues') !== true) {
      setCapabilityFailure('Required crypto.getRandomValues is unavailable in the warm shell. Coldbox refuses all vault operations and never substitutes Math.random.');
      return;
    }
    updateAirgapBanner();
  }

  function startCapabilities() {
    setCapabilityPanelState(
      'checking',
      'Checking',
      'Coldbox is checking the platform capabilities needed for safe secret work and portable saves.'
    );
    if (!capabilities || typeof capabilities.detect !== 'function') {
      handleWarmCapabilityResult({ randomValues: false });
      return;
    }
    capabilities.detect().then(handleWarmCapabilityResult, function () {
      handleWarmCapabilityResult({ randomValues: false });
    });
  }

  function handleWarmCanaryResult(result) {
    warmCanaryPassed = Boolean(result && result.passed);
    root.setAttribute('data-csp-canary', warmCanaryPassed ? 'passed' : 'failed');
    root.setAttribute(
      'data-csp-canary-reason',
      result && result.reason ? result.reason : 'unknown'
    );
    if (!warmCanaryPassed) {
      setAirgapFailure('The warm shell CSP canary did not fire. Coldbox refuses to continue without a verified policy.');
      return;
    }
    updateAirgapBanner();
  }

  function startWarmCanary() {
    root.setAttribute('data-csp-canary', 'checking');
    if (!airgap) {
      handleWarmCanaryResult({ passed: false, reason: 'airgap-guard-unavailable' });
      return;
    }
    airgap.runCanary().then(handleWarmCanaryResult, function () {
      handleWarmCanaryResult({ passed: false, reason: 'canary-error' });
    });
  }

  function startNetworkMonitor() {
    if (!airgap) {
      return;
    }
    var connection = window.navigator && (
      window.navigator.connection
      || window.navigator.mozConnection
      || window.navigator.webkitConnection
    );
    window.addEventListener('online', updateAirgapBanner);
    window.addEventListener('offline', updateAirgapBanner);
    window.addEventListener('focus', updateAirgapBanner);
    if (connection && typeof connection.addEventListener === 'function') {
      connection.addEventListener('change', updateAirgapBanner);
    }
    window.setInterval(updateAirgapBanner, 5000);
    updateAirgapBanner();
  }

  function handleColdRealmMessage(event) {
    if (handshakeState === 'ready') {
      recordGlobalMessageAnomaly();
      return;
    }
    if (coldRealmFailed || !coldFrame || event.source !== coldFrame.contentWindow) {
      return;
    }
    if (handshakeState !== 'starting'
      || !protocol.isReadySignal(event.data)
      || !event.ports
      || event.ports.length !== 0) {
      return;
    }
    setColdRealmReady();
    beginHandshake();
  }

  function startColdRealm() {
    if (airgapFailure || !coldRealmHost) {
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
        if (handshakeState !== 'ready') {
          setColdRealmFailure(handshakeState === 'pending' ? 'handshake-timeout' : 'boot-timeout');
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
  app.setAttribute('data-handshake-state', 'starting');
  app.setAttribute('data-airgap-state', 'checking');
  app.setAttribute('data-capability-state', 'checking');
  app.setAttribute('data-lockdown-state', 'checking');
  app.setAttribute('data-vault-operations', 'refused');
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
  startNetworkMonitor();
  startCapabilities();
  startWarmCanary();
  startColdRealm();
}());
