
__COLDBOX_PROTOCOL__
__COLDBOX_REGISTRY__
__COLDBOX_AIRGAP__
__COLDBOX_CAPABILITIES__
__COLDBOX_SAVE_INTEGRITY__
__COLDBOX_VAULT_TRANSFER__
(function () {
  'use strict';

__COLDBOX_QR_ENCODER__
__COLDBOX_CONCEALMENT__

  var coldRealmDocument = __COLDBOX_COLD_REALM_DOCUMENT__;
  var protocol = window.__coldboxProtocol;
  var registry = window.__coldboxRegistry;
  var concealment = window.__coldboxConcealment;
  var airgap = window.__coldboxAirgap;
  var capabilities = window.__coldboxCapabilities;
  var saveIntegrity = window.__coldboxSaveIntegrity;
  var vaultTransfer = window.__coldboxLiveTransfer;
  var root = document.documentElement;
  var app = document.getElementById('app');
  var main = document.getElementById('main-content');
  var currentSection = document.getElementById('current-section');
  var announcement = document.getElementById('route-announcement');
  var themeToggle = document.getElementById('theme-toggle');
  var themeLabel = document.getElementById('theme-toggle-label');
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var privacyBlurToggle = document.getElementById('privacy-blur-toggle');
  var privacyBlurLabel = document.getElementById('privacy-blur-toggle-label');
  var moreMenu = document.getElementById('mobile-more-menu');
  var moreTab = document.getElementById('mobile-more-tab');
  var moreClose = document.getElementById('mobile-more-close');
  var coldRealmStatus = document.getElementById('cold-realm-status');
  // R2-F2 remediation: this used to point at the <h2> itself, whose
  // .textContent assignment below silently deleted the contextual help
  // button nested inside it (a text/element sibling, wiped along with the
  // old text on every status update). Pointing at the dedicated child span
  // instead leaves the button - a sibling of the span within the same <h2>
  // - untouched by every rewrite below.
  var coldRealmStatusTitle = document.getElementById('cold-realm-status-title-text');
  var coldRealmStatusCopy = document.getElementById('cold-realm-status-copy');
  var coldRealmStatusLabel = document.getElementById('cold-realm-status-label');
  var coldRealmFailure = document.getElementById('cold-realm-failure');
  var protocolWarning = document.getElementById('protocol-warning');
  var coldRealmHost = document.getElementById('cold-realm-host');
  var airgapBanner = document.getElementById('airgap-banner');
  // R2-F2 remediation: see the coldRealmStatusTitle comment above - same
  // fix, same reason (this title also has a nested contextual help button).
  var airgapBannerTitle = document.getElementById('airgap-banner-title-text');
  var airgapBannerCopy = document.getElementById('airgap-banner-copy');
  var airgapBannerLabel = document.getElementById('airgap-banner-label');
  var warmReachabilityStatus = document.getElementById('warm-reachability-status');
  var coldIsolationStatus = document.getElementById('cold-isolation-status');
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
  var provenanceLibraryList = document.getElementById('provenance-library-list');
  var provenanceBuildDate = document.getElementById('provenance-build-date');
  var provenanceCspWarm = document.getElementById('provenance-csp-warm');
  var provenanceCspCold = document.getElementById('provenance-csp-cold');
  var provenanceDropZone = document.getElementById('provenance-drop-zone');
  var provenanceDropInput = document.getElementById('provenance-drop-input');
  var provenanceDropChoose = document.getElementById('provenance-drop-choose');
  var provenanceDropResult = document.getElementById('provenance-drop-result');
  var provenanceExpectedHash = document.getElementById('provenance-expected-hash');
  var provenanceLicenseText = document.getElementById('provenance-license-text');
  var PROVENANCE_LIBRARIES = __COLDBOX_PROVENANCE_LIBRARIES__;
  var PROVENANCE_BUILD_DATE = __COLDBOX_BUILD_DATE__;
  var PROVENANCE_LICENSE_TEXT = __COLDBOX_LICENSE_TEXT__;
  var HELP_CONTENT = __COLDBOX_HELP_CONTENT__;
  var HELP_DEPTHS = ['plain', 'working', 'technical'];
  var HELP_DEPTH_STORAGE_KEY = 'coldbox-help-depth';
  var helpDepthButtons = Array.prototype.slice.call(document.querySelectorAll('[data-help-depth]'));
  var helpSearchInput = document.getElementById('help-search-input');
  var helpSearchResults = document.getElementById('help-search-results');
  var helpGlossaryList = document.getElementById('help-glossary-list');
  var helpGuidesList = document.getElementById('help-guides-list');
  var helpFallbackNotice = document.getElementById('help-fallback-notice');
  var helpContextButtons = Array.prototype.slice.call(document.querySelectorAll('[data-help-topic]'));
  var currentHelpDepth = 'plain';
  var helpGlossaryTermIndex = null;
  var helpGlossaryPattern;
  var helpSearchCorpus = null;
  var PROVENANCE_MAX_DROP_BYTES = 16 * 1024 * 1024;
  var vaultStatus = document.getElementById('vault-status');
  // R2-F2 remediation: see the coldRealmStatusTitle comment above - same
  // fix, same reason (this title also has a nested contextual help button).
  var vaultStatusTitle = document.getElementById('vault-status-title-text');
  var vaultStatusCopy = document.getElementById('vault-status-copy');
  var vaultStatusLabel = document.getElementById('vault-status-label');
  var vaultFileInput = document.getElementById('vault-file-input');
  var vaultLoadFile = document.getElementById('vault-load-file');
  var vaultChooseFolder = document.getElementById('vault-choose-folder');
  var vaultLibraryList = document.getElementById('vault-library-list');
  var vaultLibraryEmpty = document.getElementById('vault-library-empty');
  var vaultCreateName = document.getElementById('vault-create-name');
  var vaultCreatePrepare = document.getElementById('vault-create-prepare');
  var vaultSavePrimary = document.getElementById('vault-save-primary');
  var vaultActiveMeta = document.getElementById('vault-active-meta');
  var vaultActiveNameNode = document.getElementById('vault-active-name');
  var vaultActiveIdNode = document.getElementById('vault-active-id');
  var vaultSaveFileSystem = document.getElementById('vault-save-file-system');
  var vaultSaveDownload = document.getElementById('vault-save-download');
  var vaultSaveManual = document.getElementById('vault-save-manual');
  var vaultManualData = document.getElementById('vault-manual-data');
  var vaultManualCopy = document.getElementById('vault-manual-copy');
  var vaultManualShare = document.getElementById('vault-manual-share');
  var vaultTransferStart = document.getElementById('vault-transfer-start');
  var vaultTransferPause = document.getElementById('vault-transfer-pause');
  var vaultTransferStop = document.getElementById('vault-transfer-stop');
  var vaultTransferSender = document.getElementById('vault-transfer-sender');
  var vaultTransferImage = document.getElementById('vault-transfer-image');
  var vaultTransferSendStatus = document.getElementById('vault-transfer-send-status');
  var vaultTransferReceive = document.getElementById('vault-transfer-receive');
  var vaultTransferReceiveStop = document.getElementById('vault-transfer-receive-stop');
  var vaultTransferVideo = document.getElementById('vault-transfer-video');
  var vaultTransferReceiveStatus = document.getElementById('vault-transfer-receive-status');
  var vaultTransferReceipt = document.getElementById('vault-transfer-receipt');
  var vaultTransferReceiptSummary = document.getElementById('vault-transfer-receipt-summary');
  var vaultTransferReceiveName = document.getElementById('vault-transfer-receive-name');
  var vaultTransferLoad = document.getElementById('vault-transfer-load');
  var vaultTransferDiscard = document.getElementById('vault-transfer-discard');
  var vaultLoadManual = document.getElementById('vault-load-manual');
  var vaultLock = document.getElementById('vault-lock');
  var vaultLockWarning = document.getElementById('vault-lock-warning');
  var vaultLockWarningCopy = document.getElementById('vault-lock-warning-copy');
  var vaultLockSave = document.getElementById('vault-lock-save');
  var vaultLockWithoutSave = document.getElementById('vault-lock-without-save');
  var vaultLockCancel = document.getElementById('vault-lock-cancel');
  var vaultPanicHide = document.getElementById('vault-panic-hide');
  var panicScreen = document.getElementById('panic-screen');
  var panicReload = document.getElementById('panic-reload');
  var registryLocked = document.getElementById('registry-locked');
  var registryWorkspace = document.getElementById('registry-workspace');
  var registryStatus = document.getElementById('registry-status');
  var registryWalletForm = document.getElementById('registry-wallet-form');
  var registryWalletId = document.getElementById('registry-wallet-id');
  var registryWalletLabel = document.getElementById('registry-wallet-label');
  var registryWalletType = document.getElementById('registry-wallet-type');
  var registryWalletNetwork = document.getElementById('registry-wallet-network');
  var registryWalletScript = document.getElementById('registry-wallet-script');
  var registryWalletPath = document.getElementById('registry-wallet-path');
  var registryWalletFingerprint = document.getElementById('registry-wallet-fingerprint');
  var registryWalletCancel = document.getElementById('registry-wallet-cancel');
  var registryAccountForm = document.getElementById('registry-account-form');
  var registryAccountId = document.getElementById('registry-account-id');
  var registryAccountWallet = document.getElementById('registry-account-wallet');
  var registryAccountAsset = document.getElementById('registry-account-asset');
  var registryAccountPath = document.getElementById('registry-account-path');
  var registryAccountLabel = document.getElementById('registry-account-label');
  var registryAccountCancel = document.getElementById('registry-account-cancel');
  var registryAddressForm = document.getElementById('registry-address-form');
  var registryAddressId = document.getElementById('registry-address-id');
  var registryAddressAccount = document.getElementById('registry-address-account');
  var registryAddressIndex = document.getElementById('registry-address-index');
  var registryAddressValue = document.getElementById('registry-address-value');
  var registryAddressLabel = document.getElementById('registry-address-label');
  var registryAddressChange = document.getElementById('registry-address-change');
  var registryAddressCancel = document.getElementById('registry-address-cancel');
  var registryWalletNotes = document.getElementById('registry-wallet-notes');
  var registryWalletTags = document.getElementById('registry-wallet-tags');
  var registryWalletHidden = document.getElementById('registry-wallet-hidden');
  var registryAccountNotes = document.getElementById('registry-account-notes');
  var registryAccountTags = document.getElementById('registry-account-tags');
  var registryAccountHidden = document.getElementById('registry-account-hidden');
  var registryAddressNotes = document.getElementById('registry-address-notes');
  var registryAddressTags = document.getElementById('registry-address-tags');
  var registryAddressHidden = document.getElementById('registry-address-hidden');
  var registryNoteForm = document.getElementById('registry-note-form');
  var registryNoteId = document.getElementById('registry-note-id');
  var registryNoteTitle = document.getElementById('registry-note-title');
  var registryNoteBody = document.getElementById('registry-note-body');
  var registryNoteLinks = document.getElementById('registry-note-links');
  var registryNoteTags = document.getElementById('registry-note-tags');
  var registryNoteHidden = document.getElementById('registry-note-hidden');
  var registryNoteCancel = document.getElementById('registry-note-cancel');
  var registryNoteList = document.getElementById('registry-note-list');
  var registrySearch = document.getElementById('registry-search');
  var registryShowHidden = document.getElementById('registry-show-hidden');
  var registryHiddenHelp = document.getElementById('registry-hidden-help');
  var registryWalletList = document.getElementById('registry-wallet-list');
  var registryAccountList = document.getElementById('registry-account-list');
  var registryAddressList = document.getElementById('registry-address-list');
  var qrPublicNetwork = document.getElementById('qr-public-network');
  var qrPublicAddress = document.getElementById('qr-public-address');
  var qrPublicAmount = document.getElementById('qr-public-amount');
  var qrPublicLabel = document.getElementById('qr-public-label');
  var qrPublicUri = document.getElementById('qr-public-uri');
  var qrPublicGenerate = document.getElementById('qr-public-generate');
  var qrPublicStatus = document.getElementById('qr-public-status');
  var qrPublicOutput = document.getElementById('qr-public-output');
  var qrPublicDownloadSvg = document.getElementById('qr-public-download-svg');
  var qrPublicDownloadPng = document.getElementById('qr-public-download-png');
  var qrPublicArtifact = null;
  var deviceLocked = document.getElementById('device-locked');
  var deviceWorkspace = document.getElementById('device-workspace');
  var deviceStatus = document.getElementById('device-status');
  var deviceForm = document.getElementById('device-form');
  var deviceId = document.getElementById('device-id');
  var deviceVendor = document.getElementById('device-vendor');
  var deviceModel = document.getElementById('device-model');
  var deviceSerial = document.getElementById('device-serial');
  var deviceFirmware = document.getElementById('device-firmware');
  var deviceFirmwareDate = document.getElementById('device-firmware-date');
  var devicePurchasedFrom = document.getElementById('device-purchased-from');
  var devicePurchasedAt = document.getElementById('device-purchased-at');
  var deviceTamperCheck = document.getElementById('device-tamper-check');
  var deviceTamperNotes = document.getElementById('device-tamper-notes');
  var devicePinSetAt = document.getElementById('device-pin-set-at');
  var devicePinChangedAt = document.getElementById('device-pin-changed-at');
  var devicePassphraseUsed = document.getElementById('device-phrase-wallet-used');
  var deviceSeedFingerprints = document.getElementById('device-seed-fingerprints');
  var deviceLocation = document.getElementById('device-location');
  var deviceStatusValue = document.getElementById('device-status-value');
  var deviceNotes = document.getElementById('device-notes');
  var deviceHidden = document.getElementById('device-hidden');
  var deviceCancel = document.getElementById('device-cancel');
  var deviceList = document.getElementById('device-list');
  var deviceSearch = document.getElementById('device-search');
  var deviceShowHidden = document.getElementById('device-show-hidden');
  var deviceHiddenHelp = document.getElementById('device-hidden-help');
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
  var vaultDirty = false;
  var vaultPersistenceState = 'none';
  var pendingVaultLoad = false;
  var pendingLoadFileMeta = null;
  var saveGeneration = { counter: 0, savedAt: null };
  var activeVaultName = '';
  var activeVaultId = null;
  var activeVaultNamespace = null;
  var activeVaultFileHandle = null;
  var activeVaultCanonicalFilename = null;
  var pendingCreateVaultName = '';
  var vaultLibraryEntries = [];
  var vaultSessionNameOwners = {};
  var reachabilityState = 'checking';
  var reachabilityFailureRounds = 0;
  var reachabilityInFlight = false;
  var reachabilitySequence = 0;
  var REACHABILITY_INTERVAL_MS = 10000;
  var REACHABILITY_TIMEOUT_MS = 3500;
  var REACHABILITY_FAILURE_THRESHOLD = 2;
  var REACHABILITY_ENDPOINTS = Object.freeze([
    'https://api.coinbase.com/v2/time',
    'https://mempool.space/api/blocks/tip/height'
  ]);
  var vaultDirtyNotice = document.getElementById('vault-dirty-notice');
  var vaultRollbackBanner = document.getElementById('vault-rollback-banner');
  var vaultRollbackBannerCopy = document.getElementById('vault-rollback-banner-copy');
  var liveTransferFrames = [];
  var liveTransferIndex = 0;
  var liveTransferTimer = null;
  var liveTransferPaused = false;
  var liveTransferCameraStream = null;
  var liveTransferDetector = null;
  var liveTransferScanTimer = null;
  var liveTransferCollector = null;
  var liveQrReceiverState = 'checking';
  var pendingReceivedTransfer = null;
  var pendingReceivedTransferMeta = null;
  var registryStore = null;
  var pendingRegistryMutation = null;
  var hiddenRegistryVisible = false;
  var pendingHiddenReveal = null;
  var concealmentController = concealment && typeof concealment.createController === 'function'
    ? concealment.createController({ root: root })
    : null;
  var registrySearchTerm = '';
  var deviceSearchTerm = '';
  var LIVE_TRANSFER_INTERVAL_MS = 250;
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

  // P0.17 - Help framework.
  //
  // HELP_CONTENT is compiled at build time (scripts/help-content.js) from
  // docs/00-overview/glossary.md and docs/03-guides/*.md, per SPEC.md #18.
  // Everything below only ever reads that already-rendered, already-escaped
  // HTML - it never fetches, parses markdown at runtime, or reaches the
  // network, so the "searchable help index, fully offline" and "no network,
  // no external docs links" acceptance criteria hold structurally.

  function helpDomId(id) {
    return 'help-' + String(id).replace(/[^a-zA-Z0-9]+/g, '-');
  }

  function stripHtmlToText(html) {
    var container = document.createElement('div');
    container.innerHTML = html || '';
    return (container.textContent || '').trim();
  }

  function escapeHelpHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function readStoredHelpDepth() {
    try {
      var stored = window.localStorage.getItem(HELP_DEPTH_STORAGE_KEY);
      return HELP_DEPTHS.indexOf(stored) !== -1 ? stored : 'plain';
    } catch (error) {
      return 'plain';
    }
  }

  function findGlossaryTermById(id) {
    for (var i = 0; i < HELP_CONTENT.glossary.length; i += 1) {
      var category = HELP_CONTENT.glossary[i];
      for (var j = 0; j < category.terms.length; j += 1) {
        if (category.terms[j].id === id) {
          return category.terms[j];
        }
      }
    }
    return null;
  }

  function findGuideById(id) {
    for (var i = 0; i < HELP_CONTENT.guides.length; i += 1) {
      if (HELP_CONTENT.guides[i].id === id) {
        return HELP_CONTENT.guides[i];
      }
    }
    return null;
  }

  // The compiled build deliberately does NOT ship a separate precomputed
  // search-text field (see help-content.js's renderNodesAtDepth comment) -
  // duplicating all three depths again just for search would have added
  // roughly as much weight as the glossary and guides combined. Instead the
  // corpus is built once, lazily, from the same byDepth HTML already
  // embedded, by stripping tags via stripHtmlToText. This still satisfies
  // "searchable help index, fully offline" (SPEC.md #18.2): no network
  // call, and the index is fully available at first use, not lazily fetched
  // from anywhere.
  function buildHelpSearchCorpus() {
    if (helpSearchCorpus) {
      return helpSearchCorpus;
    }
    helpSearchCorpus = Object.create(null);
    HELP_CONTENT.searchIndex.forEach(function (entry) {
      var source = entry.kind === 'glossary' ? findGlossaryTermById(entry.id) : findGuideById(entry.id);
      var parts = [entry.title].concat(entry.aliases || []);
      if (source) {
        HELP_DEPTHS.forEach(function (depth) {
          parts.push(stripHtmlToText(source.byDepth[depth]));
        });
      }
      helpSearchCorpus[entry.id] = parts.join(' ').toLowerCase();
    });
    return helpSearchCorpus;
  }

  function buildGlossaryTermIndex() {
    if (helpGlossaryTermIndex) {
      return helpGlossaryTermIndex;
    }
    var index = [];
    var byLower = Object.create(null);
    HELP_CONTENT.glossary.forEach(function (category) {
      category.terms.forEach(function (term) {
        var names = [term.term].concat(term.aliases || []);
        names.forEach(function (rawName) {
          var name = String(rawName).trim();
          if (name.length < 3) {
            return;
          }
          var lower = name.toLowerCase();
          if (byLower[lower]) {
            return;
          }
          var entry = { name: name, id: term.id };
          byLower[lower] = entry;
          index.push(entry);
        });
      });
    });
    index.sort(function (a, b) {
      return b.name.length - a.name.length;
    });
    helpGlossaryTermIndex = { list: index, byLower: byLower };
    return helpGlossaryTermIndex;
  }

  function buildGlossaryPattern() {
    if (helpGlossaryPattern !== undefined) {
      return helpGlossaryPattern;
    }
    var index = buildGlossaryTermIndex();
    if (index.list.length === 0) {
      helpGlossaryPattern = null;
      return null;
    }
    var escapedNames = index.list.map(function (entry) {
      return entry.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    });
    helpGlossaryPattern = new RegExp('\\b(' + escapedNames.join('|') + ')\\b', 'gi');
    return helpGlossaryPattern;
  }

  function replaceGlossaryTermsInText(text) {
    var pattern = buildGlossaryPattern();
    if (!pattern || !text || !text.trim()) {
      return null;
    }
    var index = buildGlossaryTermIndex();
    pattern.lastIndex = 0;
    var match = pattern.exec(text);
    if (!match) {
      return null;
    }
    var result = '';
    var lastIndex = 0;
    while (match) {
      var entry = index.byLower[match[0].toLowerCase()];
      result += escapeHelpHtml(text.slice(lastIndex, match.index));
      if (entry) {
        result += '<button type="button" class="glossary-term" data-term-id="' +
          escapeHelpHtml(entry.id) + '" aria-expanded="false" aria-label="Definition: ' +
          escapeHelpHtml(entry.name) + '">' + escapeHelpHtml(match[0]) + '</button>';
      } else {
        result += escapeHelpHtml(match[0]);
      }
      lastIndex = pattern.lastIndex;
      match = pattern.exec(text);
    }
    result += escapeHelpHtml(text.slice(lastIndex));
    return result;
  }

  function linkifyGlossaryTerms(container) {
    if (!container) {
      return;
    }
    var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    var textNodes = [];
    var node = walker.nextNode();
    while (node) {
      var parentTag = node.parentNode && node.parentNode.tagName;
      if (parentTag !== 'CODE' && parentTag !== 'PRE' && parentTag !== 'BUTTON') {
        textNodes.push(node);
      }
      node = walker.nextNode();
    }
    textNodes.forEach(function (textNode) {
      var replaced = replaceGlossaryTermsInText(textNode.nodeValue);
      if (replaced !== null) {
        var span = document.createElement('span');
        span.innerHTML = replaced;
        textNode.parentNode.replaceChild(span, textNode);
      }
    });
  }

  function closeGlossaryTooltips() {
    Array.prototype.slice.call(document.querySelectorAll('.glossary-tooltip')).forEach(function (tooltip) {
      var owner = tooltip.previousElementSibling;
      tooltip.parentNode.removeChild(tooltip);
      if (owner) {
        owner.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function handleGlossaryTermClick(event) {
    var target = event.target;
    var button = target && typeof target.closest === 'function' ? target.closest('.glossary-term') : null;
    if (!button) {
      return;
    }
    var alreadyOpen = button.getAttribute('aria-expanded') === 'true';
    closeGlossaryTooltips();
    if (alreadyOpen) {
      return;
    }
    var term = findGlossaryTermById(button.getAttribute('data-term-id'));
    if (!term) {
      return;
    }
    var tooltip = document.createElement('span');
    tooltip.className = 'glossary-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.textContent = stripHtmlToText(term.byDepth.plain || term.byDepth.working || term.byDepth.technical);
    button.insertAdjacentElement('afterend', tooltip);
    button.setAttribute('aria-expanded', 'true');
  }

  function renderHelpGlossary() {
    if (!helpGlossaryList) {
      return;
    }
    while (helpGlossaryList.firstChild) {
      helpGlossaryList.removeChild(helpGlossaryList.firstChild);
    }
    HELP_CONTENT.glossary.forEach(function (category) {
      var section = document.createElement('section');
      section.className = 'help-glossary-category';
      var heading = document.createElement('h3');
      heading.textContent = category.title;
      section.appendChild(heading);
      category.terms.forEach(function (term) {
        var entry = document.createElement('article');
        entry.className = 'help-glossary-term';
        entry.id = helpDomId(term.id);
        entry.setAttribute('tabindex', '-1');
        var termHeading = document.createElement('h4');
        termHeading.textContent = term.aliases.length
          ? term.term + ' (also ' + term.aliases.join(', ') + ')'
          : term.term;
        entry.appendChild(termHeading);
        var body = document.createElement('div');
        body.className = 'help-term-body';
        body.innerHTML = term.byDepth[currentHelpDepth] || term.byDepth.plain || '';
        entry.appendChild(body);
        section.appendChild(entry);
      });
      helpGlossaryList.appendChild(section);
    });
  }

  function renderHelpGuides() {
    if (!helpGuidesList) {
      return;
    }
    while (helpGuidesList.firstChild) {
      helpGuidesList.removeChild(helpGuidesList.firstChild);
    }
    HELP_CONTENT.guides.forEach(function (guide) {
      var entry = document.createElement('article');
      entry.className = 'help-guide';
      entry.id = helpDomId(guide.id);
      entry.setAttribute('tabindex', '-1');
      var heading = document.createElement('h3');
      heading.textContent = guide.title;
      entry.appendChild(heading);
      var body = document.createElement('div');
      body.className = 'help-guide-body';
      body.innerHTML = guide.byDepth[currentHelpDepth] || guide.byDepth.plain || '';
      entry.appendChild(body);
      helpGuidesList.appendChild(entry);
      linkifyGlossaryTerms(body);
    });
  }

  function setHelpDepth(depth, persist) {
    currentHelpDepth = HELP_DEPTHS.indexOf(depth) !== -1 ? depth : 'plain';
    helpDepthButtons.forEach(function (button) {
      var isCurrent = button.getAttribute('data-help-depth') === currentHelpDepth;
      button.setAttribute('aria-pressed', String(isCurrent));
    });
    closeGlossaryTooltips();
    renderHelpGlossary();
    renderHelpGuides();
    if (persist) {
      try {
        window.localStorage.setItem(HELP_DEPTH_STORAGE_KEY, currentHelpDepth);
      } catch (error) {
        // UI preferences are optional on file:// and must not block the shell.
      }
    }
  }

  function showHelpFallbackNotice() {
    if (!helpFallbackNotice) {
      return;
    }
    helpFallbackNotice.hidden = false;
    window.setTimeout(function () {
      helpFallbackNotice.hidden = true;
    }, 6000);
  }

  function focusHelpTopic(id) {
    var target = document.getElementById(helpDomId(id));
    if (!target) {
      showHelpFallbackNotice();
      return;
    }
    try {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      target.scrollIntoView();
    }
    target.classList.add('help-topic-highlight');
    window.setTimeout(function () {
      target.classList.remove('help-topic-highlight');
    }, 2000);
    target.focus({ preventScroll: true });
  }

  function navigateToHelpTopic(id) {
    var encoded = encodeURIComponent(id);
    if (routeFromLocation() === 'learn') {
      try {
        window.history.replaceState(null, '', '#learn/' + encoded);
      } catch (error) {
        window.location.hash = 'learn/' + encoded;
      }
      focusHelpTopic(id);
    } else {
      window.location.hash = 'learn/' + encoded;
    }
  }

  function handleHelpSearch() {
    if (!helpSearchInput || !helpSearchResults) {
      return;
    }
    var rawQuery = helpSearchInput.value || '';
    var query = rawQuery.trim().toLowerCase();
    while (helpSearchResults.firstChild) {
      helpSearchResults.removeChild(helpSearchResults.firstChild);
    }
    if (!query) {
      helpSearchResults.hidden = true;
      return;
    }
    var corpus = buildHelpSearchCorpus();
    var matches = HELP_CONTENT.searchIndex.filter(function (entry) {
      return (corpus[entry.id] || '').indexOf(query) !== -1;
    }).slice(0, 30);
    helpSearchResults.hidden = false;
    if (matches.length === 0) {
      var empty = document.createElement('p');
      empty.className = 'help-search-empty';
      empty.textContent = 'No offline help entries match "' + rawQuery.trim() + '".';
      helpSearchResults.appendChild(empty);
      return;
    }
    matches.forEach(function (entry) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'help-search-result';
      item.setAttribute('role', 'option');
      item.textContent = entry.title + ' — ' + entry.category;
      item.addEventListener('click', function () {
        navigateToHelpTopic(entry.id);
      });
      helpSearchResults.appendChild(item);
    });
  }

  function initHelp() {
    setHelpDepth(readStoredHelpDepth(), false);
    helpDepthButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        setHelpDepth(button.getAttribute('data-help-depth'), true);
      });
    });
    if (helpSearchInput) {
      helpSearchInput.addEventListener('input', handleHelpSearch);
    }
    if (helpGlossaryList) {
      helpGlossaryList.addEventListener('click', handleGlossaryTermClick);
    }
    if (helpGuidesList) {
      helpGuidesList.addEventListener('click', handleGlossaryTermClick);
    }
    helpContextButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        var topic = button.getAttribute('data-help-topic');
        if (topic) {
          navigateToHelpTopic(topic);
        }
      });
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeGlossaryTooltips();
      }
    });
  }

  function routeFromLocation() {
    var hash = window.location.hash.replace(/^#/, '').trim();
    var route = hash.split('/')[0];
    return Object.prototype.hasOwnProperty.call(routeDetails, route) ? route : 'dashboard';
  }

  function normalizeLocation(route) {
    var hash = window.location.hash;
    // A '#route/topic' deep link (used by contextual ? help and search
    // results to jump straight to a compiled glossary/guide entry) is left
    // alone rather than collapsed to the bare route, so the link stays
    // shareable and survives a reload.
    if (hash === '#' + route || hash.indexOf('#' + route + '/') === 0) {
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
    if (camera === true && liveQrReceiverState === 'available') {
      setCapabilityRow('camera', 'available', 'Live QR available', 'Camera API and QR decoder are available. Permission is requested only when a receive workflow starts.');
    } else if (camera === true && liveQrReceiverState === 'checking') {
      setCapabilityRow('camera', 'partial', 'Checking QR decoder', 'Camera API is available; checking whether this browser can decode QR from the camera.');
      optionalWarnings += 1;
    } else if (camera === true) {
      setCapabilityRow('camera', 'partial', 'Camera API only', 'Camera access exists, but live QR decoding is unavailable here. Use the canonical .cbx file instead.');
      optionalWarnings += 1;
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

  // P0.16: the provenance panel is static, build-time data plus two values
  // read straight off the live DOM (the warm CSP meta tag and the embedded
  // cold-realm srcdoc string), so there is exactly one copy of each fact -
  // nothing here is a second transcription of dependencies.md or csp-policy.md.
  function renderProvenanceLibraryList() {
    if (!provenanceLibraryList) {
      return;
    }
    while (provenanceLibraryList.firstChild) {
      provenanceLibraryList.removeChild(provenanceLibraryList.firstChild);
    }
    if (!Array.isArray(PROVENANCE_LIBRARIES) || PROVENANCE_LIBRARIES.length === 0) {
      var empty = document.createElement('p');
      empty.className = 'provenance-loading';
      empty.textContent = 'No embedded libraries were recorded in this build.';
      provenanceLibraryList.appendChild(empty);
      return;
    }
    PROVENANCE_LIBRARIES.forEach(function (library) {
      var row = document.createElement('article');
      row.className = 'provenance-library-row';
      row.setAttribute('role', 'listitem');

      var name = document.createElement('h4');
      name.textContent = String(library.name) + ' · v' + String(library.version);
      row.appendChild(name);

      var hash = document.createElement('p');
      hash.className = 'provenance-library-hash';
      hash.textContent = 'SHA-256: ' + String(library.sha256);
      row.appendChild(hash);

      var source = document.createElement('p');
      source.className = 'provenance-library-source';
      source.textContent = 'Upstream: ' + String(library.url);
      row.appendChild(source);

      provenanceLibraryList.appendChild(row);
    });
  }

  function extractCspFromMarkup(markup) {
    if (typeof markup !== 'string') {
      return null;
    }
    var match = markup.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/i);
    return match ? match[1] : null;
  }

  function renderProvenanceCsp() {
    if (provenanceCspWarm) {
      var warmMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      provenanceCspWarm.textContent = warmMeta && warmMeta.getAttribute('content')
        ? warmMeta.getAttribute('content')
        : 'Unavailable: no CSP meta tag found in this document.';
    }
    if (provenanceCspCold) {
      var coldCsp = extractCspFromMarkup(coldRealmDocument);
      provenanceCspCold.textContent = coldCsp
        || 'Unavailable: no CSP meta tag found in the embedded cold-realm document.';
    }
  }

  function renderProvenanceBuildDate() {
    if (!provenanceBuildDate) {
      return;
    }
    provenanceBuildDate.textContent = typeof PROVENANCE_BUILD_DATE === 'string' && PROVENANCE_BUILD_DATE
      ? PROVENANCE_BUILD_DATE
      : 'Unknown (no source commit date was available at build time).';
  }

  // P0.20: AGPLv3 §5(d) requires an interactive UI showing "how to view a
  // copy of [the] License". The full text is embedded at build time (see
  // scripts/build.js's readLicenseText()) rather than linked to a URL, which
  // would be unreachable offline and would itself be an outbound network
  // reference the CSP forbids. Rendered lazily-visible inside a native
  // <details> disclosure so the panel isn't dominated by ~34 KB of licence
  // text by default, but the text itself is populated on load (not on
  // first expand) so it is present in the DOM - and therefore reachable by
  // the browser harness and by find-in-page/screen readers - without
  // requiring a click first.
  function renderProvenanceLicenseText() {
    if (!provenanceLicenseText) {
      return;
    }
    provenanceLicenseText.textContent = typeof PROVENANCE_LICENSE_TEXT === 'string' && PROVENANCE_LICENSE_TEXT
      ? PROVENANCE_LICENSE_TEXT
      : 'Unavailable: no licence text was embedded at build time.';
  }

  function setProvenanceDropResult(state, message) {
    if (!provenanceDropResult) {
      return;
    }
    provenanceDropResult.setAttribute('data-state', state);
    provenanceDropResult.textContent = message;
  }

  function currentExpectedHash() {
    var meta = document.querySelector('meta[name="coldbox-expected-hash"]');
    var value = meta ? meta.getAttribute('content') : null;
    return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value) ? value : null;
  }

  // F1 remediation (review of P0.16): the compiled expected hash must be
  // visible in the UI, not just present in a hidden meta tag, so a user can
  // read it off-screen (or compare it against an independently-computed
  // value) without having to view source. Deliberately labeled in the
  // markup so it is never mistaken for coldbox.html.sha256 - see the note
  // above this element and ADR-0015 for why the two values differ.
  function renderProvenanceExpectedHash() {
    if (!provenanceExpectedHash) {
      return;
    }
    var expected = currentExpectedHash();
    provenanceExpectedHash.textContent = expected
      || 'Unavailable: no readable coldbox-expected-hash value in this document.';
  }

  // Reproduces exactly what the build does: the expected-hash meta tag's own
  // value is blanked to 64 zero characters before hashing, because the tag
  // cannot contain the hash of a document that includes that very value.
  // This is why the check is a self-consistency check, not independent proof
  // - a hostile build could blank-and-hash however it likes and always
  // report a match. The panel text says this; this function does not try to
  // hide it.
  function blankExpectedHashMeta(text) {
    return text.replace(
      /(<meta name="coldbox-expected-hash" content=")[0-9a-f]{64}(">)/i,
      '$1' + '0'.repeat(64) + '$2'
    );
  }

  function hexByte(value) {
    var hex = value.toString(16);
    return hex.length < 2 ? '0' + hex : hex;
  }

  function computeSelfHash(arrayBuffer) {
    if (!window.crypto || !window.crypto.subtle || typeof window.crypto.subtle.digest !== 'function') {
      return Promise.reject(new Error('crypto.subtle is unavailable in this browser. Use the command-line instructions instead.'));
    }
    if (typeof window.TextDecoder !== 'function' || typeof window.TextEncoder !== 'function') {
      return Promise.reject(new Error('UTF-8 text encoding is unavailable in this browser. Use the command-line instructions instead.'));
    }
    var text;
    try {
      text = new window.TextDecoder('utf-8', { fatal: false }).decode(arrayBuffer);
    } catch (error) {
      return Promise.reject(new Error('The dropped file could not be decoded as UTF-8 text.'));
    }
    var declaredMatch = text.match(/<meta name="coldbox-expected-hash" content="([0-9a-f]{64})">/i);
    if (!declaredMatch) {
      return Promise.reject(new Error(
        'The dropped file has no coldbox-expected-hash tag. It may not be a Coldbox build, or predates this check.'
      ));
    }
    // F2 remediation (review of P0.16): blanking-then-hashing alone cannot
    // detect corruption confined to the hash field itself, because the
    // field is erased before hashing either way. So the field's own
    // as-declared value in the dropped file is captured here too, and
    // handleProvenanceDropFile requires BOTH the blank-then-hash result AND
    // this declared value to equal the running copy's expected hash before
    // reporting a match. A byte flipped inside the hash field changes
    // declaredHash but leaves computedHash unchanged - the declaredHash
    // check is what catches that case.
    var declaredHash = declaredMatch[1];
    var blanked = blankExpectedHashMeta(text);
    var blankedBytes = new window.TextEncoder().encode(blanked);
    return window.crypto.subtle.digest('SHA-256', blankedBytes).then(function (digestBuffer) {
      var bytes = new Uint8Array(digestBuffer);
      var hex = '';
      for (var i = 0; i < bytes.length; i += 1) {
        hex += hexByte(bytes[i]);
      }
      return { computedHash: hex, declaredHash: declaredHash };
    });
  }

  function handleProvenanceDropFile(file) {
    if (!file) {
      return;
    }
    if (typeof file.size === 'number' && file.size > PROVENANCE_MAX_DROP_BYTES) {
      setProvenanceDropResult('error', 'That file is too large to hash here (limit ' + String(PROVENANCE_MAX_DROP_BYTES) + ' bytes). Use the command-line instructions instead.');
      return;
    }
    var expected = currentExpectedHash();
    if (!expected) {
      setProvenanceDropResult('error', 'This running copy has no readable expected-hash value, so nothing can be compared.');
      return;
    }
    setProvenanceDropResult('checking', 'Hashing the dropped file…');
    var reader = new FileReader();
    reader.onerror = function () {
      setProvenanceDropResult('error', 'Could not read the dropped file.');
    };
    reader.onload = function () {
      var result = reader.result;
      if (!(result instanceof ArrayBuffer)) {
        setProvenanceDropResult('error', 'Could not read the dropped file.');
        return;
      }
      computeSelfHash(result).then(function (outcome) {
        // Both must hold: the blank-then-hash comparison (catches corruption
        // anywhere outside the hash field) and the declared-value comparison
        // (catches corruption inside the hash field itself, which blanking
        // would otherwise erase before it could be seen). See F2 in the
        // P0.16 review remediation and the comment on computeSelfHash.
        if (outcome.computedHash === expected && outcome.declaredHash === expected) {
          setProvenanceDropResult(
            'match',
            'Match. The dropped file\'s self-consistency hash equals this running copy\'s. Remember: this is circular and does not rule out a deliberately tampered build - see the note above.'
          );
        } else {
          setProvenanceDropResult(
            'mismatch',
            'Mismatch. The dropped file\'s self-consistency hash does not equal this running copy\'s. Do not trust this file; verify with the command-line hash and signature instead.'
          );
        }
      }, function (error) {
        setProvenanceDropResult('error', error && error.message ? error.message : 'Could not hash the dropped file.');
      });
    };
    reader.readAsArrayBuffer(file);
  }

  function initProvenanceDropZone() {
    if (provenanceDropChoose && provenanceDropInput) {
      provenanceDropChoose.addEventListener('click', function () {
        provenanceDropInput.click();
      });
    }
    if (provenanceDropInput) {
      provenanceDropInput.addEventListener('change', function () {
        if (provenanceDropInput.files && provenanceDropInput.files.length > 0) {
          handleProvenanceDropFile(provenanceDropInput.files[0]);
        }
        provenanceDropInput.value = '';
      });
    }
    if (provenanceDropZone) {
      provenanceDropZone.addEventListener('dragover', function (event) {
        event.preventDefault();
      });
      provenanceDropZone.addEventListener('drop', function (event) {
        event.preventDefault();
        var files = event.dataTransfer && event.dataTransfer.files;
        if (files && files.length > 0) {
          handleProvenanceDropFile(files[0]);
        }
      });
      provenanceDropZone.addEventListener('keydown', function (event) {
        if ((event.key === 'Enter' || event.key === ' ') && provenanceDropInput) {
          event.preventDefault();
          provenanceDropInput.click();
        }
      });
    }
  }

  function renderProvenancePanel() {
    renderProvenanceLibraryList();
    renderProvenanceCsp();
    renderProvenanceBuildDate();
    renderProvenanceExpectedHash();
    renderProvenanceLicenseText();
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

  function reachabilityDetail(state) {
    if (state === 'reachable') {
      return 'External reachability confirmed by the warm shell. No vault, address, asset, balance, Vault ID/name, or user-entered data is included in the probe.';
    }
    if (state === 'unreachable') {
      return 'No external reachability detected after consecutive all-endpoint failures. This is not proof that the device is physically airgapped.';
    }
    return 'External reachability is checking or uncertain. Coldbox fails online-safe and keeps secret-capable work sealed.';
  }

  function setReachabilityState(state) {
    reachabilityState = state;
    root.setAttribute('data-reachability-state', state);
    app.setAttribute('data-reachability-state', state);
    if (warmReachabilityStatus) {
      warmReachabilityStatus.textContent = reachabilityDetail(state);
    }
    updateAirgapBanner();
  }

  function probeReachabilityUrl(url) {
    return new Promise(function (resolve) {
      var settled = false;
      var timeout = null;
      var controller = typeof window.AbortController === 'function' ? new window.AbortController() : null;

      function finish(reachable) {
        if (settled) {
          return;
        }
        settled = true;
        if (timeout !== null) {
          window.clearTimeout(timeout);
        }
        resolve(Boolean(reachable));
      }

      timeout = window.setTimeout(function () {
        if (controller) {
          try { controller.abort(); } catch (error) { /* timeout still means no confirmed reachability */ }
        }
        finish(false);
      }, REACHABILITY_TIMEOUT_MS);

      try {
        var options = {
          method: 'GET',
          mode: 'no-cors',
          cache: 'no-store',
          credentials: 'omit',
          referrerPolicy: 'no-referrer'
        };
        if (controller) {
          options.signal = controller.signal;
        }
        var request = window.fetch(url, options);
        if (!request || typeof request.then !== 'function') {
          finish(false);
          return;
        }
        request.then(function () {
          // Any resolved HTTP response proves reachability; status/body are irrelevant.
          finish(true);
        }, function () {
          finish(false);
        });
      } catch (error) {
        finish(false);
      }
    });
  }

  function runReachabilityCheck() {
    if (reachabilityInFlight || typeof window.fetch !== 'function') {
      if (typeof window.fetch !== 'function') {
        setReachabilityState('unknown');
      }
      return;
    }
    reachabilityInFlight = true;
    reachabilitySequence += 1;
    var sequence = reachabilitySequence;
    root.setAttribute('data-reachability-checking', 'true');

    // A previously established offline classification is stale as soon as a
    // fresh probe starts. Move the authority to online-safe before waiting on
    // either endpoint. This immediately sends mode.set { online: true } and
    // closes any offline secret-capable session instead of leaving the old
    // offline decision active during the checking interval.
    if (reachabilityState === 'unreachable') {
      setReachabilityState('unknown');
    }

    probeReachabilityUrl(REACHABILITY_ENDPOINTS[0]).then(function (primaryReachable) {
      if (primaryReachable) {
        return true;
      }
      return probeReachabilityUrl(REACHABILITY_ENDPOINTS[1]);
    }).then(function (reachable) {
      if (sequence !== reachabilitySequence) {
        return;
      }
      if (reachable) {
        reachabilityFailureRounds = 0;
        setReachabilityState('reachable');
        return;
      }
      reachabilityFailureRounds += 1;
      if (reachabilityFailureRounds >= REACHABILITY_FAILURE_THRESHOLD) {
        setReachabilityState('unreachable');
      } else if (reachabilityState !== 'unreachable') {
        setReachabilityState('unknown');
      } else {
        updateAirgapBanner();
      }
    }, function () {
      if (sequence === reachabilitySequence) {
        reachabilityFailureRounds = 0;
        setReachabilityState('unknown');
      }
    }).then(function () {
      if (sequence === reachabilitySequence) {
        reachabilityInFlight = false;
        root.setAttribute('data-reachability-checking', 'false');
      }
    }, function () {
      if (sequence === reachabilitySequence) {
        reachabilityInFlight = false;
        root.setAttribute('data-reachability-checking', 'false');
        reachabilityFailureRounds = 0;
        setReachabilityState('unknown');
      }
    });
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
    root.setAttribute('data-reachability-state', reachabilityState);
    if (airgapFailure) {
      if (coldIsolationStatus) {
        coldIsolationStatus.textContent = 'LOCKED DOWN: a CSP/runtime isolation check failed.';
      }
      setAirgapBanner(
        'red',
        lockdownTitle,
        lockdownCopy,
        'Locked down'
      );
      return;
    }
    if (!warmCapabilityReport || !coldCapabilityReport) {
      if (coldIsolationStatus) {
        coldIsolationStatus.textContent = 'Checking required realm capabilities.';
      }
      setAirgapBanner(
        'checking',
        'Checking network and cold isolation',
        reachabilityDetail(reachabilityState),
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
      if (coldIsolationStatus) {
        coldIsolationStatus.textContent = 'Checking cold CSP, runtime guards, and private channel.';
      }
      setAirgapBanner(
        'checking',
        'Checking network and cold isolation',
        reachabilityDetail(reachabilityState),
        'Checking'
      );
      return;
    }
    root.setAttribute('data-lockdown-state', 'none');
    root.setAttribute('data-vault-operations', 'guarded');
    app.setAttribute('data-lockdown-state', 'none');
    app.setAttribute('data-vault-operations', 'guarded');
    // The handshake-ready callback refreshes controls before this guarded
    // transition. Refresh again after the gate opens so create/load controls
    // become usable immediately rather than remaining stuck disabled.
    updateVaultControls();
    if (coldIsolationStatus) {
      coldIsolationStatus.textContent = "Verified: cold connect-src 'none', runtime network guards, and the private channel are active.";
    }

    // Only a stable, consecutive all-endpoint failure permits offline mode.
    // Every other state is online-safe, so secrets remain sealed if the
    // monitor is uncertain or stale.
    sendColdMode(reachabilityState !== 'unreachable');

    if (reachabilityState === 'unreachable') {
      setAirgapBanner(
        'green',
        'No external reachability detected / cold sealed',
        reachabilityDetail('unreachable'),
        'No reachability'
      );
      return;
    }
    if (reachabilityState === 'reachable') {
      setAirgapBanner(
        'amber',
        'External reachability confirmed / secrets sealed',
        reachabilityDetail('reachable'),
        'Online'
      );
      return;
    }
    setAirgapBanner(
      'amber',
      'Reachability uncertain / secrets sealed',
      reachabilityDetail('unknown'),
      'Unknown'
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

  function updateLiveTransferReceiverStatus() {
    if (!vaultTransferReceiveStatus || liveTransferCameraStream || pendingReceivedTransfer) {
      return;
    }
    if (liveQrReceiverState === 'checking') {
      vaultTransferReceiveStatus.textContent = 'Checking whether this browser can decode live QR from a camera.';
      return;
    }
    if (liveQrReceiverState !== 'available') {
      vaultTransferReceiveStatus.textContent = 'Live QR receive is unavailable in this browser. Use the canonical .cbx file instead.';
      return;
    }
    vaultTransferReceiveStatus.textContent = 'Camera is off.';
  }

  function setLiveQrReceiverState(state) {
    liveQrReceiverState = state === 'available' || state === 'unavailable' ? state : 'checking';
    if (warmCapabilityReport) {
      renderCapabilityPanel();
    }
    updateLiveTransferReceiverStatus();
    updateVaultControls();
  }

  function probeLiveTransferReceiverCapability() {
    var navigatorObject = window.navigator || {};
    var mediaDevices = navigatorObject.mediaDevices;
    if (capabilityBoolean(warmCapabilityReport, 'camera') !== true
      || !mediaDevices
      || typeof mediaDevices.getUserMedia !== 'function'
      || typeof window.BarcodeDetector !== 'function') {
      setLiveQrReceiverState('unavailable');
      return;
    }
    if (typeof window.BarcodeDetector.getSupportedFormats !== 'function') {
      try {
        // Older implementations may omit getSupportedFormats(), but a
        // constructor probe still tells us whether the exact QR format used
        // by the receiver is accepted. Do not enable the button on the mere
        // presence of a BarcodeDetector constructor.
        new window.BarcodeDetector({ formats: ['qr_code'] });
        setLiveQrReceiverState('available');
      } catch (error) {
        setLiveQrReceiverState('unavailable');
      }
      return;
    }
    var formatsPromise;
    try {
      formatsPromise = window.BarcodeDetector.getSupportedFormats();
    } catch (error) {
      setLiveQrReceiverState('unavailable');
      return;
    }
    Promise.resolve(formatsPromise).then(function (formats) {
      setLiveQrReceiverState(Array.isArray(formats) && formats.indexOf('qr_code') !== -1
        ? 'available'
        : 'unavailable');
    }, function () {
      setLiveQrReceiverState('unavailable');
    });
  }

  function updateVaultControls() {
    var channelReady = vaultChannelReady();
    var unlocked = vaultState === 'unlocked';
    var locked = vaultState === 'locked';
    var hasManualText = Boolean(vaultManualData && vaultManualData.value.trim());
    var needsCanonicalSave = vaultPersistenceState === 'unsaved';
    if (vaultLoadFile) {
      vaultLoadFile.disabled = !channelReady || unlocked || Boolean(liveTransferCameraStream) || Boolean(pendingReceivedTransfer);
    }
    if (vaultChooseFolder) {
      vaultChooseFolder.hidden = typeof window.showDirectoryPicker !== 'function';
      vaultChooseFolder.disabled = !channelReady || unlocked || Boolean(liveTransferCameraStream) || Boolean(pendingReceivedTransfer) || typeof window.showDirectoryPicker !== 'function';
    }
    if (vaultCreateName) {
      vaultCreateName.disabled = !channelReady || !locked || Boolean(liveTransferCameraStream) || Boolean(pendingReceivedTransfer);
    }
    if (vaultCreatePrepare) {
      vaultCreatePrepare.disabled = !channelReady || !locked || Boolean(liveTransferCameraStream) || Boolean(pendingReceivedTransfer);
    }
    if (vaultSavePrimary) {
      vaultSavePrimary.disabled = !channelReady || !unlocked || !needsCanonicalSave;
    }
    if (vaultSaveFileSystem) {
      vaultSaveFileSystem.disabled = !channelReady
        || !unlocked
        || !needsCanonicalSave
        || typeof window.showSaveFilePicker !== 'function';
    }
    if (vaultSaveDownload) {
      vaultSaveDownload.disabled = !channelReady || !unlocked || !needsCanonicalSave;
    }
    if (vaultSaveManual) {
      vaultSaveManual.disabled = !channelReady || !unlocked;
    }
    if (vaultManualCopy) {
      vaultManualCopy.disabled = !hasManualText;
    }
    if (vaultManualShare) {
      vaultManualShare.disabled = !hasManualText
        || !window.navigator
        || typeof window.navigator.share !== 'function';
    }
    if (vaultLoadManual) {
      vaultLoadManual.disabled = !channelReady || !hasManualText || unlocked;
    }
    if (vaultTransferStart) {
      vaultTransferStart.disabled = !channelReady || !unlocked || !activeVaultId || !vaultHasDurableTransferSource() || liveTransferFrames.length > 0;
    }
    if (vaultTransferReceive) {
      vaultTransferReceive.disabled = !channelReady
        || !locked
        || liveQrReceiverState !== 'available'
        || Boolean(liveTransferCameraStream)
        || Boolean(pendingReceivedTransfer);
    }
    if (vaultTransferLoad) {
      vaultTransferLoad.disabled = !channelReady || !locked || !pendingReceivedTransfer;
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

  function safeLocalStorage() {
    try {
      return window.localStorage;
    } catch (error) {
      return null;
    }
  }

  function setActiveVaultMeta(name, vaultId) {
    activeVaultName = typeof name === 'string' ? name.trim() : '';
    activeVaultId = typeof vaultId === 'string' ? vaultId : null;
    if (vaultActiveMeta) {
      vaultActiveMeta.hidden = !activeVaultName && !activeVaultId;
    }
    if (vaultActiveNameNode) {
      vaultActiveNameNode.textContent = activeVaultName || 'Unnamed vault';
    }
    if (vaultActiveIdNode) {
      vaultActiveIdNode.textContent = activeVaultId ? 'Vault ID ' + activeVaultId : 'Legacy vault (no authenticated Vault ID)';
    }
  }

  function displayNameFromFilename(name) {
    if (!saveIntegrity || typeof saveIntegrity.parseVaultFilename !== 'function') {
      return typeof name === 'string' ? name.replace(/\.cbx$/i, '') : 'Vault';
    }
    var parsed = saveIntegrity.parseVaultFilename(name);
    if (parsed && parsed.name) {
      return parsed.name.replace(/-/g, ' ');
    }
    return typeof name === 'string' ? name.replace(/\.cbx$/i, '') : 'Vault';
  }

  function libraryEntryForFile(file, handle) {
    var parsed = saveIntegrity && typeof saveIntegrity.parseVaultFilename === 'function'
      ? saveIntegrity.parseVaultFilename(file && file.name)
      : null;
    return {
      file: file,
      handle: handle || null,
      displayName: displayNameFromFilename(file && file.name),
      parsed: parsed,
      key: String(file && file.name || '') + ':' + String(file && file.size || 0) + ':' + String(file && file.lastModified || 0)
    };
  }

  function vaultNameConflict(name, vaultId) {
    if (!saveIntegrity || typeof saveIntegrity.normalizedVaultNameKey !== 'function') {
      return false;
    }
    var key = saveIntegrity.normalizedVaultNameKey(name);
    if (!key) {
      return true;
    }
    var normalizedId = typeof vaultId === 'string' ? vaultId.toLowerCase() : null;
    if (vaultSessionNameOwners[key] && (!normalizedId || vaultSessionNameOwners[key] !== normalizedId)) {
      return true;
    }
    if (typeof saveIntegrity.vaultNameOwner === 'function') {
      var owner = saveIntegrity.vaultNameOwner(safeLocalStorage(), name);
      if (owner && (!normalizedId || owner !== normalizedId)) {
        return true;
      }
    }
    for (var index = 0; index < vaultLibraryEntries.length; index += 1) {
      var entry = vaultLibraryEntries[index];
      if (saveIntegrity.normalizedVaultNameKey(entry.displayName) !== key) {
        continue;
      }
      if (!normalizedId) {
        return true;
      }
      var shortId = typeof saveIntegrity.id8 === 'function' ? saveIntegrity.id8(normalizedId) : null;
      if (!entry.parsed || !entry.parsed.id8 || !shortId || entry.parsed.id8 !== shortId) {
        return true;
      }
    }
    return false;
  }

  function claimVaultName(name, vaultId) {
    if (!saveIntegrity || typeof saveIntegrity.normalizedVaultNameKey !== 'function') {
      return false;
    }
    var key = saveIntegrity.normalizedVaultNameKey(name);
    var normalizedId = typeof vaultId === 'string' ? vaultId.toLowerCase() : null;
    if (!key || !normalizedId) {
      return false;
    }
    if (vaultSessionNameOwners[key] && vaultSessionNameOwners[key] !== normalizedId) {
      return false;
    }
    vaultSessionNameOwners[key] = normalizedId;
    if (typeof saveIntegrity.claimVaultName === 'function') {
      saveIntegrity.claimVaultName(safeLocalStorage(), name, normalizedId);
    }
    return true;
  }

  function renderVaultLibrary() {
    if (!vaultLibraryList) {
      return;
    }
    while (vaultLibraryList.firstChild) {
      vaultLibraryList.removeChild(vaultLibraryList.firstChild);
    }
    if (vaultLibraryEmpty) {
      vaultLibraryEmpty.hidden = vaultLibraryEntries.length > 0;
    }
    vaultLibraryEntries.forEach(function (entry, index) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'vault-button vault-library-item';
      button.setAttribute('role', 'listitem');
      button.setAttribute('data-vault-library-index', String(index));
      var title = document.createElement('strong');
      title.textContent = entry.displayName;
      var detail = document.createElement('span');
      var historyHint = entry.parsed && entry.parsed.counter !== null
        ? 'legacy generation ' + String(entry.parsed.counter) + ' · '
        : '';
      var nameConflict = false;
      if (saveIntegrity && typeof saveIntegrity.normalizedVaultNameKey === 'function') {
        var entryKey = saveIntegrity.normalizedVaultNameKey(entry.displayName);
        var entryId8 = entry.parsed && entry.parsed.id8 ? entry.parsed.id8 : null;
        nameConflict = vaultLibraryEntries.some(function (other) {
          return other !== entry
            && saveIntegrity.normalizedVaultNameKey(other.displayName) === entryKey
            && (!entryId8 || !other.parsed || !other.parsed.id8 || other.parsed.id8 !== entryId8);
        });
      }
      detail.textContent = (nameConflict ? 'NAME CONFLICT · rename one vault file · ' : '')
        + historyHint + String(entry.file.name || 'vault.cbx');
      button.disabled = nameConflict;
      button.appendChild(title);
      button.appendChild(detail);
      vaultLibraryList.appendChild(button);
    });
  }

  function addVaultEntries(entries) {
    var incoming = Array.prototype.slice.call(entries || []).filter(function (entry) {
      return entry && entry.file && typeof entry.file.name === 'string' && /\.cbx$/i.test(entry.file.name);
    });
    var known = {};
    vaultLibraryEntries.forEach(function (entry) { known[entry.key] = true; });
    incoming.forEach(function (item) {
      var entry = libraryEntryForFile(item.file, item.handle);
      if (!known[entry.key]) {
        known[entry.key] = true;
        vaultLibraryEntries.push(entry);
      }
    });
    vaultLibraryEntries.sort(function (left, right) {
      var nameOrder = left.displayName.localeCompare(right.displayName);
      if (nameOrder !== 0) { return nameOrder; }
      return String(left.file.name || '').localeCompare(String(right.file.name || ''));
    });
    renderVaultLibrary();
    if (incoming.length === 0) {
      setVaultNotice('No .cbx vault files were found in that selection.');
    } else {
      setVaultNotice(String(incoming.length) + ' vault file(s) added to the user-granted library. Select one to unlock.');
    }
  }

  function addVaultFiles(files) {
    addVaultEntries(Array.prototype.slice.call(files || []).map(function (file) {
      return { file: file, handle: null };
    }));
  }

  function prepareNewVaultCreation() {
    if (!vaultCreateName || !saveIntegrity) {
      setVaultNotice('Vault creation metadata is unavailable in this build.');
      return;
    }
    var name = vaultCreateName.value.trim();
    var safeFilenameName = saveIntegrity.sanitizeVaultName(name);
    if (!name || !safeFilenameName) {
      setVaultNotice('Enter a public vault name before creation.');
      vaultCreateName.focus();
      return;
    }
    if (vaultNameConflict(name, null)) {
      setVaultNotice('A different vault already uses that public name on this device or in the granted Vault Library. Choose another name before creating a new vault.');
      vaultCreateName.focus();
      return;
    }
    clearManualVaultExport();
    pendingCreateVaultName = name.slice(0, 80);
    setActiveVaultMeta(pendingCreateVaultName, null);
    var id = sendVaultMessage('vault.create.prepare', {});
    if (!id) {
      pendingCreateVaultName = '';
      return;
    }
    setVaultStatus(
      'pending',
      'New vault is ready for its unlock phrase',
      'Public name “' + pendingCreateVaultName + '” is prepared in the warm shell. Enter the new unlock phrase twice in the sealed realm, then choose Create prepared vault.',
      'Creation prepared'
    );
  }

  async function chooseVaultFolder() {
    if (typeof window.showDirectoryPicker !== 'function') {
      setVaultNotice('Folder access is unavailable in this browser. Choose vault files instead.');
      return;
    }
    try {
      var directory = await window.showDirectoryPicker({ mode: 'read' });
      var entries = [];
      for await (var handle of directory.values()) {
        if (handle && handle.kind === 'file' && /\.cbx$/i.test(handle.name || '')) {
          entries.push({ file: await handle.getFile(), handle: handle });
        }
      }
      addVaultEntries(entries);
    } catch (error) {
      if (!error || error.name !== 'AbortError') {
        setVaultNotice('The selected folder could not be read. Choose vault files instead.');
      }
    }
  }

  // Persistence and dirty state are related but not identical. A browser
  // canonical download can be a real saved copy even though Coldbox cannot
  // read it back to verify it. Advanced Base64 handoff is not a save. Keep
  // the unverified-download state distinct from a never-saved vault while
  // still requiring an explicit lock decision.
  function setVaultPersistenceState(state) {
    var allowed = ['none', 'unsaved', 'saved-unverified', 'saved-verified', 'loaded'];
    vaultPersistenceState = allowed.indexOf(state) !== -1 ? state : 'none';
    vaultDirty = vaultPersistenceState === 'unsaved' || vaultPersistenceState === 'saved-unverified';
    root.setAttribute('data-vault-dirty', String(vaultDirty));
    root.setAttribute('data-vault-persistence', vaultPersistenceState);
    app.setAttribute('data-vault-dirty', String(vaultDirty));
    app.setAttribute('data-vault-persistence', vaultPersistenceState);
    if (vaultDirtyNotice) {
      vaultDirtyNotice.hidden = !vaultDirty;
      vaultDirtyNotice.setAttribute('data-dirty', String(vaultDirty));
      vaultDirtyNotice.textContent = vaultPersistenceState === 'saved-unverified'
        ? 'SAVED · NOT VERIFIED / Coldbox started a canonical .cbx download but cannot read that copy back. Reopen it before relying on it as the only copy.'
        : (vaultPersistenceState === 'unsaved'
          ? 'UNLOCKED · NOT SAVED / this vault exists only in working memory until you save it.'
          : '');
    }
    if (!vaultDirty && vaultLockWarning) {
      vaultLockWarning.hidden = true;
    }
  }

  function vaultPersistenceLabel() {
    if (vaultPersistenceState === 'unsaved') { return 'Not saved'; }
    if (vaultPersistenceState === 'saved-unverified') { return 'Saved · unverified'; }
    if (vaultPersistenceState === 'saved-verified') { return 'Saved · verified'; }
    if (vaultPersistenceState === 'loaded') { return 'Loaded'; }
    return 'Unlocked';
  }

  function setVaultRollbackBanner(evaluation, fileMeta) {
    var detected = Boolean(evaluation && evaluation.rollback);
    root.setAttribute('data-vault-rollback', detected ? 'detected' : 'none');
    if (!vaultRollbackBanner) {
      return;
    }
    vaultRollbackBanner.hidden = !detected;
    vaultRollbackBanner.setAttribute('data-state', detected ? 'detected' : 'none');
    if (!detected || !vaultRollbackBannerCopy) {
      return;
    }
    var fileDate = fileMeta && typeof fileMeta.lastModified === 'number'
      ? new Date(fileMeta.lastModified).toISOString()
      : 'unknown date';
    var seenDate = evaluation.seenSavedAt || 'unknown date';
    if (evaluation.reason === 'legacy-generation') {
      vaultRollbackBannerCopy.textContent = 'This legacy file is save generation '
        + String(evaluation.fileCounter) + ' (' + fileDate + '), but this browser previously recorded legacy generation '
        + String(evaluation.seenCounter) + ' (' + seenDate + '). You may be opening an older backup.';
      return;
    }
    vaultRollbackBannerCopy.textContent = 'This canonical file is older by filesystem timestamp (' + fileDate
      + ') than the latest copy this browser profile recorded for this Vault ID (' + seenDate + '). You may be opening an older backup. '
      + 'This advisory check degrades silently when browser-local history or trustworthy file timestamps are unavailable.';
  }

  function saveVerificationError() {
    var error = new Error('Vault save could not be verified.');
    error.code = 'VAULT_SAVE_VERIFY_FAILED';
    return error;
  }

  // Only called after a save's written bytes have been read back and
  // confirmed identical (P0.14 verify-after-save). Advances browser-local
  // advisory history and clears the dirty flag; a failed write or failed
  // verification must never reach this function.
  function completeVerifiedSave() {
    if (saveIntegrity) {
      var counter = saveIntegrity.nextCounter(saveGeneration);
      var savedAt = new Date().toISOString();
      saveGeneration = { counter: counter, savedAt: savedAt };
      if (activeVaultNamespace && typeof saveIntegrity.writeGenerationFor === 'function') {
        saveIntegrity.writeGenerationFor(safeLocalStorage(), activeVaultNamespace, counter, savedAt);
      } else {
        saveIntegrity.writeGeneration(safeLocalStorage(), counter, savedAt);
      }
    }
    setVaultPersistenceState('saved-verified');
  }

  function assertStableSaveIdentity(expectedVaultId, chosenName) {
    if (expectedVaultId && activeVaultId !== expectedVaultId) {
      throw new Error('Active Vault ID changed while save was in progress.');
    }
    if (!expectedVaultId || !activeVaultName || !saveIntegrity
      || typeof saveIntegrity.filenameForVault !== 'function') {
      return;
    }
    var expectedName = saveIntegrity.filenameForVault(activeVaultName, expectedVaultId);
    if (typeof chosenName === 'string' && chosenName !== expectedName) {
      throw new Error('Canonical vault saves must keep the unique name/Vault-ID filename.');
    }
  }

  function canonicalSaveReady() {
    if (vaultState !== 'unlocked' || vaultPersistenceState !== 'unsaved') {
      setVaultNotice('This vault has no unsaved state to persist. Coldbox will not create another look-alike copy of an unchanged vault.');
      return false;
    }
    if (!activeVaultName || !activeVaultId || vaultNameConflict(activeVaultName, activeVaultId)) {
      setVaultNotice('This public vault name is already owned by a different Vault ID. Choose a unique name before saving.');
      return false;
    }
    return true;
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

  function sendVaultOpen(bytes, fileMeta) {
    if (!bytes || bytes.length === 0) {
      setVaultNotice('The selected file did not contain vault bytes.');
      return;
    }
    var copy = new Uint8Array(bytes);
    var loadMeta = fileMeta ? Object.assign({}, fileMeta) : {};
    if (saveIntegrity && typeof saveIntegrity.legacyNamespaceFromBytes === 'function') {
      loadMeta.legacyNamespace = saveIntegrity.legacyNamespaceFromBytes(copy);
    }
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
      // Set only once the message is actually queued - handleVaultOpened()
      // uses this to distinguish "opened an existing file" (not dirty) from
      // "created fresh inside the cold realm" (dirty until first verified
      // save). A retried unlock attempt on the same file must keep this set.
      pendingVaultLoad = true;
      pendingLoadFileMeta = loadMeta;
    } catch (error) {
      pendingVaultLoad = false;
      pendingLoadFileMeta = null;
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

  function clearManualVaultExport() {
    if (vaultManualData) {
      vaultManualData.value = '';
      vaultManualData.scrollTop = 0;
    }
    updateVaultControls();
  }

  function transferId() {
    if (!window.crypto || typeof window.crypto.getRandomValues !== 'function') {
      throw new Error('Secure randomness is unavailable for the live transfer ID.');
    }
    var bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    var result = '';
    for (var index = 0; index < bytes.length; index += 1) {
      result += bytes[index].toString(16).padStart(2, '0');
      bytes[index] = 0;
    }
    return result;
  }

  function sha256Hex(bytes) {
    if (!window.crypto || !window.crypto.subtle || typeof window.crypto.subtle.digest !== 'function') {
      return Promise.reject(new Error('SHA-256 is unavailable for live transfer integrity.'));
    }
    return window.crypto.subtle.digest('SHA-256', bytes).then(function (buffer) {
      var digest = new Uint8Array(buffer);
      var result = '';
      for (var index = 0; index < digest.length; index += 1) {
        result += digest[index].toString(16).padStart(2, '0');
        digest[index] = 0;
      }
      return result;
    });
  }

  function vaultHasDurableTransferSource() {
    return vaultPersistenceState === 'saved-verified' || vaultPersistenceState === 'loaded';
  }

  function grantedLibraryAlreadyHasVault(vaultId) {
    if (!vaultId || !saveIntegrity || typeof saveIntegrity.id8 !== 'function') {
      return false;
    }
    if (activeVaultId === vaultId && activeVaultCanonicalFilename) {
      return true;
    }
    var shortId = saveIntegrity.id8(vaultId);
    return vaultLibraryEntries.some(function (entry) {
      return Boolean(entry.parsed && entry.parsed.id8 && entry.parsed.id8 === shortId);
    });
  }

  function clearLiveTransferSender(message) {
    if (liveTransferTimer !== null) {
      window.clearInterval(liveTransferTimer);
      liveTransferTimer = null;
    }
    liveTransferFrames = [];
    liveTransferIndex = 0;
    liveTransferPaused = false;
    if (vaultTransferSender) {
      vaultTransferSender.hidden = true;
    }
    if (vaultTransferImage) {
      vaultTransferImage.removeAttribute('src');
      vaultTransferImage.removeAttribute('data-transfer-frame');
    }
    if (vaultTransferPause) {
      vaultTransferPause.hidden = true;
      vaultTransferPause.textContent = 'Pause';
    }
    if (vaultTransferStop) {
      vaultTransferStop.hidden = true;
    }
    if (vaultTransferSendStatus) {
      vaultTransferSendStatus.textContent = message || 'No transfer active.';
    }
    updateVaultControls();
  }

  function renderLiveTransferFrame() {
    if (liveTransferFrames.length === 0 || !vaultTransferImage || typeof qrcode !== 'function') {
      return;
    }
    var frame = liveTransferFrames[liveTransferIndex];
    try {
      var code = qrcode(0, 'M');
      code.addData(frame, 'Byte');
      code.make();
      vaultTransferImage.src = code.createDataURL(4, 4);
      vaultTransferImage.setAttribute('data-transfer-frame', frame);
      vaultTransferImage.alt = 'Encrypted live vault transfer frame '
        + String(liveTransferIndex + 1) + ' of ' + String(liveTransferFrames.length);
      if (vaultTransferSendStatus) {
        vaultTransferSendStatus.textContent = 'Live encrypted transfer · frame '
          + String(liveTransferIndex + 1) + ' of ' + String(liveTransferFrames.length)
          + ' · repeats automatically. No QR file can be downloaded.';
      }
    } catch (error) {
      clearLiveTransferSender('The live QR frame could not be rendered. Use the canonical .cbx file instead.');
    }
  }

  function startLiveTransferAnimation() {
    renderLiveTransferFrame();
    liveTransferTimer = window.setInterval(function () {
      if (liveTransferPaused || liveTransferFrames.length === 0) {
        return;
      }
      liveTransferIndex = (liveTransferIndex + 1) % liveTransferFrames.length;
      renderLiveTransferFrame();
    }, LIVE_TRANSFER_INTERVAL_MS);
  }

  function startLiveVaultTransfer() {
    if (vaultState !== 'unlocked' || !activeVaultId || !activeVaultName || !vaultTransfer || !vaultHasDurableTransferSource()) {
      setVaultNotice('Live transfer is only for an unlocked vault that already has a durable local .cbx copy. Save/verify or load the canonical vault first.');
      return;
    }
    clearLiveTransferSender('Preparing an encrypted live transfer…');
    var expectedVaultId = activeVaultId;
    var expectedName = activeVaultName;
    requestVaultBytes().then(function (bytes) {
      return sha256Hex(bytes).then(function (hash) {
        if (vaultState !== 'unlocked' || activeVaultId !== expectedVaultId || activeVaultName !== expectedName) {
          throw new Error('Vault identity changed while transfer was being prepared.');
        }
        var frames = vaultTransfer.createFrames(bytesToBase64(bytes), {
          transferId: transferId(),
          vaultId: expectedVaultId,
          name: expectedName,
          hash: hash
        });
        liveTransferFrames = Array.prototype.slice.call(frames);
        liveTransferIndex = 0;
        liveTransferPaused = false;
        if (vaultTransferSender) {
          vaultTransferSender.hidden = false;
        }
        if (vaultTransferPause) {
          vaultTransferPause.hidden = false;
        }
        if (vaultTransferStop) {
          vaultTransferStop.hidden = false;
        }
        startLiveTransferAnimation();
        updateVaultControls();
      });
    }).catch(function () {
      clearLiveTransferSender('Live transfer could not be prepared. Use the canonical .cbx file instead.');
    });
  }

  function pauseLiveVaultTransfer() {
    if (liveTransferFrames.length === 0 || !vaultTransferPause) {
      return;
    }
    liveTransferPaused = !liveTransferPaused;
    vaultTransferPause.textContent = liveTransferPaused ? 'Resume' : 'Pause';
    if (vaultTransferSendStatus) {
      vaultTransferSendStatus.textContent = liveTransferPaused
        ? 'Live encrypted transfer paused on frame ' + String(liveTransferIndex + 1) + '.'
        : 'Live encrypted transfer resumed.';
    }
  }

  function stopLiveTransferReceiver(message, preserveReceipt) {
    if (liveTransferScanTimer !== null) {
      window.clearTimeout(liveTransferScanTimer);
      liveTransferScanTimer = null;
    }
    if (liveTransferCameraStream && typeof liveTransferCameraStream.getTracks === 'function') {
      liveTransferCameraStream.getTracks().forEach(function (track) { track.stop(); });
    }
    liveTransferCameraStream = null;
    liveTransferDetector = null;
    liveTransferCollector = null;
    if (vaultTransferVideo) {
      vaultTransferVideo.pause();
      vaultTransferVideo.srcObject = null;
      vaultTransferVideo.hidden = true;
    }
    if (vaultTransferReceiveStop) {
      vaultTransferReceiveStop.hidden = true;
    }
    if (!preserveReceipt) {
      pendingReceivedTransfer = null;
      pendingReceivedTransferMeta = null;
      if (vaultTransferReceipt) {
        vaultTransferReceipt.hidden = true;
      }
    }
    if (vaultTransferReceiveStatus && message) {
      vaultTransferReceiveStatus.textContent = message;
    }
    updateVaultControls();
  }

  function finishLiveTransferReceipt(assembled) {
    var bytes;
    try {
      bytes = base64ToBytes(assembled.base64);
    } catch (error) {
      stopLiveTransferReceiver('The received encrypted payload was invalid.', false);
      return;
    }
    sha256Hex(bytes).then(function (actualHash) {
      if (actualHash !== assembled.hash) {
        stopLiveTransferReceiver('Transfer integrity failed. The received frames were discarded.', false);
        return;
      }
      if (grantedLibraryAlreadyHasVault(assembled.vaultId)) {
        stopLiveTransferReceiver(
          'This vault is already present in the currently granted Vault Library or active canonical file. Live QR is only for a device that does not already have this vault; load the local .cbx instead.',
          false
        );
        return;
      }
      pendingReceivedTransfer = bytes;
      pendingReceivedTransferMeta = assembled;
      stopLiveTransferReceiver('Encrypted transfer complete and SHA-256 verified. Choose the local public name, then load it.', true);
      if (vaultTransferReceipt) {
        vaultTransferReceipt.hidden = false;
      }
      if (vaultTransferReceiptSummary) {
        vaultTransferReceiptSummary.textContent = 'Received encrypted vault · Vault ID '
          + assembled.vaultId + ' · transfer ' + assembled.transferId.slice(0, 8) + '…';
      }
      if (vaultTransferReceiveName) {
        vaultTransferReceiveName.value = assembled.name;
      }
      if (vaultNameConflict(assembled.name, assembled.vaultId) && vaultTransferReceiveStatus) {
        vaultTransferReceiveStatus.textContent = 'Transfer verified, but that public name already belongs to a different Vault ID on this device. Choose a different local public name before loading.';
      }
      updateVaultControls();
    }, function () {
      stopLiveTransferReceiver('Transfer integrity could not be verified. The received frames were discarded.', false);
    });
  }

  function scanLiveTransferFrame() {
    if (!liveTransferCameraStream || !liveTransferDetector || !vaultTransferVideo || !liveTransferCollector) {
      return;
    }
    Promise.resolve(liveTransferDetector.detect(vaultTransferVideo)).then(function (codes) {
      (codes || []).forEach(function (code) {
        var raw = code && typeof code.rawValue === 'string' ? code.rawValue : '';
        if (raw.indexOf(vaultTransfer.prefix) !== 0) {
          return;
        }
        var accepted = vaultTransfer.acceptFrame(liveTransferCollector, raw);
        var progress = accepted.progress;
        if (vaultTransferReceiveStatus && progress) {
          vaultTransferReceiveStatus.textContent = progress.total
            ? 'Receiving encrypted vault… ' + String(progress.received) + ' / ' + String(progress.total)
              + ' data frames collected' + (progress.hasManifest ? '.' : ' · waiting for transfer manifest.')
            : 'Receiving encrypted vault… waiting for transfer manifest.';
        }
        if (progress && progress.complete) {
          var assembled;
          try {
            assembled = vaultTransfer.assemble(liveTransferCollector);
          } catch (error) {
            stopLiveTransferReceiver('The transfer could not be reassembled. Frames were discarded.', false);
            return;
          }
          finishLiveTransferReceipt(assembled);
        }
      });
    }).catch(function () {
      // A single detector miss/error is not a transfer failure; keep scanning.
    }).then(function () {
      if (liveTransferCameraStream) {
        liveTransferScanTimer = window.setTimeout(scanLiveTransferFrame, 100);
      }
    });
  }

  function startLiveTransferReceiver() {
    if (vaultState !== 'locked' || !vaultTransfer) {
      setVaultNotice('Lock the current vault before receiving another vault.');
      return;
    }
    if (liveQrReceiverState !== 'available') {
      updateLiveTransferReceiverStatus();
      return;
    }
    if (!window.navigator || !window.navigator.mediaDevices
      || typeof window.navigator.mediaDevices.getUserMedia !== 'function'
      || typeof window.BarcodeDetector !== 'function') {
      if (vaultTransferReceiveStatus) {
        vaultTransferReceiveStatus.textContent = 'Live QR receive is unavailable in this browser. Use the canonical .cbx file instead.';
      }
      return;
    }
    var supportedPromise = typeof window.BarcodeDetector.getSupportedFormats === 'function'
      ? window.BarcodeDetector.getSupportedFormats()
      : Promise.resolve(['qr_code']);
    Promise.resolve(supportedPromise).then(function (formats) {
      if (formats.indexOf('qr_code') === -1) {
        throw new Error('QR detection unavailable.');
      }
      return window.navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    }).then(function (stream) {
      liveTransferCameraStream = stream;
      liveTransferDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
      liveTransferCollector = vaultTransfer.createCollector();
      pendingReceivedTransfer = null;
      pendingReceivedTransferMeta = null;
      if (vaultTransferReceipt) {
        vaultTransferReceipt.hidden = true;
      }
      if (vaultTransferVideo) {
        vaultTransferVideo.srcObject = stream;
        vaultTransferVideo.hidden = false;
        return Promise.resolve(vaultTransferVideo.play()).catch(function () {});
      }
      return null;
    }).then(function () {
      if (!liveTransferCameraStream) {
        return;
      }
      if (vaultTransferReceiveStop) {
        vaultTransferReceiveStop.hidden = false;
      }
      if (vaultTransferReceiveStatus) {
        vaultTransferReceiveStatus.textContent = 'Camera active. Point it at the animated QR shown by the sending Coldbox device.';
      }
      updateVaultControls();
      scanLiveTransferFrame();
    }).catch(function (error) {
      stopLiveTransferReceiver(
        error && error.name === 'NotAllowedError'
          ? 'Camera permission was not granted. Use the canonical .cbx file instead.'
          : 'Live QR receive is unavailable here. Use the canonical .cbx file instead.',
        false
      );
    });
  }

  function loadReceivedTransfer() {
    if (!pendingReceivedTransfer || !pendingReceivedTransferMeta || !vaultTransferReceiveName || !saveIntegrity) {
      setVaultNotice('No verified live transfer is waiting to be loaded.');
      return;
    }
    var name = vaultTransferReceiveName.value.trim();
    if (!name || !saveIntegrity.sanitizeVaultName(name)) {
      setVaultNotice('Choose a valid public vault name before loading the received transfer.');
      vaultTransferReceiveName.focus();
      return;
    }
    if (vaultNameConflict(name, pendingReceivedTransferMeta.vaultId)) {
      setVaultNotice('A different Vault ID already uses that public name on this device. Choose another local name.');
      vaultTransferReceiveName.focus();
      return;
    }
    var bytes = new Uint8Array(pendingReceivedTransfer);
    var meta = {
      name: null,
      displayName: name,
      lastModified: null,
      parsedName: null,
      handle: null,
      source: 'qr-transfer',
      transferVaultId: pendingReceivedTransferMeta.vaultId,
      transferId: pendingReceivedTransferMeta.transferId
    };
    clearManualVaultExport();
    setActiveVaultMeta(name, null);
    pendingReceivedTransfer = null;
    pendingReceivedTransferMeta = null;
    if (vaultTransferReceipt) {
      vaultTransferReceipt.hidden = true;
    }
    sendVaultOpen(bytes, meta);
  }

  function discardReceivedTransfer() {
    pendingReceivedTransfer = null;
    pendingReceivedTransferMeta = null;
    if (vaultTransferReceipt) {
      vaultTransferReceipt.hidden = true;
    }
    if (vaultTransferReceiveName) {
      vaultTransferReceiveName.value = '';
    }
    if (vaultTransferReceiveStatus) {
      vaultTransferReceiveStatus.textContent = 'Received transfer discarded. Camera is off.';
    }
    updateVaultControls();
  }

  function shareManualText() {
    if (!vaultManualData || !vaultManualData.value.trim()
      || !window.navigator
      || typeof window.navigator.share !== 'function') {
      setVaultNotice('This browser does not expose secure text sharing. Copy the encrypted Base64 text instead.');
      return;
    }
    window.navigator.share({
      title: 'Coldbox encrypted vault',
      text: vaultManualData.value.replace(/\s+/g, '')
    }).then(function () {
      setVaultNotice('Encrypted vault text shared.');
    }, function (error) {
      if (!error || error.name !== 'AbortError') {
        setVaultNotice('The encrypted vault was not shared. Copy the encrypted Base64 text instead.');
      }
    });
  }

  function copyText(text, success, fallbackElement) {
    if (window.navigator.clipboard && typeof window.navigator.clipboard.writeText === 'function') {
      window.navigator.clipboard.writeText(text).then(function () {
        setVaultNotice(success);
      }, function () {
        fallbackElement.focus();
        fallbackElement.select();
        setVaultNotice('Clipboard access was unavailable. The encrypted text is selected for manual copy.');
      });
      return;
    }
    fallbackElement.focus();
    fallbackElement.select();
    setVaultNotice('The encrypted text is selected for manual copy.');
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

  function loadVaultFile(file, handle) {
    // Captured before the async read so a slow FileReader path can't race a
    // second load; used only for the advisory rollback check (P0.14) and
    // never sent anywhere - it stays in the warm shell.
    var parsedName = saveIntegrity && typeof saveIntegrity.parseVaultFilename === 'function'
      ? saveIntegrity.parseVaultFilename(file && file.name)
      : null;
    var fileMeta = {
      name: file && typeof file.name === 'string' ? file.name : null,
      lastModified: file && typeof file.lastModified === 'number' ? file.lastModified : null,
      parsedName: parsedName,
      handle: handle || null,
      source: 'file'
    };
    pendingCreateVaultName = '';
    clearManualVaultExport();
    setActiveVaultMeta(displayNameFromFilename(fileMeta.name), null);
    readVaultFile(file).then(function (buffer) {
      sendVaultOpen(new Uint8Array(buffer), fileMeta);
    }, function () {
      setVaultNotice('The selected file could not be read.');
    });
  }

  function loadFromDevice() {
    if (typeof window.showOpenFilePicker === 'function') {
      window.showOpenFilePicker({
        multiple: true,
        types: [{
          description: 'Coldbox vaults',
          accept: { 'application/octet-stream': ['.cbx'] }
        }]
      }).then(function (handles) {
        return Promise.all((handles || []).map(function (handle) {
          return handle.getFile().then(function (file) { return { file: file, handle: handle }; });
        }));
      }).then(function (entries) {
        addVaultEntries(entries);
      }).catch(function (error) {
        if (!error || error.name !== 'AbortError') {
          setVaultNotice('The device file picker could not read the selected vault files.');
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

  function nextSuggestedFilename() {
    if (!saveIntegrity) {
      return 'coldbox-vault.cbx';
    }
    try {
      if (activeVaultName && activeVaultId && typeof saveIntegrity.filenameForVault === 'function') {
        return saveIntegrity.filenameForVault(activeVaultName, activeVaultId);
      }
      return 'coldbox-vault.cbx';
    } catch (error) {
      return 'coldbox-vault.cbx';
    }
  }

  function savePrimaryVault() {
    if (!canonicalSaveReady()) {
      return;
    }
    if (typeof window.showSaveFilePicker === 'function') {
      saveWithFileSystemAccess();
      return;
    }
    saveAsDownload();
  }

  // File System Access is the only save path where Coldbox can read the
  // written file back from disk, so it is the only path that performs a real
  // verify-after-save (P0.14) and the only one that ever clears the dirty
  // flag automatically. A handle that fails to re-read, or bytes that read
  // back different from what was written - the shape a truncated or
  // interrupted write takes - leaves the vault marked dirty and says so.
  function saveWithFileSystemAccess() {
    if (!canonicalSaveReady()) {
      return;
    }
    if (typeof window.showSaveFilePicker !== 'function' && !activeVaultFileHandle) {
      reportVaultSaveFailure(new Error('File System Access is unavailable.'));
      return;
    }
    var suggestedName = nextSuggestedFilename();
    var saveVaultId = activeVaultId;
    var chosenHandle = null;
    requestVaultBytes().then(function (bytes) {
      var handlePromise = activeVaultFileHandle
        ? Promise.resolve(activeVaultFileHandle)
        : window.showSaveFilePicker({
          suggestedName: suggestedName,
          types: [{
            description: 'Coldbox vault',
            accept: { 'application/octet-stream': ['.cbx'] }
          }]
        });
      return handlePromise.then(function (handle) {
        chosenHandle = handle;
        assertStableSaveIdentity(saveVaultId, handle && handle.name);
        if (!saveIntegrity) {
          return handle.createWritable().then(function (writable) {
            return writable.write(bytes).then(function () { return writable.close(); });
          }).then(function () {
            return { verified: false };
          });
        }
        return saveIntegrity.verifyAfterSave({
          bytes: bytes,
          write: function (writeBytes) {
            return handle.createWritable().then(function (writable) {
              return writable.write(writeBytes).then(function () { return writable.close(); });
            });
          },
          readBack: function () {
            return handle.getFile()
              .then(readVaultFile)
              .then(function (buffer) { return new Uint8Array(buffer); });
          }
        });
      });
    }).then(function (result) {
      if (!result || !result.verified) {
        setVaultNotice(
          'Save could not be verified: the file read back from disk did not match what was written. '
          + 'The vault still shows unsaved changes - try saving again or use a different save path.'
        );
        return;
      }
      assertStableSaveIdentity(saveVaultId, chosenHandle && chosenHandle.name);
      activeVaultFileHandle = chosenHandle;
      activeVaultCanonicalFilename = suggestedName;
      claimVaultName(activeVaultName, activeVaultId);
      completeVerifiedSave();
      setVaultStatus(
        'unlocked',
        activeVaultName ? activeVaultName + ' is unlocked' : 'Vault is unlocked',
        'The canonical encrypted vault file was written and verified byte-for-byte. Its Vault ID and filename remain stable; unchanged vaults cannot be saved again as another copy.',
        vaultPersistenceLabel()
      );
    }, reportVaultSaveFailure);
  }

  // Blob download cannot be read back from
  // disk through any web API - the browser (or the person copying the text)
  // owns that step, invisibly to this page. So neither path ever clears the
  // verified automatically. It is the canonical fallback for browsers that
  // cannot hold a writable file handle, and the UI keeps that limitation explicit.
  function saveAsDownload() {
    if (!canonicalSaveReady()) {
      return;
    }
    var suggestedName = nextSuggestedFilename();
    var saveVaultId = activeVaultId;
    requestVaultBytes().then(function (bytes) {
      assertStableSaveIdentity(saveVaultId, suggestedName);
      if (!window.URL || typeof window.URL.createObjectURL !== 'function') {
        throw new Error('Blob download is unavailable.');
      }
      var blob = new window.Blob([bytes], { type: 'application/octet-stream' });
      var url = window.URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      link.download = suggestedName;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(function () { window.URL.revokeObjectURL(url); }, 0);
    }).then(function () {
      activeVaultCanonicalFilename = suggestedName;
      claimVaultName(activeVaultName, activeVaultId);
      setVaultPersistenceState('saved-unverified');
      setVaultStatus(
        'unlocked',
        activeVaultName ? activeVaultName + ' is unlocked' : 'Vault is unlocked',
        'The canonical encrypted vault download started as ' + suggestedName + '. Coldbox cannot verify what the browser wrote, so reopen that file before relying on it as the only copy. Unchanged vaults cannot start another save.',
        vaultPersistenceLabel()
      );
    }, reportVaultSaveFailure);
  }

  function saveAsManualText() {
    var saveVaultId = activeVaultId;
    requestVaultBytes().then(function (bytes) {
      if (saveVaultId && activeVaultId !== saveVaultId) {
        throw new Error('Active Vault ID changed while encrypted text was being prepared.');
      }
      if (!vaultManualData) {
        throw new Error('Manual encrypted-text handoff is unavailable.');
      }
      vaultManualData.value = bytesToBase64(bytes);
      vaultManualData.scrollTop = 0;
      updateVaultControls();
      setVaultStatus(
        'unlocked',
        activeVaultName ? activeVaultName + ' is unlocked' : 'Vault is unlocked',
        'Encrypted Base64 text is prepared for an advanced manual handoff. This does not count as a canonical save and QR is not generated from this surface.',
        vaultPersistenceLabel()
      );
    }, reportVaultSaveFailure);
  }

  function copyManualText() {
    if (!vaultManualData || !vaultManualData.value.trim()) {
      setVaultNotice('Prepare an encrypted-text handoff before copying it.');
      return;
    }
    var text = vaultManualData.value;
    copyText(text, 'Encrypted vault text copied.', vaultManualData);
  }

  function loadManualText() {
    if (!vaultManualData) {
      return;
    }
    try {
      sendVaultOpen(base64ToBytes(vaultManualData.value), { source: 'manual-text', displayName: 'Manual imported vault' });
    } catch (error) {
      setVaultNotice('Manual load needs complete encrypted Base64 text.');
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

  function setRegistryStatus(text) {
    if (registryStatus) {
      registryStatus.textContent = text;
    }
  }

  function setDeviceStatus(text) {
    if (deviceStatus) {
      deviceStatus.textContent = text;
    }
  }

  function setPublicRecordStatus(text) {
    setRegistryStatus(text);
    setDeviceStatus(text);
  }

  function clearRegistryNode(node) {
    if (!node) {
      return;
    }
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function registryButton(action, kind, id, label) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'vault-button';
    button.textContent = label;
    button.setAttribute('data-registry-action', action);
    button.setAttribute('data-registry-kind', kind);
    button.setAttribute('data-registry-id', id);
    button.disabled = Boolean(pendingRegistryMutation);
    return button;
  }

  function appendRegistryRecord(node, kind, record, title, detail) {
    var card = document.createElement('article');
    card.className = 'registry-record';
    var titleNode = document.createElement('h3');
    titleNode.className = 'registry-record-title';
    titleNode.textContent = title;
    card.appendChild(titleNode);
    var detailNode = document.createElement('p');
    detailNode.className = 'registry-record-detail';
    detailNode.textContent = detail;
    card.appendChild(detailNode);
    card.setAttribute('data-privacy-sensitive', 'true');
    if (record.hidden === true) {
      card.setAttribute('data-concealed', 'true');
    }
    if (Array.isArray(record.tags) && record.tags.length > 0) {
      var tagsNode = document.createElement('p');
      tagsNode.className = 'registry-record-tags';
      tagsNode.textContent = record.tags.map(function (tag) { return '#' + tag; }).join(' ');
      card.appendChild(tagsNode);
    }
    if (record.notes) {
      var notesNode = document.createElement('p');
      notesNode.className = 'registry-record-notes';
      notesNode.textContent = record.notes.slice(0, 180);
      card.appendChild(notesNode);
    }
    if (kind === 'note' && record.body) {
      var bodyNode = document.createElement('p');
      bodyNode.className = 'registry-record-body';
      bodyNode.textContent = record.body.slice(0, 400);
      card.appendChild(bodyNode);
    }
    var actions = document.createElement('div');
    actions.className = 'registry-record-actions';
    actions.appendChild(registryButton('edit', kind, record.id, 'Edit'));
    actions.appendChild(registryButton('delete', kind, record.id, 'Hide'));
    card.appendChild(actions);
    node.appendChild(card);
  }

  function appendRegistryEmpty(node, text) {
    var empty = document.createElement('p');
    empty.className = 'registry-list-empty';
    empty.textContent = text;
    node.appendChild(empty);
  }

  function setRegistrySelectOptions(select, records, emptyText, titleForRecord) {
    if (!select) {
      return;
    }
    clearRegistryNode(select);
    if (records.length === 0) {
      var emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = emptyText;
      select.appendChild(emptyOption);
      select.disabled = true;
      return;
    }
    select.disabled = Boolean(pendingRegistryMutation);
    records.forEach(function (record) {
      var option = document.createElement('option');
      option.value = record.id;
      option.textContent = titleForRecord(record);
      select.appendChild(option);
    });
  }

  function setRegistryFormsDisabled(disabled) {
    [registryWalletForm, registryAccountForm, registryAddressForm, registryNoteForm, deviceForm].forEach(function (form) {
      if (!form) {
        return;
      }
      Array.prototype.forEach.call(form.elements, function (element) {
        element.disabled = disabled;
      });
    });
    [registryWalletCancel, registryAccountCancel, registryAddressCancel, registryNoteCancel, deviceCancel].forEach(function (button) {
      if (button) {
        button.disabled = disabled;
      }
    });
  }

  function registryMatchesSearch(record) {
    if (!registrySearchTerm) {
      return true;
    }
    return JSON.stringify(record).toLowerCase().indexOf(registrySearchTerm) !== -1;
  }

  function registryVisibleRecords(collection) {
    return registryStore.list(collection, hiddenRegistryVisible).filter(registryMatchesSearch);
  }

  function deviceMatchesSearch(record) {
    if (!deviceSearchTerm) {
      return true;
    }
    return JSON.stringify(record).toLowerCase().indexOf(deviceSearchTerm) !== -1;
  }

  function deviceVisibleRecords() {
    return registryStore.list('devices', hiddenRegistryVisible).filter(deviceMatchesSearch);
  }

  function renderRegistry() {
    var available = Boolean(registryStore && vaultState === 'unlocked');
    if (registryLocked) {
      registryLocked.hidden = available;
    }
    if (registryWorkspace) {
      registryWorkspace.hidden = !available;
    }
    if (deviceLocked) {
      deviceLocked.hidden = available;
    }
    if (deviceWorkspace) {
      deviceWorkspace.hidden = !available;
    }
    if (!available) {
      return;
    }
    var wallets = registryVisibleRecords('wallets');
    var accounts = registryVisibleRecords('accounts');
    var addresses = registryVisibleRecords('addresses');
    var devices = deviceVisibleRecords();
    var notes = registryVisibleRecords('notes');
    clearRegistryNode(registryWalletList);
    clearRegistryNode(registryAccountList);
    clearRegistryNode(registryAddressList);
    clearRegistryNode(deviceList);
    clearRegistryNode(registryNoteList);
    if (wallets.length === 0) {
      appendRegistryEmpty(registryWalletList, 'No wallets recorded yet.');
    } else {
      wallets.forEach(function (wallet) {
        appendRegistryRecord(
          registryWalletList,
          'wallet',
          wallet,
          wallet.label || 'Unlabeled wallet',
          [wallet.network, wallet.scriptType, wallet.primaryPath, wallet.fingerprint]
            .filter(Boolean).join(' Â· ') || 'Public wallet metadata'
        );
      });
    }
    if (accounts.length === 0) {
      appendRegistryEmpty(registryAccountList, 'No accounts recorded yet.');
    } else {
      accounts.forEach(function (account) {
        var wallet = registryStore.find('wallets', account.walletId);
        appendRegistryRecord(
          registryAccountList,
          'account',
          account,
          account.label || account.asset || 'Unlabeled account',
          [wallet && wallet.label ? wallet.label : 'Wallet', account.asset, account.path]
            .filter(Boolean).join(' Â· ')
        );
      });
    }
    if (addresses.length === 0) {
      appendRegistryEmpty(registryAddressList, registrySearchTerm ? 'No addresses match this search.' : 'No addresses recorded yet.');
    } else {
      addresses.forEach(function (address) {
        var account = registryStore.find('accounts', address.accountId);
        appendRegistryRecord(
          registryAddressList,
          'address',
          address,
          address.label || 'Address #' + String(address.index),
          [account && account.label ? account.label : 'Account', address.address]
            .filter(Boolean).join(' Â· ')
        );
      });
    }
    if (devices.length === 0) {
      appendRegistryEmpty(deviceList, deviceSearchTerm ? 'No devices match this search.' : 'No devices recorded yet.');
    } else {
      devices.forEach(function (device) {
        appendRegistryRecord(
          deviceList,
          'device',
          device,
          [device.vendor, device.model].filter(Boolean).join(' ') || 'Unlabeled device',
          [device.status, device.firmware, device.location]
            .filter(Boolean).join(' Â· ') || 'Public device metadata'
        );
      });
    }
    if (notes.length === 0) {
      appendRegistryEmpty(registryNoteList, registrySearchTerm ? 'No notes match this search.' : 'No public notes recorded yet.');
    } else {
      notes.forEach(function (note) {
        appendRegistryRecord(
          registryNoteList,
          'note',
          note,
          note.title,
          [note.visibility, note.linkedIds && note.linkedIds.length
            ? String(note.linkedIds.length) + ' linked record(s)' : 'Standalone note']
            .filter(Boolean).join(' · ')
        );
      });
    }
    setRegistrySelectOptions(
      registryAccountWallet,
      wallets,
      'Create a wallet first',
      function (wallet) { return wallet.label || 'Unlabeled wallet'; }
    );
    setRegistrySelectOptions(
      registryAddressAccount,
      accounts,
      'Create an account first',
      function (account) { return account.label || account.asset || 'Unlabeled account'; }
    );
    setRegistryFormsDisabled(Boolean(pendingRegistryMutation));
    if (registryWalletForm) {
      registryWalletForm.querySelector('button[type="submit"]').disabled = Boolean(pendingRegistryMutation);
    }
    if (registryAccountForm) {
      registryAccountForm.querySelector('button[type="submit"]').disabled = Boolean(pendingRegistryMutation);
    }
    if (registryAddressForm) {
      registryAddressForm.querySelector('button[type="submit"]').disabled = Boolean(pendingRegistryMutation);
    }
    if (registryNoteForm) {
      registryNoteForm.querySelector('button[type="submit"]').disabled = Boolean(pendingRegistryMutation);
    }
    if (deviceForm) {
      deviceForm.querySelector('button[type="submit"]').disabled = Boolean(pendingRegistryMutation);
    }
    if (registryShowHidden) {
      registryShowHidden.checked = hiddenRegistryVisible;
      registryShowHidden.disabled = Boolean(pendingRegistryMutation);
    }
    if (registryHiddenHelp) {
      registryHiddenHelp.textContent = hiddenRegistryVisible
        ? 'Hidden records are visible for this unlocked session. Locking the vault hides them again.'
        : 'Hidden records stay out of views and search until you re-enter the vault phrase inside the sealed realm.';
    }
    if (deviceSearch) {
      deviceSearch.value = deviceSearchTerm;
    }
    if (deviceShowHidden) {
      deviceShowHidden.checked = hiddenRegistryVisible;
      deviceShowHidden.disabled = Boolean(pendingRegistryMutation);
    }
    if (deviceHiddenHelp) {
      deviceHiddenHelp.textContent = hiddenRegistryVisible
        ? 'Hidden devices are visible for this unlocked session. Locking the vault hides them again.'
        : 'Hidden devices stay out of the list and search until you re-enter the vault phrase inside the sealed realm.';
    }
  }

  function beginRegistryMutation(mutator) {
    if (!registryStore || vaultState !== 'unlocked') {
      setPublicRecordStatus('Unlock the vault before changing public registry records.');
      return;
    }
    if (pendingRegistryMutation) {
      setPublicRecordStatus('A registry change is still being written inside the sealed realm.');
      return;
    }
    var before = registryStore.snapshot();
    var persistenceState = vaultPersistenceState;
    try {
      mutator();
    } catch (error) {
      setPublicRecordStatus(error && error.message ? error.message : 'The registry change was rejected.');
      return;
    }
    var id = sendVaultMessage('publicData.replace', {
      publicCompartment: registryStore.snapshot()
    });
    if (!id) {
      registryStore.replace(before);
      setPublicRecordStatus('The registry change was not sent. Nothing was changed.');
      renderRegistry();
      return;
    }
    pendingRegistryMutation = {
      id: id,
      before: before,
      persistenceState: persistenceState
    };
    setVaultPersistenceState('unsaved');
    setPublicRecordStatus('Writing public registry change inside the sealed realm...');
    renderRegistry();
  }

  function resetWalletForm() {
    if (!registryWalletForm) {
      return;
    }
    registryWalletForm.reset();
    registryWalletId.value = '';
    registryWalletNetwork.value = 'bitcoin';
    registryWalletScript.value = 'p2wpkh';
    if (registryWalletNotes) { registryWalletNotes.value = ''; }
    if (registryWalletTags) { registryWalletTags.value = ''; }
    if (registryWalletHidden) { registryWalletHidden.checked = false; }
    registryWalletCancel.hidden = true;
  }

  function resetAccountForm() {
    if (!registryAccountForm) {
      return;
    }
    registryAccountForm.reset();
    registryAccountId.value = '';
    registryAccountAsset.value = 'BTC';
    if (registryAccountNotes) { registryAccountNotes.value = ''; }
    if (registryAccountTags) { registryAccountTags.value = ''; }
    if (registryAccountHidden) { registryAccountHidden.checked = false; }
    registryAccountCancel.hidden = true;
  }

  function resetAddressForm() {
    if (!registryAddressForm) {
      return;
    }
    registryAddressForm.reset();
    registryAddressId.value = '';
    registryAddressIndex.value = '0';
    if (registryAddressNotes) { registryAddressNotes.value = ''; }
    if (registryAddressTags) { registryAddressTags.value = ''; }
    if (registryAddressHidden) { registryAddressHidden.checked = false; }
    registryAddressCancel.hidden = true;
  }

  function resetNoteForm() {
    if (!registryNoteForm) {
      return;
    }
    registryNoteForm.reset();
    registryNoteId.value = '';
    registryNoteCancel.hidden = true;
  }

  function resetDeviceForm() {
    if (!deviceForm) {
      return;
    }
    deviceForm.reset();
    deviceId.value = '';
    deviceStatusValue.value = 'in-use';
    deviceTamperCheck.checked = false;
    devicePassphraseUsed.checked = false;
    deviceHidden.checked = false;
    deviceCancel.hidden = true;
  }

  function parseRegistryList(value) {
    return value.split(',').map(function (item) { return item.trim(); }).filter(Boolean);
  }

  function dateInputToIso(input) {
    var value = input && typeof input.value === 'string' ? input.value.trim() : '';
    return value ? value + 'T00:00:00.000Z' : '';
  }

  function isoDateToInput(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)
      ? value.slice(0, 10)
      : '';
  }

  function addRegistryOptionalList(record, key, input, clearFields) {
    var values = parseRegistryList(input.value);
    if (values.length > 0) {
      record[key] = values;
    } else if (clearFields) {
      clearFields.push(key);
    }
  }

  function editRegistryRecord(kind, id) {
    var collection = kind === 'address' ? 'addresses' : (kind === 'note' ? 'notes' : kind + 's');
    var record = registryStore && registryStore.find(collection, id);
    if (!record) {
      setRegistryStatus('That registry record is no longer available.');
      return;
    }
    if (kind === 'wallet') {
      registryWalletId.value = record.id;
      registryWalletLabel.value = record.label || '';
      registryWalletType.value = record.type || 'singlesig';
      registryWalletNetwork.value = record.network || 'bitcoin';
      registryWalletScript.value = record.scriptType || 'p2wpkh';
      registryWalletPath.value = record.primaryPath || '';
      registryWalletFingerprint.value = record.fingerprint || '';
      if (registryWalletNotes) { registryWalletNotes.value = record.notes || ''; }
      if (registryWalletTags) { registryWalletTags.value = (record.tags || []).join(', '); }
      if (registryWalletHidden) { registryWalletHidden.checked = record.hidden === true; }
      registryWalletCancel.hidden = false;
      registryWalletLabel.focus();
    } else if (kind === 'account') {
      registryAccountId.value = record.id;
      registryAccountWallet.value = record.walletId;
      registryAccountAsset.value = record.asset || 'BTC';
      registryAccountPath.value = record.path || '';
      registryAccountLabel.value = record.label || '';
      if (registryAccountNotes) { registryAccountNotes.value = record.notes || ''; }
      if (registryAccountTags) { registryAccountTags.value = (record.tags || []).join(', '); }
      if (registryAccountHidden) { registryAccountHidden.checked = record.hidden === true; }
      registryAccountCancel.hidden = false;
      registryAccountLabel.focus();
    } else if (kind === 'address') {
      registryAddressId.value = record.id;
      registryAddressAccount.value = record.accountId;
      registryAddressIndex.value = String(record.index);
      registryAddressValue.value = record.address || '';
      registryAddressLabel.value = record.label || '';
      registryAddressChange.checked = record.isChange === true;
      if (registryAddressNotes) { registryAddressNotes.value = record.notes || ''; }
      if (registryAddressTags) { registryAddressTags.value = (record.tags || []).join(', '); }
      if (registryAddressHidden) { registryAddressHidden.checked = record.hidden === true; }
      registryAddressCancel.hidden = false;
      registryAddressLabel.focus();
    } else if (kind === 'note') {
      registryNoteId.value = record.id;
      registryNoteTitle.value = record.title || '';
      registryNoteBody.value = record.body || '';
      registryNoteLinks.value = (record.linkedIds || []).join(', ');
      registryNoteTags.value = (record.tags || []).join(', ');
      registryNoteHidden.checked = record.hidden === true;
      registryNoteCancel.hidden = false;
      registryNoteTitle.focus();
    } else if (kind === 'device') {
      deviceId.value = record.id;
      deviceVendor.value = record.vendor || '';
      deviceModel.value = record.model || '';
      deviceSerial.value = record.serial || '';
      deviceFirmware.value = record.firmware || '';
      deviceFirmwareDate.value = isoDateToInput(record.firmwareDate);
      devicePurchasedFrom.value = record.purchasedFrom || '';
      devicePurchasedAt.value = isoDateToInput(record.purchasedAt);
      deviceTamperCheck.checked = record.tamperCheckPassed === true;
      deviceTamperNotes.value = record.tamperCheckNotes || '';
      devicePinSetAt.value = isoDateToInput(record.pinSetAt);
      devicePinChangedAt.value = isoDateToInput(record.pinChangedAt);
      devicePassphraseUsed.checked = record.passphraseUsed === true;
      deviceSeedFingerprints.value = (record.seedFingerprints || []).join(', ');
      deviceLocation.value = record.location || '';
      deviceStatusValue.value = record.status || 'in-use';
      deviceNotes.value = record.notes || '';
      deviceHidden.checked = record.hidden === true;
      deviceCancel.hidden = false;
      deviceVendor.focus();
    }
    if (kind === 'device') {
      setDeviceStatus('Editing a public device record.');
    } else {
      setRegistryStatus('Editing a public ' + kind + ' record.');
    }
  }

  function deleteRegistryRecord(kind, id) {
    beginRegistryMutation(function () {
      if (kind === 'wallet') {
        registryStore.deleteWallet(id);
      } else if (kind === 'account') {
        registryStore.deleteAccount(id);
      } else if (kind === 'address') {
        registryStore.deleteAddress(id);
      } else if (kind === 'device') {
        registryStore.deleteDevice(id);
      } else {
        registryStore.deleteNote(id);
      }
    });
  }

  function handleRegistryListAction(event) {
    var target = event.target;
    while (target && target !== event.currentTarget
      && target.getAttribute && !target.getAttribute('data-registry-action')) {
      target = target.parentNode;
    }
    if (!target || !target.getAttribute) {
      return;
    }
    var action = target.getAttribute('data-registry-action');
    var kind = target.getAttribute('data-registry-kind');
    var id = target.getAttribute('data-registry-id');
    if (pendingRegistryMutation || !kind || !id) {
      return;
    }
    if (action === 'edit') {
      editRegistryRecord(kind, id);
    } else if (action === 'delete') {
      deleteRegistryRecord(kind, id);
    }
  }

  function addRegistryText(record, key, input, clearFields) {
    var value = input.value.trim();
    if (value) {
      record[key] = value;
    } else if (clearFields) {
      clearFields.push(key);
    }
  }

  function handleWalletFormSubmit(event) {
    event.preventDefault();
    var id = registryWalletId.value;
    var clearFields = id ? [] : null;
    var record = {
      type: registryWalletType.value
    };
    addRegistryText(record, 'label', registryWalletLabel, clearFields);
    addRegistryText(record, 'network', registryWalletNetwork, clearFields);
    addRegistryText(record, 'scriptType', registryWalletScript, clearFields);
    addRegistryText(record, 'primaryPath', registryWalletPath, clearFields);
    addRegistryText(record, 'fingerprint', registryWalletFingerprint, clearFields);
    addRegistryText(record, 'notes', registryWalletNotes, clearFields);
    addRegistryOptionalList(record, 'tags', registryWalletTags, clearFields);
    record.hidden = Boolean(registryWalletHidden && registryWalletHidden.checked);
    beginRegistryMutation(function () {
      if (id) {
        registryStore.updateWallet(id, record, { clearFields: clearFields });
      } else {
        registryStore.createWallet(record);
      }
    });
    resetWalletForm();
  }

  function handleAccountFormSubmit(event) {
    event.preventDefault();
    var id = registryAccountId.value;
    var clearFields = id ? [] : null;
    var record = {
      walletId: registryAccountWallet.value
    };
    addRegistryText(record, 'asset', registryAccountAsset, clearFields);
    addRegistryText(record, 'path', registryAccountPath, clearFields);
    addRegistryText(record, 'label', registryAccountLabel, clearFields);
    addRegistryText(record, 'notes', registryAccountNotes, clearFields);
    addRegistryOptionalList(record, 'tags', registryAccountTags, clearFields);
    record.hidden = Boolean(registryAccountHidden && registryAccountHidden.checked);
    beginRegistryMutation(function () {
      if (id) {
        registryStore.updateAccount(id, record, { clearFields: clearFields });
      } else {
        registryStore.createAccount(record);
      }
    });
    resetAccountForm();
  }

  function handleAddressFormSubmit(event) {
    event.preventDefault();
    var id = registryAddressId.value;
    var clearFields = id ? [] : null;
    var existing = id && registryStore ? registryStore.find('addresses', id) : null;
    var record = {
      accountId: registryAddressAccount.value,
      index: Number(registryAddressIndex.value),
      address: registryAddressValue.value.trim(),
      isChange: registryAddressChange.checked,
      used: existing ? existing.used === true : false
    };
    addRegistryText(record, 'label', registryAddressLabel, clearFields);
    addRegistryText(record, 'notes', registryAddressNotes, clearFields);
    addRegistryOptionalList(record, 'tags', registryAddressTags, clearFields);
    record.hidden = Boolean(registryAddressHidden && registryAddressHidden.checked);
    beginRegistryMutation(function () {
      if (id) {
        registryStore.updateAddress(id, record, { clearFields: clearFields });
      } else {
        registryStore.createAddress(record);
      }
    });
    resetAddressForm();
  }

  function handleNoteFormSubmit(event) {
    event.preventDefault();
    var id = registryNoteId.value;
    var clearFields = id ? [] : null;
    var record = {
      title: registryNoteTitle.value.trim(),
      body: registryNoteBody.value,
      visibility: 'public'
    };
    addRegistryOptionalList(record, 'linkedIds', registryNoteLinks, clearFields);
    addRegistryOptionalList(record, 'tags', registryNoteTags, clearFields);
    record.hidden = Boolean(registryNoteHidden && registryNoteHidden.checked);
    beginRegistryMutation(function () {
      if (id) {
        registryStore.updateNote(id, record, { clearFields: clearFields });
      } else {
        registryStore.createNote(record);
      }
    });
    resetNoteForm();
  }

  function addDeviceOptionalDate(record, key, input, clearFields) {
    var value = dateInputToIso(input);
    if (value) {
      record[key] = value;
    } else if (clearFields) {
      clearFields.push(key);
    }
  }

  function handleDeviceFormSubmit(event) {
    event.preventDefault();
    var id = deviceId.value;
    var clearFields = id ? [] : null;
    var record = {
      vendor: deviceVendor.value.trim(),
      model: deviceModel.value.trim(),
      firmware: deviceFirmware.value.trim(),
      tamperCheckPassed: deviceTamperCheck.checked,
      seedFingerprints: parseRegistryList(deviceSeedFingerprints.value),
      status: deviceStatusValue.value,
      hidden: deviceHidden.checked
    };
    record.passphraseUsed = devicePassphraseUsed.checked;
    addRegistryText(record, 'serial', deviceSerial, clearFields);
    addDeviceOptionalDate(record, 'firmwareDate', deviceFirmwareDate, clearFields);
    addRegistryText(record, 'purchasedFrom', devicePurchasedFrom, clearFields);
    addDeviceOptionalDate(record, 'purchasedAt', devicePurchasedAt, clearFields);
    addRegistryText(record, 'tamperCheckNotes', deviceTamperNotes, clearFields);
    addDeviceOptionalDate(record, 'pinSetAt', devicePinSetAt, clearFields);
    addDeviceOptionalDate(record, 'pinChangedAt', devicePinChangedAt, clearFields);
    addRegistryOptionalList(record, 'seedFingerprints', deviceSeedFingerprints, clearFields);
    addRegistryText(record, 'location', deviceLocation, clearFields);
    addRegistryText(record, 'notes', deviceNotes, clearFields);
    beginRegistryMutation(function () {
      if (id) {
        registryStore.updateDevice(id, record, { clearFields: clearFields });
      } else {
        registryStore.createDevice(record);
      }
    });
    resetDeviceForm();
  }

  function handleHiddenRevealResult(message) {
    if (!pendingHiddenReveal || pendingHiddenReveal !== message.id) {
      recordChannelAnomaly();
      return;
    }
    pendingHiddenReveal = null;
    if (message.payload.revealed === true) {
      hiddenRegistryVisible = true;
      setRegistryStatus('Hidden records are visible for this unlocked session.');
    } else {
      hiddenRegistryVisible = false;
      setRegistryStatus('The vault phrase was not accepted. Hidden records remain concealed.');
    }
    renderRegistry();
  }

  function requestHiddenReveal() {
    if (!registryStore || vaultState !== 'unlocked') {
      return;
    }
    if (hiddenRegistryVisible) {
      hiddenRegistryVisible = false;
      renderRegistry();
      return;
    }
    if (pendingHiddenReveal) {
      setRegistryStatus('Re-enter the vault phrase inside the sealed realm to reveal hidden records.');
      return;
    }
    var id = sendVaultMessage('concealment.reveal', {});
    if (!id) {
      setRegistryStatus('The hidden-record reveal request could not be sent.');
      return;
    }
    pendingHiddenReveal = id;
    setRegistryStatus('Re-enter the vault phrase inside the sealed realm to reveal hidden records.');
  }

  function updatePrivacyBlurControl() {
    if (!privacyBlurToggle || !concealmentController) {
      return;
    }
    var enabled = concealmentController.isPrivacyBlurred();
    privacyBlurToggle.setAttribute('aria-pressed', String(enabled));
    privacyBlurToggle.setAttribute('data-state', enabled ? 'on' : 'off');
    if (privacyBlurLabel) {
      privacyBlurLabel.textContent = enabled ? 'Privacy blur on' : 'Privacy blur off';
    }
  }

  function handlePublicDataUpdated(message) {
    if (!pendingRegistryMutation || pendingRegistryMutation.id !== message.id) {
      recordChannelAnomaly();
      return;
    }
    try {
      registryStore.replace(message.payload.publicCompartment);
      pendingRegistryMutation = null;
      setPublicRecordStatus('Public registry change written. Save the vault to make it durable.');
      renderRegistry();
    } catch (error) {
      handleVaultError({
        id: message.id,
        payload: { code: 'operation-failed', message: 'The registry acknowledgement failed validation.' }
      });
    }
  }

  function handleVaultOpened(message) {
    var publicCompartment = message.payload.publicCompartment || {};
    hiddenRegistryVisible = false;
    pendingHiddenReveal = null;
    deviceSearchTerm = '';
    var count = publicRecordCount(publicCompartment);
    var vaultId = typeof publicCompartment.id === 'string' ? publicCompartment.id : null;
    var wasLoaded = pendingVaultLoad;
    var loadMeta = pendingLoadFileMeta || {};
    var source = wasLoaded ? (loadMeta.source || 'file') : 'created';
    var durableFileLoad = source === 'file';
    var transferredLoad = source === 'qr-transfer';
    var manualLoad = source === 'manual-text';
    var chosenName = wasLoaded
      ? (loadMeta.displayName || activeVaultName || displayNameFromFilename(loadMeta.name))
      : (pendingCreateVaultName || activeVaultName || 'New vault');
    pendingVaultLoad = false;
    pendingLoadFileMeta = null;
    pendingCreateVaultName = '';

    if (transferredLoad && loadMeta.transferVaultId && vaultId !== loadMeta.transferVaultId) {
      sendVaultMessage('vault.lock', {});
      setActiveVaultMeta('', null);
      setVaultPersistenceState('none');
      setVaultStatus(
        'locked',
        'Transferred vault rejected',
        'The authenticated Vault ID did not match the public Vault ID announced by the live QR transfer. Coldbox locked and discarded the session.',
        'Rejected'
      );
      return;
    }

    if (vaultId && chosenName && vaultNameConflict(chosenName, vaultId)) {
      sendVaultMessage('vault.lock', {});
      setActiveVaultMeta('', null);
      setVaultPersistenceState('none');
      setVaultStatus(
        'locked',
        'Vault name conflict',
        'A different Vault ID already owns the public name “' + chosenName + '” on this device or in the granted Vault Library. Rename the local file/name before loading it.',
        'Name conflict'
      );
      return;
    }

    activeVaultNamespace = null;
    activeVaultFileHandle = durableFileLoad && loadMeta.parsedName && loadMeta.parsedName.canonical
      ? (loadMeta.handle || null)
      : null;
    activeVaultCanonicalFilename = durableFileLoad && loadMeta.parsedName && loadMeta.parsedName.canonical
      && typeof loadMeta.name === 'string'
      ? loadMeta.name
      : null;
    if (saveIntegrity) {
      if (vaultId && typeof saveIntegrity.vaultNamespace === 'function') {
        activeVaultNamespace = saveIntegrity.vaultNamespace(vaultId);
      }
      if (!activeVaultNamespace && loadMeta && loadMeta.legacyNamespace) {
        activeVaultNamespace = loadMeta.legacyNamespace;
      }
      saveGeneration = activeVaultNamespace && typeof saveIntegrity.readGenerationFor === 'function'
        ? saveIntegrity.readGenerationFor(safeLocalStorage(), activeVaultNamespace)
        : { counter: 0, savedAt: null };
    }
    setActiveVaultMeta(chosenName, vaultId);
    try {
      registryStore = registry.createStore(publicCompartment);
    } catch (error) {
      registryStore = null;
      sendVaultMessage('vault.lock', {});
      setVaultPersistenceState('none');
      setVaultStatus(
        'locked',
        'Registry data rejected',
        'The public registry could not be validated, so Coldbox locked the vault and discarded the session.',
        'Rejected'
      );
      renderRegistry();
      return;
    }
    pendingRegistryMutation = null;
    renderRegistry();
    // Persist public-name ownership only when a durable .cbx already exists.
    // A freshly-created or live-transferred vault that is later discarded
    // without saving must not leave a ghost name reservation behind.
    if (durableFileLoad && vaultId && chosenName) {
      claimVaultName(chosenName, vaultId);
    }
    setVaultPersistenceState(durableFileLoad ? 'loaded' : 'unsaved');

    var rollbackNotice = '';
    var identityNotice = '';
    if (durableFileLoad && saveIntegrity) {
      var parsed = loadMeta.parsedName
        ? loadMeta.parsedName
        : (loadMeta.name && typeof saveIntegrity.parseVaultFilename === 'function'
          ? saveIntegrity.parseVaultFilename(loadMeta.name)
          : null);
      var filenameIdMismatch = Boolean(
        parsed
        && parsed.id8
        && vaultId
        && typeof saveIntegrity.id8 === 'function'
        && saveIntegrity.id8(vaultId) !== parsed.id8
      );
      if (filenameIdMismatch) {
        identityNotice = ' Filename warning: the short Vault ID in the filename did not match the authenticated Vault ID, so filename identity/history hints were ignored.';
      }
      var fileCounter = !filenameIdMismatch && parsed ? parsed.counter : null;
      var fileInfo = { counter: fileCounter, lastModified: loadMeta.lastModified };
      var evaluation = saveIntegrity.evaluateRollback(saveGeneration, fileInfo);
      setVaultRollbackBanner(evaluation, loadMeta);
      if (evaluation.rollback) {
        rollbackNotice = ' Rollback warning: see the advisory banner above; this file appears older than a copy this browser profile previously recorded for this Vault ID.';
      }
      saveGeneration = saveIntegrity.advanceGenerationOnOpen(saveGeneration, fileInfo);
      if (activeVaultNamespace && typeof saveIntegrity.writeGenerationFor === 'function' && saveGeneration.savedAt) {
        saveIntegrity.writeGenerationFor(
          safeLocalStorage(),
          activeVaultNamespace,
          saveGeneration.counter,
          saveGeneration.savedAt
        );
      }
    } else {
      setVaultRollbackBanner(null, null);
      renderVaultLibrary();
    }

    var statusCopy;
    if (source === 'created') {
      statusCopy = 'New encrypted vault created in memory. SAVE VAULT now before locking, closing, timeout, or panic hide; until a durable save exists this is the only copy.';
    } else if (transferredLoad) {
      statusCopy = 'Live encrypted QR transfer authenticated successfully. The receiving device still required the normal vault unlock phrase. SAVE VAULT now to create this device’s canonical .cbx copy.';
    } else if (manualLoad) {
      statusCopy = 'Encrypted Base64 handoff opened inside the sealed realm. SAVE VAULT now if this device needs a canonical .cbx copy.';
    } else {
      statusCopy = count === 0
        ? 'The selected canonical encrypted vault opened inside the sealed realm. No public records were returned to this shell.'
        : String(count) + ' public record(s) are available to the warm shell; secret compartments remain sealed here.';
    }

    setVaultStatus(
      'unlocked',
      activeVaultName ? activeVaultName + ' is unlocked' : 'Vault is unlocked',
      statusCopy + rollbackNotice + identityNotice,
      vaultPersistenceLabel()
    );
    renderRegistry();
  }

  function handleVaultStatus(message) {
    if (message.payload.locked) {
      var lostUnsaved = vaultDirty;
      registryStore = null;
      pendingRegistryMutation = null;
      hiddenRegistryVisible = false;
      pendingHiddenReveal = null;
      resetWalletForm();
      resetAccountForm();
      resetAddressForm();
      resetNoteForm();
      resetDeviceForm();
      deviceSearchTerm = '';
      renderRegistry();
      clearLiveTransferSender('Live transfer stopped because the vault locked.');
      setVaultPersistenceState('none');
      setVaultStatus(
        'locked',
        activeVaultName ? activeVaultName + ' is locked' : 'Vault is locked',
        lostUnsaved
          ? 'The cold realm zeroized the active session. Unsaved working changes were not written; reload a durable .cbx copy to unlock again.'
          : 'The cold realm cleared its active vault session. Select or reload the encrypted .cbx file to unlock it again.',
        'Locked'
      );
    } else {
      setVaultStatus(
        'unlocked',
        activeVaultName ? activeVaultName + ' is unlocked' : 'Vault is unlocked',
        'The active vault session remains inside the sealed realm.',
        vaultPersistenceLabel()
      );
    }
    if (message.payload.warnings.indexOf('airgap-violation') !== -1) {
      setAirgapFailure('The cold realm runtime network guard blocked an unexpected request. Vault operations are refused.', true);
    }
    if (message.payload.warnings.indexOf('provider-isolation-violation') !== -1) {
      setAirgapFailure(
        'Cold realm isolation failure: an injected wallet provider was observed inside the sealed realm. '
        + 'This is different from a network-policy violation - it means a browser extension can inject into '
        + 'the sandboxed frame. Vault operations are refused. Use a browser profile with no extensions.',
        true
      );
    }
  }

  function handleVaultError(message) {
    if (pendingHiddenReveal && pendingHiddenReveal === message.id) {
      pendingHiddenReveal = null;
      hiddenRegistryVisible = false;
      setRegistryStatus('Hidden records remain concealed because re-authentication failed.');
      renderRegistry();
      return;
    }
    if (pendingRegistryMutation && pendingRegistryMutation.id === message.id) {
      var registryMutation = pendingRegistryMutation;
      pendingRegistryMutation = null;
      try {
        if (registryStore) {
          registryStore.replace(registryMutation.before);
        }
      } catch (error) {
        registryStore = null;
      }
      setVaultPersistenceState(registryMutation.persistenceState);
      setPublicRecordStatus('The registry change was rejected. Nothing was changed.');
      renderRegistry();
      return;
    }
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

  function sendVaultLockImmediately() {
    var hadUnsaved = vaultDirty;
    clearLiveTransferSender('Live transfer stopped because the vault is locking.');
    var priorPersistence = vaultPersistenceState;
    var id = sendVaultMessage('vault.lock', {});
    if (id) {
      setVaultPersistenceState('none');
      if (vaultLockWarning) {
        vaultLockWarning.hidden = true;
      }
      setVaultStatus(
        'locked',
        activeVaultName ? activeVaultName + ' is locked' : 'Vault is locked',
        hadUnsaved
          ? (priorPersistence === 'saved-unverified'
            ? 'Lock was sent immediately. The saved/exported copy remains unverified; the cold realm will zeroize its working session.'
            : 'Lock was sent immediately. Unsaved working changes were not written; the cold realm will zeroize them.')
          : 'The lock request was sent to the sealed realm. Its active bytes will be cleared there.',
        'Locked'
      );
    }
  }

  function requestVaultLock() {
    if (vaultDirty && vaultState === 'unlocked') {
      if (vaultLockWarningCopy) {
        vaultLockWarningCopy.textContent = vaultPersistenceState === 'saved-unverified'
          ? 'A canonical .cbx download was started but Coldbox could not verify the resulting copy. Reopen it before relying on it as the only copy.'
          : 'This vault has never completed a durable save. Locking now will zeroize the only working copy.';
      }
      if (vaultLockSave) {
        vaultLockSave.hidden = vaultPersistenceState === 'saved-unverified';
      }
      if (vaultLockWithoutSave) {
        vaultLockWithoutSave.textContent = vaultPersistenceState === 'saved-unverified'
          ? 'Lock anyway'
          : 'Lock without saving';
      }
      if (vaultLockWarning) {
        vaultLockWarning.hidden = false;
        vaultLockWarning.scrollIntoView({ block: 'nearest' });
      }
      setVaultNotice(vaultPersistenceState === 'saved-unverified'
        ? 'The canonical download is unverified. Lock anyway and reopen that .cbx to verify it, or cancel and keep this session open. Unchanged vaults cannot create another download copy.'
        : 'Unsaved vault: save first, lock without saving, or cancel. Emergency lock paths never wait.');
      return;
    }
    sendVaultLockImmediately();
  }

  function panicHide() {
    // Panic is an emergency path: never wait for save confirmation.
    if (concealmentController) {
      concealmentController.panicHide();
    }
    hiddenRegistryVisible = false;
    pendingHiddenReveal = null;
    clearLiveTransferSender('Live transfer stopped by panic hide.');
    stopLiveTransferReceiver('Camera stopped by panic hide.', false);
    sendVaultLockImmediately();
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
      if (!capabilities.providerNeutering) {
        setAirgapFailure('The cold realm injected-provider guard could not be installed. Vault operations are refused.');
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
      root.setAttribute('data-cold-provider-neutering', 'installed');
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
    if (handshakeState === 'ready' && message.type === 'publicData.updated') {
      handlePublicDataUpdated(message);
      return;
    }
    if (handshakeState === 'ready' && message.type === 'concealment.revealed') {
      handleHiddenRevealResult(message);
      return;
    }
    if (handshakeState === 'ready' && message.type === 'secretData.updated') {
      setVaultPersistenceState('unsaved');
      setVaultStatus(
        'unlocked',
        activeVaultName ? activeVaultName + ' is unlocked' : 'Vault is unlocked',
        'A cold-local secret note changed. Save the vault to make the encrypted update durable.',
        vaultPersistenceLabel()
      );
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
    if (handshakeState === 'ready' && message.type === 'vault.lockRequest') {
      requestVaultLock();
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
    probeLiveTransferReceiverCapability();
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

  // The dashboard stage. Purely presentational: it drives two CSS custom
  // properties and never touches routing, protocol, or realm state. If any part
  // of it is unavailable the stage simply sits at its resting transform, which
  // is the same arrangement a narrow viewport gets.
  function startStageMotion() {
    var scene = document.getElementById('stage-scene');
    if (!scene || typeof window.requestAnimationFrame !== 'function') {
      return;
    }

    var reduceMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var wideEnough = typeof window.matchMedia === 'function'
      && window.matchMedia('(min-width: 62rem)').matches;
    if (reduceMotion || !wideEnough) {
      return;
    }

    var maximumTilt = 7;
    var maximumDepth = 1.1;
    var tiltX = 0;
    var tiltY = 0;
    var depth = 0;
    var frameRequested = false;

    function applyStageTransform() {
      frameRequested = false;
      scene.style.setProperty('--stage-tilt-x', tiltX.toFixed(2) + 'deg');
      scene.style.setProperty('--stage-tilt-y', tiltY.toFixed(2) + 'deg');
      scene.style.setProperty('--stage-depth', depth.toFixed(3) + 'rem');
    }

    function requestStageFrame() {
      if (frameRequested) {
        return;
      }
      frameRequested = true;
      window.requestAnimationFrame(applyStageTransform);
    }

    function clamp(value, limit) {
      if (value > limit) {
        return limit;
      }
      if (value < -limit) {
        return -limit;
      }
      return value;
    }

    function handlePointerMove(event) {
      var width = window.innerWidth || 1;
      var height = window.innerHeight || 1;
      tiltY = clamp(((event.clientX - (width / 2)) / (width / 2)) * maximumTilt, maximumTilt);
      tiltX = clamp((((height / 2) - event.clientY) / (height / 2)) * maximumTilt, maximumTilt);
      requestStageFrame();
    }

    function handlePointerLeave() {
      tiltX = 0;
      tiltY = 0;
      requestStageFrame();
    }

    // Offset from the scene's distance to the viewport centre, so the cards
    // drift as the stage passes through the fold rather than accumulating.
    function handleScroll() {
      var bounds = scene.getBoundingClientRect();
      var viewportCentre = (window.innerHeight || 1) / 2;
      var sceneCentre = bounds.top + (bounds.height / 2);
      var offset = (sceneCentre - viewportCentre) / viewportCentre;
      depth = clamp(offset * maximumDepth, maximumDepth);
      requestStageFrame();
    }

    document.addEventListener('mousemove', handlePointerMove, { passive: true });
    document.addEventListener('mouseleave', handlePointerLeave, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
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
    function triggerReachabilityCheck() {
      updateAirgapBanner();
      runReachabilityCheck();
    }
    window.addEventListener('online', triggerReachabilityCheck);
    window.addEventListener('offline', triggerReachabilityCheck);
    window.addEventListener('focus', triggerReachabilityCheck);
    if (connection && typeof connection.addEventListener === 'function') {
      connection.addEventListener('change', triggerReachabilityCheck);
    }
    window.setInterval(runReachabilityCheck, REACHABILITY_INTERVAL_MS);
    updateAirgapBanner();
    runReachabilityCheck();
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

  function setPublicQrStatus(state, text) {
    if (!qrPublicStatus) {
      return;
    }
    qrPublicStatus.setAttribute('data-state', state);
    qrPublicStatus.textContent = text;
  }

  function publicQrAddressValid(network, address) {
    if (!address || protocol.isSecretContent(address)) {
      return false;
    }
    if (network === 'ethereum') {
      return /^0x[0-9a-fA-F]{40}$/.test(address);
    }
    return /^(?:bc1|tb1|bcrt1|[13mn2])[A-Za-z0-9]{20,130}$/.test(address);
  }

  function publicQrUri(network, address) {
    if (!qrPublicUri || !qrPublicUri.checked) {
      return address;
    }
    var amount = qrPublicAmount ? qrPublicAmount.value.trim() : '';
    var label = qrPublicLabel ? qrPublicLabel.value.trim() : '';
    if (amount && !/^\d+(?:\.\d+)?$/.test(amount)) {
      throw new Error('Amount must be a non-negative decimal number.');
    }
    if (network === 'ethereum') {
      var ethereumUri = 'ethereum:' + address;
      var ethereumParams = [];
      if (amount) {
        ethereumParams.push('value=' + encodeURIComponent(amount));
      }
      if (label) {
        ethereumParams.push('label=' + encodeURIComponent(label));
      }
      return ethereumUri + (ethereumParams.length ? '?' + ethereumParams.join('&') : '');
    }
    var bitcoinParams = [];
    if (amount) {
      bitcoinParams.push('amount=' + encodeURIComponent(amount));
    }
    if (label) {
      bitcoinParams.push('label=' + encodeURIComponent(label));
    }
    return 'bitcoin:' + address + (bitcoinParams.length ? '?' + bitcoinParams.join('&') : '');
  }

  function renderPublicQrPng(code) {
    var canvas = document.createElement('canvas');
    var cellSize = 6;
    var margin = 24;
    var moduleCount = code.getModuleCount();
    canvas.width = moduleCount * cellSize + margin * 2;
    canvas.height = canvas.width;
    var context = canvas.getContext('2d');
    if (!context || typeof canvas.toDataURL !== 'function') {
      throw new Error('PNG export is unavailable in this browser.');
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

  function downloadPublicQr(dataUrl, filename) {
    var link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.rel = 'noreferrer';
    link.click();
  }

  function generatePublicQr() {
    if (typeof qrcode !== 'function' || !qrPublicAddress) {
      setPublicQrStatus('error', 'The pinned QR encoder is unavailable.');
      return;
    }
    var network = qrPublicNetwork ? qrPublicNetwork.value : 'bitcoin';
    var address = qrPublicAddress.value.trim();
    if (!publicQrAddressValid(network, address)) {
      qrPublicArtifact = null;
      if (qrPublicOutput) {
        qrPublicOutput.textContent = '';
      }
      [qrPublicDownloadSvg, qrPublicDownloadPng].forEach(function (button) {
        if (button) {
          button.disabled = true;
        }
      });
      setPublicQrStatus('error', 'Enter one complete public receiving address. Seed-shaped and malformed input is rejected.');
      return;
    }
    try {
      var payload = publicQrUri(network, address);
      var code = qrcode(0, 'M');
      code.addData(payload, 'Byte');
      code.make();
      var svg = code.createSvgTag({
        cellSize: 4,
        margin: 4,
        scalable: true,
        title: 'Public receiving address QR',
        alt: 'Public receiving address QR'
      });
      qrPublicArtifact = { code: code, svg: svg, png: null };
      if (qrPublicOutput) {
        qrPublicOutput.innerHTML = svg;
      }
      [qrPublicDownloadSvg, qrPublicDownloadPng].forEach(function (button) {
        if (button) {
          button.disabled = false;
        }
      });
      setPublicQrStatus('ready', 'Public address QR generated. Verify the full address independently before sharing or paying.');
    } catch (error) {
      qrPublicArtifact = null;
      if (qrPublicOutput) {
        qrPublicOutput.textContent = '';
      }
      setPublicQrStatus('error', 'QR generation failed closed: ' + error.message);
    }
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
    var rawHash = window.location.hash.replace(/^#/, '').trim();
    var hashSegments = rawHash.split('/');
    var topicSegment = hashSegments.length > 1 ? hashSegments.slice(1).join('/') : null;
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

    if (route === 'learn' && topicSegment) {
      focusHelpTopic(decodeURIComponent(topicSegment));
    } else if (shouldFocus) {
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
  setVaultPersistenceState('none');
  setVaultRollbackBanner(null, null);
  setVaultStatus(
    'locked',
    'Vault is locked',
    'Choose a vault from the user-granted library, or prepare a named new vault. Unlock phrases stay inside the sealed realm.',
    'Locked'
  );
  initHelp();
  renderRoute(false);
  renderProvenancePanel();
  initProvenanceDropZone();

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
        addVaultFiles(vaultFileInput.files);
      }
      vaultFileInput.value = '';
    });
  }
  if (vaultChooseFolder) {
    vaultChooseFolder.addEventListener('click', chooseVaultFolder);
  }
  if (vaultLibraryList) {
    vaultLibraryList.addEventListener('click', function (event) {
      var target = event.target && event.target.closest
        ? event.target.closest('[data-vault-library-index]')
        : null;
      if (!target) {
        return;
      }
      var index = Number(target.getAttribute('data-vault-library-index'));
      if (!Number.isInteger(index) || !vaultLibraryEntries[index]) {
        return;
      }
      loadVaultFile(vaultLibraryEntries[index].file, vaultLibraryEntries[index].handle);
    });
  }
  if (vaultCreatePrepare) {
    vaultCreatePrepare.addEventListener('click', prepareNewVaultCreation);
  }
  if (vaultSavePrimary) {
    vaultSavePrimary.addEventListener('click', savePrimaryVault);
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
  if (vaultManualShare) {
    vaultManualShare.addEventListener('click', shareManualText);
  }
  if (vaultTransferStart) {
    vaultTransferStart.addEventListener('click', startLiveVaultTransfer);
  }
  if (vaultTransferPause) {
    vaultTransferPause.addEventListener('click', pauseLiveVaultTransfer);
  }
  if (vaultTransferStop) {
    vaultTransferStop.addEventListener('click', function () {
      clearLiveTransferSender('Live transfer stopped. No QR payload was saved.');
    });
  }
  if (vaultTransferReceive) {
    vaultTransferReceive.addEventListener('click', startLiveTransferReceiver);
  }
  if (vaultTransferReceiveStop) {
    vaultTransferReceiveStop.addEventListener('click', function () {
      stopLiveTransferReceiver('Camera stopped. No received vault was kept.', false);
    });
  }
  if (vaultTransferLoad) {
    vaultTransferLoad.addEventListener('click', loadReceivedTransfer);
  }
  if (vaultTransferDiscard) {
    vaultTransferDiscard.addEventListener('click', discardReceivedTransfer);
  }
  if (qrPublicGenerate) {
    qrPublicGenerate.addEventListener('click', generatePublicQr);
  }
  if (qrPublicNetwork) {
    qrPublicNetwork.addEventListener('change', function () {
      if (qrPublicAmount) {
        qrPublicAmount.value = '';
      }
      setPublicQrStatus('idle', 'Choose the complete address and generate a fresh public QR.');
    });
  }
  if (qrPublicDownloadSvg) {
    qrPublicDownloadSvg.addEventListener('click', function () {
      if (!qrPublicArtifact) {
        return;
      }
      downloadPublicQr(
        'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(qrPublicArtifact.svg),
        'coldbox-address.svg'
      );
    });
  }
  if (qrPublicDownloadPng) {
    qrPublicDownloadPng.addEventListener('click', function () {
      if (!qrPublicArtifact) {
        return;
      }
      try {
        if (!qrPublicArtifact.png) {
          qrPublicArtifact.png = renderPublicQrPng(qrPublicArtifact.code);
        }
        downloadPublicQr(qrPublicArtifact.png, 'coldbox-address.png');
      } catch (error) {
        setPublicQrStatus('error', 'PNG export failed closed: ' + error.message);
      }
    });
  }
  if (vaultLoadManual) {
    vaultLoadManual.addEventListener('click', loadManualText);
  }
  if (vaultManualData) {
    vaultManualData.addEventListener('input', function () {
      updateVaultControls();
    });
  }
  if (vaultLock) {
    vaultLock.addEventListener('click', requestVaultLock);
  }
  if (vaultLockSave) {
    vaultLockSave.addEventListener('click', savePrimaryVault);
  }
  if (vaultLockWithoutSave) {
    vaultLockWithoutSave.addEventListener('click', sendVaultLockImmediately);
  }
  if (vaultLockCancel) {
    vaultLockCancel.addEventListener('click', function () {
      if (vaultLockWarning) {
        vaultLockWarning.hidden = true;
      }
      setVaultNotice('Lock cancelled. The vault remains unlocked.');
    });
  }
  if (vaultPanicHide) {
    vaultPanicHide.addEventListener('click', panicHide);
  }
  if (registryWalletForm) {
    registryWalletForm.addEventListener('submit', handleWalletFormSubmit);
  }
  if (registryAccountForm) {
    registryAccountForm.addEventListener('submit', handleAccountFormSubmit);
  }
  if (registryAddressForm) {
    registryAddressForm.addEventListener('submit', handleAddressFormSubmit);
  }
  if (registryNoteForm) {
    registryNoteForm.addEventListener('submit', handleNoteFormSubmit);
  }
  if (deviceForm) {
    deviceForm.addEventListener('submit', handleDeviceFormSubmit);
  }
  if (registryWalletCancel) {
    registryWalletCancel.addEventListener('click', resetWalletForm);
  }
  if (registryAccountCancel) {
    registryAccountCancel.addEventListener('click', resetAccountForm);
  }
  if (registryAddressCancel) {
    registryAddressCancel.addEventListener('click', resetAddressForm);
  }
  if (registryNoteCancel) {
    registryNoteCancel.addEventListener('click', resetNoteForm);
  }
  if (deviceCancel) {
    deviceCancel.addEventListener('click', resetDeviceForm);
  }
  [registryWalletList, registryAccountList, registryAddressList, registryNoteList, deviceList].forEach(function (list) {
    if (list) {
      list.addEventListener('click', handleRegistryListAction);
    }
  });
  if (registrySearch) {
    registrySearch.addEventListener('input', function () {
      registrySearchTerm = registrySearch.value.trim().toLowerCase();
      renderRegistry();
    });
  }
  if (deviceSearch) {
    deviceSearch.addEventListener('input', function () {
      deviceSearchTerm = deviceSearch.value.trim().toLowerCase();
      renderRegistry();
    });
  }
  if (registryShowHidden) {
    registryShowHidden.addEventListener('change', requestHiddenReveal);
  }
  if (deviceShowHidden) {
    deviceShowHidden.addEventListener('change', requestHiddenReveal);
  }
  if (privacyBlurToggle && concealmentController) {
    privacyBlurToggle.addEventListener('click', function () {
      concealmentController.togglePrivacyBlur();
      updatePrivacyBlurControl();
    });
  }
  updatePrivacyBlurControl();
  renderRegistry();
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
  startStageMotion();
  startNetworkMonitor();
  startCapabilities();
  startWarmCanary();
  startColdRealm();
}());
