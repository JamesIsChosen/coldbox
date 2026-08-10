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
  var entropyHealth = window.__coldboxEntropyHealth;
  var seedForge = window.__coldboxSeedForge;
  var derivation = window.__coldboxDerivation;
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
  var passphraseConfirmWrap = document.getElementById('cold-vault-create-confirmation');
  var passphraseConfirmInput = document.getElementById('cold-vault-passphrase-confirm');
  var passphraseConfirmError = document.getElementById('cold-vault-create-error');
  var passphraseHealthPanel = document.getElementById('cold-vault-passphrase-health');
  var passphraseHealthState = document.getElementById('cold-vault-passphrase-health-state');
  var passphraseHealthCopy = document.getElementById('cold-vault-passphrase-health-copy');
  var createVaultButton = document.getElementById('cold-vault-create');
  var unlockVaultButton = document.getElementById('cold-vault-unlock');
  var lockVaultButton = document.getElementById('cold-vault-lock');
  var concealmentControls = document.getElementById('cold-concealment-controls');
  var concealmentPassphrase = document.getElementById('cold-concealment-passphrase');
  var concealmentRevealButton = document.getElementById('cold-concealment-reveal');
  var concealmentStatus = document.getElementById('cold-concealment-status');
  var secretNotesPanel = document.getElementById('cold-secret-notes');
  var secretNoteTitle = document.getElementById('cold-secret-note-title');
  var secretNoteBody = document.getElementById('cold-secret-note-body');
  var secretNoteTags = document.getElementById('cold-secret-note-tags');
  var secretNoteSaveButton = document.getElementById('cold-secret-note-save');
  var secretNoteSearch = document.getElementById('cold-secret-note-search');
  var secretNoteList = document.getElementById('cold-secret-note-list');
  var keyfileToggle = document.getElementById('cold-vault-keyfile-toggle');
  var keyfileWarning = document.getElementById('cold-vault-keyfile-warning');
  var keyfileInput = document.getElementById('cold-vault-keyfile-input');
  var keyfileStatus = document.getElementById('cold-vault-keyfile-status');
  var entropyDiceFace = document.getElementById('cold-entropy-dice-face');
  var entropyDiceBase6Add = document.getElementById('cold-entropy-dice-base6-add');
  var entropyDiceDiscardAdd = document.getElementById('cold-entropy-dice-discard-add');
  var entropyDiceRandomCount = document.getElementById('cold-entropy-dice-random-count');
  var entropyDiceRandomButton = document.getElementById('cold-entropy-dice-random');
  var entropyDiceResetButton = document.getElementById('cold-entropy-dice-reset');
  var entropyDiceStatus = document.getElementById('cold-entropy-dice-status');
  var entropyDiceLog = document.getElementById('cold-entropy-dice-log');
  var entropyCoinHeads = document.getElementById('cold-entropy-coin-heads');
  var entropyCoinTails = document.getElementById('cold-entropy-coin-tails');
  var entropyCoinRandomCount = document.getElementById('cold-entropy-coin-random-count');
  var entropyCoinRandomButton = document.getElementById('cold-entropy-coin-random');
  var entropyCoinResetButton = document.getElementById('cold-entropy-coin-reset');
  var entropyCoinStatus = document.getElementById('cold-entropy-coin-status');
  var entropyCoinLog = document.getElementById('cold-entropy-coin-log');
  var entropyCardGrid = document.getElementById('cold-entropy-card-grid');
  var entropyCardShuffleButton = document.getElementById('cold-entropy-card-shuffle');
  var entropyCardShuffleStatus = document.getElementById('cold-entropy-card-shuffle-status');
  var entropyCardRandomCount = document.getElementById('cold-entropy-card-random-count');
  var entropyCardRandomButton = document.getElementById('cold-entropy-card-random');
  var entropyCardResetButton = document.getElementById('cold-entropy-card-reset');
  var entropyCardLog = document.getElementById('cold-entropy-card-log');
  var entropyHexInput = document.getElementById('cold-entropy-hex-input');
  var entropyHexAdd = document.getElementById('cold-entropy-hex-add');
  var entropyHexRandomCount = document.getElementById('cold-entropy-hex-random-count');
  var entropyHexRandomButton = document.getElementById('cold-entropy-hex-random');
  var entropyHexResetButton = document.getElementById('cold-entropy-hex-reset');
  var entropyHexStatus = document.getElementById('cold-entropy-hex-status');
  var entropyHexLog = document.getElementById('cold-entropy-hex-log');
  var entropyCsprngCount = document.getElementById('cold-entropy-csprng-count');
  var entropyCsprngDraw = document.getElementById('cold-entropy-csprng-draw');
  var entropyCsprngResetButton = document.getElementById('cold-entropy-csprng-reset');
  var entropyCsprngStatus = document.getElementById('cold-entropy-csprng-status');
  var entropyUndoButton = document.getElementById('cold-entropy-undo');
  var entropyMeter = document.getElementById('cold-entropy-meter');
  var entropyOutputStrength = document.getElementById('cold-entropy-output-strength');
  var entropyIndependentStrength = document.getElementById('cold-entropy-independent-strength');
  var entropyFallbackStrength = document.getElementById('cold-entropy-fallback-strength');
  var entropySimulatedCount = document.getElementById('cold-entropy-simulated-count');
  var entropyCsprngStrength = document.getElementById('cold-entropy-csprng-strength');
  var entropyHealthPanel = document.getElementById('cold-entropy-health');
  var entropyHealthSource = document.getElementById('cold-entropy-health-source');
  var entropyHealthState = document.getElementById('cold-entropy-health-state');
  var entropyHealthSamples = document.getElementById('cold-entropy-health-samples');
  var entropyHealthClaimed = document.getElementById('cold-entropy-health-claimed');
  var entropyHealthMeasured = document.getElementById('cold-entropy-health-measured');
  var entropyHealthChi = document.getElementById('cold-entropy-health-chi');
  var entropyHealthRuns = document.getElementById('cold-entropy-health-runs');
  var entropyHealthCorrelation = document.getElementById('cold-entropy-health-correlation');
  var entropyHealthFrequencyBody = document.getElementById('cold-entropy-health-frequency-body');
  var entropyHealthPatterns = document.getElementById('cold-entropy-health-patterns');
  var entropyHealthDisclosure = document.getElementById('cold-entropy-health-disclosure');
  var entropyTargetSelect = document.getElementById('cold-entropy-target');
  var entropyMixButton = document.getElementById('cold-entropy-mix-run');
  var entropyMixStatus = document.getElementById('cold-entropy-mix-status');
  var entropyMixOutputLabel = document.getElementById('cold-entropy-mix-output-label');
  var entropyMixOutput = document.getElementById('cold-entropy-mix-output');
  var entropyMixUseSeedForgeButton = document.getElementById('cold-entropy-mix-use-seed-forge');
  var entropyMixHandoffStatus = document.getElementById('cold-entropy-mix-handoff-status');
  var seedForgePanel = document.getElementById('cold-seed-forge');
  var seedForgeLanguage = document.getElementById('cold-seed-forge-language');
  var seedForgeTarget = document.getElementById('cold-seed-forge-target');
  var seedForgeGenerateButton = document.getElementById('cold-seed-forge-generate');
  var seedForgeStatus = document.getElementById('cold-seed-forge-status');
  var seedForgeMarginalWrap = document.getElementById('cold-seed-forge-marginal-wrap');
  var seedForgeMarginalAck = document.getElementById('cold-seed-forge-marginal-ack');
  var seedForgeGeneratedPassphrase = document.getElementById('cold-seed-forge-generated-passphrase-input');
  var seedForgeGeneratedPassphraseConfirm = document.getElementById('cold-seed-forge-generated-passphrase-confirm');
  var seedForgeGeneratedPassphraseError = document.getElementById('cold-seed-forge-generated-passphrase-error');
  var seedForgeGenerated = document.getElementById('cold-seed-forge-generated');
  var seedForgeGeneratedWords = document.getElementById('cold-seed-forge-generated-words');
  var seedForgeRevealButton = document.getElementById('cold-seed-forge-reveal');
  var seedForgeGeneratedFingerprint = document.getElementById('cold-seed-forge-generated-fingerprint');
  var seedForgeGeneratedRaw = document.getElementById('cold-seed-forge-generated-raw');
  var seedForgeGeneratedSeed = document.getElementById('cold-seed-forge-generated-seed');
  var seedForgeGeneratedSeedReveal = document.getElementById('cold-seed-forge-generated-seed-reveal');
  var seedForgeMnemonicInput = document.getElementById('cold-seed-forge-mnemonic-input');
  var seedForgeValidationPassphrase = document.getElementById('cold-seed-forge-validation-passphrase-input');
  var seedForgeValidationPassphraseConfirm = document.getElementById('cold-seed-forge-validation-passphrase-confirm');
  var seedForgeValidationPassphraseError = document.getElementById('cold-seed-forge-validation-passphrase-error');
  var seedForgeWordFields = document.getElementById('cold-seed-forge-word-fields');
  var seedForgeValidateButton = document.getElementById('cold-seed-forge-validate');
  var seedForgeValidationStatus = document.getElementById('cold-seed-forge-validation-status');
  var seedForgeValidationFingerprint = document.getElementById('cold-seed-forge-validation-fingerprint');
  var seedForgeValidationRaw = document.getElementById('cold-seed-forge-validation-raw');
  var seedForgeValidationSeed = document.getElementById('cold-seed-forge-validation-seed');
  var seedForgeValidationSeedReveal = document.getElementById('cold-seed-forge-validation-seed-reveal');
  var entropySession = entropyLab ? entropyLab.createSession() : null;
  var seedForgeWordInputs = [];
  var generatedMnemonic = '';
  var generatedLanguage = 'english';
  var generatedRevealed = false;
  var generatedRevealTimer = null;
  var generatedSeedBytes = null;
  var validationSeedBytes = null;
  var generatedSeedRevealed = false;
  var validationSeedRevealed = false;
  var generatedSeedRevealTimer = null;
  var validationSeedRevealTimer = null;
  var pendingSeedForgeMix = null;
  var pendingSeedForgeMixTargetBits = null;
  var CARD_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  var CARD_SUITS = ['♠', '♥', '♦', '♣'];
  var vaultCryptoReady = false;
  var vaultBusy = false;
  var vaultUnlocked = false;
  var createPrepared = false;
  var currentVaultBytes = null;
  var currentVaultSession = null;
  var pendingVaultBytes = null;
  var pendingOpenId = null;
  var pendingConcealmentRevealId = null;
  var secretNoteRevealTimers = [];
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

  // Rebuilds the 52-button card grid from entropySession.cardRemaining every
  // time, rather than incrementally adding/removing individual buttons. The
  // predecessor of this UI was a <select> rebuilt the same way for the same
  // reason: a review finding on the first version found that undo restored
  // the session's internal state correctly but left the dropdown's option
  // list desynced, because the dropdown was mutated incrementally while undo
  // only knew how to reverse the logic-layer accumulator. Rebuilding from
  // the authoritative session state on every change (draw, undo, reshuffle,
  // reset) makes the two impossible to desync — there is no incremental DOM
  // state to drift. Drawn cards stay visible but disabled, per the user
  // request to "show all card options at once," rather than disappearing.
  function refreshCardGrid() {
    if (!entropyCardGrid || !entropySession) {
      return;
    }
    var ready = entropyLabReady();
    if (entropyCardGrid.childElementCount !== 52) {
      entropyCardGrid.textContent = '';
      for (var cardId = 0; cardId < 52; cardId += 1) {
        var button = document.createElement('button');
        button.type = 'button';
        button.dataset.cardId = String(cardId);
        button.textContent = cardLabel(cardId);
        (function (id) {
          button.addEventListener('click', function () {
            drawCard(id, entropyLab.PROVENANCE_MANUAL);
          });
        }(cardId));
        entropyCardGrid.appendChild(button);
      }
    }
    var remaining = entropySession.cardRemaining;
    for (var i = 0; i < entropyCardGrid.children.length; i += 1) {
      var child = entropyCardGrid.children[i];
      var childId = Number(child.dataset.cardId);
      child.disabled = !ready || remaining.indexOf(childId) === -1;
    }
  }

  function refreshCardLog() {
    if (!entropyCardLog || !entropySession) {
      return;
    }
    if (entropySession.cardOrder.length === 0) {
      entropyCardLog.textContent = 'None yet.';
      return;
    }
    entropyCardLog.textContent = formatProvenanceLog(
      entropySession.cardOrder.map(function (cardId) { return cardLabel(cardId); }),
      entropySession.cardProvenance
    );
  }

  function drawCard(cardId, provenance) {
    if (!entropyLabReady() || !entropySession) {
      return;
    }
    try {
      entropyLab.addCard(entropySession, cardId, provenance);
    } catch (error) {
      if (entropyMixStatus) {
        entropyMixStatus.textContent = error.message;
      }
      return;
    }
    updateEntropyLabControls();
  }

  // Uniform integer in [0, maxExclusive) via rejection sampling on fresh
  // CSPRNG bytes — used only by the "Generate with device RNG" conveniences
  // below. entropy-lab.js records those values with device-rng provenance so
  // they contribute zero independent-manual security credit. maxExclusive is
  // always small here (<=52), so a
  // single JS number (not BigInt) is safe throughout.
  function drawUniformInt(maxExclusive) {
    if (!cryptoLayer || typeof cryptoLayer.randomBytes !== 'function') {
      throw new Error('crypto.getRandomValues is unavailable; refusing to generate random entropy.');
    }
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
      throw new Error('Entropy Lab internal error: drawUniformInt requires a positive integer bound.');
    }
    if (maxExclusive === 1) {
      return 0;
    }
    var bitsNeeded = Math.ceil(Math.log2(maxExclusive));
    var bytesNeeded = Math.ceil(bitsNeeded / 8);
    var mask = (1 << bitsNeeded) - 1;
    for (;;) {
      var randomBytes = cryptoLayer.randomBytes(bytesNeeded);
      var value = 0;
      for (var i = 0; i < randomBytes.length; i += 1) {
        value = (value << 8) | randomBytes[i];
      }
      zeroBytes(randomBytes);
      value = value & mask;
      if (value < maxExclusive) {
        return value;
      }
    }
  }

  // Parses a pasted/typed run of characters into a sequence of accepted
  // values (each in [minValue, maxValue]) plus the characters that were
  // rejected, so bulk entry (many dice faces or hex digits at once) can
  // report exactly what it skipped instead of silently adding zero, which
  // is the bug a hands-on user test found: typing a long digit string into
  // the old single-character dice input produced no feedback at all.
  // Whitespace and separators (commas, dashes) are ignored rather than
  // reported as invalid, since pasted sequences often include them.
  function parseSequence(raw, isValidChar, toValue) {
    var accepted = [];
    var rejected = [];
    for (var i = 0; i < raw.length; i += 1) {
      var ch = raw[i];
      if (/[\s,._-]/.test(ch)) {
        continue;
      }
      if (isValidChar(ch)) {
        accepted.push(toValue(ch));
      } else {
        rejected.push(ch);
      }
    }
    return { accepted: accepted, rejected: rejected };
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

  function clearPendingSeedForgeMix() {
    zeroBytes(pendingSeedForgeMix);
    pendingSeedForgeMix = null;
    pendingSeedForgeMixTargetBits = null;
    if (entropyMixUseSeedForgeButton) {
      entropyMixUseSeedForgeButton.hidden = true;
      entropyMixUseSeedForgeButton.disabled = true;
    }
    if (entropyMixHandoffStatus) {
      entropyMixHandoffStatus.hidden = true;
      entropyMixHandoffStatus.textContent = '';
    }
  }

  function retainPendingSeedForgeMix(bytes, targetBits) {
    clearPendingSeedForgeMix();
    pendingSeedForgeMix = new Uint8Array(bytes);
    pendingSeedForgeMixTargetBits = targetBits;
    if (entropyMixUseSeedForgeButton) {
      entropyMixUseSeedForgeButton.hidden = false;
      entropyMixUseSeedForgeButton.disabled = !vaultCryptoReady;
    }
    if (entropyMixHandoffStatus) {
      entropyMixHandoffStatus.hidden = false;
      entropyMixHandoffStatus.textContent = 'This exact mixed byte array is held locally for one use. Select the matching Seed Forge size, then use the button once; changing Entropy Lab input or output size clears it.';
    }
    updateSeedForgeControls();
  }

  function formatEntropyFallback(strength) {
    if (strength.fallbackBits === 0) {
      return '0 bits — CSPRNG-only security';
    }
    if (strength.fullTwoSourceProtection) {
      return '~' + strength.fallbackBits + ' bits — full two-source protection';
    }
    return '~' + strength.fallbackBits + ' bits — partial independent fallback';
  }

  function formatProvenanceLog(values, provenances) {
    var manual = [];
    var device = [];
    for (var index = 0; index < values.length; index += 1) {
      if (provenances[index] === entropyLab.PROVENANCE_DEVICE_RNG) {
        device.push(values[index]);
      } else {
        manual.push(values[index]);
      }
    }
    var parts = [];
    if (manual.length > 0) {
      parts.push('Physical/manual: ' + manual.join(', '));
    }
    if (device.length > 0) {
      parts.push('Device RNG: ' + device.join(', '));
    }
    return parts.length === 0 ? 'None yet.' : parts.join(' · ');
  }

  function manualHealthValues(values, provenances) {
    var manual = [];
    for (var index = 0; index < values.length; index += 1) {
      if (provenances[index] === entropyLab.PROVENANCE_MANUAL) {
        manual.push(values[index]);
      }
    }
    return manual;
  }

  function healthSource(id, label, values, provenances, alphabetSize, options) {
    var config = options || {};
    var manual = manualHealthValues(values, provenances);
    return {
      id: id,
      label: label,
      values: manual,
      simulatedCount: values.length - manual.length,
      alphabetSize: alphabetSize,
      symbolLabels: config.symbolLabels || [],
      claimedBits: config.claimedBits,
      claimedBitsPerSymbol: config.claimedBitsPerSymbol,
      withoutReplacement: Boolean(config.withoutReplacement)
    };
  }

  function buildEntropyHealthSources() {
    if (!entropySession) {
      return [];
    }
    var base6Labels = [];
    var discardLabels = [];
    var hexLabels = [];
    var cardLabels = [];
    for (var face = 1; face <= 6; face += 1) {
      base6Labels.push(String(face));
    }
    for (var acceptedFace = 1; acceptedFace <= 4; acceptedFace += 1) {
      discardLabels.push(String(acceptedFace));
    }
    for (var nibble = 0; nibble < 16; nibble += 1) {
      hexLabels.push(nibble.toString(16));
    }
    for (var cardIndex = 0; cardIndex < 52; cardIndex += 1) {
      cardLabels.push(cardLabel(cardIndex));
    }

    // The session stores every finite-alphabet symbol zero-based; labels keep
    // the physical notation (die faces 1-6 and discard outcomes 1-4).
    var base6Values = entropySession.diceDigits.slice();
    var base6Source = healthSource(
      'dice-base6', 'Dice - base-6', base6Values, entropySession.diceProvenance, 6,
      { symbolLabels: base6Labels, claimedBitsPerSymbol: Math.log2(6) }
    );

    var discardValues = [];
    for (var discardIndex = 0; discardIndex + 2 <= entropySession.discardDiceBits.length; discardIndex += 2) {
      discardValues.push(
        (entropySession.discardDiceBits[discardIndex] << 1)
          | entropySession.discardDiceBits[discardIndex + 1]
      );
    }
    var discardSource = healthSource(
      'dice-discard', 'Dice - 1-4 discard', discardValues,
      entropySession.discardDiceProvenance, 4,
      { symbolLabels: discardLabels, claimedBitsPerSymbol: 2 }
    );

    var coinSource = healthSource(
      'coin', 'Coin flips', entropySession.coinBits, entropySession.coinProvenance, 2,
      { symbolLabels: ['T', 'H'], claimedBitsPerSymbol: 1 }
    );

    var hexValues = [];
    for (var hexIndex = 0; hexIndex + 4 <= entropySession.hexBits.length; hexIndex += 4) {
      hexValues.push(
        (entropySession.hexBits[hexIndex] << 3)
        | (entropySession.hexBits[hexIndex + 1] << 2)
        | (entropySession.hexBits[hexIndex + 2] << 1)
        | entropySession.hexBits[hexIndex + 3]
      );
    }
    var hexSource = healthSource(
      'hex', 'Hex digits', hexValues, entropySession.hexProvenance, 16,
      { symbolLabels: hexLabels, claimedBitsPerSymbol: 4 }
    );

    var cardValues = entropySession.cardOrder.slice();
    var cardProvenance = entropySession.cardProvenance.slice();
    var manualCardClaimedBits = 0;
    for (var cardOrderIndex = 0; cardOrderIndex < cardValues.length; cardOrderIndex += 1) {
      if (cardProvenance[cardOrderIndex] === entropyLab.PROVENANCE_MANUAL) {
        var poolSize = entropySession.cardDrawPoolSizes[cardOrderIndex];
        if (Number.isInteger(poolSize) && poolSize > 0) {
          manualCardClaimedBits += Math.log2(poolSize);
        }
      }
    }
    var cardSource = healthSource(
      'cards', 'Playing cards', cardValues, cardProvenance, 52,
      { symbolLabels: cardLabels, claimedBits: manualCardClaimedBits, withoutReplacement: true }
    );
    return [base6Source, discardSource, coinSource, cardSource, hexSource];
  }

  function formatHealthBits(value) {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return 'Not available';
    }
    return value.toFixed(1) + ' bits';
  }

  function formatHealthPValue(value) {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return 'not available';
    }
    return value < 0.0001 ? '<0.0001' : value.toFixed(4);
  }

  function healthTestUnavailable(reason) {
    var messages = {
      'without-replacement': 'not applicable to cards drawn without replacement',
      'expected-counts-too-small': 'not available until each expected bin has at least 5 samples',
      'sample-too-small': 'not available until at least 20 samples',
      'symbol-counts-too-small': 'not available until both projected symbol counts are above 10',
      'proportion-too-skewed': 'not available while the observed split is too skewed',
      'one-symbol-only': 'not available with only one observed symbol',
      'zero-variance': 'not available because all values are identical'
    };
    return messages[reason] || 'not available';
  }

  function healthStateText(analysis, targetBits) {
    if (analysis.state === 'not-applicable') {
      return 'Not applicable - cards are drawn without replacement';
    }
    if (analysis.state === 'marginal') {
      return 'Marginal (advisory) - chi-square p < 0.01; inspect the recording';
    }
    if (analysis.state === 'strong') {
      return 'Strong (advisory) - measured min-entropy is at least 256 bits';
    }
    if (analysis.state === 'adequate') {
      return 'Adequate (advisory) - measured min-entropy reaches ' + targetBits + ' bits';
    }
    return 'Insufficient (advisory) - measured min-entropy is below ' + targetBits + ' bits';
  }

  function renderHealthFrequency(source, analysis) {
    if (!entropyHealthFrequencyBody) {
      return;
    }
    entropyHealthFrequencyBody.textContent = '';
    for (var index = 0; index < analysis.frequencies.length; index += 1) {
      var frequency = analysis.frequencies[index];
      var row = document.createElement('tr');
      var symbolCell = document.createElement('td');
      var countCell = document.createElement('td');
      var shareCell = document.createElement('td');
      symbolCell.textContent = source.symbolLabels[frequency.symbol] || String(frequency.symbol);
      countCell.textContent = String(frequency.count);
      shareCell.textContent = (frequency.probability * 100).toFixed(1) + '%';
      row.appendChild(symbolCell);
      row.appendChild(countCell);
      row.appendChild(shareCell);
      entropyHealthFrequencyBody.appendChild(row);
    }
  }

  function renderHealthPatternWarnings(source, warnings) {
    if (!entropyHealthPatterns) {
      return;
    }
    entropyHealthPatterns.setAttribute('data-warning', warnings.length > 0 ? 'true' : 'false');
    if (warnings.length === 0) {
      entropyHealthPatterns.textContent = 'No pattern warnings yet.';
      return;
    }
    var messages = warnings.map(function (warning) {
      if (warning.code === 'long-run') {
        return 'long run of ' + (source.symbolLabels[warning.symbol] || String(warning.symbol)) + ' (' + warning.length + ')';
      }
      if (warning.code === 'ascending-sequence') {
        return 'ascending sequence (' + warning.length + ' values)';
      }
      if (warning.code === 'descending-sequence') {
        return 'descending sequence (' + warning.length + ' values)';
      }
      if (warning.code === 'alternation') {
        return 'alternating pattern (' + warning.length + ' values)';
      }
      return 'repeated block (' + warning.blockLength + ' values repeated)';
    });
    entropyHealthPatterns.textContent = 'Pattern warning - inspect: ' + messages.join('; ') + '.';
  }

  function updateEntropyHealth() {
    if (!entropyHealth || !entropyHealthPanel || !entropyHealthSource || !entropySession) {
      return;
    }
    var sources = buildEntropyHealthSources();
    var selectedId = entropyHealthSource.value;
    var source = sources[0];
    for (var index = 0; index < sources.length; index += 1) {
      if (sources[index].id === selectedId) {
        source = sources[index];
        break;
      }
    }
    entropyHealthPanel.setAttribute('data-source', source.id);
    if (source.values.length === 0) {
      entropyHealthPanel.setAttribute('data-state', 'insufficient');
      entropyHealthState.textContent = 'Insufficient (advisory) - collect physical/manual samples first';
      entropyHealthSamples.textContent = source.simulatedCount > 0
        ? '0 physical/manual (' + source.simulatedCount + ' simulations excluded)'
        : '0';
      entropyHealthClaimed.textContent = '0 bits';
      entropyHealthMeasured.textContent = 'Not available';
      entropyHealthChi.textContent = source.simulatedCount > 0
        ? 'No physical/manual samples (simulations excluded)'
        : 'Not available yet';
      entropyHealthRuns.textContent = 'Not available yet';
      entropyHealthCorrelation.textContent = 'Not available yet';
      if (entropyHealthDisclosure) {
        entropyHealthDisclosure.textContent = source.simulatedCount > 0
          ? 'Device-RNG simulations are excluded from this analysis. Add physical/manual samples; passing tests are not proof that a platform RNG is sound. P1.2 is advisory and does not block mixing.'
          : 'Warnings are prompts to inspect the recording, not proof of a broken source. Insufficient sample size leaves a test unavailable. P1.2 is advisory and does not block mixing; the analyzer never replaces the CSPRNG or the integer independent-source accounting. Seed Forge asks for acknowledgement only when this selected source is marginal.';
      }
      if (entropyHealthFrequencyBody) {
        entropyHealthFrequencyBody.textContent = '';
        var emptyRow = document.createElement('tr');
        var emptyCell = document.createElement('td');
        emptyCell.colSpan = 3;
        emptyCell.textContent = source.simulatedCount > 0
          ? 'Device-RNG simulations are excluded; add physical/manual samples.'
          : 'No physical/manual samples yet.';
        emptyRow.appendChild(emptyCell);
        entropyHealthFrequencyBody.appendChild(emptyRow);
      }
      renderHealthPatternWarnings(source, []);
      return;
    }

    var targetBits = Number(entropyTargetSelect && entropyTargetSelect.value) || 128;
    var analysis;
    try {
      analysis = entropyHealth.analyze(source.values, {
        alphabetSize: source.alphabetSize,
        targetBits: targetBits,
        claimedBits: source.claimedBits,
        claimedBitsPerSymbol: source.claimedBitsPerSymbol,
        withoutReplacement: source.withoutReplacement
      });
    } catch (error) {
      entropyHealthPanel.setAttribute('data-state', 'unavailable');
      entropyHealthState.textContent = 'Unavailable - invalid source state';
      entropyHealthSamples.textContent = '0';
      entropyHealthClaimed.textContent = 'Not available';
      entropyHealthMeasured.textContent = 'Not available';
      entropyHealthChi.textContent = 'Not available';
      entropyHealthRuns.textContent = 'Not available';
      entropyHealthCorrelation.textContent = 'Not available';
      if (entropyHealthPatterns) {
        entropyHealthPatterns.setAttribute('data-warning', 'true');
        entropyHealthPatterns.textContent = 'Analysis failed closed: ' + error.message;
      }
      if (entropyHealthDisclosure) {
        entropyHealthDisclosure.textContent = 'Analysis failed closed. P1.2 remains advisory and does not block mixing. The analyzer never replaces the CSPRNG or the integer independent-source accounting.';
      }
      return;
    }

    entropyHealthPanel.setAttribute('data-state', analysis.state);
    entropyHealthState.textContent = healthStateText(analysis, targetBits);
    entropyHealthSamples.textContent = String(analysis.sampleCount)
      + (source.simulatedCount > 0 ? ' physical/manual (' + source.simulatedCount + ' simulations excluded)' : '');
    entropyHealthClaimed.textContent = formatHealthBits(analysis.claimedBits);
    entropyHealthMeasured.textContent = formatHealthBits(analysis.measuredBits);
    entropyHealthChi.textContent = analysis.chiSquare.available
      ? 'chi2=' + analysis.chiSquare.statistic.toFixed(2) + ', p=' + formatHealthPValue(analysis.chiSquare.pValue)
      : healthTestUnavailable(analysis.chiSquare.reason);
    entropyHealthRuns.textContent = analysis.runs.available
      ? 'runs=' + analysis.runs.runs + ', p=' + formatHealthPValue(analysis.runs.pValue)
        + (analysis.runs.biasDetected ? ' - warning' : '')
      : healthTestUnavailable(analysis.runs.reason);
    entropyHealthCorrelation.textContent = analysis.serialCorrelation.available
      ? 'r1=' + analysis.serialCorrelation.value.toFixed(3)
        + (analysis.serialCorrelation.significant ? ' - outside 95% band' : '')
      : healthTestUnavailable(analysis.serialCorrelation.reason);
    renderHealthFrequency(source, analysis);
    renderHealthPatternWarnings(source, analysis.patternWarnings);
    if (entropyHealthDisclosure) {
      entropyHealthDisclosure.textContent = source.withoutReplacement
        ? 'Cards are a without-replacement permutation: frequency and iid randomness tests are intentionally not reported. The card order is still shown for review.'
        : 'Warnings are prompts to inspect the recording, not proof of a broken source. Passing tests are not proof that a platform RNG is sound. P1.2 is advisory and does not block mixing; Seed Forge asks for acknowledgement only when this selected source is marginal.';
    }
  }

  function updateEntropyMeter() {
    if (!entropyMeter || !entropySession || !entropyTargetSelect) {
      return;
    }
    var targetBits = Number(entropyTargetSelect.value);
    var strength = entropyLab.strengthSummary(entropySession, targetBits);
    var simulated = entropyLab.deviceRngDerivedValueCount(entropySession);
    var csprngBits = entropyLab.csprngGuaranteedBits(entropySession);

    entropyMeter.setAttribute('data-guaranteed-bits', String(strength.independentBits));
    entropyMeter.setAttribute('data-independent-bits', String(strength.independentBits));
    entropyMeter.setAttribute('data-device-rng-values', String(simulated));
    entropyMeter.setAttribute('data-csprng-bits', String(csprngBits));
    entropyMeter.setAttribute('data-output-strength-bits', String(strength.normalOutputBits));
    entropyMeter.setAttribute('data-fallback-bits', String(strength.fallbackBits));
    entropyMeter.setAttribute('data-full-two-source-protection', String(strength.fullTwoSourceProtection));

    if (entropyOutputStrength) {
      entropyOutputStrength.textContent = strength.normalOutputBits + ' bits';
    }
    if (entropyIndependentStrength) {
      entropyIndependentStrength.textContent = strength.independentBits + ' / ' + targetBits + ' bits';
    }
    if (entropyFallbackStrength) {
      entropyFallbackStrength.textContent = formatEntropyFallback(strength);
    }
    if (entropySimulatedCount) {
      entropySimulatedCount.textContent = simulated + ' (0 independent bits)';
    }
    if (entropyCsprngStrength) {
      entropyCsprngStrength.textContent = csprngBits + ' bits';
    }
  }

  // Single source of truth for the CSPRNG status line, reporting only
  // *available* (unspent) bytes via entropyLab.availableCsprngBytes() rather
  // than session.csprngBytes.length directly — the raw array includes bytes
  // a mix() call has already spent, and a review round found the status
  // text going stale (still claiming spent bytes as "drawn") because it was
  // set ad hoc inside the draw/undo handlers instead of refreshed centrally
  // alongside the meter every time state changes, including after mix().
  function updateEntropyCsprngStatus() {
    if (!entropyCsprngStatus || !entropySession || !entropyLab) {
      return;
    }
    var availableBytes = entropyLab.availableCsprngBytes(entropySession).length;
    entropyCsprngStatus.textContent = availableBytes + ' fresh CSPRNG byte' + (availableBytes === 1 ? '' : 's') + ' available.';
  }

  // options.preserveOutput: when true, does not clear a just-displayed mix
  // result. Only the mix button's success path passes this — every other
  // caller (adding entropy, undo, changing the target size) wants the old
  // result cleared, since review found a stale result surviving further
  // input. The mix button still needs this function's other effects (the
  // meter, CSPRNG status, and undo button must reflect newly spent CSPRNG
  // bytes immediately, not only after some later unrelated action — a
  // second review finding), which is why this is a flag here rather than a
  // second copy of the control-refresh logic in the click handler.
  function updateEntropyDiceStatus() {
    if (!entropyDiceStatus || !entropySession) {
      return;
    }
    var base6Count = entropySession.diceDigits.length;
    var discardBits = entropySession.discardDiceBits.length;
    if (base6Count === 0 && discardBits === 0) {
      entropyDiceStatus.textContent = 'No dice rolls recorded yet.';
      return;
    }
    entropyDiceStatus.textContent = base6Count + ' base-6 roll' + (base6Count === 1 ? '' : 's')
      + ', ' + discardBits + ' discard-mode bit' + (discardBits === 1 ? '' : 's') + ' recorded.';
  }

  // Reconstructs the original die faces (1-6) from session.diceDigits (which
  // stores face-1, per entropy-lab.js's base-6 accumulator comment) and from
  // session.discardDiceBits (2 bits per kept roll, MSB-first, mapping
  // 1->00 2->01 3->10 4->11 — see entropy-lab.js's addDiceDiscard comment).
  // Only *kept* discard-mode rolls are recoverable this way, since a
  // rejected 5/6 contributes no bits and was never retained anywhere — the
  // log only ever needs to show what was actually kept.
  function updateEntropyDiceLog() {
    if (!entropyDiceLog || !entropySession) {
      return;
    }
    var parts = [];
    if (entropySession.diceDigits.length > 0) {
      parts.push('base-6 — ' + formatProvenanceLog(
        entropySession.diceDigits.map(function (digit) { return String(digit + 1); }),
        entropySession.diceProvenance
      ));
    }
    var discardBits = entropySession.discardDiceBits;
    if (discardBits.length > 0) {
      var discardFaces = [];
      for (var i = 0; i + 2 <= discardBits.length; i += 2) {
        var face = ((discardBits[i] << 1) | discardBits[i + 1]) + 1;
        discardFaces.push(String(face));
      }
      parts.push('discard-mode — ' + formatProvenanceLog(discardFaces, entropySession.discardDiceProvenance));
    }
    entropyDiceLog.textContent = parts.length === 0 ? 'None yet.' : parts.join(' · ');
  }

  function updateEntropyCoinStatus() {
    if (!entropyCoinStatus || !entropySession) {
      return;
    }
    var count = entropySession.coinBits.length;
    entropyCoinStatus.textContent = count === 0
      ? 'No coin flips recorded yet.'
      : count + ' coin flip' + (count === 1 ? '' : 's') + ' recorded.';
  }

  function updateEntropyCoinLog() {
    if (!entropyCoinLog || !entropySession) {
      return;
    }
    entropyCoinLog.textContent = entropySession.coinBits.length === 0
      ? 'None yet.'
      : formatProvenanceLog(
        entropySession.coinBits.map(function (bit) { return bit ? 'H' : 'T'; }),
        entropySession.coinProvenance
      );
  }

  function updateEntropyHexStatus() {
    if (!entropyHexStatus || !entropySession) {
      return;
    }
    var count = entropySession.hexBits.length / 4;
    entropyHexStatus.textContent = count === 0
      ? 'No hex digits recorded yet.'
      : count + ' hex digit' + (count === 1 ? '' : 's') + ' recorded.';
  }

  // Regroups session.hexBits (4 MSB-first bits per recorded digit, per
  // entropy-lab.js's addHexNibble comment) back into hex characters for
  // display.
  function updateEntropyHexLog() {
    if (!entropyHexLog || !entropySession) {
      return;
    }
    var bits = entropySession.hexBits;
    if (bits.length === 0) {
      entropyHexLog.textContent = 'None yet.';
      return;
    }
    var digits = [];
    for (var i = 0; i + 4 <= bits.length; i += 4) {
      var nibble = (bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | bits[i + 3];
      digits.push(nibble.toString(16));
    }
    entropyHexLog.textContent = formatProvenanceLog(digits, entropySession.hexProvenance);
  }

  // options.preserveOutput: when true, does not clear a just-displayed mix
  // result. Only the mix button's success path passes this — every other
  // caller (adding entropy, undo, changing the target size) wants the old
  // result cleared, since review found a stale result surviving further
  // input. The mix button still needs this function's other effects (the
  // meter, CSPRNG status, and undo button must reflect newly spent CSPRNG
  // bytes immediately, not only after some later unrelated action — a
  // second review finding), which is why this is a flag here rather than a
  // second copy of the control-refresh logic in the click handler.
  function updateEntropyLabControls(options) {
    var preserveOutput = Boolean(options && options.preserveOutput);
    var ready = entropyLabReady();
    var controls = [
      entropyDiceFace, entropyDiceBase6Add, entropyDiceDiscardAdd,
      entropyDiceRandomCount, entropyDiceRandomButton, entropyDiceResetButton,
      entropyCoinHeads, entropyCoinTails,
      entropyCoinRandomCount, entropyCoinRandomButton, entropyCoinResetButton,
      entropyCardRandomCount, entropyCardRandomButton, entropyCardResetButton,
      entropyHexInput, entropyHexAdd,
      entropyHexRandomCount, entropyHexRandomButton, entropyHexResetButton,
      entropyCsprngCount, entropyCsprngDraw, entropyCsprngResetButton,
      entropyUndoButton, entropyHealthSource, entropyTargetSelect, entropyMixButton
    ];
    for (var index = 0; index < controls.length; index += 1) {
      if (controls[index]) {
        controls[index].disabled = !ready;
      }
    }
    if (entropyCardShuffleButton) {
      entropyCardShuffleButton.disabled = !ready || !entropySession || entropySession.cardRemaining.length !== 0;
    }
    if (entropyCardShuffleStatus && entropySession) {
      var remaining = entropySession.cardRemaining.length;
      entropyCardShuffleStatus.textContent = remaining === 0
        ? 'Every card in this shuffle has been drawn — "Start new shuffle" is ready.'
        : remaining + ' card' + (remaining === 1 ? '' : 's') + ' remaining in this shuffle before you can start a new one.';
    }
    refreshCardGrid();
    if (!preserveOutput) {
      setEntropyMixOutput(null);
      clearPendingSeedForgeMix();
    }
    if (!ready) {
      updateSeedForgeControls();
      return;
    }
    if (entropyUndoButton) {
      entropyUndoButton.disabled = entropySession.history.length === 0;
    }
    updateEntropyDiceStatus();
    updateEntropyDiceLog();
    updateEntropyCoinStatus();
    updateEntropyCoinLog();
    updateEntropyHexStatus();
    updateEntropyHexLog();
    refreshCardLog();
    updateEntropyMeter();
    updateEntropyHealth();
    updateEntropyCsprngStatus();
    updateEntropyMixStatus();
    updateSeedForgeControls();
  }

  function updateEntropyMixStatus() {
    if (!entropyMixStatus || !entropySession || !entropyTargetSelect) {
      return;
    }
    var targetBits = Number(entropyTargetSelect.value);
    var targetBytes = targetBits / 8;
    var sourceBytes = entropyLab.sourceEntropyBytes(entropySession);
    var availableBytes = entropyLab.availableCsprngBytes(entropySession).length;
    var strength = entropyLab.strengthSummary(entropySession, targetBits);
    var simulated = entropyLab.deviceRngDerivedValueCount(entropySession);

    if (sourceBytes.length === 0) {
      if (availableBytes < targetBytes) {
        entropyMixStatus.textContent = 'CSPRNG-only security: need ' + targetBytes + ' fresh CSPRNG bytes for the selected ' + targetBits + '-bit output; have ' + availableBytes + '. Independent-source fallback is 0 bits.';
      } else {
        entropyMixStatus.textContent = 'Ready for a ' + targetBits + '-bit CSPRNG-only draw. Normal output strength is ' + targetBits + ' bits if the device RNG is sound; independent-source fallback is 0 bits.';
      }
      return;
    }

    var mixBytesNeeded = Math.max(targetBytes, sourceBytes.length);
    if (availableBytes < mixBytesNeeded) {
      var pendingSecurityState;
      if (strength.fullTwoSourceProtection) {
        pendingSecurityState = ' Independent physical/manual entropy already reaches the target; full two-source protection becomes available once enough fresh CSPRNG bytes are drawn.';
      } else if (strength.fallbackBits === 0) {
        pendingSecurityState = ' This remains CSPRNG-only security with 0-bit independent-source fallback.';
      } else {
        pendingSecurityState = ' This is not full two-source protection; independent-source fallback is ~' + strength.fallbackBits + ' bits.';
      }
      entropyMixStatus.textContent = 'Need ' + mixBytesNeeded + ' fresh CSPRNG bytes for this ' + targetBits + '-bit output; have ' + availableBytes + '.' + pendingSecurityState;
      return;
    }

    if (strength.fullTwoSourceProtection) {
      entropyMixStatus.textContent = 'Ready for a ' + targetBits + '-bit output with full two-source protection. Independent physical/manual credit: ' + strength.independentBits + ' bits; fallback if the device RNG is compromised: ~' + strength.fallbackBits + ' bits.';
      return;
    }

    if (strength.fallbackBits === 0) {
      entropyMixStatus.textContent = 'Ready for a ' + targetBits + '-bit output with CSPRNG-only security. Independent-source fallback: 0 bits.'
        + (simulated > 0 ? ' ' + simulated + ' simulated value(s) use the same device RNG and add 0 independent bits.' : '');
      return;
    }

    entropyMixStatus.textContent = 'Ready for a ' + targetBits + '-bit output under normal device-RNG operation. Independent-source fallback: ~' + strength.fallbackBits + ' bits from ' + strength.independentBits + ' bits of conservative physical/manual credit; this is not full two-source protection.'
      + (simulated > 0 ? ' ' + simulated + ' simulated value(s) add 0 independent bits.' : '');
  }

  // Reads a "how many" input used by the various "Generate random" rows,
  // clamped to the input's own min/max so a malformed or out-of-range value
  // typed directly into the number field fails closed to a safe bound
  // instead of e.g. generating zero or a huge unbounded loop.
  function readRandomCount(input, fallback) {
    if (!input) {
      return fallback;
    }
    var value = Math.round(Number(input.value));
    var min = Number(input.min) || 1;
    var max = Number(input.max) || fallback;
    if (!Number.isFinite(value) || value < min) {
      return min;
    }
    if (value > max) {
      return max;
    }
    return value;
  }

  function wireEntropyLab() {
    if (!entropyLab || !entropySession) {
      return;
    }
    refreshCardGrid();

    if (entropyDiceBase6Add) {
      entropyDiceBase6Add.addEventListener('click', function () {
        var parsed = parseSequence(
          (entropyDiceFace && entropyDiceFace.value) || '',
          function (ch) { return ch >= '1' && ch <= '6'; },
          Number
        );
        if (parsed.accepted.length === 0) {
          if (entropyDiceStatus) {
            entropyDiceStatus.textContent = parsed.rejected.length > 0
              ? 'No valid die faces found (only digits 1-6 count). Rejected: ' + parsed.rejected.join('')
              : 'Enter at least one die face (1-6) first.';
          }
          return;
        }
        parsed.accepted.forEach(function (face) {
          entropyLab.addDiceBase6(entropySession, face);
        });
        if (entropyDiceFace) {
          entropyDiceFace.value = '';
        }
        updateEntropyLabControls();
        if (entropyDiceStatus) {
          entropyDiceStatus.textContent = 'Added ' + parsed.accepted.length + ' base-6 roll' + (parsed.accepted.length === 1 ? '' : 's') + '.'
            + (parsed.rejected.length > 0 ? ' Ignored invalid character(s): ' + parsed.rejected.join('') : '');
        }
      });
    }

    if (entropyDiceDiscardAdd) {
      entropyDiceDiscardAdd.addEventListener('click', function () {
        var parsed = parseSequence(
          (entropyDiceFace && entropyDiceFace.value) || '',
          function (ch) { return ch >= '1' && ch <= '6'; },
          Number
        );
        if (parsed.accepted.length === 0) {
          if (entropyDiceStatus) {
            entropyDiceStatus.textContent = parsed.rejected.length > 0
              ? 'No valid die faces found (only digits 1-6 count). Rejected: ' + parsed.rejected.join('')
              : 'Enter at least one die face (1-6) first.';
          }
          return;
        }
        var acceptedRolls = 0;
        parsed.accepted.forEach(function (face) {
          if (entropyLab.addDiceDiscard(entropySession, face)) {
            acceptedRolls += 1;
          }
        });
        if (entropyDiceFace) {
          entropyDiceFace.value = '';
        }
        updateEntropyLabControls();
        if (entropyDiceStatus) {
          entropyDiceStatus.textContent = 'Kept ' + acceptedRolls + ' of ' + parsed.accepted.length + ' roll(s) (discard mode only keeps 1-4).'
            + (parsed.rejected.length > 0 ? ' Ignored invalid character(s): ' + parsed.rejected.join('') : '');
        }
      });
    }

    if (entropyDiceRandomButton) {
      entropyDiceRandomButton.addEventListener('click', function () {
        var count = readRandomCount(entropyDiceRandomCount, 10);
        try {
          for (var i = 0; i < count; i += 1) {
            entropyLab.addDiceBase6(entropySession, drawUniformInt(6) + 1, entropyLab.PROVENANCE_DEVICE_RNG);
          }
        } catch (error) {
          updateEntropyLabControls();
          if (entropyDiceStatus) {
            entropyDiceStatus.textContent = error.message;
          }
          return;
        }
        updateEntropyLabControls();
        if (entropyDiceStatus) {
          entropyDiceStatus.textContent = 'Generated ' + count + ' base-6 dice roll(s) with the device RNG. They receive 0 independent-manual credit.';
        }
      });
    }

    if (entropyDiceResetButton) {
      entropyDiceResetButton.addEventListener('click', function () {
        entropyLab.resetDice(entropySession);
        updateEntropyLabControls();
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

    if (entropyCoinRandomButton) {
      entropyCoinRandomButton.addEventListener('click', function () {
        var count = readRandomCount(entropyCoinRandomCount, 10);
        try {
          for (var i = 0; i < count; i += 1) {
            entropyLab.addCoin(entropySession, drawUniformInt(2) === 1, entropyLab.PROVENANCE_DEVICE_RNG);
          }
        } catch (error) {
          updateEntropyLabControls();
          if (entropyCoinStatus) {
            entropyCoinStatus.textContent = error.message;
          }
          return;
        }
        updateEntropyLabControls();
        if (entropyCoinStatus) {
          entropyCoinStatus.textContent = 'Generated ' + count + ' coin flip(s) with the device RNG. They receive 0 independent-manual credit.';
        }
      });
    }

    if (entropyCoinResetButton) {
      entropyCoinResetButton.addEventListener('click', function () {
        entropyLab.resetCoin(entropySession);
        updateEntropyLabControls();
      });
    }

    if (entropyCardShuffleButton) {
      entropyCardShuffleButton.addEventListener('click', function () {
        try {
          entropyLab.startNewCardShuffle(entropySession);
        } catch (error) {
          if (entropyCardShuffleStatus) {
            entropyCardShuffleStatus.textContent = error.message;
          }
          return;
        }
        updateEntropyLabControls();
      });
    }

    if (entropyCardRandomButton) {
      entropyCardRandomButton.addEventListener('click', function () {
        var count = readRandomCount(entropyCardRandomCount, 5);
        var drawn = 0;
        try {
          for (var i = 0; i < count; i += 1) {
            if (entropySession.cardRemaining.length === 0) {
              entropyLab.startNewCardShuffle(entropySession);
            }
            var pickIndex = drawUniformInt(entropySession.cardRemaining.length);
            entropyLab.addCard(entropySession, entropySession.cardRemaining[pickIndex], entropyLab.PROVENANCE_DEVICE_RNG);
            drawn += 1;
          }
        } catch (error) {
          updateEntropyLabControls();
          if (entropyCardShuffleStatus) {
            entropyCardShuffleStatus.textContent = error.message;
          }
          return;
        }
        updateEntropyLabControls();
      });
    }

    if (entropyCardResetButton) {
      entropyCardResetButton.addEventListener('click', function () {
        entropyLab.resetCards(entropySession);
        updateEntropyLabControls();
      });
    }

    if (entropyHexAdd) {
      entropyHexAdd.addEventListener('click', function () {
        var parsed = parseSequence(
          ((entropyHexInput && entropyHexInput.value) || '').toLowerCase(),
          function (ch) { return /[0-9a-f]/.test(ch); },
          function (ch) { return parseInt(ch, 16); }
        );
        if (parsed.accepted.length === 0) {
          if (entropyHexStatus) {
            entropyHexStatus.textContent = parsed.rejected.length > 0
              ? 'No valid hex digits found (0-9, a-f only). Rejected: ' + parsed.rejected.join('')
              : 'Enter at least one hex digit (0-9, a-f) first.';
          }
          return;
        }
        parsed.accepted.forEach(function (nibble) {
          entropyLab.addHexNibble(entropySession, nibble);
        });
        if (entropyHexInput) {
          entropyHexInput.value = '';
        }
        updateEntropyLabControls();
        if (entropyHexStatus) {
          entropyHexStatus.textContent = 'Added ' + parsed.accepted.length + ' hex digit' + (parsed.accepted.length === 1 ? '' : 's') + '.'
            + (parsed.rejected.length > 0 ? ' Ignored invalid character(s): ' + parsed.rejected.join('') : '');
        }
      });
    }

    if (entropyHexRandomButton) {
      entropyHexRandomButton.addEventListener('click', function () {
        var count = readRandomCount(entropyHexRandomCount, 10);
        try {
          for (var i = 0; i < count; i += 1) {
            entropyLab.addHexNibble(entropySession, drawUniformInt(16), entropyLab.PROVENANCE_DEVICE_RNG);
          }
        } catch (error) {
          updateEntropyLabControls();
          if (entropyHexStatus) {
            entropyHexStatus.textContent = error.message;
          }
          return;
        }
        updateEntropyLabControls();
        if (entropyHexStatus) {
          entropyHexStatus.textContent = 'Generated ' + count + ' hex digit(s) with the device RNG. They receive 0 independent-manual credit.';
        }
      });
    }

    if (entropyHexResetButton) {
      entropyHexResetButton.addEventListener('click', function () {
        entropyLab.resetHex(entropySession);
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
        var batches = readRandomCount(entropyCsprngCount, 1);
        var drawn;
        try {
          drawn = cryptoLayer.randomBytes(32 * batches);
        } catch (error) {
          if (entropyCsprngStatus) {
            entropyCsprngStatus.textContent = 'CSPRNG draw failed: ' + error.message;
          }
          return;
        }
        entropyLab.addCsprngBytes(entropySession, drawn);
        zeroBytes(drawn);
        updateEntropyLabControls();
      });
    }

    if (entropyCsprngResetButton) {
      entropyCsprngResetButton.addEventListener('click', function () {
        entropyLab.resetCsprng(entropySession);
        updateEntropyLabControls();
      });
    }

    if (entropyUndoButton) {
      entropyUndoButton.addEventListener('click', function () {
        entropyLab.undoLast(entropySession);
        updateEntropyLabControls();
      });
    }

    if (entropyTargetSelect) {
      entropyTargetSelect.addEventListener('change', function () {
        if (seedForgeTarget) {
          seedForgeTarget.value = entropyTargetSelect.value;
        }
        updateEntropyLabControls();
      });
    }

    if (entropyHealthSource) {
      entropyHealthSource.addEventListener('change', function () {
        updateEntropyHealth();
      });
    }

    if (entropyMixButton) {
      entropyMixButton.addEventListener('click', function () {
        var targetBits = Number(entropyTargetSelect.value);
        var mixed;
        try {
          mixed = entropyLab.mix(entropySession, targetBits);
        } catch (error) {
          // mix() validates everything before it mutates anything (see its
          // comment), so a thrown error here means no CSPRNG bytes were
          // spent — a plain refresh (clearing any older output) is correct.
          updateEntropyLabControls();
          if (entropyMixStatus) {
            entropyMixStatus.textContent = error.message;
          }
          return;
        }
        // Refresh first (meter, CSPRNG status, and the undo/mix buttons'
        // disabled state must reflect the CSPRNG bytes mix() just spent
        // immediately, not only after some later action — a review finding
        // on the previous round caught this going stale), with
        // preserveOutput so this refresh's default output-clearing doesn't
        // wipe the result being displayed on the next two lines.
        updateEntropyLabControls({ preserveOutput: true });
        setEntropyMixOutput(mixed);
        retainPendingSeedForgeMix(mixed, targetBits);
        if (entropyMixStatus) {
          var strength = entropyLab.strengthSummary(entropySession, targetBits);
          var securityText = strength.fullTwoSourceProtection
            ? ' Full two-source protection: independent-source fallback is ~' + strength.fallbackBits + ' bits.'
            : (strength.fallbackBits === 0
              ? ' CSPRNG-only security: independent-source fallback is 0 bits.'
              : ' Normal output strength is ' + targetBits + ' bits if the device RNG is sound; independent-source fallback is ~' + strength.fallbackBits + ' bits, not full two-source protection.');
          entropyMixStatus.textContent = 'Mixed ' + targetBits + ' bits.' + securityText + ' The exact result is ready: use it once in Seed Forge below.';
        }
      });
    }

    if (entropyMixUseSeedForgeButton) {
      entropyMixUseSeedForgeButton.addEventListener('click', function () {
        if (!pendingSeedForgeMix) {
          return;
        }
        generateSeedPhrase(pendingSeedForgeMix, true);
      });
    }

    updateEntropyLabControls();
  }

  // --- Seed Forge (P1.3) ---------------------------------------------------
  //
  // Everything in this section stays in the cold document. The only input
  // from Entropy Lab is the byte array returned by mix(); no mnemonic,
  // passphrase, derived seed, or fingerprint is sent to the warm shell.

  function setSeedForgeStatus(state, text) {
    if (seedForgePanel) {
      seedForgePanel.setAttribute('data-state', state);
    }
    if (seedForgeStatus) {
      seedForgeStatus.setAttribute('data-state', state);
      seedForgeStatus.textContent = text;
    }
  }

  function setSeedForgePassphraseError(output, text) {
    if (!output) {
      return;
    }
    output.textContent = text || '';
    output.hidden = !text;
  }

  function seedForgePassphrasePairValid(passphraseInput, confirmationInput, errorOutput) {
    var passphrase = passphraseInput ? passphraseInput.value : '';
    var confirmation = confirmationInput ? confirmationInput.value : '';
    if (passphrase !== confirmation) {
      setSeedForgePassphraseError(errorOutput, 'Passphrases do not match. Nothing will be derived for this workflow until they are identical.');
      return false;
    }
    setSeedForgePassphraseError(errorOutput, '');
    return true;
  }

  function generatedPassphrasePairValid() {
    return seedForgePassphrasePairValid(
      seedForgeGeneratedPassphrase,
      seedForgeGeneratedPassphraseConfirm,
      seedForgeGeneratedPassphraseError
    );
  }

  function validationPassphrasePairValid() {
    return seedForgePassphrasePairValid(
      seedForgeValidationPassphrase,
      seedForgeValidationPassphraseConfirm,
      seedForgeValidationPassphraseError
    );
  }

  function seedForgeTargetBits() {
    var targetBits = Number(seedForgeTarget && seedForgeTarget.value);
    if (!entropyLab || !entropyLab.isValidTargetBits || !entropyLab.isValidTargetBits(targetBits)) {
      throw new Error('Seed Forge target size is unavailable; refusing to generate.');
    }
    return targetBits;
  }

  function seedForgeMarginalAcknowledged() {
    return !entropyHealthPanel
      || entropyHealthPanel.getAttribute('data-state') !== 'marginal'
      || Boolean(seedForgeMarginalAck && seedForgeMarginalAck.checked);
  }

  function updateSeedForgeMarginalControl(ready) {
    if (!seedForgeMarginalWrap) {
      return;
    }
    var marginal = Boolean(
      entropyHealthPanel
      && entropyHealthPanel.getAttribute('data-state') === 'marginal'
    );
    seedForgeMarginalWrap.hidden = !marginal;
    if (seedForgeMarginalAck) {
      seedForgeMarginalAck.disabled = !ready || !marginal;
      if (!marginal) {
        seedForgeMarginalAck.checked = false;
      }
    }
  }

  function updateSeedForgeControls() {
    if (!seedForge) {
      return;
    }
    var ready = Boolean(seedForgePanel && vaultCryptoReady && entropyLab && entropySession);
    if (seedForgePanel) {
      seedForgePanel.setAttribute('data-state', ready ? 'ready' : 'locked');
    }
    var controls = [
      seedForgeLanguage,
      seedForgeTarget,
      seedForgeGenerateButton,
      seedForgeGeneratedPassphrase,
      seedForgeGeneratedPassphraseConfirm,
      seedForgeMnemonicInput,
      seedForgeValidationPassphrase,
      seedForgeValidationPassphraseConfirm,
      seedForgeValidateButton
    ];
    controls.forEach(function (control) {
      if (control) {
        control.disabled = !ready;
      }
    });
    if (seedForgeRevealButton) {
      seedForgeRevealButton.disabled = !ready || !generatedMnemonic;
    }
    if (entropyMixUseSeedForgeButton) {
      entropyMixUseSeedForgeButton.disabled = !ready || !pendingSeedForgeMix;
    }
    if (seedForgeGeneratedSeedReveal) {
      seedForgeGeneratedSeedReveal.disabled = !ready || !generatedSeedBytes;
    }
    if (seedForgeValidationSeedReveal) {
      seedForgeValidationSeedReveal.disabled = !ready || !validationSeedBytes;
    }
    if (seedForgeTarget && entropyTargetSelect && seedForgeTarget.value !== entropyTargetSelect.value) {
      seedForgeTarget.value = entropyTargetSelect.value;
    }
    updateSeedForgeMarginalControl(ready);
  }

  function setFingerprintOutput(output, value) {
    if (output) {
      output.textContent = value || 'Not calculated';
    }
  }

  function remaskGeneratedPhrase() {
    generatedRevealed = false;
    if (generatedRevealTimer !== null) {
      window.clearTimeout(generatedRevealTimer);
      generatedRevealTimer = null;
    }
    if (seedForgeGeneratedWords) {
      var maskedValues = seedForgeGeneratedWords.querySelectorAll('.cold-seed-forge-word-value');
      for (var index = 0; index < maskedValues.length; index += 1) {
        maskedValues[index].textContent = '••••••';
      }
    }
    if (seedForgeRevealButton) {
      seedForgeRevealButton.textContent = 'Reveal for 30 seconds';
    }
  }

  function revealGeneratedPhrase() {
    if (!generatedMnemonic || !seedForge) {
      return;
    }
    if (generatedRevealTimer !== null) {
      window.clearTimeout(generatedRevealTimer);
      generatedRevealTimer = null;
    }
    var words = seedForge.splitMnemonic(generatedMnemonic);
    var values = seedForgeGeneratedWords
      ? seedForgeGeneratedWords.querySelectorAll('.cold-seed-forge-word-value')
      : [];
    for (var index = 0; index < values.length; index += 1) {
      values[index].textContent = words[index] || '••••••';
    }
    generatedRevealed = true;
    if (seedForgeRevealButton) {
      seedForgeRevealButton.textContent = 'Hide now';
    }
    generatedRevealTimer = window.setTimeout(remaskGeneratedPhrase, 30000);
  }

  function renderGeneratedPhrase(mnemonic) {
    if (!seedForgeGeneratedWords || !seedForge) {
      return;
    }
    remaskGeneratedPhrase();
    seedForgeGeneratedWords.textContent = '';
    var words = seedForge.splitMnemonic(mnemonic);
    for (var index = 0; index < words.length; index += 1) {
      var item = document.createElement('li');
      var value = document.createElement('span');
      value.className = 'cold-seed-forge-word-value';
      value.textContent = '••••••';
      item.appendChild(value);
      seedForgeGeneratedWords.appendChild(item);
    }
    if (seedForgeGenerated) {
      seedForgeGenerated.hidden = false;
    }
  }

  function remaskGeneratedSeed() {
    generatedSeedRevealed = false;
    if (generatedSeedRevealTimer !== null) {
      window.clearTimeout(generatedSeedRevealTimer);
      generatedSeedRevealTimer = null;
    }
    if (seedForgeGeneratedSeed) {
      seedForgeGeneratedSeed.textContent = generatedSeedBytes ? 'Masked (64 bytes)' : 'Not calculated';
    }
    if (seedForgeGeneratedSeedReveal) {
      seedForgeGeneratedSeedReveal.textContent = 'Reveal raw seed for 30 seconds';
    }
  }

  function clearGeneratedSeed() {
    zeroBytes(generatedSeedBytes);
    generatedSeedBytes = null;
    remaskGeneratedSeed();
    if (seedForgeGeneratedRaw) {
      seedForgeGeneratedRaw.hidden = true;
    }
    if (seedForgeGeneratedSeedReveal) {
      seedForgeGeneratedSeedReveal.disabled = true;
    }
  }

  function replaceGeneratedSeed(bytes) {
    clearGeneratedSeed();
    generatedSeedBytes = new Uint8Array(bytes);
    if (seedForgeGeneratedRaw) {
      seedForgeGeneratedRaw.hidden = false;
    }
    remaskGeneratedSeed();
  }

  function revealGeneratedSeed() {
    if (!generatedSeedBytes || !seedForgeGeneratedSeed) {
      return;
    }
    if (generatedSeedRevealTimer !== null) {
      window.clearTimeout(generatedSeedRevealTimer);
      generatedSeedRevealTimer = null;
    }
    seedForgeGeneratedSeed.textContent = bytesToHex(generatedSeedBytes);
    generatedSeedRevealed = true;
    if (seedForgeGeneratedSeedReveal) {
      seedForgeGeneratedSeedReveal.textContent = 'Hide now';
    }
    generatedSeedRevealTimer = window.setTimeout(remaskGeneratedSeed, 30000);
  }

  function remaskValidationSeed() {
    validationSeedRevealed = false;
    if (validationSeedRevealTimer !== null) {
      window.clearTimeout(validationSeedRevealTimer);
      validationSeedRevealTimer = null;
    }
    if (seedForgeValidationSeed) {
      seedForgeValidationSeed.textContent = validationSeedBytes ? 'Masked (64 bytes)' : 'Not calculated';
    }
    if (seedForgeValidationSeedReveal) {
      seedForgeValidationSeedReveal.textContent = 'Reveal raw seed for 30 seconds';
    }
  }

  function clearValidationSeed() {
    zeroBytes(validationSeedBytes);
    validationSeedBytes = null;
    remaskValidationSeed();
    if (seedForgeValidationRaw) {
      seedForgeValidationRaw.hidden = true;
    }
    if (seedForgeValidationSeedReveal) {
      seedForgeValidationSeedReveal.disabled = true;
    }
  }

  function replaceValidationSeed(bytes) {
    clearValidationSeed();
    validationSeedBytes = new Uint8Array(bytes);
    if (seedForgeValidationRaw) {
      seedForgeValidationRaw.hidden = false;
    }
    remaskValidationSeed();
  }

  function revealValidationSeed() {
    if (!validationSeedBytes || !seedForgeValidationSeed) {
      return;
    }
    if (validationSeedRevealTimer !== null) {
      window.clearTimeout(validationSeedRevealTimer);
      validationSeedRevealTimer = null;
    }
    seedForgeValidationSeed.textContent = bytesToHex(validationSeedBytes);
    validationSeedRevealed = true;
    if (seedForgeValidationSeedReveal) {
      seedForgeValidationSeedReveal.textContent = 'Hide now';
    }
    validationSeedRevealTimer = window.setTimeout(remaskValidationSeed, 30000);
  }

  function refreshGeneratedDerivation() {
    if (!seedForge) {
      return false;
    }
    if (!generatedMnemonic) {
      clearGeneratedSeed();
      setFingerprintOutput(seedForgeGeneratedFingerprint, 'Not calculated');
      return true;
    }
    if (!generatedPassphrasePairValid()) {
      clearGeneratedSeed();
      setFingerprintOutput(seedForgeGeneratedFingerprint, 'Not calculated');
      return false;
    }

    var passphrase = seedForgeGeneratedPassphrase ? seedForgeGeneratedPassphrase.value : '';
    try {
      var generatedDerived = seedForge.deriveMnemonic(generatedMnemonic, passphrase, generatedLanguage);
      try {
        replaceGeneratedSeed(generatedDerived.seed);
      } finally {
        zeroBytes(generatedDerived.seed);
      }
      setFingerprintOutput(seedForgeGeneratedFingerprint, generatedDerived.fingerprint);
      return true;
    } catch (error) {
      clearGeneratedSeed();
      setFingerprintOutput(seedForgeGeneratedFingerprint, 'Not calculated');
      setSeedForgeStatus('error', 'Generated seed derivation failed closed: ' + error.message);
      return false;
    } finally {
      passphrase = '';
    }
  }

  function refreshValidationDerivation() {
    if (!seedForge) {
      return false;
    }
    var language = seedForgeLanguage ? seedForgeLanguage.value : 'english';
    var phrase = validationPhraseText || validationPhraseFromFields();
    var validation = phrase ? seedForge.validateMnemonic(phrase, language) : null;
    if (!validation || !validation.valid) {
      clearValidationSeed();
      setFingerprintOutput(seedForgeValidationFingerprint, 'Not calculated');
      return true;
    }
    if (!validationPassphrasePairValid()) {
      clearValidationSeed();
      setFingerprintOutput(seedForgeValidationFingerprint, 'Not calculated');
      return false;
    }

    var passphrase = seedForgeValidationPassphrase ? seedForgeValidationPassphrase.value : '';
    try {
      var validationDerived = seedForge.deriveMnemonic(phrase, passphrase, language);
      try {
        replaceValidationSeed(validationDerived.seed);
      } finally {
        zeroBytes(validationDerived.seed);
      }
      setFingerprintOutput(seedForgeValidationFingerprint, validationDerived.fingerprint);
      return true;
    } catch (error) {
      clearValidationSeed();
      setFingerprintOutput(seedForgeValidationFingerprint, 'Not calculated');
      setSeedForgeStatus('error', 'Validation seed derivation failed closed: ' + error.message);
      return false;
    } finally {
      passphrase = '';
    }
  }

  function refreshGeneratedDerivationAndControls() {
    var valid = refreshGeneratedDerivation();
    updateSeedForgeControls();
    return valid;
  }

  function refreshValidationDerivationAndControls() {
    var valid = refreshValidationDerivation();
    updateSeedForgeControls();
    return valid;
  }

  var validationPhraseText = '';

  function validationPhraseFromFields() {
    return seedForgeWordInputs.map(function (input) { return input.value; }).join(' ').trim();
  }

  function populateValidationFields(mnemonic) {
    if (!seedForge || seedForgeWordInputs.length === 0) {
      return;
    }
    var words = seedForge.splitMnemonic(mnemonic);
    for (var index = 0; index < seedForgeWordInputs.length; index += 1) {
      seedForgeWordInputs[index].value = words[index] || '';
    }
  }

  function setValidationWordState(index, state, text) {
    var input = seedForgeWordInputs[index];
    if (!input || !input.parentElement) {
      return;
    }
    input.parentElement.setAttribute('data-state', state || 'empty');
    var status = input.parentElement.querySelector('.cold-seed-forge-word-status');
    if (status) {
      status.textContent = text;
    }
  }

  function updateValidationStatus() {
    if (!seedForge || !seedForgeValidationStatus) {
      return false;
    }
    var language = seedForgeLanguage ? seedForgeLanguage.value : 'english';
    var phrase = validationPhraseText || validationPhraseFromFields();
    validationPhraseText = phrase;
    if (!phrase) {
      seedForgeValidationStatus.setAttribute('data-state', 'empty');
      seedForgeValidationStatus.textContent = 'No phrase entered.';
      for (var emptyIndex = 0; emptyIndex < seedForgeWordInputs.length; emptyIndex += 1) {
        setValidationWordState(emptyIndex, 'empty', 'Empty');
      }
      refreshValidationDerivationAndControls();
      return false;
    }

    var validation;
    try {
      validation = seedForge.validateMnemonic(phrase, language);
    } catch (error) {
      seedForgeValidationStatus.setAttribute('data-state', 'invalid');
      seedForgeValidationStatus.textContent = 'Validation failed closed: ' + error.message;
      refreshValidationDerivationAndControls();
      return false;
    }

    for (var index = 0; index < seedForgeWordInputs.length; index += 1) {
      var entry = validation.words[index];
      if (!entry) {
        setValidationWordState(index, 'empty', 'Empty');
      } else if (entry.state === 'unknown') {
        setValidationWordState(index, 'unknown', 'Unknown word');
      } else if (entry.state === 'valid') {
        setValidationWordState(index, 'valid', 'Word and checksum valid');
      } else if (validation.reason === 'checksum') {
        setValidationWordState(index, 'checksum', 'Known word; checksum mismatch');
      } else {
        setValidationWordState(index, 'known', 'Known word');
      }
    }

    seedForgeValidationStatus.setAttribute('data-state', validation.valid ? 'valid' : 'invalid');
    if (validation.valid) {
      seedForgeValidationStatus.textContent = 'Valid ' + validation.words.length + '-word BIP-39 phrase.';
      refreshValidationDerivationAndControls();
      return true;
    }

    if (validation.reason === 'unknown-word') {
      seedForgeValidationStatus.textContent = 'At least one word is not in the selected ' + language + ' wordlist.';
    } else if (validation.reason === 'checksum') {
      seedForgeValidationStatus.textContent = 'All words are known, but the BIP-39 checksum does not match.';
    } else {
      seedForgeValidationStatus.textContent = 'BIP-39 needs 12, 15, 18, 21, or 24 words; received ' + validation.words.length + '.';
    }
    refreshValidationDerivationAndControls();
    return false;
  }

  function clearSeedForgeSession() {
    clearPendingSeedForgeMix();
    setEntropyMixOutput(null);
    generatedMnemonic = '';
    generatedLanguage = 'english';
    remaskGeneratedPhrase();
    if (seedForgeGenerated) {
      seedForgeGenerated.hidden = true;
    }
    clearGeneratedSeed();
    setFingerprintOutput(seedForgeGeneratedFingerprint, 'Not calculated');
    validationPhraseText = '';
    if (seedForgeMnemonicInput) {
      seedForgeMnemonicInput.value = '';
    }
    for (var index = 0; index < seedForgeWordInputs.length; index += 1) {
      seedForgeWordInputs[index].value = '';
      setValidationWordState(index, 'empty', 'Empty');
    }
    clearValidationSeed();
    setFingerprintOutput(seedForgeValidationFingerprint, 'Not calculated');
    if (seedForgeValidationStatus) {
      seedForgeValidationStatus.setAttribute('data-state', 'empty');
      seedForgeValidationStatus.textContent = 'No phrase entered.';
    }
    if (seedForgeMarginalAck) {
      seedForgeMarginalAck.checked = false;
    }
    setSeedForgePassphraseError(seedForgeGeneratedPassphraseError, '');
    if (seedForgeGeneratedPassphrase) {
      seedForgeGeneratedPassphrase.value = '';
    }
    if (seedForgeGeneratedPassphraseConfirm) {
      seedForgeGeneratedPassphraseConfirm.value = '';
    }
    setSeedForgePassphraseError(seedForgeValidationPassphraseError, '');
    if (seedForgeValidationPassphrase) {
      seedForgeValidationPassphrase.value = '';
    }
    if (seedForgeValidationPassphraseConfirm) {
      seedForgeValidationPassphraseConfirm.value = '';
    }
  }

  function ensureSeedForgeCsprng(targetBits) {
    var targetBytes = targetBits / 8;
    var sourceBytes = entropyLab.sourceEntropyBytes(entropySession);
    var needed = sourceBytes.length === 0
      ? targetBytes
      : Math.max(targetBytes, sourceBytes.length);
    var available = entropyLab.availableCsprngBytes(entropySession).length;
    if (available >= needed) {
      return;
    }
    if (!cryptoLayer || typeof cryptoLayer.randomBytes !== 'function') {
      throw new Error('crypto.getRandomValues is unavailable; refusing to generate a seed phrase.');
    }
    var fresh = cryptoLayer.randomBytes(needed - available);
    try {
      entropyLab.addCsprngBytes(entropySession, fresh);
    } finally {
      zeroBytes(fresh);
    }
  }

  function generateSeedPhrase(explicitMixed, consumePendingMix) {
    if (!seedForge || !vaultCryptoReady || !entropySession) {
      setSeedForgeStatus('error', 'Seed Forge is locked because the cold-realm health checks have not passed.');
      return;
    }
    if (!generatedPassphrasePairValid()) {
      setSeedForgeStatus('error', 'Confirm the Generate passphrase before generating.');
      return;
    }
    if (!seedForgeMarginalAcknowledged()) {
      setSeedForgeStatus('error', 'Generation paused: review the marginal Entropy Health warning and acknowledge it before continuing.');
      return;
    }
    var targetBits;
    var mixed = null;
    var language = seedForgeLanguage ? seedForgeLanguage.value : 'english';
    var usingPendingMix = Boolean(explicitMixed);
    try {
      targetBits = seedForgeTargetBits();
      if (usingPendingMix) {
        if (!pendingSeedForgeMix
          || pendingSeedForgeMixTargetBits !== targetBits
          || explicitMixed !== pendingSeedForgeMix
          || explicitMixed.length !== targetBits / 8) {
          throw new Error('The mixed bytes no longer match the selected Seed Forge size; refusing to reuse them. Mix again.');
        }
        setSeedForgeStatus('pending', 'Using the exact mixed bytes from Entropy Lab once inside the sealed realm...');
        mixed = new Uint8Array(explicitMixed);
      } else {
        setSeedForgeStatus('pending', 'Preparing fresh CSPRNG bytes and mixing entropy inside the sealed realm...');
        ensureSeedForgeCsprng(targetBits);
        mixed = entropyLab.mix(entropySession, targetBits);
      }
      generatedLanguage = language;
      generatedMnemonic = seedForge.entropyToMnemonic(mixed, language);
      renderGeneratedPhrase(generatedMnemonic);
      if (!refreshGeneratedDerivationAndControls()) {
        throw new Error('Seed derivation did not complete; refusing to finish generation.');
      }
      setSeedForgeStatus('ready', 'Generated a ' + seedForge.splitMnemonic(generatedMnemonic).length + '-word BIP-39 phrase. Verify the written backup before trusting it.');
      if (usingPendingMix && consumePendingMix) {
        clearPendingSeedForgeMix();
      }
      updateEntropyLabControls({ preserveOutput: usingPendingMix && !consumePendingMix });
    } catch (error) {
      setSeedForgeStatus('error', 'Seed generation failed closed: ' + error.message);
      updateEntropyLabControls({ preserveOutput: usingPendingMix });
    } finally {
      zeroBytes(mixed);
    }
  }

  function wireSeedForge() {
    if (!seedForge) {
      return;
    }
    if (seedForgeLanguage) {
      seedForgeLanguage.textContent = '';
      seedForge.languages.forEach(function (language) {
        var option = document.createElement('option');
        option.value = language.id;
        option.textContent = language.label;
        seedForgeLanguage.appendChild(option);
      });
      seedForgeLanguage.value = 'english';
    }
    if (seedForgeWordFields) {
      seedForgeWordFields.textContent = '';
      for (var index = 0; index < 24; index += 1) {
        var field = document.createElement('div');
        field.className = 'cold-seed-forge-word-field';
        field.setAttribute('data-state', 'empty');
        var label = document.createElement('label');
        label.textContent = 'Word ' + String(index + 1);
        var input = document.createElement('input');
        input.type = 'password';
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.setAttribute('autocorrect', 'off');
        input.setAttribute('autocapitalize', 'off');
        input.setAttribute('aria-label', 'Seed word ' + String(index + 1));
        input.disabled = true;
        var status = document.createElement('span');
        status.className = 'cold-seed-forge-word-status';
        status.textContent = 'Empty';
        field.appendChild(label);
        field.appendChild(input);
        field.appendChild(status);
        seedForgeWordFields.appendChild(field);
        seedForgeWordInputs.push(input);
        input.addEventListener('input', function () {
          validationPhraseText = validationPhraseFromFields();
          if (seedForgeMnemonicInput) {
            seedForgeMnemonicInput.value = validationPhraseText;
          }
          updateValidationStatus();
        });
      }
    }
    if (seedForgeTarget) {
      seedForgeTarget.addEventListener('change', function () {
        if (entropyTargetSelect) {
          entropyTargetSelect.value = seedForgeTarget.value;
        }
        updateEntropyLabControls();
      });
    }
    if (seedForgeLanguage) {
      seedForgeLanguage.addEventListener('change', function () {
        updateValidationStatus();
      });
    }
    if (seedForgeGenerateButton) {
      seedForgeGenerateButton.addEventListener('click', function () {
        generateSeedPhrase();
      });
    }
    if (seedForgeRevealButton) {
      seedForgeRevealButton.addEventListener('click', function () {
        if (generatedRevealed) {
          remaskGeneratedPhrase();
        } else {
          revealGeneratedPhrase();
        }
      });
    }
    if (seedForgeGeneratedSeedReveal) {
      seedForgeGeneratedSeedReveal.addEventListener('click', function () {
        if (generatedSeedRevealed) {
          remaskGeneratedSeed();
        } else {
          revealGeneratedSeed();
        }
      });
    }
    if (seedForgeValidationSeedReveal) {
      seedForgeValidationSeedReveal.addEventListener('click', function () {
        if (validationSeedRevealed) {
          remaskValidationSeed();
        } else {
          revealValidationSeed();
        }
      });
    }
    if (seedForgeGeneratedPassphrase) {
      seedForgeGeneratedPassphrase.addEventListener('input', function () {
        generatedPassphrasePairValid();
        refreshGeneratedDerivationAndControls();
      });
    }
    if (seedForgeGeneratedPassphraseConfirm) {
      seedForgeGeneratedPassphraseConfirm.addEventListener('input', function () {
        generatedPassphrasePairValid();
        refreshGeneratedDerivationAndControls();
      });
    }
    if (seedForgeValidationPassphrase) {
      seedForgeValidationPassphrase.addEventListener('input', function () {
        validationPassphrasePairValid();
        refreshValidationDerivationAndControls();
      });
    }
    if (seedForgeValidationPassphraseConfirm) {
      seedForgeValidationPassphraseConfirm.addEventListener('input', function () {
        validationPassphrasePairValid();
        refreshValidationDerivationAndControls();
      });
    }
    if (seedForgeMnemonicInput) {
      seedForgeMnemonicInput.addEventListener('input', function () {
        validationPhraseText = seedForgeMnemonicInput.value;
        populateValidationFields(validationPhraseText);
        updateValidationStatus();
      });
    }
    if (seedForgeValidateButton) {
      seedForgeValidateButton.addEventListener('click', function () {
        updateValidationStatus();
      });
    }
    updateSeedForgeControls();
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

  function setCreateConfirmationError(text) {
    if (!passphraseConfirmError) {
      return;
    }
    passphraseConfirmError.textContent = text || '';
    passphraseConfirmError.hidden = !text;
  }

  // Human-chosen text has no trustworthy numeric entropy estimate. This
  // creation-only surface stays hidden during ordinary unlock and gives the
  // user the conservative range/limitation guidance from the reference docs.
  function updateVaultPassphraseHealth() {
    if (!passphraseHealthPanel) {
      return;
    }
    var creationActive = createPrepared && !vaultUnlocked;
    passphraseHealthPanel.hidden = !creationActive;
    passphraseHealthPanel.setAttribute('data-mode', creationActive ? 'creation' : 'unlock');
    if (!creationActive) {
      passphraseHealthPanel.setAttribute('data-state', 'not-applicable');
      return;
    }
    var entered = Boolean(passphraseInput && passphraseInput.value.length > 0);
    passphraseHealthPanel.setAttribute('data-state', entered ? 'entered' : 'empty');
    if (passphraseHealthState) {
      passphraseHealthState.textContent = entered
        ? 'Unknown range — no numeric estimate'
        : 'Not estimated yet';
    }
    if (passphraseHealthCopy) {
      passphraseHealthCopy.textContent = entered
        ? 'Human-chosen text has an unknown entropy range; spelling and length cannot establish a numeric score. Use six Diceware words or more for a new vault.'
        : 'Enter a new phrase to see this guidance. Human-chosen text has an unknown entropy range; the sealed realm does not invent a numeric score from spelling or length. Use six Diceware words or more for a new vault.';
    }
  }

  function vaultControlsReady() {
    return vaultCryptoReady && handshakeState === 'ready' && messagePort !== null;
  }

  function updateVaultControls() {
    var ready = vaultControlsReady();
    if (passphraseInput) {
      passphraseInput.disabled = !ready;
    }
    if (passphraseConfirmWrap) {
      passphraseConfirmWrap.hidden = !createPrepared;
    }
    if (passphraseConfirmInput) {
      passphraseConfirmInput.disabled = !ready || vaultBusy || vaultUnlocked || !createPrepared;
    }
    if (createVaultButton) {
      createVaultButton.disabled = !ready || vaultBusy || vaultUnlocked || !createPrepared;
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
    updateVaultPassphraseHealth();
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

  function clearCreatePreparation() {
    createPrepared = false;
    if (passphraseConfirmInput) {
      passphraseConfirmInput.value = '';
    }
    setCreateConfirmationError('');
    if (passphraseConfirmWrap) {
      passphraseConfirmWrap.hidden = true;
    }
    if (passphraseHealthPanel) {
      passphraseHealthPanel.hidden = true;
      passphraseHealthPanel.setAttribute('data-mode', 'unlock');
      passphraseHealthPanel.setAttribute('data-state', 'not-applicable');
    }
  }

  function generateVaultUuid() {
    if (!cryptoLayer || typeof cryptoLayer.randomBytes !== 'function') {
      throw new Error('Secure randomness is unavailable.');
    }
    var bytes = cryptoLayer.randomBytes(16);
    try {
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      var hex = Array.prototype.map.call(bytes, function (value) {
        return value.toString(16).padStart(2, '0');
      }).join('');
      return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-'
        + hex.slice(16, 20) + '-' + hex.slice(20);
    } finally {
      zeroBytes(bytes);
    }
  }

  function clearVaultSession(clearPending) {
    clearSeedForgeSession();
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
    clearCreatePreparation();
    // F2 remediation: route through the same coherent reset path the user-
    // facing "clear" action uses, so lock/session teardown never leaves the
    // file input value or visible "loaded" status stale relative to the
    // now-zeroed keyfileBytes.
    clearKeyfileSelection();
    pendingConcealmentRevealId = null;
    if (concealmentControls) {
      concealmentControls.hidden = true;
    }
    if (concealmentPassphrase) {
      concealmentPassphrase.value = '';
    }
    if (concealmentStatus) {
      concealmentStatus.textContent = '';
    }
    clearSecretNoteReveals();
    if (secretNoteTitle) {
      secretNoteTitle.value = '';
    }
    if (secretNoteBody) {
      secretNoteBody.value = '';
    }
    if (secretNoteTags) {
      secretNoteTags.value = '';
    }
    if (secretNoteSearch) {
      secretNoteSearch.value = '';
    }
    if (secretNoteList) {
      secretNoteList.textContent = '';
    }
    if (secretNotesPanel) {
      secretNotesPanel.hidden = true;
    }
    setSessionEvidence('locked');
    updateVaultControls();
  }

  function requestHiddenRecordReveal(id) {
    if (!vaultUnlocked || !currentVaultBytes || !currentVaultSession) {
      sendVaultError(id, 'vault-locked');
      return;
    }
    pendingConcealmentRevealId = id;
    if (concealmentControls) {
      concealmentControls.hidden = false;
    }
    if (concealmentStatus) {
      concealmentStatus.textContent = 'Re-enter the vault phrase to continue.';
    }
    if (concealmentPassphrase) {
      concealmentPassphrase.value = '';
      concealmentPassphrase.focus();
    }
  }

  function completeHiddenRecordReveal() {
    if (!pendingConcealmentRevealId || !currentVaultBytes || !vaultLayer
      || typeof vaultLayer.openSession !== 'function') {
      return;
    }
    var id = pendingConcealmentRevealId;
    var phrase = concealmentPassphrase ? concealmentPassphrase.value : '';
    if (!phrase) {
      if (concealmentStatus) {
        concealmentStatus.textContent = 'Enter the vault phrase first.';
      }
      return;
    }
    if (concealmentRevealButton) {
      concealmentRevealButton.disabled = true;
    }
    vaultLayer.openSession(
      currentVaultBytes,
      phrase,
      onlineMode ? 'online' : 'offline',
      keyfileBytes
    ).then(function (reauthenticatedSession) {
      if (reauthenticatedSession && typeof reauthenticatedSession.close === 'function') {
        reauthenticatedSession.close();
      }
      phrase = '';
      if (concealmentPassphrase) {
        concealmentPassphrase.value = '';
      }
      pendingConcealmentRevealId = null;
      if (concealmentControls) {
        concealmentControls.hidden = true;
      }
      if (!postVaultMessage(id, 'concealment.revealed', { revealed: true })) {
        lockVaultSession(null, 'Vault locked because the hidden-record reveal acknowledgement failed.', true);
      }
    }, function () {
      phrase = '';
      if (concealmentPassphrase) {
        concealmentPassphrase.value = '';
      }
      pendingConcealmentRevealId = null;
      if (concealmentStatus) {
        concealmentStatus.textContent = 'The vault phrase was not accepted. Hidden records remain concealed.';
      }
      postVaultMessage(id, 'concealment.revealed', { revealed: false });
    }).then(function () {
      if (concealmentRevealButton) {
        concealmentRevealButton.disabled = false;
      }
    }, function () {
      if (concealmentRevealButton) {
        concealmentRevealButton.disabled = false;
      }
    });
  }

  function clearSecretNoteReveals() {
    secretNoteRevealTimers.forEach(function (entry) {
      window.clearTimeout(entry.timer);
      entry.node.textContent = '••••••';
      entry.button.textContent = 'Reveal for 30 seconds';
    });
    secretNoteRevealTimers = [];
  }

  function renderSecretNotes() {
    if (!secretNotesPanel || !secretNoteList || !currentVaultSession
      || !vaultUnlocked || onlineMode || typeof currentVaultSession.getSecretData !== 'function') {
      if (secretNotesPanel) {
        secretNotesPanel.hidden = true;
      }
      return;
    }
    var data;
    try {
      data = currentVaultSession.getSecretData();
    } catch (error) {
      data = null;
    }
    if (!data || !Array.isArray(data.notes)) {
      secretNotesPanel.hidden = true;
      return;
    }
    secretNotesPanel.hidden = false;
    clearSecretNoteReveals();
    secretNoteList.textContent = '';
    var query = secretNoteSearch ? secretNoteSearch.value.trim().toLowerCase() : '';
    var notes = data.notes.filter(function (note) {
      return !query || JSON.stringify(note).toLowerCase().indexOf(query) !== -1;
    });
    if (notes.length === 0) {
      var empty = document.createElement('p');
      empty.textContent = query
        ? 'No secret notes match this search.'
        : 'No secret notes recorded in this vault.';
      secretNoteList.appendChild(empty);
      return;
    }
    notes.forEach(function (note) {
      var card = document.createElement('article');
      card.className = 'cold-secret-note-card';
      var title = document.createElement('h3');
      title.textContent = note.title;
      card.appendChild(title);
      var body = document.createElement('p');
      body.textContent = '••••••';
      card.appendChild(body);
      var reveal = document.createElement('button');
      reveal.type = 'button';
      reveal.textContent = 'Reveal for 30 seconds';
      reveal.addEventListener('click', function () {
        body.textContent = note.body;
        reveal.textContent = 'Secret visible';
        var timer = window.setTimeout(function () {
          body.textContent = '••••••';
          reveal.textContent = 'Reveal for 30 seconds';
        }, 30000);
        secretNoteRevealTimers.push({ node: body, button: reveal, timer: timer });
      });
      card.appendChild(reveal);
      if (Array.isArray(note.tags) && note.tags.length > 0) {
        var tags = document.createElement('p');
        tags.textContent = note.tags.map(function (tag) { return '#' + tag; }).join(' ');
        card.appendChild(tags);
      }
      secretNoteList.appendChild(card);
    });
  }

  function secretNoteTagsFromInput(value) {
    return value.split(',').map(function (item) {
      return item.trim().replace(/^#+/, '').toLowerCase();
    }).filter(function (tag, index, values) {
      return tag && tag.length <= 64 && /^[a-z0-9_:-]+$/.test(tag) && values.indexOf(tag) === index;
    });
  }

  function saveSecretNote(event) {
    event.preventDefault();
    if (!currentVaultSession || !vaultUnlocked || onlineMode
      || typeof currentVaultSession.getSecretData !== 'function'
      || typeof currentVaultSession.replaceSecretData !== 'function') {
      if (secretNoteList) {
        secretNoteList.textContent = 'Secret notes need an offline unlocked vault with a secret compartment.';
      }
      return;
    }
    var title = secretNoteTitle ? secretNoteTitle.value.trim() : '';
    var body = secretNoteBody ? secretNoteBody.value : '';
    if (!title || !body || title.length > 256 || body.length > 20000) {
      if (secretNoteList) {
        secretNoteList.textContent = 'Enter a title and body within the displayed limits.';
      }
      return;
    }
    var data;
    try {
      data = currentVaultSession.getSecretData() || {};
      data.notes = Array.isArray(data.notes) ? data.notes : [];
      data.notes.push({
        id: generateVaultUuid(),
        title: title,
        body: body,
        visibility: 'secret',
        tags: secretNoteTagsFromInput(secretNoteTags ? secretNoteTags.value : ''),
        hidden: false
      });
      currentVaultSession.replaceSecretData(data);
    } catch (error) {
      if (secretNoteList) {
        secretNoteList.textContent = 'The encrypted secret compartment could not be updated; nothing was saved.';
      }
      return;
    }
    if (secretNoteTitle) { secretNoteTitle.value = ''; }
    if (secretNoteBody) { secretNoteBody.value = ''; }
    if (secretNoteTags) { secretNoteTags.value = ''; }
    renderSecretNotes();
    if (!postVaultMessage(nextVaultMessageId('secret-note'), 'secretData.updated', { dirty: true })) {
      lockVaultSession(null, 'Vault locked because the secret-note acknowledgement failed.', true);
      return;
    }
    recordVaultActivity();
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
    if (!createPrepared) {
      setVaultStatus('locked', 'Choose a public vault name in the warm Vault page before creating a new vault.');
      return;
    }
    var passphrase = passphraseInput.value;
    var confirmation = passphraseConfirmInput ? passphraseConfirmInput.value : '';
    if (!passphrase) {
      setVaultStatus('locked', 'Enter a new unlock phrase in the sealed realm first.');
      passphraseInput.focus();
      return;
    }
    if (!confirmation) {
      setCreateConfirmationError('Enter the confirmation phrase before creating the vault.');
      setVaultStatus('pending', 'Confirm the new unlock phrase before creating the vault.');
      if (passphraseConfirmInput) { passphraseConfirmInput.focus(); }
      return;
    }
    if (passphrase !== confirmation) {
      setCreateConfirmationError('Unlock phrases do not match. Nothing was created.');
      setVaultStatus('pending', 'The two new unlock phrase entries do not match. Nothing was created.');
      if (passphraseConfirmInput) {
        passphraseConfirmInput.value = '';
        passphraseConfirmInput.focus();
      }
      return;
    }
    setCreateConfirmationError('');
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
    var createOptions;
    try {
      createOptions = {
        passphrase: passphrase,
        profile: 'fast',
        publicData: { id: generateVaultUuid() }
      };
    } catch (error) {
      passphrase = '';
      vaultBusy = false;
      updateVaultControls();
      setVaultStatus('locked', 'Vault creation failed because secure Vault ID generation was unavailable.');
      return;
    }
    if (!onlineMode) {
      createOptions.secretData = { notes: [] };
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
        clearCreatePreparation();
        setSessionEvidence('unlocked');
        setVaultStatus(
          'unlocked',
          onlineMode
            ? 'New public-only vault created in online mode.'
            : 'New encrypted vault created and unlocked.'
        );
        sendVaultOpened(nextVaultMessageId('created'), session.publicData);
        sendVaultStatus(false);
        renderSecretNotes();
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
      renderSecretNotes();
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
    if (message.type === 'vault.create.prepare') {
      if (vaultUnlocked || vaultBusy) {
        sendVaultError(message.id, 'operation-failed');
        return;
      }
      zeroBytes(pendingVaultBytes);
      pendingVaultBytes = null;
      pendingOpenId = null;
      createPrepared = true;
      setCreateConfirmationError('');
      if (passphraseConfirmInput) {
        passphraseConfirmInput.value = '';
      }
      setVaultStatus('pending', 'New vault prepared. Enter the new unlock phrase twice, then create it.');
      updateVaultControls();
      return;
    }
    if (message.type === 'vault.open') {
      clearCreatePreparation();
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
    if (message.type === 'publicData.replace') {
      if (!vaultUnlocked || !currentVaultSession
        || typeof currentVaultSession.replacePublicData !== 'function') {
        sendVaultError(message.id, 'vault-locked');
        return;
      }
      try {
        var updatedPublicData = currentVaultSession.replacePublicData(
          message.payload.publicCompartment
        );
        if (!postVaultMessage(message.id, 'publicData.updated', {
          publicCompartment: updatedPublicData
        })) {
          lockVaultSession(null, 'Vault locked because the public registry acknowledgement failed.', true);
          return;
        }
        recordVaultActivity();
      } catch (error) {
        sendVaultError(message.id, 'operation-failed');
      }
      return;
    }
    if (message.type === 'concealment.reveal') {
      requestHiddenRecordReveal(message.id);
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

  if (!readyMarker || !window.parent || !protocol || !airgap || !capabilities || !cryptoLayer || !vaultLayer || !entropyLab || !seedForge || !derivation) {
    return;
  }

  if (benchmarkButton) {
    benchmarkButton.addEventListener('click', runBenchmark);
  }
  if (createVaultButton) {
    createVaultButton.addEventListener('click', createEmptyVault);
  }
  if (passphraseInput) {
    passphraseInput.addEventListener('input', function () {
      setCreateConfirmationError('');
      updateVaultPassphraseHealth();
    });
  }
  if (passphraseConfirmInput) {
    passphraseConfirmInput.addEventListener('input', function () { setCreateConfirmationError(''); });
  }
  if (unlockVaultButton) {
    unlockVaultButton.addEventListener('click', unlockLoadedVault);
  }
  if (lockVaultButton) {
    lockVaultButton.addEventListener('click', function () {
      if (vaultUnlocked) {
        var requestId = nextVaultMessageId('lock-request');
        if (postVaultMessage(requestId, 'vault.lockRequest', {})) {
          setVaultStatus('unlocked', 'Lock requested. If this vault is unsaved or unverified, confirm the warning in the warm Vault page.');
        } else {
          setVaultStatus('unlocked', 'Lock request could not reach the warm shell. The vault remains unlocked.');
        }
        return;
      }
      lockVaultSession(nextVaultMessageId('local-clear'), 'Pending vault bytes cleared locally.', true);
    });
  }
  if (concealmentRevealButton) {
    concealmentRevealButton.addEventListener('click', completeHiddenRecordReveal);
  }
  if (secretNoteSaveButton) {
    secretNoteSaveButton.addEventListener('click', saveSecretNote);
  }
  if (secretNoteSearch) {
    secretNoteSearch.addEventListener('input', renderSecretNotes);
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
  wireSeedForge();
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
