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
  var entropyLab = window.__coldboxEntropyLab;
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
  var providerNeuteringInstalled = false;
  var providerViolationCount = 0;
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
  var entropyDiceFace = document.getElementById('cold-entropy-dice-face');
  var entropyDiceBase6Add = document.getElementById('cold-entropy-dice-base6-add');
  var entropyDiceDiscardAdd = document.getElementById('cold-entropy-dice-discard-add');
  var entropyCoinHeads = document.getElementById('cold-entropy-coin-heads');
  var entropyCoinTails = document.getElementById('cold-entropy-coin-tails');
  var entropyCardSelect = document.getElementById('cold-entropy-card-select');
  var entropyCardAdd = document.getElementById('cold-entropy-card-add');
  var entropyCardShuffleButton = document.getElementById('cold-entropy-card-shuffle');
  var entropyHexInput = document.getElementById('cold-entropy-hex-input');
  var entropyHexAdd = document.getElementById('cold-entropy-hex-add');
  var entropyCsprngDraw = document.getElementById('cold-entropy-csprng-draw');
  var entropyCsprngStatus = document.getElementById('cold-entropy-csprng-status');
  var entropyUndoButton = document.getElementById('cold-entropy-undo');
  var entropyMeter = document.getElementById('cold-entropy-meter');
  var entropyTargetSelect = document.getElementById('cold-entropy-target');
  var entropyMixButton = document.getElementById('cold-entropy-mix-run');
  var entropyMixStatus = document.getElementById('cold-entropy-mix-status');
  var entropyMixOutputLabel = document.getElementById('cold-entropy-mix-output-label');
  var entropyMixOutput = document.getElementById('cold-entropy-mix-output');
  var entropySession = entropyLab ? entropyLab.createSession() : null;
  var CARD_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  var CARD_SUITS = ['♠', '♥', '♦', '♣'];
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
  // F1 remediation: a monotonically increasing generation token plus the
  // currently in-flight FileReader (if any). Every asynchronous keyfile read
  // captures the generation that was current when it started; its onload/
  // onerror callbacks are a complete no-op unless that generation is still
  // current and the callback's own reader is still the active one. This
  // stops a stale (superseded) read from ever overwriting or clearing a
  // newer selection, regardless of completion order.
  var keyfileGeneration = 0;
  var activeKeyfileReader = null;
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

  function bytesToHex(bytes) {
    var hex = '';
    for (var index = 0; index < bytes.length; index += 1) {
      hex += bytes[index].toString(16).padStart(2, '0');
    }
    return hex;
  }

  // --- Entropy Lab (P1.1) ---------------------------------------------------
  //
  // Local only: no message crosses to the warm shell, and nothing here is
  // gated on the warm-cold handshake, only on the same crypto self-test that
  // gates vault creation (entropyLabReady below). All accumulation and mixing
  // logic lives in src/cold/entropy-lab.js; this section only wires the DOM.

  function cardLabel(cardId) {
    var rankIndex = cardId % CARD_RANKS.length;
    var suitIndex = Math.floor(cardId / CARD_RANKS.length);
    return CARD_RANKS[rankIndex] + CARD_SUITS[suitIndex];
  }

  // Rebuilds the <select> from entropySession.cardRemaining every time,
  // rather than incrementally adding/removing individual <option> elements.
  // A review finding on the first version of this feature found that undo
  // restored the session's internal state correctly but left a previously
  // drawn card's <option> permanently missing from the selector, because
  // draws removed options directly while undo only knew how to reverse the
  // logic-layer accumulator. Rebuilding from the authoritative session state
  // on every change (draw, undo, reshuffle) makes the two impossible to
  // desync — there is no incremental option-list state to drift.
  function refreshCardOptions() {
    if (!entropyCardSelect || !entropySession) {
      return;
    }
    var previousValue = entropyCardSelect.value;
    entropyCardSelect.textContent = '';
    var remaining = entropySession.cardRemaining.slice().sort(function (a, b) { return a - b; });
    for (var i = 0; i < remaining.length; i += 1) {
      var cardId = remaining[i];
      var option = document.createElement('option');
      option.value = String(cardId);
      option.textContent = cardLabel(cardId);
      entropyCardSelect.appendChild(option);
    }
    if (remaining.indexOf(Number(previousValue)) !== -1) {
      entropyCardSelect.value = previousValue;
    }
  }

  function entropyLabReady() {
    return Boolean(entropyLab) && vaultCryptoReady;
  }

  function setEntropyMixOutput(bytes) {
    if (!entropyMixOutput || !entropyMixOutputLabel) {
      return;
    }
    if (!bytes) {
      entropyMixOutput.hidden = true;
      entropyMixOutputLabel.hidden = true;
      entropyMixOutput.textContent = '';
      return;
    }
    entropyMixOutput.textContent = bytesToHex(bytes);
    entropyMixOutput.hidden = false;
    entropyMixOutputLabel.hidden = false;
  }

  function updateEntropyMeter() {
    if (!entropyMeter || !entropySession) {
      return;
    }
    var bits = entropyLab.guaranteedBits(entropySession);
    var csprngBits = entropyLab.csprngGuaranteedBits(entropySession);
    entropyMeter.setAttribute('data-guaranteed-bits', String(bits));
    entropyMeter.setAttribute('data-csprng-bits', String(csprngBits));
    entropyMeter.textContent = 'Collected: ' + bits + ' guaranteed bit' + (bits === 1 ? '' : 's')
      + ' from dice/coins/cards/hex, plus ' + csprngBits + ' fresh CSPRNG bit' + (csprngBits === 1 ? '' : 's') + '.';
  }

  function updateEntropyLabControls() {
    var ready = entropyLabReady();
    var controls = [
      entropyDiceFace, entropyDiceBase6Add, entropyDiceDiscardAdd,
      entropyCoinHeads, entropyCoinTails,
      entropyCardSelect, entropyCardAdd,
      entropyHexInput, entropyHexAdd,
      entropyCsprngDraw, entropyUndoButton, entropyTargetSelect, entropyMixButton
    ];
    for (var index = 0; index < controls.length; index += 1) {
      if (controls[index]) {
        controls[index].disabled = !ready;
      }
    }
    if (entropyCardShuffleButton) {
      entropyCardShuffleButton.disabled = !ready || !entropySession || entropySession.cardRemaining.length !== 0;
    }
    // Any change to the recorded entropy invalidates a previously displayed
    // mix result — a review finding on the first version of this feature
    // found that adding more entropy or changing the target size after
    // mixing left the old, no-longer-current output on screen. This
    // function runs after every add/undo/CSPRNG-draw, so clearing here
    // covers all of them from one place rather than each call site
    // separately (and separately again wherever a call site might be added
    // later).
    setEntropyMixOutput(null);
    if (!ready) {
      return;
    }
    if (entropyUndoButton) {
      entropyUndoButton.disabled = entropySession.history.length === 0;
    }
    refreshCardOptions();
    updateEntropyMeter();
    updateEntropyMixStatus();
  }

  function updateEntropyMixStatus() {
    if (!entropyMixStatus || !entropySession || !entropyTargetSelect) {
      return;
    }
    var targetBits = Number(entropyTargetSelect.value);
    var targetBytes = targetBits / 8;
    var manualBytes = entropyLab.manualEntropyBytes(entropySession);
    if (manualBytes.length === 0) {
      if (entropySession.csprngBytes.length < targetBytes) {
        entropyMixStatus.textContent = 'No manual entropy recorded. Need ' + targetBytes + ' fresh CSPRNG bytes for a CSPRNG-only draw; have ' + entropySession.csprngBytes.length + '.';
      } else {
        entropyMixStatus.textContent = 'Ready for a CSPRNG-only ' + targetBits + '-bit draw (no manual entropy recorded — record dice/coin/card/hex entropy first to mix instead).';
      }
      return;
    }
    var available = entropyLab.guaranteedBits(entropySession);
    if (available < targetBits) {
      entropyMixStatus.textContent = 'Collected ' + available + ' of ' + targetBits + ' guaranteed manual bits needed before mixing.';
      return;
    }
    if (entropySession.csprngBytes.length < manualBytes.length) {
      entropyMixStatus.textContent = 'Need ' + manualBytes.length + ' CSPRNG bytes to mix against; have ' + entropySession.csprngBytes.length + '.';
      return;
    }
    entropyMixStatus.textContent = 'Ready to mix ' + targetBits + ' bits.';
  }

  function handleEntropyDiceFace() {
    var value = Number(entropyDiceFace.value);
    if (!Number.isInteger(value) || value < 1 || value > 6) {
      return null;
    }
    return value;
  }

  function wireEntropyLab() {
    if (!entropyLab || !entropySession) {
      return;
    }
    refreshCardOptions();

    if (entropyDiceBase6Add) {
      entropyDiceBase6Add.addEventListener('click', function () {
        var face = handleEntropyDiceFace();
        if (face === null) {
          return;
        }
        entropyLab.addDiceBase6(entropySession, face);
        updateEntropyLabControls();
      });
    }

    if (entropyDiceDiscardAdd) {
      entropyDiceDiscardAdd.addEventListener('click', function () {
        var face = handleEntropyDiceFace();
        if (face === null) {
          return;
        }
        var accepted = entropyLab.addDiceDiscard(entropySession, face);
        updateEntropyLabControls();
        if (!accepted && entropyMixStatus) {
          entropyMixStatus.textContent = 'Roll of ' + face + ' discarded (only 1-4 count); reroll.';
        }
      });
    }

    if (entropyCoinHeads) {
      entropyCoinHeads.addEventListener('click', function () {
        entropyLab.addCoin(entropySession, true);
        updateEntropyLabControls();
      });
    }
    if (entropyCoinTails) {
      entropyCoinTails.addEventListener('click', function () {
        entropyLab.addCoin(entropySession, false);
        updateEntropyLabControls();
      });
    }

    if (entropyCardAdd) {
      entropyCardAdd.addEventListener('click', function () {
        if (!entropyCardSelect || entropyCardSelect.value === '') {
          return;
        }
        var cardId = Number(entropyCardSelect.value);
        try {
          entropyLab.addCard(entropySession, cardId);
        } catch (error) {
          if (entropyMixStatus) {
            entropyMixStatus.textContent = error.message;
          }
          return;
        }
        updateEntropyLabControls();
      });
    }

    if (entropyCardShuffleButton) {
      entropyCardShuffleButton.addEventListener('click', function () {
        try {
          entropyLab.startNewCardShuffle(entropySession);
        } catch (error) {
          if (entropyMixStatus) {
            entropyMixStatus.textContent = error.message;
          }
          return;
        }
        updateEntropyLabControls();
      });
    }

    if (entropyHexAdd) {
      entropyHexAdd.addEventListener('click', function () {
        var raw = (entropyHexInput && entropyHexInput.value || '').trim().toLowerCase();
        if (!/^[0-9a-f]$/.test(raw)) {
          return;
        }
        entropyLab.addHexNibble(entropySession, parseInt(raw, 16));
        if (entropyHexInput) {
          entropyHexInput.value = '';
        }
        updateEntropyLabControls();
      });
    }

    if (entropyCsprngDraw) {
      entropyCsprngDraw.addEventListener('click', function () {
        if (!cryptoLayer || typeof cryptoLayer.randomBytes !== 'function') {
          if (entropyCsprngStatus) {
            entropyCsprngStatus.textContent = 'crypto.getRandomValues is unavailable; refusing to draw.';
          }
          return;
        }
        var drawn;
        try {
          drawn = cryptoLayer.randomBytes(32);
        } catch (error) {
          if (entropyCsprngStatus) {
            entropyCsprngStatus.textContent = 'CSPRNG draw failed: ' + error.message;
          }
          return;
        }
        entropyLab.addCsprngBytes(entropySession, drawn);
        zeroBytes(drawn);
        if (entropyCsprngStatus) {
          entropyCsprngStatus.textContent = entropySession.csprngBytes.length + ' CSPRNG bytes drawn.';
        }
        updateEntropyLabControls();
      });
    }

    if (entropyUndoButton) {
      entropyUndoButton.addEventListener('click', function () {
        entropyLab.undoLast(entropySession);
        if (entropyCsprngStatus) {
          entropyCsprngStatus.textContent = entropySession.csprngBytes.length + ' CSPRNG bytes drawn.';
        }
        setEntropyMixOutput(null);
        updateEntropyLabControls();
      });
    }

    if (entropyTargetSelect) {
      entropyTargetSelect.addEventListener('change', function () {
        setEntropyMixOutput(null);
        updateEntropyMixStatus();
      });
    }

    if (entropyMixButton) {
      entropyMixButton.addEventListener('click', function () {
        var targetBits = Number(entropyTargetSelect.value);
        var mixed;
        try {
          mixed = entropyLab.mix(entropySession, targetBits);
        } catch (error) {
          setEntropyMixOutput(null);
          if (entropyMixStatus) {
            entropyMixStatus.textContent = error.message;
          }
          return;
        }
        setEntropyMixOutput(mixed);
        if (entropyMixStatus) {
          entropyMixStatus.textContent = 'Mixed ' + targetBits + ' bits. Seed Forge (P1.3) is not built yet; this output is not carried anywhere.';
        }
      });
    }

    updateEntropyLabControls();
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

  // F1 remediation: invalidates any in-flight keyfile FileReader so its
  // eventual onload/onerror callback becomes a no-op, and bumps the
  // generation token so a callback already past its generation check cannot
  // slip through. Safe to call with no reader in flight.
  function invalidateActiveKeyfileRead() {
    keyfileGeneration += 1;
    if (activeKeyfileReader) {
      try {
        activeKeyfileReader.abort();
      } catch (error) {
        // FileReader.abort() should not throw, but a stale/foreign reader
        // implementation must never be allowed to break teardown.
      }
      activeKeyfileReader = null;
    }
  }

  // F1/F2 remediation: the single coherent reset path for the keyfile
  // selection. Invalidates any in-flight read, zeroes the retained bytes and
  // filename, clears the file input's value (so re-selecting the same file
  // still fires a change event), and resets the visible status text. Called
  // on explicit clear, toggle-off, and - via clearVaultSession - every lock/
  // session-teardown path (manual lock, idle auto-lock, panic hide, and
  // runtime-health closure all funnel through clearVaultSession).
  function clearKeyfileSelection() {
    invalidateActiveKeyfileRead();
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
    // F2 remediation: route through the same coherent reset path the user-
    // facing "clear" action uses, so lock/session teardown never leaves the
    // file input value or visible "loaded" status stale relative to the
    // now-zeroed keyfileBytes.
    clearKeyfileSelection();
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

  // P0.21: an injected wallet provider observed inside the cold realm is an
  // ISOLATION failure, not a policy failure - there is no connect-src in
  // front of it the way there is for the five network primitives, so the
  // alarm text must not imply the CSP caught this (ADR-0020).
  function recordProviderIsolationViolation(name) {
    providerViolationCount += 1;
    document.documentElement.setAttribute(
      'data-provider-neutering-violations',
      String(providerViolationCount)
    );
    setAirgapFailure(
      'Cold realm isolation failure: an injected wallet provider (' + name + ') was observed inside the '
      + 'sealed realm. This is not a network-policy violation - it means a browser extension can inject '
      + 'into this sandboxed frame. Vault operations remain refused. Use a browser profile with no '
      + 'extensions installed.'
    );
    console.warn('Coldbox detected an injected provider inside the cold realm: ' + name + '.');
    if (messagePort) {
      var status = protocol.createMessage(
        'cold-to-warm',
        'cold-provider-isolation-violation-' + String(providerViolationCount),
        'status',
        {
          locked: true,
          mode: 'cold',
          warnings: ['provider-isolation-violation']
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

    // P0.21: same shape as the network-primitive guard above, but for the
    // injected-provider surface (window.ethereum, eip6963:announceProvider)
    // that has no CSP in front of it at all (ADR-0020).
    var providerNeutering = airgap.neuterProviders(recordProviderIsolationViolation);
    // F1 remediation (P0.21 review): a provider present before this guard
    // installed is an isolation failure even though the guard itself
    // installs successfully over it - recordProviderIsolationViolation()
    // has already fired synchronously inside neuterProviders() above and
    // set the isolation-specific alarm text/lockdown state. Readiness must
    // stay blocked either way, but the generic "could not be installed"
    // message below must not fire and overwrite that more specific text.
    providerNeuteringInstalled = providerNeutering.installed && !providerNeutering.preexisting;
    document.documentElement.setAttribute(
      'data-provider-neutering',
      providerNeuteringInstalled ? 'installed' : 'failed'
    );
    document.documentElement.setAttribute(
      'data-provider-neutering-failures',
      providerNeutering.failed.join(',')
    );
    if (!providerNeutering.installed) {
      setAirgapFailure('The cold realm injected-provider guard could not be installed. Vault operations are refused.');
    }
    if (capabilityReport.randomValues !== true) {
      setCapabilityFailure('Required crypto.getRandomValues is unavailable in the cold realm. Coldbox refuses all vault operations and never substitutes Math.random.');
    }
    if (cryptoReport.nobleAesGcm !== true) {
      setCryptoFailure('The pure-JS @noble AES-GCM known-answer test failed. Coldbox refuses all vault operations.');
    }

    var coldReady = canaryPassed
      && runtimeNeuteringInstalled
      && providerNeuteringInstalled
      && capabilityReport.randomValues === true
      && cryptoReport.nobleAesGcm === true;
    document.documentElement.setAttribute(
      'data-cold-state',
      coldReady ? 'ready' : 'failed'
    );
    if (coldReady) {
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
    updateEntropyLabControls();
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
          providerNeutering: providerNeuteringInstalled,
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
      // F1 remediation: every new selection (including a cleared/empty
      // selection) invalidates whatever read was previously in flight
      // before anything else happens, so a stale callback can never land
      // after this point believes it is still current.
      invalidateActiveKeyfileRead();
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
      // Capture this request's generation now, after invalidation above, so
      // it is the current one. Only a callback that fires while this exact
      // generation is still current, and whose reader is still the active
      // one, may mutate keyfile state.
      var readGeneration = keyfileGeneration;
      var reader = new window.FileReader();
      activeKeyfileReader = reader;
      function isStaleCallback() {
        return readGeneration !== keyfileGeneration
          || reader !== activeKeyfileReader
          || !keyfileToggle
          || !keyfileToggle.checked;
      }
      reader.onerror = function () {
        if (isStaleCallback()) {
          return;
        }
        activeKeyfileReader = null;
        clearKeyfileSelection();
        setKeyfileStatus('Could not read the selected keyfile.');
      };
      reader.onload = function () {
        if (isStaleCallback()) {
          return;
        }
        activeKeyfileReader = null;
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
  wireEntropyLab();
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
