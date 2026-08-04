__COLDBOX_PROTOCOL__
__COLDBOX_AIRGAP__
__COLDBOX_CAPABILITIES__
(function () {
  'use strict';

  var protocol = window.__coldboxProtocol;
  var airgap = window.__coldboxAirgap;
  var capabilities = window.__coldboxCapabilities;
  var cryptoLayer = window.__coldboxCrypto;
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

  function setAirgapFailure(reason) {
    document.documentElement.setAttribute('data-airgap-state', 'red');
    document.documentElement.setAttribute('data-lockdown-state', 'full');
    document.documentElement.setAttribute('data-vault-operations', 'refused');
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
    document.documentElement.setAttribute('data-capability-state', 'failed');
    document.documentElement.setAttribute('data-lockdown-state', 'full');
    document.documentElement.setAttribute('data-vault-operations', 'refused');
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

  function setCryptoFailure(reason) {
    document.documentElement.setAttribute('data-crypto-state', 'failed');
    document.documentElement.setAttribute('data-cold-state', 'failed');
    document.documentElement.setAttribute('data-airgap-state', 'red');
    document.documentElement.setAttribute('data-lockdown-state', 'full');
    document.documentElement.setAttribute('data-vault-operations', 'refused');
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
      document.documentElement.setAttribute('data-airgap-state', 'green');
      if (readyMarker) {
        readyMarker.textContent = 'Cold realm sealed';
      }
      if (details) {
        details.textContent = 'CSP canary passed and runtime network guard installed. Active KDF: '
          + (cryptoReport.kdf && cryptoReport.kdf.label ? cryptoReport.kdf.label : 'unknown') + '.';
      }
    }
    window.parent.postMessage({ type: 'cold.ready' }, '*');
  }

  function handleChannelMessage(event) {
    if (!protocol.validateMessage('warm-to-cold', event.data)) {
      recordChannelAnomaly();
    }
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

  if (!readyMarker || !window.parent || !protocol || !airgap || !capabilities || !cryptoLayer) {
    return;
  }

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
