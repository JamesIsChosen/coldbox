
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
  var capabilityCryptoSummary = document.getElementById('capability-crypto-summary');
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
  var vaultStatus = document.getElementById('vault-status');
  var vaultStatusTitle = document.getElementById('vault-status-title');
  var vaultStatusCopy = document.getElementById('vault-status-copy');
  var vaultStatusLabel = document.getElementById('vault-status-label');
  var vaultFileInput = document.getElementById('vault-file-input');
  var vaultLoadFile = document.getElementById('vault-load-file');
  var vaultSaveFileSystem = document.getElementById('vault-save-file-system');
  var vaultSaveDownload = document.getElementById('vault-save-download');
  var vaultSaveManual = document.getElementById('vault-save-manual');
  var vaultManualData = document.getElementById('vault-manual-data');
  var vaultManualCopy = document.getElementById('vault-manual-copy');
  var vaultLoadManual = document.getElementById('vault-load-manual');
  var vaultLock = document.getElementById('vault-lock');
  var vaultPanicHide = document.getElementById('vault-panic-hide');
  var panicScreen = document.getElementById('panic-screen');
  var panicReload = document.getElementById('panic-reload');
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
  var vaultState = 'locked';
  var pendingVaultRequest = null;
  var vaultMessageSequence = 0;
  var lastModeOnline = null;
  var lastEscapeAt = 0;
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

  function renderCryptoSummary() {
    if (!capabilityCryptoSummary) {
      return;
    }
    if (!coldCapabilityReport) {
      capabilityCryptoSummary.textContent = 'Vault crypto: waiting for the sealed realm to report its active KDF.';
      capabilityCryptoSummary.setAttribute('data-kdf-active', 'checking');
      return;
    }
    var activeKdf = coldCapabilityReport.kdfActive || 'unknown';
    capabilityCryptoSummary.setAttribute('data-kdf-active', activeKdf);
    if (coldCapabilityReport.nobleAesGcm !== true) {
      capabilityCryptoSummary.textContent = 'Vault crypto: pure-JS AES-GCM self-test failed; vault operations are refused.';
      return;
    }
    if (coldCapabilityReport.argon2id === true) {
      capabilityCryptoSummary.textContent = 'Vault crypto: active KDF is ' + activeKdf + '. Pure-JS @noble AES-GCM is the default cipher path.';
      return;
    }
    capabilityCryptoSummary.textContent = 'Vault crypto: active KDF is ' + activeKdf + '. Argon2id WASM failed its test, so the visible PBKDF2 fallback is active.';
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
    renderCryptoSummary();
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

  function sendColdMode(online) {
    if (airgapFailure || handshakeState !== 'ready' || !coldMessagePort || lastModeOnline === online) {
      return;
    }
    var message = protocol.createMessage(
      'warm-to-cold',
      nextVaultMessageId('mode'),
      'mode.set',
      { online: online }
    );
    if (!message) {
      recordChannelAnomaly();
      return;
    }
    try {
      coldMessagePort.postMessage(message);
      lastModeOnline = online;
    } catch (error) {
      recordChannelAnomaly();
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
    sendColdMode(snapshot.online !== false);
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
    if (pendingVaultRequest) {
      var pendingRequest = pendingVaultRequest;
      pendingVaultRequest = null;
      pendingRequest.reject(new Error('Vault operations are locked down.'));
    }
    updateVaultControls();
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

  function vaultChannelReady() {
    return !airgapFailure
      && handshakeState === 'ready'
      && coldMessagePort !== null
      && root.getAttribute('data-vault-operations') === 'guarded';
  }

  function updateVaultControls() {
    var channelReady = vaultChannelReady();
    var unlocked = vaultState === 'unlocked';
    var hasManualText = Boolean(vaultManualData && vaultManualData.value.trim());
    if (vaultLoadFile) {
      vaultLoadFile.disabled = !channelReady;
    }
    if (vaultSaveFileSystem) {
      vaultSaveFileSystem.disabled = !channelReady
        || !unlocked
        || typeof window.showSaveFilePicker !== 'function';
    }
    if (vaultSaveDownload) {
      vaultSaveDownload.disabled = !channelReady || !unlocked;
    }
    if (vaultSaveManual) {
      vaultSaveManual.disabled = !channelReady || !unlocked;
    }
    if (vaultManualCopy) {
      vaultManualCopy.disabled = !hasManualText;
    }
    if (vaultLoadManual) {
      vaultLoadManual.disabled = !channelReady || !hasManualText;
    }
    if (vaultLock) {
      vaultLock.disabled = !channelReady || vaultState === 'locked';
    }
  }

  function setVaultStatus(state, title, copy, label) {
    vaultState = state;
    if (vaultStatus) {
      vaultStatus.setAttribute('data-state', state);
    }
    if (vaultStatusTitle) {
      vaultStatusTitle.textContent = title;
    }
    if (vaultStatusCopy) {
      vaultStatusCopy.textContent = copy;
    }
    if (vaultStatusLabel) {
      vaultStatusLabel.textContent = label;
    }
    updateVaultControls();
  }

  function setVaultNotice(copy) {
    if (vaultStatusCopy) {
      vaultStatusCopy.textContent = copy;
    }
  }

  function nextVaultMessageId(prefix) {
    vaultMessageSequence += 1;
    return 'vault-' + prefix + '-' + String(vaultMessageSequence);
  }

  function sendVaultMessage(type, payload, id) {
    if (!vaultChannelReady()) {
      setVaultNotice('The sealed realm is not ready. Vault operations remain locked.');
      return null;
    }
    var message = protocol.createMessage(
      'warm-to-cold',
      id || nextVaultMessageId(type.replace(/[^A-Za-z0-9]+/g, '-')),
      type,
      payload
    );
    if (!message) {
      setVaultNotice('The vault operation was rejected before it reached the sealed realm.');
      return null;
    }
    try {
      coldMessagePort.postMessage(message);
      return message.id;
    } catch (error) {
      setVaultNotice('The sealed realm could not receive the vault operation.');
      return null;
    }
  }

  function requestVaultBytes() {
    return new Promise(function (resolve, reject) {
      if (pendingVaultRequest) {
        reject(new Error('A vault save is already in progress.'));
        return;
      }
      if (!vaultChannelReady()) {
        reject(new Error('The sealed realm is not ready.'));
        return;
      }
      var id = nextVaultMessageId('save');
      var message = protocol.createMessage(
        'warm-to-cold',
        id,
        'vault.saveRequest',
        {}
      );
      if (!message) {
        reject(new Error('The vault save request was rejected.'));
        return;
      }
      pendingVaultRequest = { id: id, resolve: resolve, reject: reject };
      try {
        coldMessagePort.postMessage(message);
      } catch (error) {
        pendingVaultRequest = null;
        reject(new Error('The sealed realm could not receive the save request.'));
      }
    });
  }

  function sendVaultOpen(bytes) {
    if (!bytes || bytes.length === 0) {
      setVaultNotice('The selected file did not contain vault bytes.');
      return;
    }
    var copy = new Uint8Array(bytes);
    var id = nextVaultMessageId('open');
    var message = protocol.createMessage(
      'warm-to-cold',
      id,
      'vault.open',
      { bytes: copy }
    );
    if (!message) {
      setVaultNotice('The selected vault is too large or is not a supported byte file.');
      return;
    }
    setVaultStatus(
      'pending',
      'Vault is waiting for unlock',
      'Encrypted bytes are inside the cold realm. Enter the unlock phrase in the sealed frame above.',
      'Pending'
    );
    try {
      coldMessagePort.postMessage(message);
    } catch (error) {
      setVaultStatus(
        'locked',
        'Vault is locked',
        'The sealed realm could not receive the selected file.',
        'Locked'
      );
    }
  }

  function bytesToBase64(bytes) {
    var binary = '';
    for (var index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }
    return window.btoa(binary);
  }

  function base64ToBytes(value) {
    var normalized = String(value || '').replace(/\s+/g, '');
    var maximumBase64Length = Math.ceil((64 * 1024 * 1024) * 4 / 3) + 8;
    if (!normalized
      || normalized.length > maximumBase64Length
      || normalized.length % 4 !== 0
      || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
      throw new Error('Invalid vault text.');
    }
    var binary;
    try {
      binary = window.atob(normalized);
    } catch (error) {
      throw new Error('Invalid vault text.');
    }
    var bytes = new Uint8Array(binary.length);
    for (var index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  function readVaultFile(file) {
    if (!file) {
      return Promise.reject(new Error('No file was selected.'));
    }
    if (typeof file.arrayBuffer === 'function') {
      return file.arrayBuffer();
    }
    return new Promise(function (resolve, reject) {
      if (typeof window.FileReader !== 'function') {
        reject(new Error('File reading is unavailable.'));
        return;
      }
      var reader = new window.FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error('The selected file could not be read.')); };
      reader.readAsArrayBuffer(file);
    });
  }

  function loadVaultFile(file) {
    readVaultFile(file).then(function (buffer) {
      sendVaultOpen(new Uint8Array(buffer));
    }, function () {
      setVaultNotice('The selected file could not be read.');
    });
  }

  function loadFromDevice() {
    if (typeof window.showOpenFilePicker === 'function') {
      window.showOpenFilePicker({
        multiple: false,
        types: [{
          description: 'Coldbox vault',
          accept: { 'application/octet-stream': ['.cbxvault'] }
        }]
      }).then(function (handles) {
        if (!handles || handles.length === 0) {
          return null;
        }
        return handles[0].getFile();
      }).then(function (file) {
        if (file) {
          loadVaultFile(file);
        }
      }).catch(function (error) {
        if (!error || error.name !== 'AbortError') {
          setVaultNotice('The device file picker could not open the vault.');
        }
      });
      return;
    }
    if (vaultFileInput) {
      vaultFileInput.click();
    }
  }

  function reportVaultSaveFailure(error) {
    if (error && error.name === 'AbortError') {
      setVaultNotice('Save cancelled. The vault remains unchanged.');
      return;
    }
    setVaultNotice('The encrypted vault could not be saved.');
  }

  function saveWithFileSystemAccess() {
    requestVaultBytes().then(function (bytes) {
      if (typeof window.showSaveFilePicker !== 'function') {
        throw new Error('File System Access is unavailable.');
      }
      return window.showSaveFilePicker({
        suggestedName: 'coldbox-vault.cbxvault',
        types: [{
          description: 'Coldbox vault',
          accept: { 'application/octet-stream': ['.cbxvault'] }
        }]
      }).then(function (handle) {
        return handle.createWritable().then(function (writable) {
          return writable.write(bytes).then(function () {
            return writable.close();
          });
        });
      });
    }).then(function () {
      setVaultNotice('Encrypted vault saved with File System Access.');
    }, reportVaultSaveFailure);
  }

  function saveAsDownload() {
    requestVaultBytes().then(function (bytes) {
      if (!window.URL || typeof window.URL.createObjectURL !== 'function') {
        throw new Error('Blob download is unavailable.');
      }
      var blob = new window.Blob([bytes], { type: 'application/octet-stream' });
      var url = window.URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      link.download = 'coldbox-vault.cbxvault';
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(function () { window.URL.revokeObjectURL(url); }, 0);
    }).then(function () {
      setVaultNotice('Encrypted vault download started.');
    }, reportVaultSaveFailure);
  }

  function saveAsManualText() {
    requestVaultBytes().then(function (bytes) {
      if (!vaultManualData) {
        throw new Error('Manual export is unavailable.');
      }
      vaultManualData.value = bytesToBase64(bytes);
      vaultManualData.scrollTop = 0;
      updateVaultControls();
      setVaultNotice('Encrypted vault text is ready to copy or move through a QR handoff.');
    }, reportVaultSaveFailure);
  }

  function copyManualText() {
    if (!vaultManualData || !vaultManualData.value.trim()) {
      setVaultNotice('Prepare a manual export before copying it.');
      return;
    }
    var text = vaultManualData.value;
    if (window.navigator.clipboard && typeof window.navigator.clipboard.writeText === 'function') {
      window.navigator.clipboard.writeText(text).then(function () {
        setVaultNotice('Encrypted vault text copied.');
      }, function () {
        vaultManualData.focus();
        vaultManualData.select();
        setVaultNotice('Clipboard access was unavailable. The encrypted text is selected for manual copy.');
      });
      return;
    }
    vaultManualData.focus();
    vaultManualData.select();
    setVaultNotice('The encrypted text is selected for manual copy.');
  }

  function loadManualText() {
    if (!vaultManualData) {
      return;
    }
    try {
      sendVaultOpen(base64ToBytes(vaultManualData.value));
    } catch (error) {
      setVaultNotice('Manual load needs the complete base64 text from an encrypted vault export.');
    }
  }

  function publicRecordCount(publicCompartment) {
    if (!publicCompartment || typeof publicCompartment !== 'object') {
      return 0;
    }
    return Object.keys(publicCompartment).reduce(function (total, key) {
      return total + (Array.isArray(publicCompartment[key]) ? publicCompartment[key].length : 0);
    }, 0);
  }

  function handleVaultOpened(message) {
    var count = publicRecordCount(message.payload.publicCompartment);
    setVaultStatus(
      'unlocked',
      'Vault is unlocked',
      count === 0
        ? 'The encrypted vault opened inside the sealed realm. No public records were returned to this shell.'
        : String(count) + ' public record(s) are available to the warm shell; secret compartments remain sealed here.',
      'Unlocked'
    );
  }

  function handleVaultStatus(message) {
    if (message.payload.locked) {
      setVaultStatus(
        'locked',
        'Vault is locked',
        'The cold realm cleared its active vault session. Encrypted bytes can still be loaded again.',
        'Locked'
      );
    } else {
      setVaultStatus(
        'unlocked',
        'Vault is unlocked',
        'The active vault session remains inside the sealed realm.',
        'Unlocked'
      );
    }
    if (message.payload.warnings.indexOf('airgap-violation') !== -1) {
      setAirgapFailure('The cold realm runtime network guard blocked an unexpected request. Vault operations are refused.', true);
    }
  }

  function handleVaultError(message) {
    if (pendingVaultRequest && pendingVaultRequest.id === message.id) {
      var request = pendingVaultRequest;
      pendingVaultRequest = null;
      request.reject(new Error(message.payload.message));
    }
    if (message.payload.code === 'vault-corrupt') {
      setVaultStatus(
        'pending',
        'Vault remains locked',
        'Unlock failed. The vault could not be authenticated; the same message covers a wrong phrase or corrupted bytes.',
        'Pending'
      );
      return;
    }
    setVaultNotice(message.payload.message);
  }

  function handleVaultBytes(message) {
    if (!pendingVaultRequest || pendingVaultRequest.id !== message.id) {
      recordChannelAnomaly();
      return;
    }
    var request = pendingVaultRequest;
    pendingVaultRequest = null;
    request.resolve(new Uint8Array(message.payload.bytes));
    updateVaultControls();
  }

  function sendVaultLock() {
    var id = sendVaultMessage('vault.lock', {});
    if (id) {
      setVaultStatus(
        'locked',
        'Vault is locked',
        'The lock request was sent to the sealed realm. Its active bytes will be cleared there.',
        'Locked'
      );
    }
  }

  function panicHide() {
    sendVaultLock();
    if (app) {
      app.hidden = true;
    }
    if (panicScreen) {
      panicScreen.hidden = false;
    }
    document.title = 'Coldbox hidden';
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
    updateVaultControls();
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
      if (capabilities.nobleAesGcm !== true) {
        setAirgapFailure('The cold realm pure-JS AES-GCM known-answer test did not pass. Vault operations are refused.');
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
        manualExport: capabilities.manualExport === true,
        nobleAesGcm: capabilities.nobleAesGcm === true,
        argon2id: capabilities.argon2id === true,
        webCryptoKat: capabilities.webCryptoKat === true,
        kdfActive: typeof capabilities.kdfActive === 'string' ? capabilities.kdfActive : 'unknown'
      };
      root.setAttribute('data-cold-crypto-state', coldCapabilityReport.argon2id ? 'ready' : 'fallback');
      root.setAttribute('data-cold-kdf-active', coldCapabilityReport.kdfActive);
      setCapabilityRootAttributes(coldCapabilityReport, 'cold');
      if (coldCapabilityReport.randomValues !== true) {
        setCapabilityFailure('Required crypto.getRandomValues is unavailable in the cold realm. Coldbox refuses all vault operations and never substitutes Math.random.');
        return;
      }
      coldCanaryPassed = true;
      root.setAttribute('data-cold-csp-canary', 'passed');
      root.setAttribute('data-cold-runtime-neutering', 'installed');
      renderCryptoSummary();
      renderCapabilityPanel();
      setHandshakeReady();
      updateAirgapBanner();
      return;
    }
    if (handshakeState === 'ready'
      && message.type === 'vault.opened') {
      handleVaultOpened(message);
      return;
    }
    if (handshakeState === 'ready' && message.type === 'vault.bytes') {
      handleVaultBytes(message);
      return;
    }
    if (handshakeState === 'ready' && message.type === 'status') {
      handleVaultStatus(message);
      return;
    }
    if (handshakeState === 'ready' && message.type === 'error') {
      handleVaultError(message);
      return;
    }
    if (handshakeState === 'ready' && message.type === 'panic.hide') {
      panicHide();
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
  setVaultStatus(
    'locked',
    'Vault is locked',
    'Load an encrypted vault, then enter its unlock phrase in the sealed realm. The warm shell never receives it.',
    'Locked'
  );
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
  if (vaultLoadFile) {
    vaultLoadFile.addEventListener('click', loadFromDevice);
  }
  if (vaultFileInput) {
    vaultFileInput.addEventListener('change', function () {
      if (vaultFileInput.files && vaultFileInput.files.length > 0) {
        loadVaultFile(vaultFileInput.files[0]);
      }
      vaultFileInput.value = '';
    });
  }
  if (vaultSaveFileSystem) {
    vaultSaveFileSystem.addEventListener('click', saveWithFileSystemAccess);
  }
  if (vaultSaveDownload) {
    vaultSaveDownload.addEventListener('click', saveAsDownload);
  }
  if (vaultSaveManual) {
    vaultSaveManual.addEventListener('click', saveAsManualText);
  }
  if (vaultManualCopy) {
    vaultManualCopy.addEventListener('click', copyManualText);
  }
  if (vaultLoadManual) {
    vaultLoadManual.addEventListener('click', loadManualText);
  }
  if (vaultManualData) {
    vaultManualData.addEventListener('input', updateVaultControls);
  }
  if (vaultLock) {
    vaultLock.addEventListener('click', sendVaultLock);
  }
  if (vaultPanicHide) {
    vaultPanicHide.addEventListener('click', panicHide);
  }
  if (panicReload) {
    panicReload.addEventListener('click', function () {
      window.location.reload();
    });
  }
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeMoreMenu();
      var now = Date.now();
      if (lastEscapeAt > 0 && now - lastEscapeAt <= 800) {
        event.preventDefault();
        lastEscapeAt = 0;
        panicHide();
      } else {
        lastEscapeAt = now;
      }
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
