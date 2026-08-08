
__COLDBOX_PROTOCOL__
__COLDBOX_AIRGAP__
__COLDBOX_CAPABILITIES__
__COLDBOX_SAVE_INTEGRITY__
(function () {
  'use strict';

__COLDBOX_QR_ENCODER__

  var coldRealmDocument = __COLDBOX_COLD_REALM_DOCUMENT__;
  var protocol = window.__coldboxProtocol;
  var airgap = window.__coldboxAirgap;
  var capabilities = window.__coldboxCapabilities;
  var saveIntegrity = window.__coldboxSaveIntegrity;
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
  var vaultManualQrPrepare = document.getElementById('vault-manual-qr-prepare');
  var vaultManualQrCopy = document.getElementById('vault-manual-qr-copy');
  var vaultManualQrCopyAll = document.getElementById('vault-manual-qr-copy-all');
  var vaultManualQrPrevious = document.getElementById('vault-manual-qr-previous');
  var vaultManualQrNext = document.getElementById('vault-manual-qr-next');
  var vaultManualQrIndex = document.getElementById('vault-manual-qr-index');
  var vaultManualQrData = document.getElementById('vault-manual-qr-data');
  var vaultManualQrImage = document.getElementById('vault-manual-qr-image');
  var vaultManualQrCount = document.getElementById('vault-manual-qr-count');
  var vaultLoadManual = document.getElementById('vault-load-manual');
  var vaultLock = document.getElementById('vault-lock');
  var vaultLockWarning = document.getElementById('vault-lock-warning');
  var vaultLockSave = document.getElementById('vault-lock-save');
  var vaultLockWithoutSave = document.getElementById('vault-lock-without-save');
  var vaultLockCancel = document.getElementById('vault-lock-cancel');
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
  var vaultDirty = false;
  var pendingVaultLoad = false;
  var pendingLoadFileMeta = null;
  var saveGeneration = { counter: 0, savedAt: null };
  var activeVaultName = '';
  var activeVaultId = null;
  var activeVaultNamespace = null;
  var pendingCreateVaultName = '';
  var vaultLibraryEntries = [];
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
  var manualQrChunks = [];
  var manualQrIndex = 0;
  var QR_FRAME_PAYLOAD_LENGTH = 650;
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

  function updateVaultControls() {
    var channelReady = vaultChannelReady();
    var unlocked = vaultState === 'unlocked';
    var locked = vaultState === 'locked';
    var hasManualText = Boolean(vaultManualData && vaultManualData.value.trim());
    var hasQrChunks = manualQrChunks.length > 0;
    if (vaultLoadFile) {
      vaultLoadFile.disabled = !channelReady || unlocked;
    }
    if (vaultChooseFolder) {
      vaultChooseFolder.hidden = typeof window.showDirectoryPicker !== 'function';
      vaultChooseFolder.disabled = !channelReady || unlocked || typeof window.showDirectoryPicker !== 'function';
    }
    if (vaultCreateName) {
      vaultCreateName.disabled = !channelReady || !locked;
    }
    if (vaultCreatePrepare) {
      vaultCreatePrepare.disabled = !channelReady || !locked;
    }
    if (vaultSavePrimary) {
      vaultSavePrimary.disabled = !channelReady || !unlocked;
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
    if (vaultManualShare) {
      vaultManualShare.disabled = !hasManualText
        || !window.navigator
        || typeof window.navigator.share !== 'function';
    }
    if (vaultManualQrPrepare) {
      vaultManualQrPrepare.disabled = !hasManualText;
    }
    if (vaultManualQrCopy) {
      vaultManualQrCopy.disabled = !hasQrChunks;
    }
    if (vaultManualQrCopyAll) {
      vaultManualQrCopyAll.disabled = !hasQrChunks;
    }
    if (vaultManualQrPrevious) {
      vaultManualQrPrevious.disabled = !hasQrChunks || manualQrIndex === 0;
    }
    if (vaultManualQrNext) {
      vaultManualQrNext.disabled = !hasQrChunks || manualQrIndex >= manualQrChunks.length - 1;
    }
    if (vaultManualQrIndex) {
      vaultManualQrIndex.disabled = !hasQrChunks;
    }
    if (vaultLoadManual) {
      vaultLoadManual.disabled = !channelReady || !hasManualText || unlocked;
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

  function libraryEntryForFile(file) {
    var parsed = saveIntegrity && typeof saveIntegrity.parseVaultFilename === 'function'
      ? saveIntegrity.parseVaultFilename(file && file.name)
      : null;
    return {
      file: file,
      displayName: displayNameFromFilename(file && file.name),
      parsed: parsed,
      key: String(file && file.name || '') + ':' + String(file && file.size || 0) + ':' + String(file && file.lastModified || 0)
    };
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
      var generation = entry.parsed && entry.parsed.counter !== null
        ? 'generation ' + String(entry.parsed.counter)
        : 'generation unknown';
      detail.textContent = generation + ' · ' + String(entry.file.name || 'vault.cbx');
      button.appendChild(title);
      button.appendChild(detail);
      vaultLibraryList.appendChild(button);
    });
  }

  function addVaultFiles(files) {
    var incoming = Array.prototype.slice.call(files || []).filter(function (file) {
      return file && typeof file.name === 'string' && /\.cbx$/i.test(file.name);
    });
    var known = {};
    vaultLibraryEntries.forEach(function (entry) { known[entry.key] = true; });
    incoming.forEach(function (file) {
      var entry = libraryEntryForFile(file);
      if (!known[entry.key]) {
        known[entry.key] = true;
        vaultLibraryEntries.push(entry);
      }
    });
    vaultLibraryEntries.sort(function (left, right) {
      var nameOrder = left.displayName.localeCompare(right.displayName);
      if (nameOrder !== 0) { return nameOrder; }
      var leftGeneration = left.parsed && Number.isInteger(left.parsed.counter) ? left.parsed.counter : -1;
      var rightGeneration = right.parsed && Number.isInteger(right.parsed.counter) ? right.parsed.counter : -1;
      return rightGeneration - leftGeneration;
    });
    renderVaultLibrary();
    if (incoming.length === 0) {
      setVaultNotice('No .cbx vault files were found in that selection.');
    } else {
      setVaultNotice(String(incoming.length) + ' vault file(s) added to the user-granted library. Select one to unlock.');
    }
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
      var files = [];
      for await (var handle of directory.values()) {
        if (handle && handle.kind === 'file' && /\.cbx$/i.test(handle.name || '')) {
          files.push(await handle.getFile());
        }
      }
      addVaultFiles(files);
    } catch (error) {
      if (!error || error.name !== 'AbortError') {
        setVaultNotice('The selected folder could not be read. Choose vault files instead.');
      }
    }
  }

  // The dirty flag only ever clears inside completeVerifiedSave(), after a
  // save has been read back from disk and found byte-identical to what was
  // written (P0.14). Every other caller may only set it true.
  function setVaultDirty(value) {
    vaultDirty = Boolean(value);
    root.setAttribute('data-vault-dirty', String(vaultDirty));
    app.setAttribute('data-vault-dirty', String(vaultDirty));
    if (vaultDirtyNotice) {
      vaultDirtyNotice.hidden = !vaultDirty;
      vaultDirtyNotice.setAttribute('data-dirty', String(vaultDirty));
      vaultDirtyNotice.textContent = vaultDirty
        ? 'UNLOCKED · NOT SAVED / unsaved changes: this vault has not completed a verified save yet.'
        : '';
    }
    if (!vaultDirty && vaultLockWarning) {
      vaultLockWarning.hidden = true;
    }
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
    vaultRollbackBannerCopy.textContent = 'This file is save generation '
      + String(evaluation.fileCounter) + ' (' + fileDate + '), but this browser has already recorded'
      + ' generation ' + String(evaluation.seenCounter) + ' (' + seenDate + '). '
      + 'You may be opening an older backup. This check is advisory: it degrades silently when the'
      + ' filename or local record is unavailable.';
  }

  function saveVerificationError() {
    var error = new Error('Vault save could not be verified.');
    error.code = 'VAULT_SAVE_VERIFY_FAILED';
    return error;
  }

  // Only called after a save's written bytes have been read back and
  // confirmed identical (P0.14 verify-after-save). Advances the local save
  // generation and clears the dirty flag; a failed write or a failed
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
    setVaultDirty(false);
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

  function clearQrExport() {
    manualQrChunks = [];
    manualQrIndex = 0;
    if (vaultManualQrData) {
      vaultManualQrData.value = '';
    }
    if (vaultManualQrImage) {
      vaultManualQrImage.hidden = true;
      vaultManualQrImage.removeAttribute('src');
    }
    if (vaultManualQrCount) {
      vaultManualQrCount.textContent = 'No QR frames prepared.';
    }
    updateVaultControls();
  }

  function clearManualVaultExport() {
    if (vaultManualData) {
      vaultManualData.value = '';
      vaultManualData.scrollTop = 0;
    }
    clearQrExport();
  }

  function renderQrFrame() {
    if (manualQrChunks.length === 0) {
      clearQrExport();
      return;
    }
    var frame = manualQrChunks[manualQrIndex];
    if (vaultManualQrData) {
      vaultManualQrData.value = frame;
    }
    if (vaultManualQrIndex) {
      vaultManualQrIndex.value = String(manualQrIndex + 1);
    }
    if (vaultManualQrCount) {
      vaultManualQrCount.textContent = 'QR frame '
        + String(manualQrIndex + 1)
        + ' of '
        + String(manualQrChunks.length)
        + '. Copy all frames in order, or scan each frame in order and paste the resulting lines into the encrypted vault base64 field.';
    }
    if (vaultManualQrImage && typeof qrcode === 'function') {
      try {
        var code = qrcode(0, 'M');
        code.addData(frame, 'Byte');
        code.make();
        vaultManualQrImage.src = code.createDataURL(4, 4);
        vaultManualQrImage.alt = 'Encrypted vault QR frame '
          + String(manualQrIndex + 1)
          + ' of '
          + String(manualQrChunks.length);
        vaultManualQrImage.hidden = false;
      } catch (error) {
        vaultManualQrImage.hidden = true;
        vaultManualQrImage.removeAttribute('src');
        if (vaultManualQrCount) {
          vaultManualQrCount.textContent = 'This QR frame could not be rendered. Copy the numbered text frame instead.';
        }
      }
    }
    updateVaultControls();
  }

  function prepareQrExport(value) {
    var normalized = String(value || '').replace(/\s+/g, '');
    if (!normalized) {
      clearQrExport();
      return;
    }
    var total = Math.ceil(normalized.length / QR_FRAME_PAYLOAD_LENGTH);
    manualQrChunks = [];
    for (var index = 0; index < total; index += 1) {
      manualQrChunks.push(
        'CBX-QR/1/'
        + String(index + 1)
        + '/'
        + String(total)
        + '/'
        + normalized.slice(index * QR_FRAME_PAYLOAD_LENGTH, (index + 1) * QR_FRAME_PAYLOAD_LENGTH)
      );
    }
    manualQrIndex = 0;
    renderQrFrame();
  }

  function assembleQrExport(value) {
    var lines = String(value || '').trim().split(/\s+/).filter(function (line) {
      return line.length > 0;
    });
    if (lines.length === 0 || lines[0].indexOf('CBX-QR/1/') !== 0) {
      return null;
    }
    var chunks = [];
    var total = null;
    lines.forEach(function (line) {
      var match = /^CBX-QR\/1\/(\d+)\/(\d+)\/([A-Za-z0-9+/=]+)$/.exec(line);
      if (!match) {
        throw new Error('Invalid QR frame.');
      }
      var index = Number(match[1]);
      var declaredTotal = Number(match[2]);
      if (!Number.isSafeInteger(index)
        || !Number.isSafeInteger(declaredTotal)
        || index < 1
        || declaredTotal < 1
        || declaredTotal > Math.ceil((Math.ceil((64 * 1024 * 1024) * 4 / 3) + 8) / QR_FRAME_PAYLOAD_LENGTH)
        || index > declaredTotal
        || match[3].length > QR_FRAME_PAYLOAD_LENGTH
        || (total !== null && total !== declaredTotal)) {
        throw new Error('Invalid QR frame sequence.');
      }
      total = declaredTotal;
      if (chunks[index - 1]) {
        throw new Error('Duplicate QR frame.');
      }
      chunks[index - 1] = match[3];
    });
    if (total === null || chunks.length !== total) {
      throw new Error('Incomplete QR frame set.');
    }
    for (var chunkIndex = 0; chunkIndex < total; chunkIndex += 1) {
      if (!chunks[chunkIndex]) {
        throw new Error('Incomplete QR frame set.');
      }
    }
    return chunks.join('');
  }

  function shareManualText() {
    if (!vaultManualData || !vaultManualData.value.trim()
      || !window.navigator
      || typeof window.navigator.share !== 'function') {
      setVaultNotice('This browser does not expose secure text sharing. Copy the encrypted text or QR frames instead.');
      return;
    }
    window.navigator.share({
      title: 'Coldbox encrypted vault',
      text: vaultManualData.value.replace(/\s+/g, '')
    }).then(function () {
      setVaultNotice('Encrypted vault text shared.');
    }, function (error) {
      if (!error || error.name !== 'AbortError') {
        setVaultNotice('The encrypted vault was not shared. Copy the text or QR frames instead.');
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

  function loadVaultFile(file) {
    // Captured before the async read so a slow FileReader path can't race a
    // second load; used only for the advisory rollback check (P0.14) and
    // never sent anywhere - it stays in the warm shell.
    var parsedName = saveIntegrity && typeof saveIntegrity.parseVaultFilename === 'function'
      ? saveIntegrity.parseVaultFilename(file && file.name)
      : null;
    var fileMeta = {
      name: file && typeof file.name === 'string' ? file.name : null,
      lastModified: file && typeof file.lastModified === 'number' ? file.lastModified : null,
      parsedName: parsedName
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
        return Promise.all((handles || []).map(function (handle) { return handle.getFile(); }));
      }).then(function (files) {
        addVaultFiles(files);
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
      var counter = saveIntegrity.nextCounter(saveGeneration);
      if (activeVaultName && activeVaultId && typeof saveIntegrity.filenameForVault === 'function') {
        return saveIntegrity.filenameForVault(activeVaultName, activeVaultId, counter);
      }
      return saveIntegrity.filenameForCounter(counter);
    } catch (error) {
      return 'coldbox-vault.cbx';
    }
  }

  function savePrimaryVault() {
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
    if (typeof window.showSaveFilePicker !== 'function') {
      reportVaultSaveFailure(new Error('File System Access is unavailable.'));
      return;
    }
    var suggestedName = nextSuggestedFilename();
    requestVaultBytes().then(function (bytes) {
      return window.showSaveFilePicker({
        suggestedName: suggestedName,
        types: [{
          description: 'Coldbox vault',
          accept: { 'application/octet-stream': ['.cbx'] }
        }]
      }).then(function (handle) {
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
      completeVerifiedSave();
      setVaultNotice('Encrypted vault saved as ' + suggestedName + ' and verified by reading it back from disk.');
    }, reportVaultSaveFailure);
  }

  // Blob download and the manual/QR export below cannot be read back from
  // disk through any web API - the browser (or the person copying the text)
  // owns that step, invisibly to this page. So neither path ever clears the
  // dirty flag automatically or advances the save generation; both say so
  // plainly rather than claiming a verification that did not happen.
  function saveAsDownload() {
    var suggestedName = nextSuggestedFilename();
    requestVaultBytes().then(function (bytes) {
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
      setVaultNotice(
        'Encrypted vault download started as ' + suggestedName + '. Browsers do not let Coldbox read a '
        + 'downloaded file back to verify it, so unsaved changes remain marked until a File System Access '
        + 'save succeeds or you confirm the download opened correctly.'
      );
    }, reportVaultSaveFailure);
  }

  function saveAsManualText() {
    var suggestedName = nextSuggestedFilename();
    requestVaultBytes().then(function (bytes) {
      if (!vaultManualData) {
        throw new Error('Manual export is unavailable.');
      }
      vaultManualData.value = bytesToBase64(bytes);
      vaultManualData.scrollTop = 0;
      prepareQrExport(vaultManualData.value);
      updateVaultControls();
      setVaultNotice(
        'Encrypted vault text and numbered QR frames are ready for copy, share, or airgapped transfer '
        + '(suggested filename ' + suggestedName + ' if you save the pasted text as a file). This handoff '
        + 'is not read back automatically, so unsaved changes remain marked until you confirm it was '
        + 'captured correctly.'
      );
    }, reportVaultSaveFailure);
  }

  function copyManualText() {
    if (!vaultManualData || !vaultManualData.value.trim()) {
      setVaultNotice('Prepare a manual export before copying it.');
      return;
    }
    var text = vaultManualData.value;
    copyText(text, 'Encrypted vault text copied.', vaultManualData);
  }

  function prepareManualQr() {
    if (!vaultManualData || !vaultManualData.value.trim()) {
      setVaultNotice('Prepare an encrypted vault export before making QR frames.');
      return;
    }
    prepareQrExport(vaultManualData.value);
    setVaultNotice('Numbered QR frames are ready. Scan or copy every frame in order.');
  }

  function copyManualQr() {
    if (manualQrChunks.length === 0 || !vaultManualQrData) {
      setVaultNotice('Prepare QR frames before copying one.');
      return;
    }
    copyText(vaultManualQrData.value, 'Current QR frame copied.', vaultManualQrData);
  }

  function copyAllManualQr() {
    if (manualQrChunks.length === 0 || !vaultManualQrData) {
      setVaultNotice('Prepare QR frames before copying them.');
      return;
    }
    copyText(
      manualQrChunks.join('\n'),
      'All QR frames copied in numbered order.',
      vaultManualQrData
    );
  }

  function loadManualText() {
    if (!vaultManualData) {
      return;
    }
    try {
      var qrText = assembleQrExport(vaultManualData.value);
      sendVaultOpen(base64ToBytes(qrText || vaultManualData.value));
    } catch (error) {
      setVaultNotice('Manual load needs complete base64 text or every numbered QR frame in order.');
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
    var publicCompartment = message.payload.publicCompartment || {};
    var count = publicRecordCount(publicCompartment);
    var vaultId = typeof publicCompartment.id === 'string' ? publicCompartment.id : null;
    var wasLoadedFile = pendingVaultLoad;
    var loadMeta = pendingLoadFileMeta;
    var chosenName = wasLoadedFile
      ? (activeVaultName || displayNameFromFilename(loadMeta && loadMeta.name))
      : (pendingCreateVaultName || activeVaultName || 'New vault');
    pendingVaultLoad = false;
    pendingLoadFileMeta = null;
    pendingCreateVaultName = '';

    activeVaultNamespace = null;
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
    setVaultDirty(!wasLoadedFile);

    var rollbackNotice = '';
    var identityNotice = '';
    if (wasLoadedFile && saveIntegrity) {
      var parsed = loadMeta && loadMeta.parsedName
        ? loadMeta.parsedName
        : (loadMeta && loadMeta.name && typeof saveIntegrity.parseVaultFilename === 'function'
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
        identityNotice = ' Filename warning: the short Vault ID in the filename did not match the authenticated Vault ID, so the filename identity/generation hint was ignored.';
      }
      var fileCounter = !filenameIdMismatch && parsed ? parsed.counter : null;
      var fileInfo = { counter: fileCounter, lastModified: loadMeta ? loadMeta.lastModified : null };
      var evaluation = saveIntegrity.evaluateRollback(saveGeneration, fileInfo);
      setVaultRollbackBanner(evaluation, loadMeta);
      if (evaluation.rollback) {
        rollbackNotice = ' Rollback warning: see the banner above - this file is an older save generation than one this browser has already recorded for this vault.';
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

    setVaultStatus(
      'unlocked',
      activeVaultName ? activeVaultName + ' is unlocked' : 'Vault is unlocked',
      (!wasLoadedFile
        ? 'New encrypted vault created in memory. SAVE VAULT now before locking, closing, timeout, or panic hide; until a durable save exists this is the only copy.'
        : (count === 0
          ? 'The selected encrypted vault opened inside the sealed realm. No public records were returned to this shell.'
          : String(count) + ' public record(s) are available to the warm shell; secret compartments remain sealed here.'))
      + rollbackNotice
      + identityNotice,
      wasLoadedFile ? 'Unlocked' : 'Not saved'
    );
  }

  function handleVaultStatus(message) {
    if (message.payload.locked) {
      var lostUnsaved = vaultDirty;
      setVaultDirty(false);
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
        vaultDirty ? 'Not saved' : 'Unlocked'
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
    var id = sendVaultMessage('vault.lock', {});
    if (id) {
      setVaultDirty(false);
      if (vaultLockWarning) {
        vaultLockWarning.hidden = true;
      }
      setVaultStatus(
        'locked',
        activeVaultName ? activeVaultName + ' is locked' : 'Vault is locked',
        hadUnsaved
          ? 'Lock was sent immediately. Unsaved working changes were not written; the cold realm will zeroize them.'
          : 'The lock request was sent to the sealed realm. Its active bytes will be cleared there.',
        'Locked'
      );
    }
  }

  function requestVaultLock() {
    if (vaultDirty && vaultState === 'unlocked') {
      if (vaultLockWarning) {
        vaultLockWarning.hidden = false;
        vaultLockWarning.scrollIntoView({ block: 'nearest' });
      }
      setVaultNotice('Unsaved changes exist. Save first, lock without saving, or cancel. Emergency lock paths never wait.');
      return;
    }
    sendVaultLockImmediately();
  }

  function panicHide() {
    // Panic is an emergency path: never wait for save confirmation.
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
  setVaultDirty(false);
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
      loadVaultFile(vaultLibraryEntries[index].file);
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
  if (vaultManualQrPrepare) {
    vaultManualQrPrepare.addEventListener('click', prepareManualQr);
  }
  if (vaultManualQrCopy) {
    vaultManualQrCopy.addEventListener('click', copyManualQr);
  }
  if (vaultManualQrCopyAll) {
    vaultManualQrCopyAll.addEventListener('click', copyAllManualQr);
  }
  if (vaultManualQrPrevious) {
    vaultManualQrPrevious.addEventListener('click', function () {
      if (manualQrIndex > 0) {
        manualQrIndex -= 1;
        renderQrFrame();
      }
    });
  }
  if (vaultManualQrNext) {
    vaultManualQrNext.addEventListener('click', function () {
      if (manualQrIndex < manualQrChunks.length - 1) {
        manualQrIndex += 1;
        renderQrFrame();
      }
    });
  }
  if (vaultManualQrIndex) {
    vaultManualQrIndex.addEventListener('change', function () {
      var requested = Number(vaultManualQrIndex.value) - 1;
      if (manualQrChunks.length > 0 && Number.isSafeInteger(requested)) {
        manualQrIndex = Math.max(0, Math.min(requested, manualQrChunks.length - 1));
        renderQrFrame();
      }
    });
  }
  if (vaultLoadManual) {
    vaultLoadManual.addEventListener('click', loadManualText);
  }
  if (vaultManualData) {
    vaultManualData.addEventListener('input', function () {
      clearQrExport();
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
