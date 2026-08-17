__COLDBOX_PROTOCOL__
__COLDBOX_AIRGAP__
__COLDBOX_CAPABILITIES__
__COLDBOX_QR_ENCODER__
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
  var seedXor = window.__coldboxSeedXor;
  var codex32 = window.__coldboxCodex32;
  var shamir = window.__coldboxShamir;
  var derivation = window.__coldboxDerivation;
  var addressVerification = window.__coldboxAddressVerification;
  var verification = window.__coldboxVerification;
  var qr = window.__coldboxQr;
  var slip39 = window.__coldboxSlip39;
  var readyMarker = document.getElementById('cold-ready');
  var protocolWarning = document.getElementById('cold-protocol-warning');
  var details = document.getElementById('cold-realm-details');
  var releasedSecretSwitcher = document.getElementById('cold-secret-switcher');
  var releasedSecretList = document.getElementById('cold-secret-list');
  var releasedSecretEmpty = document.getElementById('cold-secret-registry-empty');
  var releasedSecretSummary = document.getElementById('cold-secret-focus-summary');
  var releasedSecretClearButton = document.getElementById('cold-secret-registry-clear');
  var activeSecretPanel = document.getElementById('cold-active-secret');
  var activeSecretLabel = document.getElementById('cold-active-secret-label');
  var activeSecretIdentityLabel = document.getElementById('cold-active-secret-identity-label');
  var activeSecretFingerprint = document.getElementById('cold-active-secret-fingerprint');
  var activeSecretWordCount = document.getElementById('cold-active-secret-word-count');
  var activeSecretSummary = document.getElementById('cold-active-secret-summary');
  var activeSecretGrid = document.getElementById('cold-active-secret-grid');
  var activeSecretRevealButton = document.getElementById('cold-active-secret-reveal');
  var activeSecretRevealTimer = null;
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
  var vaultNameInput = document.getElementById('cold-vault-name');
  var vaultNameSaveButton = document.getElementById('cold-vault-name-save');
  var vaultKdfProfile = document.getElementById('cold-vault-kdf-profile');
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
  var vaultRecoveryStatus = document.getElementById('cold-vault-recovery-status');
  var vaultRecoveryPassphrase = document.getElementById('cold-vault-recovery-passphrase');
  var vaultRecoveryGroupThreshold = document.getElementById('cold-vault-recovery-group-threshold');
  var vaultRecoveryGroupCount = document.getElementById('cold-vault-recovery-group-count');
  var vaultRecoveryReplaceLabel = document.getElementById('cold-vault-recovery-replace-label');
  var vaultRecoveryReplace = document.getElementById('cold-vault-recovery-replace');
  var vaultRecoveryConfigureButton = document.getElementById('cold-vault-recovery-configure');
  var vaultRecoveryGenerated = document.getElementById('cold-vault-recovery-generated');
  var vaultRecoveryOutput = document.getElementById('cold-vault-recovery-output');
  var vaultRecoveryRevealButton = document.getElementById('cold-vault-recovery-reveal');
  var vaultRecoveryInput = document.getElementById('cold-vault-recovery-input');
  var vaultRecoveryUnlockButton = document.getElementById('cold-vault-recovery-unlock');
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
  var seedForgeGeneratedReleaseLabel = document.getElementById('cold-seed-forge-generated-release-label');
  var seedForgeGeneratedReleaseButton = document.getElementById('cold-seed-forge-generated-release');
  var seedForgeGeneratedReleaseStatus = document.getElementById('cold-seed-forge-generated-release-status');
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
  var seedForgeValidationReleaseLabel = document.getElementById('cold-seed-forge-validation-release-label');
  var seedForgeValidationReleaseButton = document.getElementById('cold-seed-forge-validation-release');
  var seedForgeValidationReleaseStatus = document.getElementById('cold-seed-forge-validation-release-status');
  var seedXorPanel = document.getElementById('cold-seed-xor');
  var seedXorLanguage = document.getElementById('cold-seed-xor-language');
  var seedXorCount = document.getElementById('cold-seed-xor-count');
  var seedXorMode = document.getElementById('cold-seed-xor-mode');
  var seedXorSplitButton = document.getElementById('cold-seed-xor-split');
  var seedXorSplitStatus = document.getElementById('cold-seed-xor-split-status');
  var seedXorGenerated = document.getElementById('cold-seed-xor-generated');
  var seedXorGeneratedParts = document.getElementById('cold-seed-xor-generated-parts');
  var seedXorRevealButton = document.getElementById('cold-seed-xor-reveal');
  var seedXorPartFields = document.getElementById('cold-seed-xor-part-fields');
  var seedXorCombineButton = document.getElementById('cold-seed-xor-combine');
  var seedXorCombineStatus = document.getElementById('cold-seed-xor-combine-status');
  var seedXorCombined = document.getElementById('cold-seed-xor-combined');
  var seedXorCombinedRevealButton = document.getElementById('cold-seed-xor-combined-reveal');
  var codex32Panel = document.getElementById('cold-codex32');
  var codex32Threshold = document.getElementById('cold-codex32-threshold');
  var codex32Count = document.getElementById('cold-codex32-count');
  var codex32Identifier = document.getElementById('cold-codex32-identifier');
  var codex32GenerateButton = document.getElementById('cold-codex32-generate');
  var codex32RevealButton = document.getElementById('cold-codex32-reveal');
  var codex32GenerateStatus = document.getElementById('cold-codex32-generate-status');
  var codex32Generated = document.getElementById('cold-codex32-generated');
  var codex32RecoveryInput = document.getElementById('cold-codex32-recovery-input');
  var codex32RecoverButton = document.getElementById('cold-codex32-recover');
  var codex32RecoveredRevealButton = document.getElementById('cold-codex32-recovered-reveal');
  var codex32Recovered = document.getElementById('cold-codex32-recovered');
  var codex32RecoveryStatus = document.getElementById('cold-codex32-recovery-status');
  var codex32CorrectionInput = document.getElementById('cold-codex32-correction-input');
  var codex32CorrectButton = document.getElementById('cold-codex32-correct');
  var codex32CorrectionOutput = document.getElementById('cold-codex32-correction-output');
  var codex32UseCorrectionButton = document.getElementById('cold-codex32-use-correction');
  var codex32CorrectionStatus = document.getElementById('cold-codex32-correction-status');
  var shamirPanel = document.getElementById('cold-shamir');
  var shamir39Language = document.getElementById('cold-shamir39-language');
  var shamir39Threshold = document.getElementById('cold-shamir39-threshold');
  var shamir39Shares = document.getElementById('cold-shamir39-shares');
  var shamir39SplitButton = document.getElementById('cold-shamir39-split');
  var shamir39Status = document.getElementById('cold-shamir39-status');
  var shamir39Generated = document.getElementById('cold-shamir39-generated');
  var shamir39GeneratedParts = document.getElementById('cold-shamir39-generated-parts');
  var shamir39RevealButton = document.getElementById('cold-shamir39-reveal');
  var shamir39CombineFields = document.getElementById('cold-shamir39-combine-fields');
  var shamir39CombineButton = document.getElementById('cold-shamir39-combine-button');
  var shamir39CombineStatus = document.getElementById('cold-shamir39-combine-status');
  var shamir39Result = document.getElementById('cold-shamir39-result');
  var shamir39ResultRevealButton = document.getElementById('cold-shamir39-result-reveal');
  var rawSssBits = document.getElementById('cold-raw-sss-bits');
  var rawSssThreshold = document.getElementById('cold-raw-sss-threshold');
  var rawSssShares = document.getElementById('cold-raw-sss-shares');
  var rawSssSplitButton = document.getElementById('cold-raw-sss-split');
  var rawSssStatus = document.getElementById('cold-raw-sss-status');
  var rawSssGenerated = document.getElementById('cold-raw-sss-generated');
  var rawSssGeneratedParts = document.getElementById('cold-raw-sss-generated-parts');
  var rawSssRevealButton = document.getElementById('cold-raw-sss-reveal');
  var rawSssCombineFields = document.getElementById('cold-raw-sss-combine-fields');
  var rawSssCombineButton = document.getElementById('cold-raw-sss-combine-button');
  var rawSssCombineStatus = document.getElementById('cold-raw-sss-combine-status');
  var rawSssResult = document.getElementById('cold-raw-sss-result');
  var rawSssResultRevealButton = document.getElementById('cold-raw-sss-result-reveal');
  var verificationPanel = document.getElementById('cold-verification');
  var verificationWalletNetwork = document.getElementById('cold-verification-wallet-network');
  var verificationWalletScript = document.getElementById('cold-verification-wallet-script');
  var verificationWalletUseButton = document.getElementById('cold-verification-wallet-use');
  var verificationWalletSource = document.getElementById('cold-verification-wallet-source');
  var verificationWalletStatus = document.getElementById('cold-verification-wallet-status');
  var verificationWalletFingerprint = document.getElementById('cold-verification-wallet-fingerprint');
  var verificationWalletPath = document.getElementById('cold-verification-wallet-path');
  var verificationWalletXpub = document.getElementById('cold-verification-wallet-xpub');
  var verificationWalletReceiveRange = document.getElementById('cold-verification-wallet-receive-range');
  var verificationWalletChangeRange = document.getElementById('cold-verification-wallet-change-range');
  var verificationWalletFamilies = document.getElementById('cold-verification-wallet-families');
  var verificationFingerprintForm = document.getElementById('cold-verification-fingerprint-form');
  var verificationFingerprintExpected = document.getElementById('cold-verification-fingerprint-expected');
  var verificationFingerprintRun = document.getElementById('cold-verification-fingerprint-run');
  var verificationFingerprintStatus = document.getElementById('cold-verification-fingerprint-status');
  var verificationReceiveForm = document.getElementById('cold-verification-receive-form');
  var verificationReceiveChange = document.getElementById('cold-verification-receive-change');
  var verificationReceiveIndex = document.getElementById('cold-verification-receive-index');
  var verificationReceiveExpected = document.getElementById('cold-verification-receive-expected');
  var verificationReceiveRun = document.getElementById('cold-verification-receive-run');
  var verificationReceiveStatus = document.getElementById('cold-verification-receive-status');
  var verificationXpubForm = document.getElementById('cold-verification-xpub-form');
  var verificationXpubExpected = document.getElementById('cold-verification-xpub-expected');
  var verificationXpubRun = document.getElementById('cold-verification-xpub-run');
  var verificationXpubStatus = document.getElementById('cold-verification-xpub-status');
  var verificationBackupForm = document.getElementById('cold-verification-backup-form');
  var verificationBackupExpected = document.getElementById('cold-verification-backup-expected');
  var verificationBackupRun = document.getElementById('cold-verification-backup-run');
  var verificationBackupStatus = document.getElementById('cold-verification-backup-status');
  var qrStudio = document.getElementById('cold-qr-studio');
  var qrLanguage = document.getElementById('cold-qr-language');
  var qrFormat = document.getElementById('cold-qr-format');
  var qrLayout = document.getElementById('cold-qr-layout');
  var qrGrid = document.getElementById('cold-qr-grid');
  var qrSecretConfirm = document.getElementById('cold-qr-secret-confirm');
  var qrStandardButton = document.getElementById('cold-qr-standard');
  var qrCompactButton = document.getElementById('cold-qr-compact');
  var qrOutput = document.getElementById('cold-qr-output');
  var qrOutputStatus = document.getElementById('cold-qr-output-status');
  var qrDownloadSvg = document.getElementById('cold-qr-download-svg');
  var qrDownloadPng = document.getElementById('cold-qr-download-png');
  var qrPrint = document.getElementById('cold-qr-print');
  var qrCard = document.getElementById('cold-qr-card');
  var qrCardCode = document.getElementById('cold-qr-card-code');
  var qrCardGrid = document.getElementById('cold-qr-card-grid');
  var slip39Panel = document.getElementById('cold-slip39-lab');
  var slip39GroupThreshold = document.getElementById('cold-slip39-group-threshold');
  var slip39Groups = document.getElementById('cold-slip39-groups');
  var slip39Passphrase = document.getElementById('cold-slip39-passphrase');
  var slip39CompatibilityAck = document.getElementById('cold-slip39-compatibility-ack');
  var slip39GenerateButton = document.getElementById('cold-slip39-generate');
  var slip39ClearButton = document.getElementById('cold-slip39-clear');
  var slip39Status = document.getElementById('cold-slip39-status');
  var slip39Output = document.getElementById('cold-slip39-output');
  var slip39RevealButton = document.getElementById('cold-slip39-reveal');
  var slip39RecoveryInput = document.getElementById('cold-slip39-recovery-input');
  var slip39RecoverButton = document.getElementById('cold-slip39-recover');
  var slip39RecoveryStatus = document.getElementById('cold-slip39-recovery-status');
  var backupVerificationPanel = document.getElementById('cold-backup-verification');
  var backupVerificationLabel = document.getElementById('cold-backup-verification-label');
  var backupVerificationMethod = document.getElementById('cold-backup-verification-method');
  var backupVerificationThreshold = document.getElementById('cold-backup-verification-threshold');
  var backupVerificationLanguage = document.getElementById('cold-backup-verification-language');
  var backupVerificationPassphrase = document.getElementById('cold-backup-verification-passphrase');
  var backupVerificationInput = document.getElementById('cold-backup-verification-input');
  var backupVerificationRun = document.getElementById('cold-backup-verification-run');
  var backupVerificationClear = document.getElementById('cold-backup-verification-clear');
  var backupVerificationStatus = document.getElementById('cold-backup-verification-status');
  var entropySession = entropyLab ? entropyLab.createSession() : null;
  var seedForgeWordInputs = [];
  var shamir39CombineInputs = [];
  var rawSssCombineInputs = [];
  var shamir39Parts = [];
  var rawSssParts = [];
  var shamir39PartsRevealed = false;
  var rawSssPartsRevealed = false;
  var shamir39ResultValue = '';
  var rawSssResultValue = '';
  var shamir39ResultRevealed = false;
  var rawSssResultRevealed = false;
  var shamir39PartsRevealTimer = null;
  var rawSssPartsRevealTimer = null;
  var shamir39ResultRevealTimer = null;
  var rawSssResultRevealTimer = null;
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
  var slip39ShareText = '';
  var slip39SharesRevealed = false;
  var slip39RevealTimer = null;
  var generatedWalletRevision = 0;
  var validationWalletRevision = 0;

  // ADR-0045: every cold input that accepts secret material is declared here.
  // The per-word validation fields are declared separately: they are editable
  // validation mirrors, not additional seed-loading entry points.
  var COLD_SECRET_INPUT_REGISTRY = Object.freeze([
    { category: 'seed-entry', ids: ['cold-seed-forge-mnemonic-input'] },
    { category: 'seed-validation', prefixes: ['cold-seed-forge-word-'] },
    { category: 'vault-auth', ids: ['cold-vault-passphrase', 'cold-vault-passphrase-confirm'] },
    { category: 'keyfile', ids: ['cold-vault-keyfile-input'] },
    { category: 'recovery-auth', ids: ['cold-vault-recovery-passphrase'] },
    { category: 'recovery-share', ids: ['cold-vault-recovery-input', 'cold-codex32-recovery-input', 'cold-slip39-recovery-input', 'cold-backup-verification-input'], prefixes: ['cold-seed-xor-part-', 'cold-shamir39-combine-', 'cold-raw-sss-combine-'] },
    { category: 'concealment-auth', ids: ['cold-concealment-passphrase'] },
    { category: 'secret-note', ids: ['cold-secret-note-search', 'cold-secret-note-title', 'cold-secret-note-body', 'cold-secret-note-tags'] },
    { category: 'bip39-passphrase', ids: ['cold-seed-forge-generated-passphrase-input', 'cold-seed-forge-generated-passphrase-confirm', 'cold-seed-forge-validation-passphrase-input', 'cold-seed-forge-validation-passphrase-confirm'] },
    { category: 'entropy-input', ids: ['cold-entropy-dice-face', 'cold-entropy-hex-input'] },
    { category: 'share-passphrase', ids: ['cold-slip39-passphrase', 'cold-backup-verification-passphrase'] },
    { category: 'share-combine', ids: ['cold-codex32-correction-input'] }
  ]);

  function declaredSecretInputCategory(id) {
    for (var entryIndex = 0; entryIndex < COLD_SECRET_INPUT_REGISTRY.length; entryIndex += 1) {
      var entry = COLD_SECRET_INPUT_REGISTRY[entryIndex];
      if (entry.ids && entry.ids.indexOf(id) !== -1) {
        return entry.category;
      }
      if (entry.prefixes) {
        for (var prefixIndex = 0; prefixIndex < entry.prefixes.length; prefixIndex += 1) {
          var prefix = entry.prefixes[prefixIndex];
          var suffix = id.indexOf(prefix) === 0 ? id.slice(prefix.length) : '';
          if (suffix && /^\d+$/.test(suffix)) {
            return entry.category;
          }
        }
      }
    }
    return null;
  }

  function createDeclaredSecretInput(id, category) {
    if (declaredSecretInputCategory(id) !== category) {
      throw new Error('Secret input is not declared: ' + id);
    }
    var input = document.createElement('input');
    input.type = 'password';
    input.id = id;
    input.setAttribute('data-input-surface', 'secret');
    input.setAttribute('data-secret-input-category', category);
    return input;
  }

  var seedForgeWalletRevision = 0;
  var linkedVerificationWallet = null;
  var qrArtifact = null;
  var pendingSeedForgeMix = null;
  var pendingSeedForgeMixTargetBits = null;
  var seedXorPartInputs = [];
  var seedXorParts = [];
  var seedXorPartsRevealed = false;
  var seedXorRevealTimer = null;
  var seedXorCombinedMnemonic = '';
  var seedXorCombinedWordCount = 0;
  var seedXorCombinedRevealed = false;
  var seedXorCombinedRevealTimer = null;
  var codex32GeneratedShares = [];
  var codex32GeneratedRevealed = false;
  var codex32GeneratedRevealTimer = null;
  var codex32RecoveredValue = '';
  var codex32RecoveredBytes = null;
  var codex32RecoveredRevealed = false;
  var codex32RecoveredRevealTimer = null;
  var codex32CorrectionCandidate = '';
  var CARD_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  var CARD_SUITS = ['♠', '♥', '♦', '♣'];
  var vaultCryptoReady = false;
  var vaultBusy = false;
  var vaultUnlocked = false;
  var createPrepared = false;
  var pendingVaultName = '';
  var currentVaultBytes = null;
  var currentVaultSession = null;
  var vaultSessionGeneration = 0;
  var pendingVaultBytes = null;
  var pendingOpenId = null;
  var vaultRecoveryShareText = '';
  var vaultRecoverySharesRevealed = false;
  var vaultRecoveryRevealTimer = null;
  var pendingConcealmentRevealId = null;
  var pendingBackupVerification = null;
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

  function createReleasedSecretRegistry(zeroize) {
    if (typeof zeroize !== 'function') {
      throw new TypeError('A zeroization function is required for the released-secret registry.');
    }
    var records = [];
    var nextId = 1;
    var everReleased = false;

    function publicRecord(record) {
      return {
        id: record.id,
        label: record.label,
        fingerprint: record.fingerprint,
        focused: record.id === focusedId
      };
    }

    function normalizeLabel(value, fallback) {
      var label = typeof value === 'string' ? value.trim() : '';
      if (!label) {
        label = fallback;
      }
      if (label.length < 1 || label.length > 64) {
        throw new RangeError('A released-secret label must be 1 through 64 characters.');
      }
      return label;
    }

    function release(input) {
      if (!input || typeof input.mnemonic !== 'string' || input.mnemonic.trim().length === 0) {
        throw new TypeError('A non-empty BIP-39 phrase is required for release.');
      }
      if (typeof input.language !== 'string' || input.language.trim().length === 0) {
        throw new TypeError('A BIP-39 language is required for release.');
      }
      if (typeof input.fingerprint !== 'string' || !/^[0-9a-f]{8}$/i.test(input.fingerprint)) {
        throw new TypeError('A public eight-character master fingerprint is required for release.');
      }
      if (!input.seedBytes || typeof input.seedBytes.length !== 'number' || input.seedBytes.length === 0) {
        throw new TypeError('Derived seed bytes are required for release.');
      }
      var id = 'released-secret-' + String(nextId);
      nextId += 1;
      var record = {
        id: id,
        label: normalizeLabel(input.label, 'Released secret ' + String(nextId - 1)),
        fingerprint: input.fingerprint.toLowerCase(),
        language: input.language,
        mnemonic: input.mnemonic,
        seedBytes: new Uint8Array(input.seedBytes)
      };
      records.push(record);
      focusedId = id;
      everReleased = true;
      return publicRecord(record);
    }

    function focus(id) {
      var match = records.find(function (record) { return record.id === id; });
      if (!match) {
        return false;
      }
      focusedId = match.id;
      return true;
    }

    function clear() {
      records.forEach(function (record) {
        zeroize(record.seedBytes);
        record.seedBytes = new Uint8Array(0);
        record.mnemonic = '';
        record.language = '';
        record.fingerprint = '';
        record.label = '';
      });
      records = [];
      focusedId = null;
    }

    function listPublic() {
      return records.map(publicRecord);
    }

    function getFocused() {
      return records.find(function (record) { return record.id === focusedId; }) || null;
    }

    function getFocusedPublic() {
      var focused = getFocused();
      return focused ? publicRecord(focused) : null;
    }

    function count() {
      return records.length;
    }

    function hasEverReleased() {
      return everReleased;
    }

    var focusedId = null;
    return Object.freeze({
      release: release,
      focus: focus,
      clear: clear,
      listPublic: listPublic,
      getFocused: getFocused,
      getFocusedPublic: getFocusedPublic,
      count: count,
      hasEverReleased: hasEverReleased
    });
  }

  var releasedSecretRegistry = createReleasedSecretRegistry(zeroBytes);

  function bytesToHex(bytes) {
    var hex = '';
    for (var index = 0; index < bytes.length; index += 1) {
      hex += bytes[index].toString(16).padStart(2, '0');
    }
    return hex;
  }

  function hexToBytes(value) {
    if (typeof value !== 'string' || value.length === 0 || value.length % 2 !== 0
      || !/^[0-9a-f]+$/i.test(value)) {
      throw new Error('The reconstructed hexadecimal secret is invalid.');
    }
    var bytes = new Uint8Array(value.length / 2);
    for (var index = 0; index < bytes.length; index += 1) {
      bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
    }
    return bytes;
  }

  function focusedReleasedSecret() {
    return releasedSecretRegistry.getFocused();
  }

  function releasedSecretModeActive() {
    return releasedSecretRegistry.hasEverReleased();
  }

  function renderReleasedSecretIndicators() {
    var focused = releasedSecretRegistry.getFocusedPublic();
    var text = focused
      ? 'Focused secret: ' + focused.label + ' · master fingerprint ' + focused.fingerprint + '.'
      : 'No released secret is focused. Release one from Seed Forge before using this panel.';
    var indicators = document.querySelectorAll('[data-secret-focus-indicator]');
    for (var index = 0; index < indicators.length; index += 1) {
      indicators[index].setAttribute('data-state', focused ? 'focused' : 'empty');
      indicators[index].textContent = text;
      indicators[index].setAttribute('data-fingerprint', focused ? focused.fingerprint : '');
    }
  }

  function renderReleasedSecretSwitcher(reason) {
    var records = releasedSecretRegistry.listPublic();
    var focused = releasedSecretRegistry.getFocusedPublic();
    if (releasedSecretSwitcher) {
      releasedSecretSwitcher.setAttribute('data-state', records.length > 0 ? 'ready' : 'empty');
      releasedSecretSwitcher.setAttribute('data-released-secret-count', String(records.length));
      releasedSecretSwitcher.setAttribute('data-focused-secret-id', focused ? focused.id : '');
      releasedSecretSwitcher.setAttribute('data-focused-secret-fingerprint', focused ? focused.fingerprint : '');
    }
    if (releasedSecretSummary) {
      releasedSecretSummary.textContent = focused
        ? 'Focused: ' + focused.label + ' · master fingerprint ' + focused.fingerprint
        : 'No released secret is focused.';
    }
    if (releasedSecretList) {
      releasedSecretList.textContent = '';
      records.forEach(function (record) {
        var item = document.createElement('div');
        item.className = 'cold-secret-switcher-item';
        item.setAttribute('role', 'listitem');
        item.setAttribute('data-secret-id', record.id);
        item.setAttribute('data-focused', record.focused ? 'true' : 'false');

        var copy = document.createElement('div');
        copy.className = 'cold-secret-switcher-copy';
        var label = document.createElement('strong');
        label.textContent = record.label;
        var fingerprint = document.createElement('span');
        fingerprint.textContent = record.fingerprint;
        copy.appendChild(label);
        copy.appendChild(fingerprint);

        var button = document.createElement('button');
        button.type = 'button';
        button.textContent = record.focused ? 'Focused' : 'Focus this secret';
        button.disabled = record.focused;
        button.setAttribute('aria-pressed', record.focused ? 'true' : 'false');
        button.setAttribute('data-secret-action', 'focus');
        button.setAttribute('data-secret-id', record.id);
        button.addEventListener('click', function () {
          focusReleasedSecret(record.id);
        });

        item.appendChild(copy);
        item.appendChild(button);
        releasedSecretList.appendChild(item);
      });
    }
    if (releasedSecretEmpty) {
      releasedSecretEmpty.hidden = records.length > 0;
      releasedSecretEmpty.textContent = reason
        ? 'Released secrets cleared by ' + reason + '. Release another secret from Seed Forge to continue.'
        : 'No released secret is loaded. Release one from Seed Forge. Vault lock, inactivity, panic hide, or closing this sealed realm clears this list.';
    }
    if (releasedSecretClearButton) {
      releasedSecretClearButton.disabled = records.length === 0;
    }
    renderReleasedSecretIndicators();
    renderActiveSecretPanel();
  }

  function resetActiveSecretReveal() {
    if (activeSecretRevealTimer !== null) {
      window.clearTimeout(activeSecretRevealTimer);
      activeSecretRevealTimer = null;
    }
    if (activeSecretGrid) {
      var cells = activeSecretGrid.children;
      for (var index = 0; index < cells.length; index += 1) {
        cells[index].textContent = String(index + 1).padStart(2, '0') + ' ••••••';
        cells[index].setAttribute('data-secret-visible', 'false');
      }
    }
    if (activeSecretRevealButton) {
      activeSecretRevealButton.textContent = 'Reveal for 30 seconds';
    }
  }

  function renderActiveSecretPanel() {
    var focused = focusedReleasedSecret();
    resetActiveSecretReveal();
    if (!focused) {
      if (activeSecretLabel) {
        activeSecretLabel.textContent = 'focused secret';
      }
      if (activeSecretIdentityLabel) {
        activeSecretIdentityLabel.textContent = 'No released secret';
      }
      if (activeSecretFingerprint) {
        activeSecretFingerprint.textContent = '—';
      }
      if (activeSecretWordCount) {
        activeSecretWordCount.textContent = '—';
      }
      if (activeSecretSummary) {
        activeSecretSummary.textContent = 'No released phrase · masked by default';
      }
      return;
    }
    var words = focused.mnemonic.trim().split(/\s+/);
    var language = focused.language || 'English';
    if (activeSecretLabel) {
      activeSecretLabel.textContent = focused.label;
    }
    if (activeSecretIdentityLabel) {
      activeSecretIdentityLabel.textContent = focused.label;
    }
    if (activeSecretFingerprint) {
      activeSecretFingerprint.textContent = focused.fingerprint.toUpperCase();
    }
    if (activeSecretWordCount) {
      activeSecretWordCount.textContent = String(words.length) + ' · ' + language;
    }
    if (activeSecretSummary) {
      activeSecretSummary.textContent = String(words.length) + ' words · ' + language + ' · checksum valid';
    }
  }

  function revealActiveSecret() {
    var focused = focusedReleasedSecret();
    if (!focused || !activeSecretGrid) {
      return;
    }
    resetActiveSecretReveal();
    var words = focused.mnemonic.trim().split(/\s+/);
    var cells = activeSecretGrid.children;
    for (var index = 0; index < cells.length; index += 1) {
      cells[index].textContent = String(index + 1).padStart(2, '0') + ' ' + (words[index] || '');
      cells[index].setAttribute('data-secret-visible', 'true');
    }
    if (activeSecretRevealButton) {
      activeSecretRevealButton.textContent = 'Secret visible';
    }
    activeSecretRevealTimer = window.setTimeout(resetActiveSecretReveal, 30000);
  }

  function clearReleasedSecretLensState(preserveVerificationInputs) {
    var relinkVerification = Boolean(preserveVerificationInputs && linkedVerificationWallet);
    clearSeedXorSession();
    clearShamirSession();
    clearSlip39Outputs();
    clearQrArtifact();
    clearCodex32State();
    clearVerificationSession(Boolean(preserveVerificationInputs));
    clearBackupVerificationState();
    return relinkVerification;
  }

  function refreshReleasedSecretConsumers() {
    renderReleasedSecretSwitcher();
    updateSeedForgeControls();
    updateSeedXorControls();
    updateShamirControls();
    updateVerificationControls();
    updateQrControls();
    updateCodex32Controls();
    updateSlip39Controls();
  }

  function focusReleasedSecret(id) {
    if (!releasedSecretRegistry.focus(id)) {
      return;
    }
    var relinkVerification = clearReleasedSecretLensState(true);
    refreshReleasedSecretConsumers();
    if (relinkVerification) {
      useCurrentSeedForgeWallet();
    }
  }

  function clearReleasedSecrets(reason) {
    releasedSecretRegistry.clear();
    clearReleasedSecretLensState();
    clearSeedForgeSession();
    if (qrSecretConfirm) {
      qrSecretConfirm.checked = false;
    }
    renderReleasedSecretSwitcher(reason || 'the cold session boundary');
    updateSeedForgeControls();
    updateSeedXorControls();
    updateShamirControls();
    updateVerificationControls();
    updateQrControls();
    updateCodex32Controls();
    updateSlip39Controls();
  }

  function fingerprintText(output) {
    var value = output ? output.textContent.trim().toLowerCase() : '';
    return /^[0-9a-f]{8}$/.test(value) ? value : '';
  }

  function releaseSeedForgeSecret(source) {
    var generated = source === 'generated';
    var mnemonic = generated ? generatedMnemonic : validationPhraseText;
    var language = generated ? generatedLanguage : (seedForgeLanguage ? seedForgeLanguage.value : 'english');
    var bytes = generated ? generatedSeedBytes : validationSeedBytes;
    var revision = generated ? generatedWalletRevision : validationWalletRevision;
    var fingerprint = fingerprintText(generated ? seedForgeGeneratedFingerprint : seedForgeValidationFingerprint);
    var labelInput = generated ? seedForgeGeneratedReleaseLabel : seedForgeValidationReleaseLabel;
    var statusOutput = generated ? seedForgeGeneratedReleaseStatus : seedForgeValidationReleaseStatus;
    if (!mnemonic || !bytes || revision <= 0 || !fingerprint) {
      if (statusOutput) {
        statusOutput.textContent = 'Release refused: derive a complete Seed Forge wallet first.';
      }
      return;
    }
    try {
      var released = releasedSecretRegistry.release({
        mnemonic: mnemonic,
        language: language,
        seedBytes: bytes,
        fingerprint: fingerprint,
        label: labelInput ? labelInput.value : ''
      });
      var relinkVerification = clearReleasedSecretLensState(true);
      if (labelInput) {
        labelInput.value = '';
      }
      if (statusOutput) {
        statusOutput.textContent = 'Released as “' + released.label + '”. Focused master fingerprint: ' + released.fingerprint + '.';
      }
      refreshReleasedSecretConsumers();
      if (relinkVerification) {
        useCurrentSeedForgeWallet();
      }
    } catch (error) {
      if (statusOutput) {
        statusOutput.textContent = 'Release failed closed: ' + error.message;
      }
    }
  }

  // --- codex32 (P2.2) ------------------------------------------------------
  //
  // Codex32 strings are secret material. Keep all display state in this
  // document, mask it by default, and never offer clipboard or message-channel
  // paths for the generated or recovered values.

  function maskCodex32Text(value) {
    return String(value || '').replace(/[^\r\n]/g, '•');
  }

  function setCodex32Status(output, state, text) {
    if (!output) {
      return;
    }
    output.setAttribute('data-state', state);
    output.textContent = text;
  }

  function renderCodex32Generated() {
    if (!codex32Generated) {
      return;
    }
    var value = codex32GeneratedShares.join('\n');
    codex32Generated.value = codex32GeneratedRevealed ? value : maskCodex32Text(value);
  }

  function renderCodex32Recovered() {
    if (!codex32Recovered) {
      return;
    }
    codex32Recovered.textContent = codex32RecoveredValue
      ? (codex32RecoveredRevealed ? codex32RecoveredValue : maskCodex32Text(codex32RecoveredValue))
      : 'No recovered seed.';
  }

  function clearCodex32Recovered() {
    if (codex32RecoveredRevealTimer !== null) {
      window.clearTimeout(codex32RecoveredRevealTimer);
      codex32RecoveredRevealTimer = null;
    }
    zeroBytes(codex32RecoveredBytes);
    codex32RecoveredBytes = null;
    codex32RecoveredValue = '';
    codex32RecoveredRevealed = false;
    renderCodex32Recovered();
    if (codex32RecoveredRevealButton) {
      codex32RecoveredRevealButton.disabled = true;
    }
  }

  function clearCodex32State() {
    if (codex32GeneratedRevealTimer !== null) {
      window.clearTimeout(codex32GeneratedRevealTimer);
      codex32GeneratedRevealTimer = null;
    }
    codex32GeneratedShares = [];
    codex32GeneratedRevealed = false;
    if (codex32Generated) {
      codex32Generated.value = '';
    }
    clearCodex32Recovered();
    codex32CorrectionCandidate = '';
    if (codex32RecoveryInput) {
      codex32RecoveryInput.value = '';
    }
    if (codex32CorrectionInput) {
      codex32CorrectionInput.value = '';
    }
    if (codex32CorrectionOutput) {
      codex32CorrectionOutput.textContent = 'No correction suggested.';
    }
    if (codex32UseCorrectionButton) {
      codex32UseCorrectionButton.disabled = true;
    }
    setCodex32Status(codex32GenerateStatus, 'idle', 'No codex32 shares generated in this session.');
    setCodex32Status(codex32RecoveryStatus, 'idle', 'No shares entered.');
    setCodex32Status(codex32CorrectionStatus, 'idle', 'No transcription checked.');
  }

  function updateCodex32Controls() {
    if (!codex32Panel || !codex32) {
      return;
    }
    var ready = vaultCryptoReady;
    var focused = focusedReleasedSecret();
    codex32Panel.setAttribute('data-state', ready ? 'ready' : 'locked');
    [
      codex32Threshold,
      codex32Count,
      codex32Identifier,
      codex32GenerateButton,
      codex32RecoveryInput,
      codex32RecoverButton,
      codex32CorrectionInput,
      codex32CorrectButton
    ].forEach(function (control) {
      if (control) {
        control.disabled = !ready;
      }
    });
    if (codex32GenerateButton) {
      codex32GenerateButton.disabled = !ready || !focused;
    }
    if (codex32RevealButton) {
      codex32RevealButton.disabled = !ready || codex32GeneratedShares.length === 0;
    }
    if (codex32RecoveredRevealButton) {
      codex32RecoveredRevealButton.disabled = !ready || !codex32RecoveredValue;
    }
    if (codex32UseCorrectionButton) {
      codex32UseCorrectionButton.disabled = !ready || !codex32CorrectionCandidate;
    }
  }

  function generateCodex32Shares() {
    if (!vaultCryptoReady || !codex32) {
      return;
    }
    var secretBytes = null;
    try {
      var focused = focusedReleasedSecret();
      if (!focused) {
        throw new Error('Release and focus a Seed Forge secret first.');
      }
      secretBytes = new Uint8Array(focused.seedBytes);
      var threshold = Number(codex32Threshold ? codex32Threshold.value : 3);
      var count = Number(codex32Count ? codex32Count.value : 5);
      var identifier = codex32Identifier ? codex32Identifier.value.trim().toLowerCase() : '';
      var generationOptions = {
        threshold: threshold,
        count: count
      };
      // An empty identifier deliberately leaves the API's secure random
      // default active. A typed identifier is an explicit compatibility
      // choice and must not turn the ordinary blank path into a fixed value.
      if (identifier) {
        generationOptions.identifier = identifier;
      }
      var generated = codex32.generate(secretBytes, generationOptions);
      codex32GeneratedShares = generated.shares.slice();
      codex32GeneratedRevealed = false;
      renderCodex32Generated();
      zeroBytes(generated.bytes);
      setCodex32Status(
        codex32GenerateStatus,
        'ready',
        'Generated ' + String(generated.count) + ' codex32 shares at a ' + String(generated.threshold)
          + '-of-' + String(generated.count) + ' threshold. Write them to separate offline copies.'
      );
      clearCodex32Recovered();
    } catch (error) {
      codex32GeneratedShares = [];
      codex32GeneratedRevealed = false;
      renderCodex32Generated();
      setCodex32Status(codex32GenerateStatus, 'error', 'Codex32 generation failed closed: ' + error.message);
    } finally {
      zeroBytes(secretBytes);
      updateCodex32Controls();
    }
  }

  function revealCodex32Generated() {
    if (!codex32GeneratedShares.length) {
      return;
    }
    if (codex32GeneratedRevealTimer !== null) {
      window.clearTimeout(codex32GeneratedRevealTimer);
    }
    codex32GeneratedRevealed = true;
    renderCodex32Generated();
    setCodex32Status(codex32GenerateStatus, 'ready', 'Shares are visible for 30 seconds; transcribe them offline and verify each copy.');
    codex32GeneratedRevealTimer = window.setTimeout(function () {
      codex32GeneratedRevealed = false;
      codex32GeneratedRevealTimer = null;
      renderCodex32Generated();
      setCodex32Status(codex32GenerateStatus, 'ready', 'Generated shares were masked again after the timed reveal.');
    }, 30000);
  }

  function recoverCodex32Shares() {
    if (!vaultCryptoReady || !codex32) {
      return;
    }
    var shares = String(codex32RecoveryInput ? codex32RecoveryInput.value : '')
      .split(/\r?\n/)
      .map(function (share) { return share.trim(); })
      .filter(function (share) { return share.length > 0; });
    try {
      var recovered = codex32.recover(shares);
      clearCodex32Recovered();
      codex32RecoveredValue = recovered.value;
      codex32RecoveredBytes = new Uint8Array(recovered.bytes);
      zeroBytes(recovered.bytes);
      renderCodex32Recovered();
      setCodex32Status(
        codex32RecoveryStatus,
        'ready',
        'Recovered and checksum-verified a ' + String(recovered.threshold) + '-of-' + String(shares.length)
          + ' codex32 set. The seed is masked until you explicitly reveal it.'
      );
    } catch (error) {
      clearCodex32Recovered();
      setCodex32Status(codex32RecoveryStatus, 'error', 'Codex32 recovery failed closed: ' + error.message);
    } finally {
      updateCodex32Controls();
    }
  }

  function revealCodex32Recovered() {
    if (!codex32RecoveredValue) {
      return;
    }
    if (codex32RecoveredRevealTimer !== null) {
      window.clearTimeout(codex32RecoveredRevealTimer);
    }
    codex32RecoveredRevealed = true;
    renderCodex32Recovered();
    setCodex32Status(codex32RecoveryStatus, 'ready', 'Recovered seed is visible for 30 seconds. Keep it inside the offline workflow.');
    codex32RecoveredRevealTimer = window.setTimeout(function () {
      codex32RecoveredRevealed = false;
      codex32RecoveredRevealTimer = null;
      renderCodex32Recovered();
      setCodex32Status(codex32RecoveryStatus, 'ready', 'Recovered seed was masked again after the timed reveal.');
    }, 30000);
  }

  function suggestCodex32Correction() {
    if (!vaultCryptoReady || !codex32) {
      return;
    }
    codex32CorrectionCandidate = '';
    if (codex32UseCorrectionButton) {
      codex32UseCorrectionButton.disabled = true;
    }
    if (codex32CorrectionOutput) {
      codex32CorrectionOutput.textContent = 'No correction suggested.';
    }
    try {
      var result = codex32.correctSingleError(codex32CorrectionInput ? codex32CorrectionInput.value.trim() : '');
      if (!result.changed) {
        if (codex32CorrectionOutput) {
          codex32CorrectionOutput.textContent = 'Checksum is valid; no correction is needed.';
        }
        setCodex32Status(codex32CorrectionStatus, 'ready', 'This codex32 value is already valid.');
        return;
      }
      codex32CorrectionCandidate = result.corrected;
      if (codex32CorrectionOutput) {
        codex32CorrectionOutput.textContent = maskCodex32Text(result.corrected);
      }
      setCodex32Status(
        codex32CorrectionStatus,
        'ready',
        'Suggested one-character change at position ' + String(result.position)
          + ' (' + result.from + ' to ' + result.to + '). Compare with paper before using it.'
      );
      updateCodex32Controls();
    } catch (error) {
      setCodex32Status(codex32CorrectionStatus, 'error', 'Codex32 correction failed closed: ' + error.message);
    }
  }

  function useCodex32Correction() {
    if (!codex32CorrectionCandidate || !codex32CorrectionInput) {
      return;
    }
    codex32CorrectionInput.value = codex32CorrectionCandidate;
    codex32CorrectionCandidate = '';
    if (codex32CorrectionOutput) {
      codex32CorrectionOutput.textContent = 'Corrected value loaded into the field; it remains masked.';
    }
    setCodex32Status(codex32CorrectionStatus, 'ready', 'Corrected value loaded after confirmation. Submit it to recovery separately.');
    updateCodex32Controls();
  }

  function wireCodex32() {
    if (!codex32Panel || !codex32) {
      return;
    }
    if (codex32GenerateButton) {
      codex32GenerateButton.addEventListener('click', generateCodex32Shares);
    }
    if (codex32RevealButton) {
      codex32RevealButton.addEventListener('click', revealCodex32Generated);
    }
    if (codex32RecoverButton) {
      codex32RecoverButton.addEventListener('click', recoverCodex32Shares);
    }
    if (codex32RecoveredRevealButton) {
      codex32RecoveredRevealButton.addEventListener('click', revealCodex32Recovered);
    }
    if (codex32CorrectButton) {
      codex32CorrectButton.addEventListener('click', suggestCodex32Correction);
    }
    if (codex32UseCorrectionButton) {
      codex32UseCorrectionButton.addEventListener('click', useCodex32Correction);
    }
    clearCodex32State();
    updateCodex32Controls();
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
      seedForgeGeneratedReleaseLabel,
      seedForgeValidationReleaseLabel,
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
    if (seedForgeGeneratedReleaseButton) {
      seedForgeGeneratedReleaseButton.disabled = !ready || !generatedMnemonic
        || !generatedSeedBytes || generatedWalletRevision <= 0
        || !fingerprintText(seedForgeGeneratedFingerprint);
    }
    if (seedForgeValidationReleaseButton) {
      seedForgeValidationReleaseButton.disabled = !ready || !validationPhraseText
        || !validationSeedBytes || validationWalletRevision <= 0
        || !fingerprintText(seedForgeValidationFingerprint);
    }
    if (seedForgeTarget && entropyTargetSelect && seedForgeTarget.value !== entropyTargetSelect.value) {
      seedForgeTarget.value = entropyTargetSelect.value;
    }
    updateSeedForgeMarginalControl(ready);
    updateSlip39Controls();
  }

  function setSlip39Status(output, state, text) {
    if (!output) {
      return;
    }
    output.setAttribute('data-state', state);
    output.textContent = text;
  }

  function slip39SourceBytes() {
    if (!slip39 || !seedForge) {
      return null;
    }
    var focused = focusedReleasedSecret();
    if (!focused) {
      return null;
    }
    return new Uint8Array(seedForge.mnemonicToEntropy(focused.mnemonic, focused.language));
  }

  function slip39SourceAvailable() {
    var source = null;
    try {
      source = slip39SourceBytes();
      return Boolean(source);
    } catch (_error) {
      return false;
    } finally {
      zeroBytes(source);
    }
  }

  function remaskSlip39Shares() {
    slip39SharesRevealed = false;
    if (slip39RevealTimer !== null) {
      window.clearTimeout(slip39RevealTimer);
      slip39RevealTimer = null;
    }
    if (slip39Output) {
      slip39Output.value = slip39ShareText
        ? 'Masked (' + slip39ShareText.split('\n').length + ' shares)'
        : '';
    }
    if (slip39RevealButton) {
      slip39RevealButton.textContent = 'Reveal shares for 30 seconds';
      slip39RevealButton.disabled = !vaultCryptoReady || !slip39ShareText;
    }
  }

  function clearSlip39Outputs() {
    slip39ShareText = '';
    remaskSlip39Shares();
    if (slip39Output) {
      slip39Output.value = '';
    }
    if (slip39RecoveryInput) {
      slip39RecoveryInput.value = '';
    }
    setSlip39Status(slip39Status, 'idle', 'No SLIP-39 share set generated in this session.');
    setSlip39Status(slip39RecoveryStatus, 'idle', 'No recovery attempt.');
    updateSlip39Controls();
  }

  function revealSlip39Shares() {
    if (!slip39ShareText || !slip39Output) {
      return;
    }
    if (slip39RevealTimer !== null) {
      window.clearTimeout(slip39RevealTimer);
      slip39RevealTimer = null;
    }
    slip39Output.value = slip39ShareText;
    slip39SharesRevealed = true;
    if (slip39RevealButton) {
      slip39RevealButton.textContent = 'Hide shares now';
    }
    slip39RevealTimer = window.setTimeout(remaskSlip39Shares, 30000);
  }

  function parseSlip39Options() {
    var groupThreshold = Number(slip39GroupThreshold && slip39GroupThreshold.value);
    if (!Number.isInteger(groupThreshold) || groupThreshold < 1 || groupThreshold > 16) {
      throw new Error('Groups required must be an integer from 1 to 16.');
    }
    var groups;
    try {
      groups = JSON.parse(slip39Groups ? slip39Groups.value : '');
    } catch (_error) {
      throw new Error('Member groups must be valid JSON.');
    }
    if (!Array.isArray(groups) || groups.length < 1 || groups.length > 16) {
      throw new Error('Member groups must contain 1 to 16 group objects.');
    }
    return {
      groups: groups,
      groupThreshold: groupThreshold,
      passphrase: slip39Passphrase ? slip39Passphrase.value : ''
    };
  }

  function updateSlip39Controls() {
    if (!slip39Panel) {
      return;
    }
    var ready = Boolean(slip39 && seedForge && vaultCryptoReady);
    var sourceReady = ready && slip39SourceAvailable();
    slip39Panel.setAttribute('data-state', ready ? 'ready' : 'locked');
    [slip39GroupThreshold, slip39Groups, slip39Passphrase, slip39RecoveryInput]
      .forEach(function (control) {
        if (control) {
          control.disabled = !ready;
        }
      });
    if (slip39CompatibilityAck) {
      slip39CompatibilityAck.disabled = !ready || !sourceReady;
      if (!sourceReady) {
        slip39CompatibilityAck.checked = false;
      }
    }
    if (slip39GenerateButton) {
      slip39GenerateButton.disabled = !ready || !sourceReady
        || !slip39CompatibilityAck || !slip39CompatibilityAck.checked;
    }
    if (slip39ClearButton) {
      slip39ClearButton.disabled = !ready;
    }
    if (slip39RecoverButton) {
      slip39RecoverButton.disabled = !ready;
    }
    if (slip39RevealButton) {
      slip39RevealButton.disabled = !ready || !slip39ShareText;
    }
  }

  function generateSlip39Shares() {
    if (!slip39 || !vaultCryptoReady) {
      setSlip39Status(slip39Status, 'error', 'SLIP-39 is unavailable; generation refused.');
      return;
    }
    if (!slip39CompatibilityAck || !slip39CompatibilityAck.checked) {
      setSlip39Status(slip39Status, 'error', 'Confirm device compatibility and separate distribution before generating.');
      return;
    }
    var source = null;
    var generated = null;
    try {
      source = slip39SourceBytes();
      if (!source) {
        throw new Error('Release and focus a Seed Forge secret first.');
      }
      var options = parseSlip39Options();
      clearSlip39Outputs();
      generated = slip39.generate(source, options);
      slip39ShareText = generated.shares.map(function (share) { return share.mnemonic; }).join('\n');
      remaskSlip39Shares();
      setSlip39Status(
        slip39Status,
        'ready',
        'Generated ' + generated.shares.length + ' share(s) from ' + (source.length * 8)
          + '-bit BIP-39 phrase entropy. Write each share separately; the BIP-39 passphrase, if any, is not included.'
      );
    } catch (error) {
      setSlip39Status(slip39Status, 'error', 'SLIP-39 generation failed closed: ' + error.message);
      slip39ShareText = '';
      remaskSlip39Shares();
    } finally {
      zeroBytes(source);
      generated = null;
      updateSlip39Controls();
    }
  }

  function recoverSlip39Shares() {
    if (!slip39 || !vaultCryptoReady) {
      setSlip39Status(slip39RecoveryStatus, 'error', 'SLIP-39 is unavailable; recovery refused.');
      return;
    }
    var recovered = null;
    var source = null;
    var lines = [];
    try {
      lines = (slip39RecoveryInput ? slip39RecoveryInput.value : '')
        .split(/\r?\n/)
        .map(function (line) { return line.trim(); })
        .filter(function (line) { return line.length > 0; });
      if (lines.length === 0) {
        throw new Error('Enter at least one complete share from the written copies.');
      }
      recovered = slip39.recover(lines, slip39Passphrase ? slip39Passphrase.value : '');
      source = slip39SourceBytes();
      if (source && slip39.bytesEqual(recovered, source)) {
        setSlip39Status(
          slip39RecoveryStatus,
          'valid',
          'Recovered ' + recovered.length + '-byte phrase entropy and it matches the selected Seed Forge phrase.'
        );
      } else if (source) {
        setSlip39Status(
          slip39RecoveryStatus,
          'error',
          'Recovered ' + recovered.length + '-byte phrase entropy, but it does not match the selected Seed Forge phrase.'
        );
      } else {
        setSlip39Status(
          slip39RecoveryStatus,
          'ready',
          'Recovered ' + recovered.length + '-byte phrase entropy. Select the source phrase to compare it locally.'
        );
      }
    } catch (error) {
      setSlip39Status(slip39RecoveryStatus, 'error', 'SLIP-39 recovery failed closed: ' + error.message);
    } finally {
      zeroBytes(recovered);
      zeroBytes(source);
      lines.length = 0;
      if (slip39RecoveryInput) {
        slip39RecoveryInput.value = '';
      }
      updateSlip39Controls();
    }
  }

  function wireSlip39() {
    if (!slip39) {
      return;
    }
    if (slip39GenerateButton) {
      slip39GenerateButton.addEventListener('click', generateSlip39Shares);
    }
    if (slip39ClearButton) {
      slip39ClearButton.addEventListener('click', clearSlip39Outputs);
    }
    if (slip39RevealButton) {
      slip39RevealButton.addEventListener('click', function () {
        if (slip39SharesRevealed) {
          remaskSlip39Shares();
        } else {
          revealSlip39Shares();
        }
      });
    }
    if (slip39RecoverButton) {
      slip39RecoverButton.addEventListener('click', recoverSlip39Shares);
    }
    [slip39GroupThreshold, slip39Groups, slip39Passphrase].forEach(function (control) {
      if (control) {
        control.addEventListener('input', function () {
          clearSlip39Outputs();
          updateSlip39Controls();
        });
      }
    });
    if (slip39CompatibilityAck) {
      slip39CompatibilityAck.addEventListener('change', updateSlip39Controls);
    }
    updateSlip39Controls();
  }

  function setBackupVerificationStatus(state, text) {
    if (!backupVerificationStatus) {
      return;
    }
    backupVerificationStatus.setAttribute('data-state', state);
    backupVerificationStatus.textContent = text;
  }

  function clearBackupVerificationInput() {
    if (backupVerificationPassphrase) {
      backupVerificationPassphrase.value = '';
    }
    if (backupVerificationInput) {
      backupVerificationInput.value = '';
    }
  }

  function clearBackupVerificationState() {
    pendingBackupVerification = null;
    clearBackupVerificationInput();
    if (backupVerificationPanel) {
      backupVerificationPanel.hidden = true;
    }
    if (backupVerificationLabel) {
      backupVerificationLabel.textContent = 'No record selected.';
    }
    if (backupVerificationMethod) {
      backupVerificationMethod.textContent = 'Not selected';
    }
    if (backupVerificationThreshold) {
      backupVerificationThreshold.textContent = 'Not selected';
    }
    setBackupVerificationStatus('idle', 'No BackupRecord verification requested.');
    updateBackupVerificationControls();
  }

  function updateBackupVerificationControls() {
    var active = Boolean(
      pendingBackupVerification
      && vaultCryptoReady
      && vaultUnlocked
      && currentVaultSession
      && typeof currentVaultSession.markBackupVerified === 'function'
    );
    var method = pendingBackupVerification && pendingBackupVerification.record
      ? pendingBackupVerification.record.method
      : '';
    if (backupVerificationPanel) {
      backupVerificationPanel.hidden = !pendingBackupVerification;
      backupVerificationPanel.setAttribute('data-state', active ? 'ready' : 'locked');
    }
    [backupVerificationLanguage, backupVerificationInput, backupVerificationRun, backupVerificationClear]
      .forEach(function (control) {
        if (control) {
          control.disabled = !active;
        }
      });
    if (backupVerificationPassphrase) {
      backupVerificationPassphrase.disabled = !active || method !== 'slip39';
    }
  }

  function sendBackupVerificationResult(outcome, verifiedAt) {
    if (!pendingBackupVerification) {
      return;
    }
    var request = pendingBackupVerification;
    pendingBackupVerification = null;
    clearBackupVerificationInput();
    var payload = { backupId: request.record.id, outcome: outcome };
    if (verifiedAt) {
      payload.verifiedAt = verifiedAt;
    }
    if (!postVaultMessage(request.requestId, 'backup.verifyResult', payload)) {
      setBackupVerificationStatus('error', 'The verification result could not be sent. The backup was not confirmed by the warm register.');
    }
    updateBackupVerificationControls();
  }

  function handleBackupVerificationRequest(message) {
    if (!vaultUnlocked || !currentVaultSession || typeof currentVaultSession.getPublicData !== 'function') {
      postVaultMessage(message.id, 'backup.verifyResult', {
        backupId: message.payload.backupId,
        outcome: 'vault-locked'
      });
      return;
    }
    if (pendingBackupVerification) {
      postVaultMessage(message.id, 'backup.verifyResult', {
        backupId: message.payload.backupId,
        outcome: 'invalid'
      });
      return;
    }
    var publicData = currentVaultSession.getPublicData() || {};
    var record = findPublicRecord(publicData.backups, message.payload.backupId);
    if (!record) {
      postVaultMessage(message.id, 'backup.verifyResult', {
        backupId: message.payload.backupId,
        outcome: 'no-record'
      });
      return;
    }
    pendingBackupVerification = {
      requestId: message.id,
      record: {
        id: record.id,
        method: record.method,
        shareLabel: record.shareLabel,
        threshold: record.threshold,
        groupConfig: record.groupConfig || null
      }
    };
    if (backupVerificationLabel) {
      backupVerificationLabel.textContent = record.shareLabel || record.id;
    }
    if (backupVerificationMethod) {
      backupVerificationMethod.textContent = record.method;
    }
    if (backupVerificationThreshold) {
      backupVerificationThreshold.textContent = String(record.threshold);
    }
    setBackupVerificationStatus('ready', 'Type the threshold subset from the physical copies, then reconstruct it here.');
    updateBackupVerificationControls();
    if (backupVerificationInput) {
      backupVerificationInput.focus();
    }
  }

  function runBackupVerification() {
    if (!pendingBackupVerification || !vaultUnlocked || !currentVaultSession) {
      setBackupVerificationStatus('error', 'A vault must remain unlocked while a backup is verified.');
      return;
    }
    var record = pendingBackupVerification.record;
    var lines = (backupVerificationInput ? backupVerificationInput.value : '')
      .split(/\r?\n/)
      .map(function (line) { return line.trim(); })
      .filter(function (line) { return line.length > 0; });
    var recoveredBytes = null;
    var outcome = 'invalid';
    try {
      if (lines.length === 0 || lines.length > 32) {
        throw new Error('Enter a bounded set of complete shares from the physical copies.');
      }
      var language = backupVerificationLanguage ? backupVerificationLanguage.value : 'english';
      if (record.method === 'slip39') {
        var slip39Records = lines.map(function (line) { return slip39.decode(line); });
        var slip39Record = slip39Records[0];
        var configuredGroups = record.groupConfig && Array.isArray(record.groupConfig.groups)
          ? record.groupConfig.groups
          : null;
        if (!configuredGroups
          && (slip39Record.groupThreshold !== 1
            || slip39Record.groupCount !== 1
            || slip39Record.memberThreshold !== record.threshold
            || lines.length !== record.threshold)) {
          throw new Error('The SLIP-39 threshold does not match the BackupRecord.');
        }
        if (configuredGroups) {
          if (slip39Record.groupCount !== configuredGroups.length
            || (record.groupConfig.groupThreshold !== undefined
              && slip39Record.groupThreshold !== record.groupConfig.groupThreshold)) {
            throw new Error('The SLIP-39 group configuration does not match the BackupRecord.');
          }
          slip39Records.forEach(function (decoded) {
            var configuredGroup = configuredGroups[decoded.groupIndex];
            if (!configuredGroup || configuredGroup.threshold !== decoded.memberThreshold) {
              throw new Error('The SLIP-39 member threshold does not match the BackupRecord.');
            }
          });
          if (configuredGroups.length === 1
            && (slip39Record.groupThreshold !== 1
              || slip39Record.memberThreshold !== record.threshold
              || lines.length !== record.threshold)) {
            throw new Error('The SLIP-39 threshold does not match the BackupRecord.');
          }
        }
        recoveredBytes = slip39.recover(
          lines,
          backupVerificationPassphrase ? backupVerificationPassphrase.value : ''
        );
      } else if (record.method === 'codex32') {
        var codexRecovered = codex32.recover(lines);
        if (codexRecovered.threshold !== record.threshold) {
          throw new Error('The codex32 threshold does not match the BackupRecord.');
        }
        recoveredBytes = new Uint8Array(codexRecovered.bytes);
        zeroBytes(codexRecovered.bytes);
      } else if (record.method === 'seedxor') {
        if (lines.length !== record.threshold) {
          throw new Error('The Seed XOR part count does not match the BackupRecord.');
        }
        var xorRecovered = seedXor.combine(lines, { language: language });
        recoveredBytes = new Uint8Array(xorRecovered.entropy);
        zeroBytes(xorRecovered.entropy);
      } else if (record.method === 'shamir39') {
        var shamirRecord = shamir.shamir39.parse(lines[0], { language: language });
        if (shamirRecord.threshold !== record.threshold) {
          throw new Error('The Shamir39 threshold does not match the BackupRecord.');
        }
        var shamirRecovered = shamir.shamir39.combine(lines, { language: language });
        recoveredBytes = new Uint8Array(seedForge.mnemonicToEntropy(shamirRecovered.mnemonic, language));
      } else if (record.method === 'sss') {
        var rawRecovered = shamir.raw.combine(lines, { threshold: record.threshold });
        if (!rawRecovered || typeof rawRecovered.hex !== 'string' || rawRecovered.hex.length === 0) {
          throw new Error('The raw share result was empty.');
        }
        recoveredBytes = hexToBytes(rawRecovered.hex);
      } else {
        outcome = 'unsupported';
      }
      if (outcome !== 'unsupported') {
        var verifiedAt = new Date().toISOString();
        currentVaultSession.markBackupVerified(record.id, record.method, recoveredBytes, verifiedAt);
        setBackupVerificationStatus('valid', 'Subject-bound reconstruction succeeded. The public record is now cold verified; save the vault to make the timestamp durable.');
        sendBackupVerificationResult('verified', verifiedAt);
      } else {
        setBackupVerificationStatus('error', 'This backup method has no reconstruction workflow in this release. The record remains incomplete.');
        sendBackupVerificationResult('unsupported');
      }
    } catch (error) {
      setBackupVerificationStatus('error', 'Reconstruction failed closed. The record remains incomplete.');
      sendBackupVerificationResult(outcome);
    } finally {
      zeroBytes(recoveredBytes);
      lines.length = 0;
      clearBackupVerificationInput();
      updateBackupVerificationControls();
    }
  }

  function wireBackupVerification() {
    if (backupVerificationLanguage && seedForge && Array.isArray(seedForge.languages)) {
      backupVerificationLanguage.textContent = '';
      seedForge.languages.forEach(function (language) {
        var option = document.createElement('option');
        option.value = language.id;
        option.textContent = language.label;
        backupVerificationLanguage.appendChild(option);
      });
      backupVerificationLanguage.value = 'english';
    }
    if (backupVerificationRun) {
      backupVerificationRun.addEventListener('click', runBackupVerification);
    }
    if (backupVerificationClear) {
      backupVerificationClear.addEventListener('click', function () {
        clearBackupVerificationInput();
        setBackupVerificationStatus('ready', 'Verification input cleared. Type the physical copies again when ready.');
      });
    }
    updateBackupVerificationControls();
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
    updateSlip39Controls();
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
    updateSlip39Controls();
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
      generatedWalletRevision = 0;
      clearLinkedVerificationWallet('No current Seed Forge wallet is linked.');
      clearGeneratedSeed();
      setFingerprintOutput(seedForgeGeneratedFingerprint, 'Not calculated');
      return true;
    }
    if (!generatedPassphrasePairValid()) {
      generatedWalletRevision = 0;
      clearLinkedVerificationWallet('Seed Forge changed; link the current wallet again.');
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
      generatedWalletRevision = ++seedForgeWalletRevision;
      clearLinkedVerificationWallet('Seed Forge changed; link the current wallet again.');
      return true;
    } catch (error) {
      generatedWalletRevision = 0;
      clearLinkedVerificationWallet('Seed Forge derivation failed; no wallet is linked.');
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
      validationWalletRevision = 0;
      clearLinkedVerificationWallet('Seed Forge changed; link the current wallet again.');
      clearValidationSeed();
      setFingerprintOutput(seedForgeValidationFingerprint, 'Not calculated');
      return true;
    }
    if (!validationPassphrasePairValid()) {
      validationWalletRevision = 0;
      clearLinkedVerificationWallet('Seed Forge changed; link the current wallet again.');
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
      validationWalletRevision = ++seedForgeWalletRevision;
      clearLinkedVerificationWallet('Seed Forge changed; link the current wallet again.');
      return true;
    } catch (error) {
      validationWalletRevision = 0;
      clearLinkedVerificationWallet('Seed Forge derivation failed; no wallet is linked.');
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
    updateVerificationControls();
    return valid;
  }

  function refreshValidationDerivationAndControls() {
    var valid = refreshValidationDerivation();
    updateSeedForgeControls();
    updateVerificationControls();
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
    generatedWalletRevision = 0;
    validationWalletRevision = 0;
    seedForgeWalletRevision = 0;
    clearLinkedVerificationWallet('No current Seed Forge wallet is linked.');
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
    if (seedForgeGeneratedReleaseLabel) {
      seedForgeGeneratedReleaseLabel.value = '';
    }
    if (seedForgeValidationReleaseLabel) {
      seedForgeValidationReleaseLabel.value = '';
    }
    if (seedForgeGeneratedReleaseStatus) {
      seedForgeGeneratedReleaseStatus.textContent = 'Not released.';
    }
    if (seedForgeValidationReleaseStatus) {
      seedForgeValidationReleaseStatus.textContent = 'Not released.';
    }
  }

  // --- Backup shares (P2.4) -----------------------------------------------
  //
  // Shamir39 and raw SSS are cold-local workflows. Share strings, source
  // material, and reconstructed candidates never enter a message payload or
  // a persistent store. The visible share/result nodes stay masked until the
  // user explicitly requests a short reveal, and the shared cold-session
  // teardown clears every input, array, timer, and output.

  function setShamirStatus(output, state, text) {
    if (!output) {
      return;
    }
    output.setAttribute('data-state', state);
    output.textContent = text;
  }

  function fillShamirCountOptions(select, selected) {
    if (!select) {
      return;
    }
    select.textContent = '';
    for (var count = 2; count <= 8; count += 1) {
      var option = document.createElement('option');
      option.value = String(count);
      option.textContent = String(count);
      select.appendChild(option);
    }
    select.value = String(selected);
  }

  function fillShamirBitsOptions() {
    if (!rawSssBits) {
      return;
    }
    rawSssBits.textContent = '';
    for (var bits = 3; bits <= 20; bits += 1) {
      var option = document.createElement('option');
      option.value = String(bits);
      option.textContent = String(bits) + ' bits (GF(2^' + String(bits) + '))';
      rawSssBits.appendChild(option);
    }
    rawSssBits.value = '8';
  }

  function updateShamirCountSelection(thresholdSelect, sharesSelect) {
    var threshold = Number(thresholdSelect && thresholdSelect.value);
    var shares = Number(sharesSelect && sharesSelect.value);
    if (!Number.isInteger(threshold) || threshold < 2 || threshold > 8) {
      threshold = 2;
      if (thresholdSelect) {
        thresholdSelect.value = '2';
      }
    }
    if (!Number.isInteger(shares) || shares < threshold || shares > 8) {
      shares = threshold;
      if (sharesSelect) {
        sharesSelect.value = String(shares);
      }
    }
  }

  function renderShamirParts(output, parts, revealed) {
    if (!output) {
      return;
    }
    output.textContent = '';
    parts.forEach(function (part, index) {
      var item = document.createElement('li');
      var value = document.createElement('span');
      value.className = 'cold-shamir-share-value';
      value.textContent = revealed ? part : 'Masked share ' + String(index + 1);
      value.setAttribute('data-secret-visible', revealed ? 'true' : 'false');
      item.appendChild(value);
      output.appendChild(item);
    });
  }

  function setShamirResultOutput(output, value, revealed, maskedText) {
    if (!output) {
      return;
    }
    output.textContent = revealed && value ? value : maskedText;
    output.setAttribute('data-secret-visible', revealed && value ? 'true' : 'false');
  }

  function clearShamirTimers() {
    [
      ['shamir39Parts', shamir39PartsRevealTimer],
      ['rawSssParts', rawSssPartsRevealTimer],
      ['shamir39Result', shamir39ResultRevealTimer],
      ['rawSssResult', rawSssResultRevealTimer]
    ].forEach(function (entry) {
      if (entry[1] !== null) {
        window.clearTimeout(entry[1]);
      }
    });
    shamir39PartsRevealTimer = null;
    rawSssPartsRevealTimer = null;
    shamir39ResultRevealTimer = null;
    rawSssResultRevealTimer = null;
  }

  function remaskShamir39Parts() {
    shamir39PartsRevealed = false;
    renderShamirParts(shamir39GeneratedParts, shamir39Parts, false);
    if (shamir39RevealButton) {
      shamir39RevealButton.textContent = 'Reveal shares for 30 seconds';
    }
  }

  function revealShamir39Parts() {
    if (shamir39Parts.length === 0) {
      return;
    }
    shamir39PartsRevealed = true;
    renderShamirParts(shamir39GeneratedParts, shamir39Parts, true);
    if (shamir39PartsRevealTimer !== null) {
      window.clearTimeout(shamir39PartsRevealTimer);
    }
    shamir39PartsRevealTimer = window.setTimeout(remaskShamir39Parts, 30000);
    if (shamir39RevealButton) {
      shamir39RevealButton.textContent = 'Hide shares now';
    }
  }

  function remaskRawSssParts() {
    rawSssPartsRevealed = false;
    renderShamirParts(rawSssGeneratedParts, rawSssParts, false);
    if (rawSssRevealButton) {
      rawSssRevealButton.textContent = 'Reveal shares for 30 seconds';
    }
  }

  function revealRawSssParts() {
    if (rawSssParts.length === 0) {
      return;
    }
    rawSssPartsRevealed = true;
    renderShamirParts(rawSssGeneratedParts, rawSssParts, true);
    if (rawSssPartsRevealTimer !== null) {
      window.clearTimeout(rawSssPartsRevealTimer);
    }
    rawSssPartsRevealTimer = window.setTimeout(remaskRawSssParts, 30000);
    if (rawSssRevealButton) {
      rawSssRevealButton.textContent = 'Hide shares now';
    }
  }

  function remaskShamir39Result() {
    shamir39ResultRevealed = false;
    setShamirResultOutput(shamir39Result, shamir39ResultValue, false, 'Masked BIP-39 phrase');
    if (shamir39ResultRevealButton) {
      shamir39ResultRevealButton.textContent = 'Reveal phrase for 30 seconds';
    }
  }

  function revealShamir39Result() {
    if (!shamir39ResultValue) {
      return;
    }
    shamir39ResultRevealed = true;
    setShamirResultOutput(shamir39Result, shamir39ResultValue, true, 'Masked BIP-39 phrase');
    if (shamir39ResultRevealTimer !== null) {
      window.clearTimeout(shamir39ResultRevealTimer);
    }
    shamir39ResultRevealTimer = window.setTimeout(remaskShamir39Result, 30000);
    if (shamir39ResultRevealButton) {
      shamir39ResultRevealButton.textContent = 'Hide phrase now';
    }
  }

  function remaskRawSssResult() {
    rawSssResultRevealed = false;
    setShamirResultOutput(rawSssResult, rawSssResultValue, false, 'Masked hexadecimal secret');
    if (rawSssResultRevealButton) {
      rawSssResultRevealButton.textContent = 'Reveal hex secret for 30 seconds';
    }
  }

  function revealRawSssResult() {
    if (!rawSssResultValue) {
      return;
    }
    rawSssResultRevealed = true;
    setShamirResultOutput(rawSssResult, rawSssResultValue, true, 'Masked hexadecimal secret');
    if (rawSssResultRevealTimer !== null) {
      window.clearTimeout(rawSssResultRevealTimer);
    }
    rawSssResultRevealTimer = window.setTimeout(remaskRawSssResult, 30000);
    if (rawSssResultRevealButton) {
      rawSssResultRevealButton.textContent = 'Hide hex secret now';
    }
  }

  function clearShamirInputs(inputs) {
    inputs.forEach(function (input) {
      input.value = '';
    });
  }

  function readShamirInputs(inputs) {
    return inputs.map(function (input) {
      return input.value.trim();
    }).filter(function (value) {
      return value.length > 0;
    });
  }

  function updateShamirControls() {
    if (!shamirPanel) {
      return;
    }
    var ready = Boolean(
      vaultCryptoReady
      && shamir
      && shamir.shamir39
      && shamir.raw
      && typeof shamir.shamir39.split === 'function'
      && typeof shamir.shamir39.combine === 'function'
      && typeof shamir.raw.split === 'function'
      && typeof shamir.raw.combine === 'function'
    );
    var focused = focusedReleasedSecret();
    shamirPanel.setAttribute('data-state', ready ? 'ready' : 'locked');
    [
      shamir39Language,
      shamir39Threshold,
      shamir39Shares,
      shamir39SplitButton,
      shamir39CombineButton,
      rawSssBits,
      rawSssThreshold,
      rawSssShares,
      rawSssSplitButton,
      rawSssCombineButton
    ].forEach(function (control) {
      if (control) {
        control.disabled = !ready;
      }
    });
    shamir39CombineInputs.concat(rawSssCombineInputs).forEach(function (input) {
      input.disabled = !ready;
    });
    if (shamir39RevealButton) {
      shamir39RevealButton.disabled = !ready || shamir39Parts.length === 0;
    }
    if (rawSssRevealButton) {
      rawSssRevealButton.disabled = !ready || rawSssParts.length === 0;
    }
    if (shamir39ResultRevealButton) {
      shamir39ResultRevealButton.disabled = !ready || !shamir39ResultValue;
    }
    if (rawSssResultRevealButton) {
      rawSssResultRevealButton.disabled = !ready || !rawSssResultValue;
    }
    if (focused) {
      if (shamir39Language) {
        shamir39Language.value = focused.language;
      }
    }
    if (shamir39SplitButton) {
      shamir39SplitButton.disabled = !ready || !focused;
    }
    if (rawSssSplitButton) {
      rawSssSplitButton.disabled = !ready || !focused;
    }
  }

  function splitShamir39Phrase() {
    var focused = focusedReleasedSecret();
    var source = focused ? focused.mnemonic : '';
    var threshold = Number(shamir39Threshold && shamir39Threshold.value);
    var shares = Number(shamir39Shares && shamir39Shares.value);
    if (!focused) {
      setShamirStatus(shamir39Status, 'error', 'Split refused: release and focus a Seed Forge secret first.');
      return;
    }
    if (!shamir) {
      setShamirStatus(shamir39Status, 'error', 'Shamir39 is unavailable; splitting refused.');
      return;
    }
    try {
      var result = shamir.shamir39.split(source, {
        language: focused.language,
        threshold: threshold,
        shares: shares
      });
      shamir39Parts = Array.prototype.slice.call(result.parts);
      shamir39PartsRevealed = false;
      renderShamirParts(shamir39GeneratedParts, shamir39Parts, false);
      if (shamir39Generated) {
        shamir39Generated.hidden = false;
      }
      clearShamirTimers();
      remaskShamir39Parts();
      setShamirStatus(shamir39Status, 'ready', 'Generated ' + String(result.shares) + ' Shamir39 shares; ' + String(result.threshold) + ' are required.');
    } catch (error) {
      shamir39Parts = [];
      if (shamir39Generated) {
        shamir39Generated.hidden = true;
      }
      setShamirStatus(shamir39Status, 'error', 'Shamir39 refused the input: ' + error.message);
    } finally {
      updateShamirControls();
    }
  }

  function splitRawSssSecret() {
    var focused = focusedReleasedSecret();
    var source = focused ? bytesToHex(focused.seedBytes) : '';
    var threshold = Number(rawSssThreshold && rawSssThreshold.value);
    var shares = Number(rawSssShares && rawSssShares.value);
    if (!focused) {
      setShamirStatus(rawSssStatus, 'error', 'Split refused: release and focus a Seed Forge secret first.');
      return;
    }
    if (!shamir) {
      setShamirStatus(rawSssStatus, 'error', 'Raw SSS is unavailable; splitting refused.');
      return;
    }
    try {
      var result = shamir.raw.split(source, {
        bits: Number(rawSssBits && rawSssBits.value),
        threshold: threshold,
        shares: shares,
        padLength: 128
      });
      rawSssParts = Array.prototype.slice.call(result.parts);
      rawSssPartsRevealed = false;
      renderShamirParts(rawSssGeneratedParts, rawSssParts, false);
      if (rawSssGenerated) {
        rawSssGenerated.hidden = false;
      }
      clearShamirTimers();
      remaskRawSssParts();
      setShamirStatus(rawSssStatus, 'ready', 'Generated ' + String(result.shares) + ' raw SSS shares; ' + String(result.threshold) + ' are required.');
    } catch (error) {
      rawSssParts = [];
      if (rawSssGenerated) {
        rawSssGenerated.hidden = true;
      }
      setShamirStatus(rawSssStatus, 'error', 'Raw SSS refused the input: ' + error.message);
    } finally {
      updateShamirControls();
    }
  }

  function combineShamir39Shares() {
    var parts = readShamirInputs(shamir39CombineInputs);
    try {
      if (!shamir || parts.length < 2) {
        throw new Error('Enter at least two complete Shamir39 shares.');
      }
      var result = shamir.shamir39.combine(parts, {
        language: shamir39Language ? shamir39Language.value : 'english'
      });
      shamir39ResultValue = result.mnemonic;
      shamir39ResultRevealed = false;
      setShamirResultOutput(shamir39Result, shamir39ResultValue, false, 'Masked BIP-39 phrase');
      setShamirStatus(shamir39CombineStatus, 'ready', 'Reconstructed a valid ' + String(result.wordCount) + '-word BIP-39 phrase.');
    } catch (error) {
      shamir39ResultValue = '';
      setShamirResultOutput(shamir39Result, '', false, 'Not reconstructed');
      setShamirStatus(shamir39CombineStatus, 'error', 'Shamir39 did not reconstruct a valid phrase: ' + error.message);
    } finally {
      clearShamirInputs(shamir39CombineInputs);
      updateShamirControls();
    }
  }

  function combineRawSssShares() {
    var parts = readShamirInputs(rawSssCombineInputs);
    try {
      if (!shamir || parts.length < 2) {
        throw new Error('Enter at least two complete raw SSS shares.');
      }
      var result = shamir.raw.combine(parts, {
        threshold: Number(rawSssThreshold && rawSssThreshold.value)
      });
      rawSssResultValue = result.hex;
      rawSssResultRevealed = false;
      setShamirResultOutput(rawSssResult, rawSssResultValue, false, 'Masked hexadecimal secret');
      setShamirStatus(rawSssCombineStatus, 'ready', 'Reconstructed the raw secret from ' + String(result.shares) + ' shares.');
    } catch (error) {
      rawSssResultValue = '';
      setShamirResultOutput(rawSssResult, '', false, 'Not reconstructed');
      setShamirStatus(rawSssCombineStatus, 'error', 'Raw SSS did not reconstruct the secret: ' + error.message);
    } finally {
      clearShamirInputs(rawSssCombineInputs);
      updateShamirControls();
    }
  }

  function createShamirCombineInputs(container, target, labelPrefix) {
    if (!container) {
      return;
    }
    container.textContent = '';
    for (var index = 0; index < 8; index += 1) {
      var label = document.createElement('label');
      label.textContent = labelPrefix + ' ' + String(index + 1);
      var inputId = labelPrefix === 'Shamir39 share'
        ? 'cold-shamir39-combine-' + String(index + 1)
        : 'cold-raw-sss-combine-' + String(index + 1);
      var input = createDeclaredSecretInput(inputId, 'recovery-share');
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.setAttribute('autocorrect', 'off');
      input.setAttribute('autocapitalize', 'off');
      input.setAttribute('aria-label', labelPrefix + ' ' + String(index + 1));
      input.disabled = true;
      label.appendChild(input);
      container.appendChild(label);
      target.push(input);
    }
  }

  function wireShamir() {
    if (!shamirPanel || !shamir || !shamir.shamir39 || !shamir.raw) {
      return;
    }
    if (shamir39Language && Array.isArray(seedForge && seedForge.languages)) {
      shamir39Language.textContent = '';
      seedForge.languages.forEach(function (language) {
        var option = document.createElement('option');
        option.value = language.id;
        option.textContent = language.label;
        shamir39Language.appendChild(option);
      });
      shamir39Language.value = 'english';
    }
    fillShamirCountOptions(shamir39Threshold, 3);
    fillShamirCountOptions(shamir39Shares, 5);
    fillShamirCountOptions(rawSssThreshold, 3);
    fillShamirCountOptions(rawSssShares, 5);
    fillShamirBitsOptions();
    createShamirCombineInputs(shamir39CombineFields, shamir39CombineInputs, 'Shamir39 share');
    createShamirCombineInputs(rawSssCombineFields, rawSssCombineInputs, 'Raw SSS share');
    if (shamir39Threshold) {
      shamir39Threshold.addEventListener('change', function () {
        updateShamirCountSelection(shamir39Threshold, shamir39Shares);
      });
    }
    if (shamir39Shares) {
      shamir39Shares.addEventListener('change', function () {
        updateShamirCountSelection(shamir39Threshold, shamir39Shares);
      });
    }
    if (rawSssThreshold) {
      rawSssThreshold.addEventListener('change', function () {
        updateShamirCountSelection(rawSssThreshold, rawSssShares);
      });
    }
    if (rawSssShares) {
      rawSssShares.addEventListener('change', function () {
        updateShamirCountSelection(rawSssThreshold, rawSssShares);
      });
    }
    if (shamir39SplitButton) {
      shamir39SplitButton.addEventListener('click', splitShamir39Phrase);
    }
    if (rawSssSplitButton) {
      rawSssSplitButton.addEventListener('click', splitRawSssSecret);
    }
    if (shamir39CombineButton) {
      shamir39CombineButton.addEventListener('click', combineShamir39Shares);
    }
    if (rawSssCombineButton) {
      rawSssCombineButton.addEventListener('click', combineRawSssShares);
    }
    if (shamir39RevealButton) {
      shamir39RevealButton.addEventListener('click', function () {
        if (shamir39PartsRevealed) {
          remaskShamir39Parts();
        } else {
          revealShamir39Parts();
        }
      });
    }
    if (rawSssRevealButton) {
      rawSssRevealButton.addEventListener('click', function () {
        if (rawSssPartsRevealed) {
          remaskRawSssParts();
        } else {
          revealRawSssParts();
        }
      });
    }
    if (shamir39ResultRevealButton) {
      shamir39ResultRevealButton.addEventListener('click', function () {
        if (shamir39ResultRevealed) {
          remaskShamir39Result();
        } else {
          revealShamir39Result();
        }
      });
    }
    if (rawSssResultRevealButton) {
      rawSssResultRevealButton.addEventListener('click', function () {
        if (rawSssResultRevealed) {
          remaskRawSssResult();
        } else {
          revealRawSssResult();
        }
      });
    }
    updateShamirControls();
  }

  function clearShamirSession() {
    clearShamirTimers();
    shamir39Parts = [];
    rawSssParts = [];
    shamir39PartsRevealed = false;
    rawSssPartsRevealed = false;
    shamir39ResultValue = '';
    rawSssResultValue = '';
    shamir39ResultRevealed = false;
    rawSssResultRevealed = false;
    clearShamirInputs(shamir39CombineInputs);
    clearShamirInputs(rawSssCombineInputs);
    renderShamirParts(shamir39GeneratedParts, shamir39Parts, false);
    renderShamirParts(rawSssGeneratedParts, rawSssParts, false);
    if (shamir39Generated) {
      shamir39Generated.hidden = true;
    }
    if (rawSssGenerated) {
      rawSssGenerated.hidden = true;
    }
    setShamirStatus(shamir39Status, 'idle', 'Shamir39 is waiting for a phrase.');
    setShamirStatus(rawSssStatus, 'idle', 'Raw SSS is waiting for a hexadecimal secret.');
    setShamirStatus(shamir39CombineStatus, 'idle', 'No shares entered.');
    setShamirStatus(rawSssCombineStatus, 'idle', 'No shares entered.');
    setShamirResultOutput(shamir39Result, '', false, 'Not reconstructed');
    setShamirResultOutput(rawSssResult, '', false, 'Not reconstructed');
    updateShamirControls();
  }

  // --- Seed XOR (P2.3) ----------------------------------------------------
  // Seed XOR is deliberately a cold-local surface. The only values retained
  // here are the phrases needed for an explicit, time-limited reveal or a
  // local combine; no handler below creates a warm message or storage record.

  function setSeedXorStatus(output, state, text) {
    if (!output) {
      return;
    }
    output.setAttribute('data-state', state);
    output.textContent = text;
  }

  function maskSeedXorMnemonic(mnemonic) {
    if (!seedForge || typeof seedForge.splitMnemonic !== 'function') {
      return 'Masked phrase';
    }
    var words = seedForge.splitMnemonic(mnemonic);
    return words.map(function () { return '••••'; }).join(' ');
  }

  function clearSeedXorRevealTimer() {
    if (seedXorRevealTimer !== null) {
      window.clearTimeout(seedXorRevealTimer);
      seedXorRevealTimer = null;
    }
  }

  function clearSeedXorCombinedRevealTimer() {
    if (seedXorCombinedRevealTimer !== null) {
      window.clearTimeout(seedXorCombinedRevealTimer);
      seedXorCombinedRevealTimer = null;
    }
  }

  function renderSeedXorParts() {
    if (!seedXorGeneratedParts) {
      return;
    }
    seedXorGeneratedParts.textContent = '';
    seedXorParts.forEach(function (part) {
      var item = document.createElement('li');
      item.textContent = seedXorPartsRevealed ? part : maskSeedXorMnemonic(part);
      seedXorGeneratedParts.appendChild(item);
    });
    if (seedXorGenerated) {
      seedXorGenerated.hidden = seedXorParts.length === 0;
    }
    if (seedXorRevealButton) {
      seedXorRevealButton.disabled = !vaultCryptoReady || seedXorParts.length === 0;
      seedXorRevealButton.textContent = seedXorPartsRevealed
        ? 'Hide parts now'
        : 'Reveal parts for 30 seconds';
    }
  }

  function renderSeedXorCombined() {
    if (!seedXorCombined) {
      return;
    }
    if (!seedXorCombinedMnemonic) {
      seedXorCombined.textContent = 'Not calculated';
    } else {
      seedXorCombined.textContent = seedXorCombinedRevealed
        ? seedXorCombinedMnemonic
        : 'Masked (' + seedXorCombinedWordCount + '-word phrase)';
    }
    if (seedXorCombinedRevealButton) {
      seedXorCombinedRevealButton.disabled = !vaultCryptoReady || !seedXorCombinedMnemonic;
      seedXorCombinedRevealButton.textContent = seedXorCombinedRevealed
        ? 'Hide combined phrase now'
        : 'Reveal combined phrase for 30 seconds';
    }
  }

  function clearSeedXorGenerated() {
    clearSeedXorRevealTimer();
    seedXorParts = [];
    seedXorPartsRevealed = false;
    renderSeedXorParts();
  }

  function clearSeedXorCombined() {
    clearSeedXorCombinedRevealTimer();
    seedXorCombinedMnemonic = '';
    seedXorCombinedWordCount = 0;
    seedXorCombinedRevealed = false;
    renderSeedXorCombined();
  }

  function clearSeedXorResults() {
    clearSeedXorGenerated();
    clearSeedXorCombined();
    setSeedXorStatus(seedXorSplitStatus, 'idle', 'No Seed XOR parts generated.');
    setSeedXorStatus(seedXorCombineStatus, 'idle', 'No phrase combined.');
  }

  function updateSeedXorPartFields() {
    var ready = Boolean(seedXorPanel && seedXor && vaultCryptoReady);
    var count = seedXorCount ? Number(seedXorCount.value) : 2;
    seedXorPartInputs.forEach(function (input, index) {
      var field = input.parentElement;
      var active = index < count;
      if (field) {
        field.hidden = !active;
      }
      input.disabled = !ready || !active;
    });
  }

  function updateSeedXorControls() {
    if (!seedXor) {
      return;
    }
    var ready = Boolean(seedXorPanel && vaultCryptoReady);
    var focused = focusedReleasedSecret();
    if (seedXorPanel) {
      seedXorPanel.setAttribute('data-state', ready ? 'ready' : 'locked');
    }
    [seedXorLanguage, seedXorCount, seedXorMode, seedXorCombineButton]
      .forEach(function (control) {
        if (control) {
          control.disabled = !ready;
        }
      });
    updateSeedXorPartFields();
    renderSeedXorParts();
    renderSeedXorCombined();
    if (focused && seedXorLanguage) {
      seedXorLanguage.value = focused.language;
    }
    if (seedXorSplitButton) {
      seedXorSplitButton.disabled = !ready || !focused;
    }
  }

  function revealSeedXorParts() {
    if (seedXorParts.length === 0) {
      return;
    }
    clearSeedXorRevealTimer();
    seedXorPartsRevealed = !seedXorPartsRevealed;
    renderSeedXorParts();
    if (seedXorPartsRevealed) {
      seedXorRevealTimer = window.setTimeout(function () {
        seedXorPartsRevealed = false;
        seedXorRevealTimer = null;
        renderSeedXorParts();
      }, 30000);
    }
  }

  function revealSeedXorCombined() {
    if (!seedXorCombinedMnemonic) {
      return;
    }
    clearSeedXorCombinedRevealTimer();
    seedXorCombinedRevealed = !seedXorCombinedRevealed;
    renderSeedXorCombined();
    if (seedXorCombinedRevealed) {
      seedXorCombinedRevealTimer = window.setTimeout(function () {
        seedXorCombinedRevealed = false;
        seedXorCombinedRevealTimer = null;
        renderSeedXorCombined();
      }, 30000);
    }
  }

  function clearSeedXorSession() {
    clearSeedXorResults();
    seedXorPartInputs.forEach(function (input) { input.value = ''; });
    if (seedXorLanguage) {
      seedXorLanguage.value = 'english';
    }
    if (seedXorCount) {
      seedXorCount.value = '2';
    }
    if (seedXorMode) {
      seedXorMode.value = 'deterministic';
    }
    updateSeedXorPartFields();
  }

  function wireSeedXor() {
    if (!seedXor || !seedForge) {
      return;
    }
    if (seedXorLanguage) {
      seedXorLanguage.textContent = '';
      seedForge.languages.forEach(function (language) {
        var option = document.createElement('option');
        option.value = language.id;
        option.textContent = language.label;
        seedXorLanguage.appendChild(option);
      });
      seedXorLanguage.value = 'english';
    }
    if (seedXorPartFields) {
      seedXorPartFields.textContent = '';
      seedXorPartInputs = [];
      for (var index = 0; index < 4; index += 1) {
        var field = document.createElement('div');
        field.className = 'cold-seed-xor-part-field';
        var label = document.createElement('label');
        var input = createDeclaredSecretInput('cold-seed-xor-part-' + String(index + 1), 'recovery-share');
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.autocorrect = 'off';
        input.autocapitalize = 'off';
        label.htmlFor = input.id;
        label.textContent = 'Seed XOR part ' + String(index + 1) + ' (masked)';
        field.appendChild(label);
        field.appendChild(input);
        seedXorPartFields.appendChild(field);
        seedXorPartInputs.push(input);
      }
    }
    if (seedXorCount) {
      seedXorCount.addEventListener('change', function () {
        clearSeedXorResults();
        updateSeedXorPartFields();
      });
    }
    [seedXorLanguage, seedXorMode].forEach(function (control) {
      if (control) {
        control.addEventListener('change', clearSeedXorResults);
      }
    });
    if (seedXorSplitButton) {
      seedXorSplitButton.addEventListener('click', function () {
        var focused = focusedReleasedSecret();
        var source = focused ? focused.mnemonic : '';
        if (!focused) {
          setSeedXorStatus(seedXorSplitStatus, 'error', 'Split refused: release and focus a Seed Forge secret first.');
          updateSeedXorControls();
          return;
        }
        clearSeedXorGenerated();
        if (!source.trim()) {
          setSeedXorStatus(seedXorSplitStatus, 'error', 'Split refused: the focused Seed Forge phrase is empty.');
          updateSeedXorControls();
          return;
        }
        try {
          var result = seedXor.split(source, {
            language: focused.language,
            count: seedXorCount ? Number(seedXorCount.value) : 2,
            mode: seedXorMode ? seedXorMode.value : 'deterministic'
          });
          seedXorParts = Array.prototype.slice.call(result.parts);
          setSeedXorStatus(seedXorSplitStatus, 'ready', 'Generated ' + seedXorParts.length + ' valid Seed XOR parts. Every part is required for recovery.');
        } catch (error) {
          setSeedXorStatus(seedXorSplitStatus, 'error', 'Split refused: ' + error.message);
        }
        renderSeedXorParts();
        updateSeedXorControls();
      });
    }
    if (seedXorRevealButton) {
      seedXorRevealButton.addEventListener('click', revealSeedXorParts);
    }
    if (seedXorCombineButton) {
      seedXorCombineButton.addEventListener('click', function () {
        var count = seedXorCount ? Number(seedXorCount.value) : 2;
        var parts = seedXorPartInputs.slice(0, count).map(function (input) { return input.value; });
        seedXorPartInputs.forEach(function (input) { input.value = ''; });
        clearSeedXorCombined();
        try {
          if (parts.some(function (part) { return part.trim() === ''; })) {
            throw new Error('Every selected Seed XOR part is required.');
          }
          var result = seedXor.combine(parts, {
            language: seedXorLanguage ? seedXorLanguage.value : 'english'
          });
          seedXorCombinedMnemonic = result.mnemonic;
          seedXorCombinedWordCount = result.wordCount;
          zeroBytes(result.entropy);
          setSeedXorStatus(seedXorCombineStatus, 'ready', 'Combined ' + result.parts + ' valid parts into one checked BIP-39 phrase.');
        } catch (error) {
          setSeedXorStatus(seedXorCombineStatus, 'error', 'Combine refused: ' + error.message);
        }
        renderSeedXorCombined();
        updateSeedXorControls();
      });
    }
    if (seedXorCombinedRevealButton) {
      seedXorCombinedRevealButton.addEventListener('click', revealSeedXorCombined);
    }
    updateSeedXorControls();
  }
  // --- Verification Bench (P1.9) ------------------------------------------
  //
  // These workflows are intentionally cold-local. The only values written to
  // the DOM after a run are public fingerprints, xpubs, addresses, and an
  // enum-like match/mismatch state. Secret inputs are cleared after every
  // attempt and again through clearVaultSession() on lock or panic hide.

  function setVerificationStatus(output, state, text) {
    if (!output) {
      return;
    }
    output.setAttribute('data-state', state);
    output.textContent = text;
  }

  function verificationResultCopy(result) {
    if (result.verdict === 'match') {
      if (result.workflow === 'receive-address') {
        return 'Match: Coldbox derived ' + result.address + ' at ' + result.path + '. Compare the complete device display.';
      }
      if (result.workflow === 'xpub') {
        return 'Match: Coldbox derived the entered account xpub: ' + result.xpub + '.';
      }
      return 'Match: Coldbox derived master fingerprint ' + result.fingerprint + '.';
    }
    if (result.workflow === 'receive-address') {
      return 'Mismatch: the full address Coldbox derived (' + result.address + ') differs from the entered device value.';
    }
    if (result.workflow === 'xpub') {
      return 'Mismatch: the full account xpub Coldbox derived differs from the entered device value.';
    }
    return 'Mismatch: Coldbox derived fingerprint ' + result.fingerprint + ', not the entered device fingerprint.';
  }

  function clearLinkedVerificationWallet(statusText) {
    linkedVerificationWallet = null;
    if (verificationWalletSource) {
      verificationWalletSource.textContent = 'No Seed Forge wallet linked.';
    }
    if (verificationWalletStatus) {
      verificationWalletStatus.setAttribute('data-state', 'empty');
      verificationWalletStatus.textContent = statusText || 'Choose Use current Seed Forge wallet after generating or validating a phrase.';
    }
    if (verificationWalletFingerprint) {
      verificationWalletFingerprint.textContent = 'Not linked';
    }
    if (verificationWalletPath) {
      verificationWalletPath.textContent = 'Not linked';
    }
    if (verificationWalletXpub) {
      verificationWalletXpub.textContent = 'Not linked';
    }
    if (verificationWalletReceiveRange) {
      verificationWalletReceiveRange.textContent = 'Not linked';
    }
    if (verificationWalletChangeRange) {
      verificationWalletChangeRange.textContent = 'Not linked';
    }
    if (verificationWalletFamilies) {
      verificationWalletFamilies.textContent = '';
    }
    [
      verificationFingerprintStatus,
      verificationReceiveStatus,
      verificationXpubStatus,
      verificationBackupStatus
    ].forEach(function (output) {
      setVerificationStatus(output, 'idle', 'No verification check run.');
    });
    updateVerificationControls();
  }

  function currentSeedForgeWallet() {
    var focused = focusedReleasedSecret();
    if (!focused) {
      return null;
    }
    return {
      source: focused.label,
      id: focused.id,
      fingerprint: focused.fingerprint,
      mnemonic: focused.mnemonic,
      language: focused.language,
      bytes: focused.seedBytes
    };
  }

  function currentUnreleasedSeedForgeWallet() {
    if (releasedSecretModeActive()) {
      return null;
    }
    if (generatedSeedBytes && generatedWalletRevision > validationWalletRevision) {
      return { source: 'Generated', bytes: generatedSeedBytes, mnemonic: generatedMnemonic, language: generatedLanguage };
    }
    if (validationSeedBytes && validationWalletRevision > 0) {
      return {
        source: 'Validated',
        bytes: validationSeedBytes,
        mnemonic: validationPhraseText,
        language: seedForgeLanguage ? seedForgeLanguage.value : 'english'
      };
    }
    if (generatedSeedBytes && generatedWalletRevision > 0) {
      return { source: 'Generated', bytes: generatedSeedBytes, mnemonic: generatedMnemonic, language: generatedLanguage };
    }
    return null;
  }

  function renderLinkedVerificationWallet(wallet) {
    var family = verification.familyFor(wallet, verificationWalletScript ? verificationWalletScript.value : 'p2wpkh');
    if (verificationWalletSource) {
      verificationWalletSource.textContent = wallet.source + ' Seed Forge wallet (cold-local).';
    }
    if (verificationWalletFingerprint) {
      verificationWalletFingerprint.textContent = wallet.fingerprint;
    }
    if (verificationWalletPath) {
      verificationWalletPath.textContent = family.accountPath;
    }
    if (verificationWalletXpub) {
      verificationWalletXpub.textContent = family.xpub;
    }
    if (verificationWalletReceiveRange) {
      verificationWalletReceiveRange.textContent = family.receiveAddresses.map(function (address, index) {
        return String(index) + ': ' + address;
      }).join(' | ');
    }
    if (verificationWalletChangeRange) {
      verificationWalletChangeRange.textContent = family.changeAddresses.map(function (address, index) {
        return String(index) + ': ' + address;
      }).join(' | ');
    }
    if (verificationWalletFamilies) {
      verificationWalletFamilies.textContent = '';
      wallet.families.forEach(function (entry) {
        var item = document.createElement('li');
        item.textContent = entry.scriptType + ' ' + entry.accountPath + ' xpub: ' + entry.xpub;
        verificationWalletFamilies.appendChild(item);
      });
    }
  }

  function useCurrentSeedForgeWallet() {
    if (!vaultCryptoReady || !verification) {
      setVerificationStatus(verificationWalletStatus, 'error', 'Verification is locked because the cold-realm health checks have not passed.');
      return;
    }
    var current = currentSeedForgeWallet();
    if (!current) {
      setVerificationStatus(verificationWalletStatus, 'error', 'Generate or validate a Seed Forge wallet before linking it.');
      return;
    }
    try {
      var derived = verification.deriveWalletIdentity(current.bytes, {
        network: verificationWalletNetwork ? verificationWalletNetwork.value : 'mainnet',
        account: 0,
        count: 5
      });
      linkedVerificationWallet = Object.freeze({
        source: current.source,
        network: derived.network,
        account: derived.account,
        count: derived.count,
        fingerprint: derived.fingerprint,
        families: derived.families
      });
      renderLinkedVerificationWallet(linkedVerificationWallet);
      setVerificationStatus(verificationWalletStatus, 'ready', 'Current Seed Forge wallet linked. Comparison values below remain independent device or backup inputs.');
    } catch (error) {
      clearLinkedVerificationWallet('Seed Forge wallet linking failed closed: ' + error.message);
      setVerificationStatus(verificationWalletStatus, 'error', 'Seed Forge wallet linking failed closed: ' + error.message);
    }
    updateVerificationControls();
  }

  function clearVerificationSession(preserveInputs) {
    clearLinkedVerificationWallet('No current Seed Forge wallet is linked.');
    if (preserveInputs) {
      return;
    }
    [
      verificationFingerprintExpected,
      verificationReceiveExpected,
      verificationXpubExpected,
      verificationBackupExpected
    ].forEach(function (input) {
      if (input) {
        input.value = '';
      }
    });
    if (verificationWalletNetwork) {
      verificationWalletNetwork.value = 'mainnet';
    }
    if (verificationWalletScript) {
      verificationWalletScript.value = 'p2wpkh';
    }
    if (verificationReceiveChange) {
      verificationReceiveChange.value = '0';
    }
    if (verificationReceiveIndex) {
      verificationReceiveIndex.value = '0';
    }
  }

  function currentQrSeed() {
    var focused = focusedReleasedSecret();
    if (focused) {
      return { mnemonic: focused.mnemonic, language: focused.language };
    }
    return null;
  }

  function clearQrArtifact() {
    qrArtifact = null;
    if (qrOutput) {
      qrOutput.textContent = '';
    }
    if (qrCardCode) {
      qrCardCode.textContent = '';
    }
    if (qrCardGrid) {
      qrCardGrid.textContent = '';
    }
    if (qrCard) {
      qrCard.hidden = true;
    }
    if (qrOutputStatus) {
      qrOutputStatus.setAttribute('data-state', 'idle');
      qrOutputStatus.textContent = 'No secret QR generated in this session.';
    }
    [qrDownloadSvg, qrDownloadPng, qrPrint].forEach(function (button) {
      if (button) {
        button.disabled = true;
      }
    });
  }

  function renderQrCardGrid(wordCount) {
    if (!qrCardGrid) {
      return;
    }
    qrCardGrid.textContent = '';
    for (var index = 0; index < wordCount; index += 1) {
      var cell = document.createElement('span');
      cell.className = 'cold-qr-card-cell';
      cell.textContent = String(index + 1);
      qrCardGrid.appendChild(cell);
    }
  }

  function renderQrPng(code) {
    if (!code || typeof document.createElement !== 'function') {
      throw new Error('PNG export is unavailable in this sealed browser.');
    }
    var canvas = document.createElement('canvas');
    var cellSize = 6;
    var margin = 24;
    var moduleCount = code.getModuleCount();
    canvas.width = moduleCount * cellSize + margin * 2;
    canvas.height = canvas.width;
    var context = canvas.getContext('2d');
    if (!context || typeof canvas.toDataURL !== 'function') {
      throw new Error('PNG export is unavailable in this sealed browser.');
    }
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#000000';
    for (var row = 0; row < moduleCount; row += 1) {
      for (var column = 0; column < moduleCount; column += 1) {
        if (code.isDark(row, column)) {
          context.fillRect(
            margin + column * cellSize,
            margin + row * cellSize,
            cellSize,
            cellSize
          );
        }
      }
    }
    return canvas.toDataURL('image/png');
  }

  function downloadDataUrl(dataUrl, filename) {
    if (typeof dataUrl !== 'string' || dataUrl.indexOf('data:') !== 0) {
      throw new Error('The QR export was not created.');
    }
    if (!window.Blob || !window.URL || typeof window.URL.createObjectURL !== 'function') {
      throw new Error('QR export downloads are unavailable in this sealed browser.');
    }
    var comma = dataUrl.indexOf(',');
    if (comma < 0) {
      throw new Error('The QR export data is malformed.');
    }
    var metadata = dataUrl.slice(5, comma);
    var payload = dataUrl.slice(comma + 1);
    var mimeType = metadata.split(';')[0] || 'application/octet-stream';
    var blob;
    if (metadata.indexOf(';base64') >= 0) {
      if (typeof window.atob !== 'function') {
        throw new Error('QR export downloads are unavailable in this sealed browser.');
      }
      var binary = window.atob(payload);
      var bytes = new Uint8Array(binary.length);
      for (var index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      blob = new window.Blob([bytes], { type: mimeType });
    } else {
      blob = new window.Blob([decodeURIComponent(payload)], { type: mimeType });
    }
    var url = window.URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { window.URL.revokeObjectURL(url); }, 0);
  }

  function updateQrControls() {
    if (!qrStudio || !qr) {
      return;
    }
    var seed = currentQrSeed();
    var ready = vaultCryptoReady && Boolean(seed) && Boolean(qrSecretConfirm && qrSecretConfirm.checked);
    qrStudio.setAttribute('data-state', vaultCryptoReady ? 'ready' : 'locked');
    [qrLanguage, qrFormat, qrLayout, qrGrid, qrSecretConfirm].forEach(function (control) {
      if (control) {
        control.disabled = !vaultCryptoReady;
      }
    });
    [qrStandardButton, qrCompactButton].forEach(function (button) {
      if (button) {
        button.disabled = !ready;
      }
    });
    var focused = focusedReleasedSecret();
    if (focused && qrLanguage) {
      qrLanguage.value = focused.language;
    }
  }

  function renderQrArtifact(format, code, wordCount) {
    var layout = qrLayout ? qrLayout.value : 'a4-letter';
    var gridEnabled = Boolean(qrGrid && qrGrid.checked);
    var svg = qr.renderSvg(code, {
      cellSize: 4,
      margin: 4,
      title: format + ' SeedQR (secret; cold-only)',
      alt: format + ' SeedQR; plaintext seed payload'
    });
    qrArtifact = {
      format: format,
      code: code,
      svg: svg,
      png: null,
      layout: layout,
      wordCount: wordCount
    };
    if (qrOutput) {
      qrOutput.innerHTML = svg;
    }
    if (qrCardCode) {
      qrCardCode.innerHTML = svg;
    }
    if (qrCard) {
      qrCard.setAttribute('data-layout', layout);
      qrCard.setAttribute('data-grid', gridEnabled ? 'on' : 'off');
      qrCard.hidden = false;
    }
    renderQrCardGrid(wordCount);
    if (qrOutputStatus) {
      qrOutputStatus.setAttribute('data-state', 'ready');
      qrOutputStatus.textContent = format + ' generated in the sealed realm ('
        + String(qr.payloadLength(code)) + '×' + String(qr.payloadLength(code))
        + ' modules). It is plaintext seed material: keep cameras and networked devices away.';
    }
    [qrDownloadSvg, qrDownloadPng, qrPrint].forEach(function (button) {
      if (button) {
        button.disabled = false;
      }
    });
  }

  function generateSeedQr(format) {
    if (!qr || !qrSecretConfirm || !qrSecretConfirm.checked) {
      return;
    }
    var seed = currentQrSeed();
    if (!seed || !seedForge) {
      if (qrOutputStatus) {
        qrOutputStatus.setAttribute('data-state', 'error');
        qrOutputStatus.textContent = 'Generate or validate a complete phrase in Seed Forge first.';
      }
      return;
    }
    try {
      var indices = seedForge.mnemonicToWordIndices(seed.mnemonic, seed.language);
      var code;
      if (format === 'Compact SeedQR') {
        var entropy = seedForge.mnemonicToEntropy(seed.mnemonic, seed.language);
        try {
          code = qr.createCompactSeedQr(entropy);
        } finally {
          if (entropy && typeof entropy.fill === 'function') {
            entropy.fill(0);
          }
        }
      } else {
        if (seed.language !== 'english') {
          throw new Error('Standard SeedQR is defined only for the English BIP-39 wordlist; use Compact SeedQR for non-English phrases.');
        }
        code = qr.createSeedQr(indices, { errorCorrection: 'M' });
      }
      renderQrArtifact(format, code, indices.length);
    } catch (error) {
      clearQrArtifact();
      if (qrOutputStatus) {
        qrOutputStatus.setAttribute('data-state', 'error');
        qrOutputStatus.textContent = 'QR generation failed closed: ' + error.message;
      }
    }
    updateQrControls();
  }

  function wireQrStudio() {
    if (!qrStudio || !qr) {
      return;
    }
    if (qrLanguage && seedForge && Array.isArray(seedForge.languages)) {
      qrLanguage.textContent = '';
      seedForge.languages.forEach(function (language) {
        var option = document.createElement('option');
        option.value = language.id;
        option.textContent = language.label;
        qrLanguage.appendChild(option);
      });
      qrLanguage.value = 'english';
    }
    if (qrLanguage) {
      qrLanguage.addEventListener('change', function () {
        clearQrArtifact();
        updateQrControls();
      });
    }
    if (qrSecretConfirm) {
      qrSecretConfirm.addEventListener('change', function () {
        if (!qrSecretConfirm.checked) {
          clearQrArtifact();
        }
        updateQrControls();
      });
    }
    if (qrStandardButton) {
      qrStandardButton.addEventListener('click', function () {
        generateSeedQr('SeedQR');
      });
    }
    if (qrCompactButton) {
      qrCompactButton.addEventListener('click', function () {
        generateSeedQr('Compact SeedQR');
      });
    }
    if (qrDownloadSvg) {
      qrDownloadSvg.addEventListener('click', function () {
        if (!qrArtifact) {
          return;
        }
        var dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(qrArtifact.svg);
        downloadDataUrl(dataUrl, 'coldbox-seedqr.svg');
      });
    }
    if (qrDownloadPng) {
      qrDownloadPng.addEventListener('click', function () {
        if (!qrArtifact) {
          return;
        }
        try {
          if (!qrArtifact.png) {
            qrArtifact.png = renderQrPng(qrArtifact.code);
          }
          downloadDataUrl(qrArtifact.png, 'coldbox-seedqr.png');
        } catch (error) {
          if (qrOutputStatus) {
            qrOutputStatus.setAttribute('data-state', 'error');
            qrOutputStatus.textContent = 'PNG export failed closed: ' + error.message;
          }
        }
      });
    }
    if (qrPrint) {
      qrPrint.addEventListener('click', function () {
        if (qrArtifact && typeof window.print === 'function') {
          window.print();
        }
      });
    }
    clearQrArtifact();
    updateQrControls();
  }

  function updateVerificationControls() {
    if (!verification || !verificationPanel) {
      return;
    }
    var ready = vaultCryptoReady;
    var linked = ready && Boolean(linkedVerificationWallet);
    verificationPanel.setAttribute('data-state', ready ? 'ready' : 'locked');
    verificationPanel.setAttribute('data-linked-wallet', linked ? 'ready' : 'empty');
    if (verificationWalletUseButton) {
      verificationWalletUseButton.disabled = !ready || !currentSeedForgeWallet();
    }
    [
      verificationWalletNetwork,
      verificationWalletScript,
      verificationFingerprintExpected,
      verificationFingerprintRun,
      verificationReceiveChange,
      verificationReceiveIndex,
      verificationReceiveExpected,
      verificationReceiveRun,
      verificationXpubExpected,
      verificationXpubRun,
      verificationBackupExpected,
      verificationBackupRun
    ].forEach(function (control) {
      if (control) {
        control.disabled = !linked;
      }
    });
    if (verificationWalletNetwork) {
      verificationWalletNetwork.disabled = !ready;
    }
    if (verificationWalletScript) {
      verificationWalletScript.disabled = !ready;
    }
  }

  function runVerificationWorkflow(runButton, statusOutput, work) {
    if (!vaultCryptoReady || !verification) {
      setVerificationStatus(statusOutput, 'error', 'Verification is locked because the cold-realm health checks have not passed.');
      return;
    }
    if (runButton) {
      runButton.disabled = true;
    }
    setVerificationStatus(statusOutput, 'checking', 'Deriving inside the sealed realm…');
    try {
      var result = work();
      setVerificationStatus(statusOutput, result.verdict, verificationResultCopy(result));
    } catch (error) {
      setVerificationStatus(statusOutput, 'error', 'Verification failed closed: ' + error.message);
    } finally {
      updateVerificationControls();
    }
  }

  function wireVerification() {
    if (!verification) {
      return;
    }
    if (verificationWalletUseButton) {
      verificationWalletUseButton.addEventListener('click', useCurrentSeedForgeWallet);
    }
    if (verificationWalletNetwork) {
      verificationWalletNetwork.addEventListener('change', function () {
        clearLinkedVerificationWallet('Network changed; link the current Seed Forge wallet again.');
      });
    }
    if (verificationWalletScript) {
      verificationWalletScript.addEventListener('change', function () {
        if (linkedVerificationWallet) {
          renderLinkedVerificationWallet(linkedVerificationWallet);
        }
        updateVerificationControls();
      });
    }
    if (verificationFingerprintForm) {
      verificationFingerprintRun.addEventListener('click', function () {
        runVerificationWorkflow(verificationFingerprintRun, verificationFingerprintStatus, function () {
          return verification.compareFingerprint(linkedVerificationWallet.fingerprint, verificationFingerprintExpected.value);
        });
      });
    }
    if (verificationReceiveForm) {
      verificationReceiveRun.addEventListener('click', function () {
        runVerificationWorkflow(verificationReceiveRun, verificationReceiveStatus, function () {
          var family = verification.familyFor(linkedVerificationWallet, verificationWalletScript.value);
          var change = Number(verificationReceiveChange.value);
          var index = Number(verificationReceiveIndex.value);
          if (!Number.isInteger(change) || (change !== 0 && change !== 1)
            || !Number.isInteger(index) || index < 0 || index >= linkedVerificationWallet.count) {
            throw new RangeError('Address range is outside the linked Seed Forge wallet.');
          }
          var addresses = change === 0 ? family.receiveAddresses : family.changeAddresses;
          return verification.compareAddress(addresses[index], verificationReceiveExpected.value, {
            network: linkedVerificationWallet.network,
            scriptType: family.scriptType,
            path: family.accountPath + '/' + String(change) + '/' + String(index)
          });
        });
      });
    }
    if (verificationXpubForm) {
      verificationXpubRun.addEventListener('click', function () {
        runVerificationWorkflow(verificationXpubRun, verificationXpubStatus, function () {
          var family = verification.familyFor(linkedVerificationWallet, verificationWalletScript.value);
          return verification.compareXpub(family.xpub, verificationXpubExpected.value, {
            network: linkedVerificationWallet.network,
            scriptType: family.scriptType
          });
        });
      });
    }
    if (verificationBackupForm) {
      verificationBackupRun.addEventListener('click', function () {
        runVerificationWorkflow(verificationBackupRun, verificationBackupStatus, function () {
          return verification.compareFingerprint(linkedVerificationWallet.fingerprint, verificationBackupExpected.value);
        });
      });
    }
    updateVerificationControls();
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
        var input = createDeclaredSecretInput('cold-seed-forge-word-' + String(index + 1), 'seed-validation');
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.setAttribute('autocorrect', 'off');
        input.setAttribute('autocapitalize', 'off');
        input.setAttribute('aria-label', 'Seed word ' + String(index + 1));
        label.htmlFor = input.id;
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
    if (seedForgeGeneratedReleaseButton) {
      seedForgeGeneratedReleaseButton.addEventListener('click', function () {
        releaseSeedForgeSecret('generated');
      });
    }
    if (seedForgeValidationReleaseButton) {
      seedForgeValidationReleaseButton.addEventListener('click', function () {
        releaseSeedForgeSecret('validated');
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

  function clearVaultRecoveryRevealTimer() {
    if (vaultRecoveryRevealTimer !== null) {
      window.clearTimeout(vaultRecoveryRevealTimer);
      vaultRecoveryRevealTimer = null;
    }
  }

  function recoveryMetadataSummary(metadata) {
    if (!metadata || !Array.isArray(metadata.groups)) {
      return 'No recovery-share set configured.';
    }
    if (metadata.groups.length === 1) {
      return 'Configured: ' + String(metadata.groups[0].threshold) + ' of '
        + String(metadata.groups[0].count) + ' shares are needed.';
    }
    return 'Configured: ' + String(metadata.groupThreshold) + ' of '
      + String(metadata.groups.length) + ' share groups are needed.';
  }

  function renderVaultRecovery() {
    var metadata = null;
    if (currentVaultSession && typeof currentVaultSession.getRecoveryShareMetadata === 'function') {
      try {
        metadata = currentVaultSession.getRecoveryShareMetadata();
      } catch (error) {
        metadata = null;
      }
    }
    if (vaultRecoveryStatus) {
      vaultRecoveryStatus.textContent = recoveryMetadataSummary(metadata);
    }
    if (vaultRecoveryReplaceLabel) {
      vaultRecoveryReplaceLabel.hidden = !metadata;
    }
    if (vaultRecoveryOutput) {
      vaultRecoveryOutput.value = vaultRecoverySharesRevealed
        ? vaultRecoveryShareText
        : (vaultRecoveryShareText ? 'Masked recovery shares. Reveal only while transcribing them.' : '');
    }
    if (vaultRecoveryGenerated) {
      vaultRecoveryGenerated.hidden = !vaultRecoveryShareText;
    }
    if (vaultRecoveryRevealButton) {
      vaultRecoveryRevealButton.disabled = !vaultCryptoReady || !vaultRecoveryShareText;
      vaultRecoveryRevealButton.textContent = vaultRecoverySharesRevealed
        ? 'Hide shares now'
        : 'Reveal shares for 30 seconds';
    }
  }

  function clearVaultRecoveryState() {
    clearVaultRecoveryRevealTimer();
    vaultRecoveryShareText = '';
    vaultRecoverySharesRevealed = false;
    if (vaultRecoveryPassphrase) {
      vaultRecoveryPassphrase.value = '';
    }
    if (vaultRecoveryReplace) {
      vaultRecoveryReplace.checked = false;
    }
    if (vaultRecoveryInput) {
      vaultRecoveryInput.value = '';
    }
    renderVaultRecovery();
  }

  function revealVaultRecoveryShares() {
    if (!vaultRecoveryShareText) {
      return;
    }
    clearVaultRecoveryRevealTimer();
    vaultRecoverySharesRevealed = !vaultRecoverySharesRevealed;
    renderVaultRecovery();
    if (vaultRecoverySharesRevealed) {
      vaultRecoveryRevealTimer = window.setTimeout(function () {
        vaultRecoverySharesRevealed = false;
        vaultRecoveryRevealTimer = null;
        renderVaultRecovery();
      }, 30000);
    }
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
    renderVaultRecovery();
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

  function updateVaultRecoveryControls() {
    var ready = vaultControlsReady();
    var offlineUnlocked = ready && !onlineMode && vaultUnlocked && currentVaultSession
      && typeof currentVaultSession.configureRecoveryShares === 'function'
      && (typeof currentVaultSession.canConfigureRecoveryShares !== 'function'
        || currentVaultSession.canConfigureRecoveryShares());
    var pendingOffline = ready && !onlineMode && !vaultUnlocked && Boolean(pendingVaultBytes);
    if (vaultRecoveryGroupThreshold) {
      vaultRecoveryGroupThreshold.disabled = !offlineUnlocked || vaultBusy;
    }
    if (vaultRecoveryPassphrase) {
      vaultRecoveryPassphrase.disabled = !offlineUnlocked || vaultBusy;
    }
    if (vaultRecoveryGroupCount) {
      vaultRecoveryGroupCount.disabled = !offlineUnlocked || vaultBusy;
    }
    if (vaultRecoveryReplace) {
      vaultRecoveryReplace.disabled = !offlineUnlocked || vaultBusy;
    }
    if (vaultRecoveryConfigureButton) {
      vaultRecoveryConfigureButton.disabled = !offlineUnlocked || vaultBusy;
    }
    if (vaultRecoveryInput) {
      vaultRecoveryInput.disabled = !pendingOffline || vaultBusy;
    }
    if (vaultRecoveryUnlockButton) {
      vaultRecoveryUnlockButton.disabled = !pendingOffline || vaultBusy;
    }
    renderVaultRecovery();
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
    if (vaultNameInput) {
      vaultNameInput.disabled = !ready || vaultBusy || (!createPrepared && !vaultUnlocked);
      if (vaultUnlocked && currentVaultSession && typeof currentVaultSession.getPublicData === 'function') {
        var currentNameData = currentVaultSession.getPublicData() || {};
        vaultNameInput.value = typeof currentNameData.name === 'string' ? currentNameData.name : '';
      } else if (createPrepared) {
        vaultNameInput.value = pendingVaultName;
      }
    }
    if (vaultNameSaveButton) {
      vaultNameSaveButton.disabled = !ready || vaultBusy || !vaultUnlocked || !currentVaultSession || !vaultNameInput;
    }
    if (vaultKdfProfile) {
      vaultKdfProfile.disabled = !ready || vaultBusy || vaultUnlocked || !createPrepared;
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
    updateVaultRecoveryControls();
    updateBackupVerificationControls();
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

  function findPublicRecord(records, id) {
    return Array.isArray(records) ? records.filter(function (record) { return record.id === id; })[0] || null : null;
  }

  function handleAddressVerifyRequest(message) {
    if (!vaultUnlocked || !currentVaultSession || typeof currentVaultSession.getPublicData !== 'function') {
      postVaultMessage(message.id, 'address.verifyResult', {
        addressId: message.payload.addressId,
        outcome: 'vault-locked',
        verificationState: 'unverified'
      });
      return;
    }
    var publicData = currentVaultSession.getPublicData() || {};
    var address = findPublicRecord(publicData.addresses, message.payload.addressId);
    var account = address ? findPublicRecord(publicData.accounts, address.accountId) : null;
    var candidate = message.payload.candidate;
    var verificationState = address && address.verificationState ? address.verificationState : 'unverified';
    var comparison = addressVerification && address
      ? addressVerification.compare(candidate, address.address)
      : { outcome: 'no-record', divergenceIndex: -1 };
    var allMatches = addressVerification && address
      ? addressVerification.findRecord(candidate, publicData.addresses || [])
      : null;
    if (address && allMatches && allMatches.id !== address.id) {
      comparison.outcome = 'different-account';
    }

    // A released secret is a cold-only session object. Warm-origin address
    // verification may still compare the candidate with public registry data,
    // but it must not derive or persist a public value from the focused
    // released secret. Before release, preserve the existing Seed Forge
    // re-derivation path; the cold-only verification panel uses the focused
    // secret through currentSeedForgeWallet().
    var current = releasedSecretModeActive() ? null : currentUnreleasedSeedForgeWallet();
    if (address && account && current && verification && addressVerification) {
      try {
        var wallet = findPublicRecord(publicData.wallets, account.walletId);
        var derivationResult = verification.deriveRegistryAddress(current.bytes, account, wallet, address);
        if (derivationResult && addressVerification.compare(derivationResult.address, address.address).outcome === 'match') {
          verificationState = 'cold-verified';
          var verifiedAt = new Date().toISOString();
          var nextPublicData = verification.markAddressColdVerified(
            publicData,
            address.id,
            verifiedAt,
            derivationResult.xpub
          );
          var updated = currentVaultSession.replacePublicData(nextPublicData);
          postVaultMessage(nextVaultMessageId('verify-state'), 'publicData.updated', {
            publicCompartment: publicCompartmentProjection(updated)
          });
        }
      } catch (error) {
        // A missing seed linkage, unsupported account, or derivation mismatch
        // is not permission to claim verification. The comparison result and
        // existing state remain visible, and the warm shell receives no error prose.
      }
    }
    postVaultMessage(message.id, 'address.verifyResult', {
      addressId: message.payload.addressId,
      outcome: comparison.outcome,
      divergenceIndex: Number.isInteger(comparison.divergenceIndex) ? comparison.divergenceIndex : -1,
      verificationState: verificationState
    });
  }

  function sendVaultOpened(id, publicData) {
    var projection = publicCompartmentProjection(publicData);
    postVaultMessage(id || nextVaultMessageId('opened'), 'vault.opened', {
      publicCompartment: projection
    });
  }

  function publicCompartmentProjection(publicData) {
    var projection = publicData && typeof publicData === 'object' ? JSON.parse(JSON.stringify(publicData)) : {};
    delete projection.name;
    return projection;
  }

  function clearCreatePreparation() {
    createPrepared = false;
    pendingVaultName = '';
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
    vaultSessionGeneration += 1;
    vaultBusy = false;
    clearReleasedSecrets('the vault session boundary');
    updateSeedForgeControls();
    updateSeedXorControls();
    updateVerificationControls();
    updateQrControls();
    updateCodex32Controls();
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
    clearVaultRecoveryState();
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

  function configureVaultRecoveryShares() {
    if (!currentVaultSession || !vaultUnlocked || onlineMode
      || typeof currentVaultSession.configureRecoveryShares !== 'function') {
      setVaultStatus('locked', 'Recovery shares can be configured only in an offline unlocked vault.');
      return;
    }
    var operationSession = currentVaultSession;
    var operationGeneration = vaultSessionGeneration;
    var threshold = vaultRecoveryGroupThreshold ? Number(vaultRecoveryGroupThreshold.value) : NaN;
    var count = vaultRecoveryGroupCount ? Number(vaultRecoveryGroupCount.value) : NaN;
    if (!Number.isInteger(threshold) || !Number.isInteger(count)
      || threshold < 1 || threshold > count || count > 16) {
      setVaultStatus('pending', 'Choose a whole-number threshold no greater than the number of shares.');
      return;
    }
    var metadata = null;
    if (typeof currentVaultSession.getRecoveryShareMetadata === 'function') {
      metadata = currentVaultSession.getRecoveryShareMetadata();
    }
    if (metadata && (!vaultRecoveryReplace || !vaultRecoveryReplace.checked)) {
      setVaultStatus('pending', 'This vault already has recovery shares. Check the replacement box before generating a new set.');
      return;
    }
    var normalPassphrase = vaultRecoveryPassphrase ? vaultRecoveryPassphrase.value : '';
    if (!normalPassphrase) {
      setVaultStatus('pending', 'Enter the normal vault unlock phrase to authorize recovery-share generation.');
      if (vaultRecoveryPassphrase) {
        vaultRecoveryPassphrase.focus();
      }
      return;
    }
    var activeKeyfile = keyfileToggle && keyfileToggle.checked ? keyfileBytes : null;
    if (keyfileToggle && keyfileToggle.checked && !activeKeyfile) {
      setVaultStatus('pending', 'This vault uses a keyfile; keep the selected keyfile available before generating shares.');
      return;
    }
    vaultBusy = true;
    updateVaultControls();
    setVaultStatus('pending', 'Generating recovery shares inside the sealed realm...');
    var resultPromise;
    try {
      resultPromise = operationSession.configureRecoveryShares({
        normalPassphrase: normalPassphrase,
        keyfile: activeKeyfile,
        groupThreshold: 1,
        groups: [{ threshold: threshold, count: count }],
        extendableBackupFlag: 1,
        iterationExponent: 0,
        passphrase: '',
        replace: Boolean(vaultRecoveryReplace && vaultRecoveryReplace.checked)
      });
    } catch (error) {
      setVaultStatus('unlocked', 'Recovery-share generation failed; the existing vault remains unchanged.');
      normalPassphrase = '';
      if (vaultRecoveryPassphrase) {
        vaultRecoveryPassphrase.value = '';
      }
      vaultBusy = false;
      updateVaultControls();
      return;
    }
    Promise.resolve(resultPromise).then(function (result) {
      if (operationGeneration !== vaultSessionGeneration
        || operationSession !== currentVaultSession || !vaultUnlocked || onlineMode) {
        return;
      }
      if (!result || !Array.isArray(result.shares) || result.shares.length === 0) {
        throw new Error('No recovery shares were generated.');
      }
      vaultRecoveryShareText = result.shares.join('\n');
      vaultRecoverySharesRevealed = false;
      if (vaultRecoveryReplace) {
        vaultRecoveryReplace.checked = false;
      }
      renderVaultRecovery();
      if (!postVaultMessage(nextVaultMessageId('recovery-configured'), 'vault.dirty', { dirty: true })) {
        lockVaultSession(null, 'Vault locked because the recovery-share acknowledgement failed.', true);
        return;
      }
      setVaultStatus('unlocked', 'Recovery shares generated in the sealed realm. Reveal and transcribe them, then save the vault.');
      normalPassphrase = '';
      if (vaultRecoveryPassphrase) {
        vaultRecoveryPassphrase.value = '';
      }
      recordVaultActivity();
    }).catch(function () {
      if (operationGeneration !== vaultSessionGeneration
        || operationSession !== currentVaultSession || !vaultUnlocked || onlineMode) {
        return;
      }
      setVaultStatus('unlocked', 'Recovery-share generation failed; the existing vault remains unchanged.');
      normalPassphrase = '';
      if (vaultRecoveryPassphrase) {
        vaultRecoveryPassphrase.value = '';
      }
    }).then(function () {
      normalPassphrase = '';
      if (operationGeneration === vaultSessionGeneration && operationSession === currentVaultSession) {
        vaultBusy = false;
        updateVaultControls();
      }
    });
  }

  function unlockLoadedVaultWithRecoveryShares() {
    if (!vaultLayer || typeof vaultLayer.openSession !== 'function'
      || !pendingVaultBytes || !vaultRecoveryInput) {
      setVaultStatus('locked', 'Load an encrypted vault before using recovery shares.');
      return;
    }
    if (onlineMode) {
      setVaultStatus('pending', 'Recovery-share unlocking is available only after the warm shell confirms offline mode.');
      return;
    }
    var shares = vaultRecoveryInput.value.split(/\r?\n/).map(function (share) {
      return share.trim();
    }).filter(function (share) { return share.length > 0; });
    if (shares.length === 0) {
      setVaultStatus('pending', 'Enter the recovery shares, one per line, inside the sealed realm.');
      vaultRecoveryInput.focus();
      return;
    }
    var bytes = pendingVaultBytes;
    var responseId = pendingOpenId || nextVaultMessageId('recovery-opened');
    vaultRecoveryInput.value = '';
    vaultBusy = true;
    updateVaultControls();
    setVaultStatus('pending', 'Authenticating recovery shares inside the sealed realm...');
    vaultLayer.openSession(bytes, undefined, 'offline', null, shares).then(function (session) {
      currentVaultSession = session;
      currentVaultBytes = new Uint8Array(bytes);
      zeroBytes(pendingVaultBytes);
      pendingVaultBytes = null;
      pendingOpenId = null;
      vaultUnlocked = true;
      if (passphraseInput) {
        passphraseInput.value = '';
      }
      clearVaultRecoveryState();
      setSessionEvidence('unlocked');
      setVaultStatus('unlocked', 'Encrypted vault opened with recovery shares.');
      sendVaultOpened(responseId, session.publicData);
      sendVaultStatus(false);
      renderSecretNotes();
      scheduleIdleLock();
    }, function () {
      setVaultStatus('pending', 'Recovery-share unlock failed. The vault remains locked; check the threshold and try again.');
      sendVaultError(responseId, 'vault-corrupt');
    }).then(function () {
      vaultBusy = false;
      updateVaultControls();
    }, function () {
      vaultBusy = false;
      updateVaultControls();
    });
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
      setVaultStatus('locked', 'Prepare vault creation from the warm Vault page before creating a new vault.');
      return;
    }
    var vaultName = vaultNameInput ? vaultNameInput.value.trim() : '';
    if (!vaultName || vaultName.length > 80 || /[\u0000-\u001f\u007f]/.test(vaultName)) {
      setVaultStatus('locked', 'Enter a bounded vault name before creating it.');
      if (vaultNameInput) { vaultNameInput.focus(); }
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
        profile: vaultKdfProfile && vaultKdfProfile.value ? vaultKdfProfile.value : 'standard',
        publicData: { id: generateVaultUuid(), name: vaultName }
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
        if (vaultNameInput) { vaultNameInput.value = vaultName; }
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

  function saveVaultName() {
    if (!currentVaultSession || !vaultNameInput || typeof currentVaultSession.renameVault !== 'function') {
      return;
    }
    try {
      var name = vaultNameInput.value.trim();
      currentVaultSession.renameVault(name);
      setVaultStatus('unlocked', 'Vault name updated inside the sealed realm.', 'The encrypted public compartment changed. Save the vault to persist the rename.', 'Renamed');
      recordVaultActivity();
    } catch (error) {
      setVaultStatus('unlocked', 'Vault name was not changed.', 'Use 1–80 characters without control characters.', 'Name rejected');
    }
    updateVaultControls();
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
          publicCompartment: publicCompartmentProjection(updatedPublicData)
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
    if (message.type === 'address.verifyRequest') {
      handleAddressVerifyRequest(message);
      return;
    }
    if (message.type === 'backup.verifyRequest') {
      handleBackupVerificationRequest(message);
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
      if (wasOnline !== onlineMode && onlineMode && vaultRecoveryInput) {
        vaultRecoveryInput.value = '';
      }
      if (wasOnline !== onlineMode && vaultUnlocked) {
        lockVaultSession(null, 'Vault locked because network mode changed.', true);
      }
      updateVaultControls();
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
    updateSeedXorControls();
    updateShamirControls();
    updateVerificationControls();
    updateQrControls();
    updateCodex32Controls();
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

  if (!readyMarker || !window.parent || !protocol || !airgap || !capabilities || !cryptoLayer || !vaultLayer || !entropyLab || !seedForge || !seedXor || !codex32 || !shamir || !slip39 || !derivation || !verification || !qr) {
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
  if (vaultNameSaveButton) {
    vaultNameSaveButton.addEventListener('click', saveVaultName);
  }
  if (vaultRecoveryConfigureButton) {
    vaultRecoveryConfigureButton.addEventListener('click', configureVaultRecoveryShares);
  }
  if (vaultRecoveryRevealButton) {
    vaultRecoveryRevealButton.addEventListener('click', revealVaultRecoveryShares);
  }
  if (vaultRecoveryUnlockButton) {
    vaultRecoveryUnlockButton.addEventListener('click', unlockLoadedVaultWithRecoveryShares);
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
  if (activeSecretRevealButton) {
    activeSecretRevealButton.addEventListener('click', revealActiveSecret);
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
  if (releasedSecretClearButton) {
    releasedSecretClearButton.addEventListener('click', function () {
      clearReleasedSecrets('the Clear released secrets action');
    });
  }
  document.addEventListener('pointerdown', recordVaultActivity);
  document.addEventListener('input', recordVaultActivity);
  document.addEventListener('keydown', function (event) {
    recordVaultActivity();
    var clearShortcut = (event.ctrlKey || event.metaKey)
      && event.altKey
      && event.shiftKey
      && typeof event.key === 'string'
      && event.key.toLowerCase() === 'l';
    if (clearShortcut) {
      event.preventDefault();
      clearReleasedSecrets('the keyboard shortcut');
      return;
    }
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

  function coldViewFromTarget(target) {
    var normalized = String(target || '').replace(/^#/, '').toLowerCase();
    var byTarget = {
      'cold-group-session': 'session',
      'cold-group-entropy': 'entropy',
      'cold-group-seed-forge': 'seed-forge',
      'cold-group-backups': 'backups',
      'cold-group-qr': 'qr',
      'cold-group-recovery': 'recovery',
      'cold-verification': 'verification',
      'cold-secret-switcher': 'secret',
      'cold-tool-hub': 'hub'
    };
    return byTarget[normalized] || normalized || 'hub';
  }

  function coldInitialView() {
    var namedView = window.name && /^[a-z-]+$/.test(window.name) ? window.name : '';
    var hashTarget = window.location.hash.replace(/^#/, '').split('/')[0];
    return namedView || coldViewFromTarget(hashTarget);
  }

  function renderColdView(view) {
    var groupByView = {
      session: 'session',
      unlock: 'session',
      conceal: 'session',
      notes: 'session',
      entropy: 'entropy',
      'seed-forge': 'seed-forge',
      forge: 'seed-forge',
      validate: 'seed-forge',
      backups: 'backups',
      shares: 'backups',
      qr: 'qr',
      recovery: 'recovery',
      // Verify Bench is nested inside the recovery workspace so that the
      // shared rail and the direct verification links select the same visible
      // document region. Leaving this as a non-existent group used to hide
      // every cold section and leave only the halftone background.
      verification: 'recovery',
      paths: 'recovery',
      addresses: 'recovery',
      verifybench: 'recovery'
    };
    var selectedGroup = groupByView[view] || null;
    var showActiveSecret = view === 'secret';
    var groups = Array.prototype.slice.call(document.querySelectorAll('.cold-tool-group'));
    groups.forEach(function (group) {
      var selected = selectedGroup && group.getAttribute('data-cold-group') === selectedGroup;
      group.hidden = !selected;
      group.setAttribute('aria-hidden', String(!selected));
    });
    var hub = document.getElementById('cold-tool-hub');
    if (hub) {
      var showHub = !selectedGroup && !showActiveSecret;
      hub.hidden = !showHub;
      hub.setAttribute('aria-hidden', String(!showHub));
    }
    if (activeSecretPanel) {
      activeSecretPanel.hidden = !showActiveSecret;
      activeSecretPanel.setAttribute('aria-hidden', String(!showActiveSecret));
    }
    document.documentElement.setAttribute('data-cold-view', view || 'hub');
  }

  function selectColdViewFromHash() {
    var hash = window.location.hash.replace(/^#/, '');
    renderColdView(coldViewFromTarget(hash.split('/')[0]));
  }

  renderColdView(coldInitialView());
  window.addEventListener('hashchange', selectColdViewFromHash);
  installThrowContract();
  wireSeedForge();
  wireSeedXor();
  wireCodex32();
  wireShamir();
  wireSlip39();
  wireBackupVerification();
  wireQrStudio();
  wireEntropyLab();
  wireVerification();
  renderReleasedSecretSwitcher();
  window.addEventListener('pagehide', function () {
    clearReleasedSecrets('realm teardown');
  });
  // The sandboxed srcdoc document has the warm file as its fallback base URL,
  // so a plain fragment anchor can resolve outside this realm. Route local
  // cold links explicitly through this document's hash; the two special
  // data-cold-more-target links below keep their focused-panel behavior.
  document.addEventListener('click', function (event) {
    var link = event.target && typeof event.target.closest === 'function'
      ? event.target.closest('a[href]')
      : null;
    if (!link || link.hasAttribute('data-cold-more-target')) {
      return;
    }
    var href = link.getAttribute('href') || '';
    if (href.charAt(0) !== '#') {
      return;
    }
    event.preventDefault();
    window.location.hash = href;
  });
  document.addEventListener('click', function (event) {
    var link = event.target && typeof event.target.closest === 'function'
      ? event.target.closest('a[data-cold-more-target]')
      : null;
    if (!link) {
      return;
    }
    var targetId = link.getAttribute('data-cold-more-target');
    var target = targetId ? document.getElementById(targetId) : null;
    if (!target) {
      return;
    }
    renderColdView('session');
    event.preventDefault();
    target.hidden = false;
    target.setAttribute('tabindex', '-1');
    target.scrollIntoView({ block: 'nearest' });
    if (targetId === 'cold-concealment-controls') {
      if (concealmentStatus && !vaultUnlocked) {
        concealmentStatus.textContent = 'Unlock the vault before revealing hidden records.';
      }
      if (vaultUnlocked && concealmentPassphrase) {
        concealmentPassphrase.focus();
      } else {
        var lockedStatus = document.getElementById('cold-vault-status');
        if (lockedStatus) {
          lockedStatus.setAttribute('tabindex', '-1');
          lockedStatus.focus();
        }
      }
    } else if (targetId === 'cold-secret-notes') {
      target.focus();
    } else if (targetId === 'cold-vault-controls') {
      var lockTarget = document.getElementById('cold-vault-lock');
      if (lockTarget && !lockTarget.disabled) {
        lockTarget.focus();
      } else {
        var vaultStatus = document.getElementById('cold-vault-status');
        if (vaultStatus) {
          vaultStatus.setAttribute('tabindex', '-1');
          vaultStatus.focus();
        }
      }
    }
    var moreSheet = link.closest('.cold-mobile-more');
    if (moreSheet) {
      moreSheet.open = false;
    }
  });
  document.addEventListener('click', function (event) {
    var mobileMoreLink = event.target && typeof event.target.closest === 'function'
      ? event.target.closest('.cold-mobile-more-links a')
      : null;
    if (!mobileMoreLink) {
      return;
    }
    var mobileMoreSheet = mobileMoreLink.closest('.cold-mobile-more');
    if (mobileMoreSheet) {
      mobileMoreSheet.open = false;
    }
  });
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
