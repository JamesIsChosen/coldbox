__COLDBOX_PROTOCOL__
__COLDBOX_AIRGAP__
__COLDBOX_CAPABILITIES__
(function () {
  'use strict';

  var protocol = window.__coldboxProtocol;
  var airgap = window.__coldboxAirgap;
  var capabilities = window.__coldboxCapabilities;
  var cryptoLayer = window.__coldboxCrypto;
  var vaultLayer = window.__coldboxVault;
  var readyMarker = document.getElementById('cold-ready');
  var protocolWarning = document.getElementById('cold-protocol-warning');
  var details = document.getElementById('cold-realm-details');
  var messagePort = null;
  var handshakeState = 'starting';
  var globalAnomalyCount = 0;
  var channelAnomalyCount = 0;
  var canaryPassed = false;
  var runtimeNeuteringInstalled = false;
  var runtimeViolationCount = 0;
  var capabilityReport = {};
  var cryptoReport = {};
  var benchmarkButton = document.getElementById('cold-kdf-benchmark-run');
  var benchmarkResult = document.getElementById('cold-kdf-benchmark-result');
  var vaultControls = document.getElementById('cold-vault-controls');
  var vaultStatus = document.getElementById('cold-vault-status');
  var passphraseInput = document.getElementById('cold-vault-passphrase');
  var createVaultButton = document.getElementById('cold-vault-create');
  var unlockVaultButton = document.getElementById('cold-vault-unlock');
  var lockVaultButton = document.getElementById('cold-vault-lock');
  var keyfileToggle = document.getElementById('cold-vault-keyfile-toggle');
  var keyfileWarning = document.getElementById('cold-vault-keyfile-warning');
  var keyfileInput = document.getElementById('cold-vault-keyfile-input');
  var keyfileStatus = document.getElementById('cold-vault-keyfile-status');
  var vaultCryptoReady = false;
  var vaultBusy = false;
  var vaultUnlocked = false;
  var currentVaultBytes = null;
  var currentVaultSession = null;
  var pendingVaultBytes = null;
  var pendingOpenId = null;
  // Off by default (P0.15). Keyfile bytes and name never leave this document -
  // no message type carries them, and they are never logged. Cleared on lock
  // and whenever the keyfile toggle is switched off.
  var keyfileBytes = null;
  var keyfileName = '';
  var idleTimer = null;
  var lastEscapeAt = 0;
  var onlineMode = true;
  var IDLE_TIMEOUT_MS = 5 * 60 * 1000;

  function recordGlobalMessageAnomaly() {
    globalAnomalyCount += 1;
    document.documentElement.setAttribute('data-global-message-anomalies', String(globalAnomalyCount));
    if (protocolWarning) {
      protocolWarning.hidden = false;
    }
    console.warn('Coldbox discarded a global message after handshake.');
  }

  function recordChannelAnomaly() {
    channelAnomalyCount += 1;
    document.documentElement.setAttribute('data-channel-anomalies', String(channelAnomalyCount));
    if (protocolWarning) {
      protocolWarning.hidden = false;
    }
    console.warn('Coldbox discarded an invalid channel message.');
  }

  function zeroBytes(value) {
    if (value && typeof value.fill === 'function') {
      value.fill(0);
    }
  }

  function setSessionEvidence(state) {
    document.documentElement.setAttribute('data-cold-session-state', state);
    document.documentElement.setAttribute(
      'data-cold-working-bytes',
      currentVaultBytes ? 'present' : 'cleared'
    );
  }

  function setVaultStatus(state, text) {
    if (vaultControls) {
      vaultControls.setAttribute('data-state', state);
    }
    if (vaultStatus) {
      vaultStatus.setAttribute('data-state', state);
      vaultStatus.textContent = text;
    }
    document.documentElement.setAttribute('data-vault-state', state);
  }

  function vaultControlsReady() {
    return vaultCryptoReady && handshakeState === 'ready' && messagePort !== null;
  }

  function updateVaultControls() {
    var ready = vaultControlsReady();
    if (passphraseInput) {
      passphraseInput.disabled = !ready;
    }
    if (createVaultButton) {
      createVaultButton.disabled = !ready || vaultBusy || vaultUnlocked;
    }
    if (unlockVaultButton) {
      unlockVaultButton.disabled = !ready || vaultBusy || vaultUnlocked || !pendingVaultBytes;
    }
    if (lockVaultButton) {
      lockVaultButton.disabled = !ready || vaultBusy || (!vaultUnlocked && !pendingVaultBytes);
    }
    if (keyfileToggle) {
      keyfileToggle.disabled = !ready || vaultBusy || vaultUnlocked;
    }
    if (keyfileInput) {
      keyfileInput.disabled = !ready || vaultBusy || vaultUnlocked || !(keyfileToggle && keyfileToggle.checked);
    }
  }

  function zeroKeyfile() {
    zeroBytes(keyfileBytes);
    keyfileBytes = null;
    keyfileName = '';
  }

  function setKeyfileStatus(text) {
    if (keyfileStatus) {
      keyfileStatus.textContent = text;
    }
  }

  function clearKeyfileSelection() {
    zeroKeyfile();
    if (keyfileInput) {
      keyfileInput.value = '';
    }
    setKeyfileStatus('No keyfile selected. This input and the file\'s bytes stay inside this sealed realm.');
  }

  function nextVaultMessageId(prefix) {
    var value = document.documentElement.getAttribute('data-vault-message-sequence');
    var sequence = Number(value || 0) + 1;
    document.documentElement.setAttribute('data-vault-message-sequence', String(sequence));
    return 'cold-' + prefix + '-' + String(sequence);
  }

  function postVaultMessage(id, type, payload) {
    if (!messagePort) {
      return false;
    }
    var message = protocol.createMessage('cold-to-warm', id, type, payload);
    if (!message) {
      recordChannelAnomaly();
      return false;
    }
    try {
      messagePort.postMessage(message);
      return true;
    } catch (error) {
      recordChannelAnomaly();
      return false;
    }
  }

  function sendVaultStatus(locked) {
    postVaultMessage(
      nextVaultMessageId('status'),
      'status',
      { locked: locked, mode: 'cold', warnings: [] }
    );
  }

  function sendVaultError(id, code) {
    postVaultMessage(id || nextVaultMessageId('error'), 'error', { code: code });
  }

  function sendVaultOpened(id, publicData) {
    postVaultMessage(id || nextVaultMessageId('opened'), 'vault.opened', {
      publicCompartment: publicData && typeof publicData === 'object' ? publicData : {}
    });
  }

  function clearVaultSession(clearPending) {
    if (currentVaultSession && typeof currentVaultSession.close === 'function') {
      currentVaultSession.close();
    }
    currentVaultSession = null;
    zeroBytes(currentVaultBytes);
    currentVaultBytes = null;
    vaultUnlocked = false;
    if (clearPending) {
      zeroBytes(pendingVaultBytes);
      pendingVaultBytes = null;
      pendingOpenId = null;
    }
    if (idleTimer !== null) {
      window.clearTimeout(idleTimer);
      idleTimer = null;
    }
    if (passphraseInput) {
      passphraseInput.value = '';
    }
    zeroKeyfile();
    setSessionEvidence('locked');
    updateVaultControls();
  }

  function scheduleIdleLock() {
    if (idleTimer !== null) {
      window.clearTimeout(idleTimer);
      idleTimer = null;
    }
    if (!vaultUnlocked) {
      return;
    }
    idleTimer = window.setTimeout(function () {
      idleTimer = null;
      if (vaultUnlocked) {
        clearVaultSession(false);
        setVaultStatus('locked', 'Vault locked after five minutes of inactivity.');
        sendVaultStatus(true);
      }
    }, IDLE_TIMEOUT_MS);
  }

  function recordVaultActivity() {
    if (vaultUnlocked) {
      scheduleIdleLock();
    }
  }

  function createEmptyVault() {
    if (!vaultLayer
      || typeof vaultLayer.create !== 'function'
      || typeof vaultLayer.openSession !== 'function'
      || !passphraseInput) {
      setVaultStatus('locked', 'Vault creation is unavailable in this build.');
      return;
    }
    var passphrase = passphraseInput.value;
    if (!passphrase) {
      setVaultStatus('locked', 'Enter an unlock phrase in the sealed realm first.');
      passphraseInput.focus();
      return;
    }
    vaultBusy = true;
    updateVaultControls();
    setVaultStatus('pending', 'Creating an encrypted vault inside the sealed realm...');
    var activeKeyfile = keyfileToggle && keyfileToggle.checked ? keyfileBytes : null;
    if (keyfileToggle && keyfileToggle.checked && !activeKeyfile) {
      vaultBusy = false;
      updateVaultControls();
      setVaultStatus('locked', 'Keyfile unlock is on but no keyfile is selected yet.');
      return;
    }
    var createOptions = {
      passphrase: passphrase,
      profile: 'fast',
      publicData: {}
    };
    if (!onlineMode) {
      createOptions.secretData = {};
    }
    if (activeKeyfile) {
      createOptions.keyfile = activeKeyfile;
      createOptions.keyfileHint = keyfileName;
    }
    vaultLayer.create(createOptions).then(function (bytes) {
      return vaultLayer.openSession(bytes, passphrase, onlineMode ? 'online' : 'offline', activeKeyfile).then(function (session) {
        currentVaultSession = session;
        currentVaultBytes = new Uint8Array(bytes);
        zeroBytes(pendingVaultBytes);
        pendingVaultBytes = null;
        pendingOpenId = null;
        vaultUnlocked = true;
        passphrase = '';
        if (passphraseInput) {
          passphraseInput.value = '';
        }
        setSessionEvidence('unlocked');
        setVaultStatus(
          'unlocked',
          onlineMode
            ? 'New public-only vault created in online mode.'
            : 'New encrypted vault created and unlocked.'
        );
        sendVaultOpened(nextVaultMessageId('created'), session.publicData);
        sendVaultStatus(false);
        scheduleIdleLock();
      }, function (error) {
        zeroBytes(bytes);
        passphrase = '';
        setVaultStatus('locked', 'Vault creation failed; no session was opened.');
        sendVaultError(nextVaultMessageId('create'), 'operation-failed');
        throw error;
      });
    }, function () {
      passphrase = '';
      setVaultStatus('locked', 'Vault creation failed; no session was opened.');
      sendVaultError(nextVaultMessageId('create'), 'operation-failed');
    }).then(function () {
      vaultBusy = false;
      updateVaultControls();
    }, function () {
      vaultBusy = false;
      updateVaultControls();
    });
  }

  function unlockLoadedVault() {
    if (!vaultLayer
      || typeof vaultLayer.openSession !== 'function'
      || !pendingVaultBytes
      || !passphraseInput) {
      setVaultStatus('locked', 'Load an encrypted vault before unlocking it.');
      return;
    }
    var passphrase = passphraseInput.value;
    if (!passphrase) {
      setVaultStatus('pending', 'Enter the unlock phrase in the sealed realm first.');
      passphraseInput.focus();
      return;
    }
    var activeKeyfile = keyfileToggle && keyfileToggle.checked ? keyfileBytes : null;
    if (keyfileToggle && keyfileToggle.checked && !activeKeyfile) {
      setVaultStatus('pending', 'Keyfile unlock is on but no keyfile is selected yet.');
      return;
    }
    var bytes = pendingVaultBytes;
    var responseId = pendingOpenId || nextVaultMessageId('opened');
    vaultBusy = true;
    updateVaultControls();
    setVaultStatus(
      'pending',
      onlineMode
        ? 'Opening only the public compartment; secrets remain sealed online...'
        : 'Authenticating the encrypted vault inside the sealed realm...'
    );
    vaultLayer.openSession(bytes, passphrase, onlineMode ? 'online' : 'offline', activeKeyfile).then(function (session) {
      currentVaultSession = session;
      currentVaultBytes = new Uint8Array(bytes);
      zeroBytes(pendingVaultBytes);
      pendingVaultBytes = null;
      pendingOpenId = null;
      vaultUnlocked = true;
      passphrase = '';
      if (passphraseInput) {
        passphraseInput.value = '';
      }
      setSessionEvidence('unlocked');
      setVaultStatus(
        'unlocked',
        onlineMode
          ? 'Vault opened in online public-only mode; secrets remain sealed.'
          : 'Encrypted vault opened and unlocked.'
      );
      sendVaultOpened(responseId, session.publicData);
      sendVaultStatus(false);
      scheduleIdleLock();
    }, function () {
      passphrase = '';
      setVaultStatus('pending', 'Unlock failed. The vault remains locked; try again.');
      sendVaultError(responseId, 'vault-corrupt');
    }).then(function () {
      vaultBusy = false;
      updateVaultControls();
    }, function () {
      vaultBusy = false;
      updateVaultControls();
    });
  }

  function lockVaultSession(responseId, text, clearPending) {
    clearVaultSession(clearPending !== false);
    setVaultStatus('locked', text || 'Vault is locked.');
    sendVaultStatus(true);
    if (responseId) {
      document.documentElement.setAttribute('data-last-lock-message', responseId);
    }
  }

  function handleVaultMessage(message) {
    if (message.type === 'vault.open') {
      clearVaultSession(true);
      pendingVaultBytes = new Uint8Array(message.payload.bytes);
      pendingOpenId = message.id;
      setVaultStatus('pending', 'Encrypted bytes received. Enter the unlock phrase to continue.');
      updateVaultControls();
      return;
    }
    if (message.type === 'vault.saveRequest') {
      if (!vaultUnlocked || !currentVaultBytes || !currentVaultSession) {
        sendVaultError(message.id, 'vault-locked');
        return;
      }
      var saveSession = currentVaultSession;
      saveSession.save().then(function (bytes) {
        if (!vaultUnlocked || saveSession !== currentVaultSession) {
          zeroBytes(bytes);
          sendVaultError(message.id, 'vault-locked');
          return;
        }
        zeroBytes(currentVaultBytes);
        currentVaultBytes = new Uint8Array(bytes);
        postVaultMessage(message.id, 'vault.bytes', { bytes: new Uint8Array(bytes) });
        zeroBytes(bytes);
        recordVaultActivity();
      }, function () {
        lockVaultSession(null, 'Vault locked because a save-time cold-realm health or mode check failed.', true);
        sendVaultError(message.id, 'operation-failed');
      });
      return;
    }
    if (message.type === 'vault.lock') {
      lockVaultSession(message.id, 'Vault locked on request.', true);
      return;
    }
    if (message.type === 'mode.set') {
      var wasOnline = onlineMode;
      onlineMode = message.payload.online;
      document.documentElement.setAttribute('data-warm-network-online', String(message.payload.online));
      if (wasOnline !== onlineMode && vaultUnlocked) {
        lockVaultSession(null, 'Vault locked because network mode changed.', true);
      }
      return;
    }
    if (message.type === 'panic.hide') {
      lockVaultSession(message.id, 'Vault locked by panic hide.', true);
      return;
    }
    recordChannelAnomaly();
  }

  function failClosedVaultHealth(reason) {
    clearVaultSession(true);
    setVaultStatus('locked', reason || 'Vault locked because cold-realm health failed.');
  }

  function setAirgapFailure(reason) {
    failClosedVaultHealth(reason);
    document.documentElement.setAttribute('data-airgap-state', 'red');
    document.documentElement.setAttribute('data-lockdown-state', 'full');
    document.documentElement.setAttribute('data-vault-operations', 'refused');
    updateBenchmarkAvailability();
    if (details) {
      details.textContent = reason;
    }
  }

  function setCapabilityAttributes(report) {
    var names = [
      'randomValues',
      'cryptoSubtle',
      'wasm',
      'workers',
      'camera',
      'fileSystemAccess',
      'blobDownload',
      'manualExport'
    ];
    names.forEach(function (name) {
      var value = typeof report[name] === 'boolean' ? String(report[name]) : 'unknown';
      document.documentElement.setAttribute('data-capability-' + name, value);
    });
    document.documentElement.setAttribute(
      'data-capability-state',
      report.randomValues === true ? 'ready' : 'failed'
    );
  }

  function setCapabilityFailure(reason) {
    failClosedVaultHealth(reason);
    document.documentElement.setAttribute('data-capability-state', 'failed');
    document.documentElement.setAttribute('data-lockdown-state', 'full');
    document.documentElement.setAttribute('data-vault-operations', 'refused');
    updateBenchmarkAvailability();
    if (details) {
      details.textContent = reason;
    }
  }

  function setCryptoAttributes(report) {
    cryptoReport = report || {};
    var kdf = cryptoReport.kdf || {};
    var cryptoState = cryptoReport.nobleAesGcm === true
      ? (cryptoReport.argon2id && cryptoReport.argon2id.passed === true ? 'ready' : 'fallback')
      : 'failed';
    document.documentElement.setAttribute('data-crypto-state', cryptoState);
    document.documentElement.setAttribute(
      'data-webcrypto-kat',
      cryptoReport.webCrypto && cryptoReport.webCrypto.passed === true ? 'passed' : 'not-active'
    );
    document.documentElement.setAttribute(
      'data-argon2id-kat',
      cryptoReport.argon2id && cryptoReport.argon2id.passed === true ? 'passed' : 'failed'
    );
    document.documentElement.setAttribute('data-kdf-active', kdf.id || 'unknown');
    var kdfPanel = document.getElementById('cold-kdf-details');
    var kdfActive = document.getElementById('cold-kdf-active');
    var cryptoPath = document.getElementById('cold-crypto-path');
    if (kdfPanel) {
      kdfPanel.setAttribute('data-kdf-active', kdf.id || 'unknown');
    }
    if (kdfActive) {
      kdfActive.textContent = kdf.label ? 'Active KDF: ' + kdf.label + '.' : 'Active KDF: unknown.';
    }
    if (cryptoPath) {
      cryptoPath.textContent = kdf.implementation || 'Crypto self-test did not report an active path.';
    }
  }

  function benchmarkAvailable() {
    return Boolean(
      benchmarkButton
      && cryptoLayer
      && typeof cryptoLayer.benchmarkProfiles === 'function'
      && vaultLayer
      && typeof vaultLayer.healthReady === 'function'
      && vaultLayer.healthReady()
      && cryptoReport.argon2id
      && cryptoReport.argon2id.passed === true
    );
  }

  function updateBenchmarkAvailability() {
    if (benchmarkButton) {
      benchmarkButton.disabled = !benchmarkAvailable();
    }
  }

  function benchmarkDuration(result) {
    if (result.status === 'passed' && typeof result.durationMs === 'number') {
      return result.durationMs.toFixed(1) + ' ms';
    }
    return result.status;
  }

  function renderBenchmark(report) {
    if (!benchmarkResult || !report || !Array.isArray(report.profiles)) {
      return;
    }
    var summaries = report.profiles.map(function (result) {
      return result.profile + ': ' + benchmarkDuration(result);
    });
    var warnings = report.profiles.filter(function (result) {
      return typeof result.warning === 'string' && result.warning.length > 0;
    }).map(function (result) {
      return result.profile + ' warning: ' + result.warning;
    });
    benchmarkResult.textContent = summaries.join(' · ')
      + (warnings.length > 0 ? ' ' + warnings.join(' ') : '');
  }

  function runBenchmark() {
    if (!benchmarkAvailable()) {
      updateBenchmarkAvailability();
      if (benchmarkResult) {
        benchmarkResult.textContent = 'KDF benchmark is unavailable while cold-realm health refuses vault operations.';
      }
      return;
    }
    benchmarkButton.disabled = true;
    if (benchmarkResult) {
      benchmarkResult.textContent = 'Benchmarking Fast, Standard, then Paranoid sequentially…';
    }
    cryptoLayer.benchmarkProfiles().then(function (report) {
      renderBenchmark(report);
      updateBenchmarkAvailability();
    });
  }

  function setCryptoFailure(reason) {
    failClosedVaultHealth(reason);
    document.documentElement.setAttribute('data-crypto-state', 'failed');
    document.documentElement.setAttribute('data-cold-state', 'failed');
    document.documentElement.setAttribute('data-airgap-state', 'red');
    document.documentElement.setAttribute('data-lockdown-state', 'full');
    document.documentElement.setAttribute('data-vault-operations', 'refused');
    updateBenchmarkAvailability();
    if (details) {
      details.textContent = reason;
    }
  }

  function recordRuntimeViolation(name) {
    runtimeViolationCount += 1;
    document.documentElement.setAttribute(
      'data-runtime-neutering-violations',
      String(runtimeViolationCount)
    );
    setAirgapFailure('Airgap guard blocked ' + name + '. Vault operations remain refused.');
    console.warn('Coldbox runtime airgap blocked ' + name + '.');
    if (messagePort) {
      var status = protocol.createMessage(
        'cold-to-warm',
        'cold-airgap-violation-' + String(runtimeViolationCount),
        'status',
        {
          locked: true,
          mode: 'cold',
          warnings: ['airgap-violation']
        }
      );
      if (status) {
        messagePort.postMessage(status);
      }
    }
  }

  function completeBootstrap(result, detectedCapabilities, detectedCrypto) {
    capabilityReport = detectedCapabilities || {};
    setCryptoAttributes(detectedCrypto || {});
    setCapabilityAttributes(capabilityReport);
    canaryPassed = Boolean(result && result.passed);
    document.documentElement.setAttribute(
      'data-csp-canary',
      canaryPassed ? 'passed' : 'failed'
    );
    document.documentElement.setAttribute(
      'data-csp-canary-reason',
      result && result.reason ? result.reason : 'unknown'
    );
    if (!canaryPassed) {
      setAirgapFailure('The cold realm CSP canary did not fire. Vault operations are refused.');
    }

    var neutering = airgap.neuterNetwork(recordRuntimeViolation);
    runtimeNeuteringInstalled = neutering.installed;
    document.documentElement.setAttribute(
      'data-runtime-neutering',
      runtimeNeuteringInstalled ? 'installed' : 'failed'
    );
    document.documentElement.setAttribute(
      'data-runtime-neutering-failures',
      neutering.failed.join(',')
    );
    if (!runtimeNeuteringInstalled) {
      setAirgapFailure('The cold realm network guard could not be installed. Vault operations are refused.');
    }
    if (capabilityReport.randomValues !== true) {
      setCapabilityFailure('Required crypto.getRandomValues is unavailable in the cold realm. Coldbox refuses all vault operations and never substitutes Math.random.');
    }
    if (cryptoReport.nobleAesGcm !== true) {
      setCryptoFailure('The pure-JS @noble AES-GCM known-answer test failed. Coldbox refuses all vault operations.');
    }

    document.documentElement.setAttribute(
      'data-cold-state',
      canaryPassed && runtimeNeuteringInstalled && capabilityReport.randomValues === true && cryptoReport.nobleAesGcm === true
        ? 'ready'
        : 'failed'
    );
    if (canaryPassed && runtimeNeuteringInstalled && capabilityReport.randomValues === true && cryptoReport.nobleAesGcm === true) {
      vaultCryptoReady = true;
      document.documentElement.setAttribute('data-airgap-state', 'green');
      document.documentElement.setAttribute('data-lockdown-state', 'none');
      document.documentElement.setAttribute('data-vault-operations', 'guarded');
      document.documentElement.setAttribute('data-idle-timeout-ms', String(IDLE_TIMEOUT_MS));
      if (readyMarker) {
        readyMarker.textContent = 'Cold realm sealed';
      }
      if (details) {
        details.textContent = 'CSP canary passed and runtime network guard installed. Active KDF: '
          + (cryptoReport.kdf && cryptoReport.kdf.label ? cryptoReport.kdf.label : 'unknown') + '.';
      }
    }
    updateVaultControls();
    updateBenchmarkAvailability();
    window.parent.postMessage({ type: 'cold.ready' }, '*');
  }

  function handleChannelMessage(event) {
    var message = protocol.validateMessage('warm-to-cold', event.data);
    if (!message) {
      recordChannelAnomaly();
      return;
    }
    handleVaultMessage(message);
  }

  function handleGlobalMessage(event) {
    if (handshakeState === 'ready') {
      recordGlobalMessageAnomaly();
      return;
    }
    if (handshakeState !== 'starting'
      || event.source !== window.parent
      || !protocol.isHandshakeMessage(event.data)
      || !event.ports
      || event.ports.length !== 1) {
      return;
    }

    var candidatePort = event.ports[0];
    if (!candidatePort || typeof candidatePort.postMessage !== 'function') {
      recordGlobalMessageAnomaly();
      return;
    }

    messagePort = candidatePort;
    handshakeState = 'ready';
    document.documentElement.setAttribute('data-handshake-state', 'ready');
    updateVaultControls();
    messagePort.addEventListener('message', handleChannelMessage);
    messagePort.start();
    var readyMessage = protocol.createMessage(
      'cold-to-warm',
      'cold-ready-1',
      'ready',
      {
        capabilities: {
          messageChannel: true,
          opaqueOrigin: true,
          cspCanary: canaryPassed,
          runtimeNeutering: runtimeNeuteringInstalled,
          randomValues: capabilityReport.randomValues === true,
          cryptoSubtle: capabilityReport.cryptoSubtle === true,
          wasm: capabilityReport.wasm === true,
          workers: capabilityReport.workers === true,
          camera: capabilityReport.camera === true,
          fileSystemAccess: capabilityReport.fileSystemAccess === true,
          blobDownload: capabilityReport.blobDownload === true,
          manualExport: capabilityReport.manualExport === true,
          nobleAesGcm: cryptoReport.nobleAesGcm === true,
          argon2id: cryptoReport.argon2id && cryptoReport.argon2id.passed === true,
          webCryptoKat: cryptoReport.webCrypto && cryptoReport.webCrypto.passed === true,
          kdfActive: cryptoReport.kdf && cryptoReport.kdf.id ? cryptoReport.kdf.id : 'unknown'
        }
      }
    );
    if (!readyMessage) {
      recordChannelAnomaly();
      return;
    }
    messagePort.postMessage(readyMessage);
  }

  if (!readyMarker || !window.parent || !protocol || !airgap || !capabilities || !cryptoLayer || !vaultLayer) {
    return;
  }

  if (benchmarkButton) {
    benchmarkButton.addEventListener('click', runBenchmark);
  }
  if (createVaultButton) {
    createVaultButton.addEventListener('click', createEmptyVault);
  }
  if (unlockVaultButton) {
    unlockVaultButton.addEventListener('click', unlockLoadedVault);
  }
  if (lockVaultButton) {
    lockVaultButton.addEventListener('click', function () {
      lockVaultSession(nextVaultMessageId('local-lock'), 'Vault locked locally.', true);
    });
  }
  if (keyfileToggle) {
    keyfileToggle.addEventListener('change', function () {
      if (keyfileWarning) {
        keyfileWarning.hidden = !keyfileToggle.checked;
      }
      if (!keyfileToggle.checked) {
        clearKeyfileSelection();
      }
      updateVaultControls();
    });
  }
  if (keyfileInput && typeof window.FileReader === 'function') {
    keyfileInput.addEventListener('change', function () {
      var file = keyfileInput.files && keyfileInput.files[0];
      if (!file) {
        clearKeyfileSelection();
        return;
      }
      var maxKeyfileBytes = vaultLayer.constants && vaultLayer.constants.maxKeyfileBytes;
      if (typeof file.size === 'number' && typeof maxKeyfileBytes === 'number' && file.size > maxKeyfileBytes) {
        clearKeyfileSelection();
        setKeyfileStatus('That keyfile is too large (limit ' + String(maxKeyfileBytes) + ' bytes).');
        return;
      }
      zeroKeyfile();
      setKeyfileStatus('Reading keyfile inside the sealed realm...');
      var reader = new window.FileReader();
      reader.onerror = function () {
        clearKeyfileSelection();
        setKeyfileStatus('Could not read the selected keyfile.');
      };
      reader.onload = function () {
        var result = reader.result;
        if (!(result instanceof ArrayBuffer) || result.byteLength === 0) {
          clearKeyfileSelection();
          setKeyfileStatus('The selected keyfile is empty or unreadable.');
          return;
        }
        keyfileBytes = new Uint8Array(result);
        // Only the filename (display metadata) is retained beyond this
        // handler - never the file's contents beyond the in-memory bytes
        // above, and neither crosses the realm boundary or is logged.
        keyfileName = typeof file.name === 'string' ? file.name : '';
        setKeyfileStatus('Keyfile loaded (' + String(keyfileBytes.length) + ' bytes). It never leaves this sealed realm.');
      };
      reader.readAsArrayBuffer(file);
    });
  }
  document.addEventListener('pointerdown', recordVaultActivity);
  document.addEventListener('input', recordVaultActivity);
  document.addEventListener('keydown', function (event) {
    recordVaultActivity();
    if (event.key !== 'Escape') {
      return;
    }
    var now = Date.now();
    if (lastEscapeAt > 0 && now - lastEscapeAt <= 800) {
      lastEscapeAt = 0;
      lockVaultSession(nextVaultMessageId('panic-lock'), 'Vault locked by panic hide.', true);
      postVaultMessage(nextVaultMessageId('panic'), 'panic.hide', {});
      return;
    }
    lastEscapeAt = now;
  });
  setSessionEvidence('locked');
  setVaultStatus('locked', 'Vault is locked. Unlocking stays in this sealed realm.');
  updateVaultControls();

  window.__coldboxColdRealmMarker = 'cold-realm-ready';

  function installThrowContract() {
    var nativeXmlHttpRequest = window.XMLHttpRequest;
    var nativeWebSocket = window.WebSocket;

    function throwBlocked(name) {
      throw new Error('Coldbox cold CSP blocked ' + name + '.');
    }

    function ThrowingXMLHttpRequest() {
      var request = new nativeXmlHttpRequest();
      var nativeSend = request.send;
      request.send = function () {
        try {
          return nativeSend.apply(request, arguments);
        } finally {
          throwBlocked('XMLHttpRequest');
        }
      };
      return request;
    }

    function ThrowingWebSocket(url, protocols) {
      var socket;
      try {
        socket = protocols === undefined
          ? new nativeWebSocket(url)
          : new nativeWebSocket(url, protocols);
        var closeSocket = function () { socket.close(); };
        socket.addEventListener('error', closeSocket, { once: true });
        socket.addEventListener('close', closeSocket, { once: true });
        window.setTimeout(closeSocket, 250);
      } catch (error) {
        // The public constructor still throws below; the native attempt preserves CSP evidence.
      }
      throwBlocked('WebSocket');
    }

    if (typeof nativeXmlHttpRequest !== 'function' || typeof nativeWebSocket !== 'function') {
      throw new Error('Coldbox cold network throw contract could not be installed.');
    }

    ThrowingXMLHttpRequest.prototype = nativeXmlHttpRequest.prototype;
    ThrowingWebSocket.prototype = nativeWebSocket.prototype;
    Object.defineProperty(window, 'XMLHttpRequest', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: ThrowingXMLHttpRequest
    });
    Object.defineProperty(window, 'WebSocket', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: ThrowingWebSocket
    });
  }

  installThrowContract();
  window.addEventListener('message', handleGlobalMessage);
  document.documentElement.setAttribute('data-cold-state', 'checking');
  document.documentElement.setAttribute('data-airgap-state', 'checking');
  document.documentElement.setAttribute('data-capability-state', 'checking');
  document.documentElement.setAttribute('data-crypto-state', 'checking');
  document.documentElement.setAttribute('data-kdf-active', 'checking');
  Promise.all([airgap.runCanary(airgap.coldCanaryUrl), capabilities.detect(), cryptoLayer.selfTest()]).then(function (results) {
    completeBootstrap(results[0], results[1], results[2]);
  }, function () {
    completeBootstrap(
      { passed: false, reason: 'bootstrap-error' },
      { randomValues: false },
      {
        nobleAesGcm: false,
        argon2id: { passed: false },
        webCrypto: { passed: false },
        kdf: { id: 'unknown', label: 'Unknown', implementation: 'Crypto bootstrap failed.' }
      }
    );
  });
}());
