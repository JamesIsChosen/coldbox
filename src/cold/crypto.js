(function (global) {
  'use strict';

  var noble = global.__coldboxNobleCrypto;
  var argon2 = global.argon2;
  var webCrypto = global.crypto;
  var webCryptoState = 'not-tested';
  var argon2Healthy = false;
  var selfTestPromise = null;
  var benchmarkPromise = null;
  var activeKdf = {
    id: 'checking',
    label: 'Checking the KDF',
    implementation: 'The active vault KDF is being verified.'
  };

  var profiles = Object.freeze({
    standard: Object.freeze({
      id: 'argon2id-standard',
      label: 'Argon2id WASM (standard)',
      memoryKiB: 65536,
      iterations: 3,
      parallelism: 1
    }),
    fast: Object.freeze({
      id: 'argon2id-fast',
      label: 'Argon2id WASM (fast)',
      memoryKiB: 19456,
      iterations: 2,
      parallelism: 1
    }),
    paranoid: Object.freeze({
      id: 'argon2id-paranoid',
      label: 'Argon2id WASM (paranoid)',
      memoryKiB: 262144,
      iterations: 4,
      parallelism: 1
    }),
    fallback: Object.freeze({
      id: 'pbkdf2-sha512-fallback',
      label: 'PBKDF2-HMAC-SHA512 fallback',
      memoryKiB: 0,
      iterations: 1000000,
      parallelism: 1
    })
  });

  function hexToBytes(value) {
    if (typeof value !== 'string' || value.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(value)) {
      throw new Error('Invalid hexadecimal test vector.');
    }
    var bytes = new Uint8Array(value.length / 2);
    for (var index = 0; index < bytes.length; index += 1) {
      bytes[index] = parseInt(value.slice(index * 2, index * 2 + 2), 16);
    }
    return bytes;
  }

  function bytesEqual(left, right) {
    if (!left || !right || left.length !== right.length) {
      return false;
    }
    var difference = 0;
    for (var index = 0; index < left.length; index += 1) {
      difference |= left[index] ^ right[index];
    }
    return difference === 0;
  }

  function asBytes(value, title) {
    if (value instanceof Uint8Array) {
      return new Uint8Array(value);
    }
    if (typeof value === 'string' && noble && typeof noble.utf8ToBytes === 'function') {
      return noble.utf8ToBytes(value);
    }
    throw new Error(`${title || 'Value'} must be a string or Uint8Array.`);
  }

  function setKdfUi(details) {
    var document = global.document;
    if (!document || !document.documentElement) {
      return;
    }
    document.documentElement.setAttribute('data-kdf-active', details.id);
    var panel = document.getElementById('cold-kdf-details');
    var active = document.getElementById('cold-kdf-active');
    var path = document.getElementById('cold-crypto-path');
    if (panel) {
      panel.setAttribute('data-kdf-active', details.id);
    }
    if (active) {
      active.textContent = `Active KDF: ${details.label}.`;
    }
    if (path) {
      path.textContent = details.implementation;
    }
  }

  function setActiveKdf(profile, implementation) {
    activeKdf = {
      id: profile.id,
      label: profile.label,
      implementation: implementation,
      memoryKiB: profile.memoryKiB,
      iterations: profile.iterations,
      parallelism: profile.parallelism
    };
    setKdfUi(activeKdf);
  }

  function setFallback(reason) {
    setActiveKdf(
      profiles.fallback,
      `Argon2id WASM was unavailable, so Coldbox is explicitly using the ${profiles.fallback.label} with ${profiles.fallback.iterations.toLocaleString('en-US')} iterations. ${reason}`
    );
  }

  function zeroBytes(value) {
    if (value && typeof value.fill === 'function') {
      value.fill(0);
    }
  }

  function monotonicNow() {
    if (global.performance && typeof global.performance.now === 'function') {
      return global.performance.now();
    }
    return Date.now();
  }

  function roundedMilliseconds(value) {
    return Math.max(0, Math.round(value * 10) / 10);
  }

  function likelyIosDevice() {
    var navigator = global.navigator;
    if (!navigator) {
      return false;
    }
    var userAgent = typeof navigator.userAgent === 'string' ? navigator.userAgent : '';
    var platform = typeof navigator.platform === 'string' ? navigator.platform : '';
    return /iPad|iPhone|iPod/i.test(userAgent)
      || (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function profileWarning(profileName) {
    return profileName === 'paranoid'
      ? 'Paranoid uses 256 MiB and may fail to allocate on iOS.'
      : null;
  }

  function benchmarkResult(profileName, status, durationMs, warning) {
    var profile = profiles[profileName];
    return {
      profile: profileName,
      id: profile.id,
      memoryKiB: profile.memoryKiB,
      iterations: profile.iterations,
      parallelism: profile.parallelism,
      status: status,
      durationMs: durationMs,
      warning: warning || profileWarning(profileName)
    };
  }

  function unavailableBenchmark(profileName) {
    var warning = profileWarning(profileName);
    var reason = 'Argon2id is unavailable, so this profile was not benchmarked.';
    return benchmarkResult(profileName, 'unavailable', null, warning ? reason + ' ' + warning : reason);
  }

  function runArgon2Benchmark(profileName) {
    if (!argon2Healthy) {
      return Promise.resolve(unavailableBenchmark(profileName));
    }
    if (profileName === 'paranoid' && likelyIosDevice()) {
      return Promise.resolve(benchmarkResult(
        profileName,
        'skipped',
        null,
        'Paranoid uses 256 MiB and may fail to allocate on iOS; skipped on this likely iOS device.'
      ));
    }

    var profile = profiles[profileName];
    var passphrase = new Uint8Array(32).fill(0x42);
    var salt = new Uint8Array(16).fill(0x24);
    var started = monotonicNow();
    var cleanup = function (result) {
      zeroBytes(passphrase);
      zeroBytes(salt);
      if (result && result.hash) {
        zeroBytes(result.hash);
      }
    };
    var operation;
    try {
      operation = argon2.hash({
        pass: passphrase,
        salt: salt,
        time: profile.iterations,
        mem: profile.memoryKiB,
        parallelism: profile.parallelism,
        hashLen: 32,
        type: argon2.ArgonType.Argon2id
      });
    } catch (error) {
      cleanup();
      return Promise.resolve(unavailableBenchmark(profileName));
    }
    return Promise.resolve(operation).then(function (result) {
      var valid = Boolean(result && result.hash && result.hash.length === 32);
      var durationMs = roundedMilliseconds(monotonicNow() - started);
      cleanup(result);
      return valid && durationMs > 0
        ? benchmarkResult(profileName, 'passed', durationMs)
        : unavailableBenchmark(profileName);
    }, function () {
      cleanup();
      return unavailableBenchmark(profileName);
    });
  }

  function randomBytes(length) {
    if (!Number.isSafeInteger(length) || length < 0) {
      throw new Error('Random byte length must be a non-negative safe integer.');
    }
    if (!webCrypto || typeof webCrypto.getRandomValues !== 'function') {
      throw new Error('Required crypto.getRandomValues is unavailable.');
    }
    var output = new Uint8Array(length);
    webCrypto.getRandomValues(output);
    return output;
  }

  function nobleAesGcm(operation, key, nonce, input, aad) {
    if (!noble || typeof noble.gcm !== 'function') {
      throw new Error('The pure-JS @noble AES-GCM path is unavailable.');
    }
    var cipher = noble.gcm(key, nonce, aad);
    return operation === 'decrypt' ? cipher.decrypt(input) : cipher.encrypt(input);
  }

  function webCryptoAesGcm(operation, key, nonce, input, aad) {
    if (webCryptoState !== 'passed' || !webCrypto || !webCrypto.subtle) {
      return Promise.reject(new Error('WebCrypto is unavailable until its known-answer test passes.'));
    }
    var usages = operation === 'decrypt' ? ['decrypt'] : ['encrypt'];
    var parameters = {
      name: 'AES-GCM',
      iv: nonce,
      tagLength: 128
    };
    if (aad && aad.length > 0) {
      parameters.additionalData = aad;
    }
    return webCrypto.subtle.importKey('raw', key, { name: 'AES-GCM' }, false, usages).then(function (cryptoKey) {
      return webCrypto.subtle[operation](parameters, cryptoKey, input);
    }).then(function (result) {
      return new Uint8Array(result);
    });
  }

  function aesGcm(operation, key, nonce, input, aad, pathName) {
    var keyBytes = asBytes(key, 'AES key');
    var nonceBytes = asBytes(nonce, 'AES nonce');
    var inputBytes = asBytes(input, 'AES input');
    var aadBytes = aad === undefined || aad === null ? new Uint8Array(0) : asBytes(aad, 'AES AAD');
    if (pathName === 'webcrypto') {
      return webCryptoAesGcm(operation, keyBytes, nonceBytes, inputBytes, aadBytes);
    }
    return Promise.resolve(nobleAesGcm(operation, keyBytes, nonceBytes, inputBytes, aadBytes));
  }

  function runNobleKnownAnswerTest() {
    try {
      var key = hexToBytes('00000000000000000000000000000000');
      var nonce = hexToBytes('000000000000000000000000');
      var plaintext = hexToBytes('00000000000000000000000000000000');
      var expected = hexToBytes('0388dace60b6a392f328c2b971b2fe78ab6e47d42cec13bdf53a67b21257bddf');
      var ciphertext = nobleAesGcm('encrypt', key, nonce, plaintext, new Uint8Array(0));
      var decrypted = nobleAesGcm('decrypt', key, nonce, ciphertext, new Uint8Array(0));
      return {
        passed: bytesEqual(ciphertext, expected) && bytesEqual(decrypted, plaintext),
        reason: 'NIST AES-GCM known-answer test'
      };
    } catch (error) {
      return { passed: false, reason: `Pure-JS AES-GCM test failed: ${error.message}` };
    }
  }

  function runWebCryptoKnownAnswerTest() {
    if (!webCrypto || !webCrypto.subtle) {
      webCryptoState = 'unsupported';
      return Promise.resolve({ passed: false, available: false, reason: 'crypto.subtle is not exposed.' });
    }
    var key = hexToBytes('00000000000000000000000000000000');
    var nonce = hexToBytes('000000000000000000000000');
    var plaintext = hexToBytes('00000000000000000000000000000000');
    var expected = hexToBytes('0388dace60b6a392f328c2b971b2fe78ab6e47d42cec13bdf53a67b21257bddf');
    var parameters = { name: 'AES-GCM', iv: nonce, tagLength: 128 };
    return webCrypto.subtle.importKey('raw', key, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']).then(function (cryptoKey) {
      return webCrypto.subtle.encrypt(parameters, cryptoKey, plaintext).then(function (ciphertext) {
        return webCrypto.subtle.decrypt(parameters, cryptoKey, ciphertext).then(function (decrypted) {
          var actualCiphertext = new Uint8Array(ciphertext);
          webCryptoState = bytesEqual(actualCiphertext, expected) && bytesEqual(new Uint8Array(decrypted), plaintext)
            ? 'passed'
            : 'failed';
          return {
            passed: webCryptoState === 'passed',
            available: true,
            reason: 'NIST AES-GCM known-answer test'
          };
        });
      });
    }).catch(function (error) {
      webCryptoState = 'failed';
      return { passed: false, available: true, reason: `WebCrypto test failed: ${error.message}` };
    });
  }

  function runArgon2KnownAnswerTest() {
    if (!argon2 || typeof argon2.hash !== 'function' || !argon2.ArgonType) {
      return Promise.resolve({ passed: false, reason: 'Argon2id WASM bundle is unavailable.' });
    }
    var password = new Uint8Array(32).fill(1);
    var salt = new Uint8Array(16).fill(2);
    var secret = new Uint8Array(8).fill(3);
    var associatedData = new Uint8Array(12).fill(4);
    var expected = hexToBytes('0d640df58d78766c08c037a34a8b53c9d01ef0452d75b65eb52520e96b01e659');
    return argon2.hash({
      pass: password,
      salt: salt,
      secret: secret,
      ad: associatedData,
      time: 3,
      mem: 32,
      parallelism: 4,
      hashLen: 32,
      type: argon2.ArgonType.Argon2id
    }).then(function (result) {
      var passed = bytesEqual(result.hash, expected);
      argon2Healthy = passed;
      return { passed: passed, reason: 'RFC 9106 Argon2id known-answer test' };
    }).catch(function (error) {
      argon2Healthy = false;
      return { passed: false, reason: `Argon2id WASM test failed: ${error.message}` };
    });
  }

  function getKdfDetails() {
    return Object.assign({}, activeKdf);
  }

  function selfTest() {
    if (selfTestPromise) {
      return selfTestPromise;
    }
    setKdfUi(activeKdf);
    var nobleResult = runNobleKnownAnswerTest();
    selfTestPromise = Promise.all([
      Promise.resolve(nobleResult),
      runWebCryptoKnownAnswerTest(),
      runArgon2KnownAnswerTest()
    ]).then(function (results) {
      var report = {
        nobleAesGcm: results[0].passed,
        webCrypto: results[1],
        argon2id: results[2],
        kdf: null
      };
      if (report.nobleAesGcm !== true) {
        setFallback('The pure-JS self-test also failed, so no vault operation is safe.');
      } else if (report.argon2id.passed === true) {
        setActiveKdf(profiles.standard, 'Pure-JS @noble AES-GCM passed its NIST test. Argon2id WASM passed the RFC 9106 test and is the active vault KDF.');
      } else {
        setFallback(report.argon2id.reason);
      }
      report.kdf = getKdfDetails();
      return report;
    }).catch(function (error) {
      setFallback(`Crypto self-test failed: ${error.message}`);
      return {
        nobleAesGcm: false,
        webCrypto: { passed: false, available: false, reason: error.message },
        argon2id: { passed: false, reason: error.message },
        kdf: getKdfDetails()
      };
    });
    return selfTestPromise;
  }

  function benchmarkProfiles() {
    if (benchmarkPromise) {
      return benchmarkPromise;
    }
    var names = ['fast', 'standard', 'paranoid'];
    var results = [];
    var work = selfTest().then(function () {
      var sequence = Promise.resolve();
      names.forEach(function (name) {
        sequence = sequence.then(function () {
          return runArgon2Benchmark(name);
        }).then(function (result) {
          results.push(result);
        });
      });
      return sequence.then(function () {
        return {
          activeKdf: getKdfDetails(),
          profiles: results
        };
      });
    });
    benchmarkPromise = work.then(function (report) {
      benchmarkPromise = null;
      return report;
    }, function () {
      benchmarkPromise = null;
      return {
        activeKdf: getKdfDetails(),
        profiles: names.map(unavailableBenchmark)
      };
    });
    return benchmarkPromise;
  }

  function deriveWithFallback(passphrase, salt) {
    if (!noble || typeof noble.pbkdf2Async !== 'function' || typeof noble.sha512 !== 'function') {
      return Promise.reject(new Error('The PBKDF2 fallback path is unavailable.'));
    }
    setFallback('This fallback is visible in the vault details panel.');
    return noble.pbkdf2Async(noble.sha512, asBytes(passphrase, 'Passphrase'), asBytes(salt, 'Salt'), {
      c: profiles.fallback.iterations,
      dkLen: 32
    }).then(function (key) {
      return { key: new Uint8Array(key), profileId: profiles.fallback.id };
    });
  }

  // Returns { key, profileId } where profileId names the KDF that ACTUALLY
  // produced the key.
  //
  // Callers must never infer the KDF from getKdfDetails(): that reads mutable
  // module state, so a concurrent derivation or a silent Argon2id-to-PBKDF2
  // fallback would let a caller record header parameters that do not match the
  // key it holds. A vault written that way is unopenable, so the derivation
  // reports its own result and the caller uses nothing else.
  function deriveKey(passphrase, salt, profileName) {
    return selfTest().then(function () {
      if (profileName === 'fallback' || profileName === profiles.fallback.id) {
        return deriveWithFallback(passphrase, salt);
      }
      if (noble && typeof noble.pbkdf2Async === 'function' && argon2Healthy) {
        var profile = profiles[profileName] || profiles.standard;
        setActiveKdf(profile, `Pure-JS @noble AES-GCM remains the default cipher path. Argon2id WASM is active with ${profile.memoryKiB.toLocaleString('en-US')} KiB, ${profile.iterations} passes, and ${profile.parallelism} lane.`);
        return argon2.hash({
          pass: asBytes(passphrase, 'Passphrase'),
          salt: asBytes(salt, 'Salt'),
          time: profile.iterations,
          mem: profile.memoryKiB,
          parallelism: profile.parallelism,
          hashLen: 32,
          type: argon2.ArgonType.Argon2id
        }).then(function (result) {
          return { key: new Uint8Array(result.hash), profileId: profile.id };
        }).catch(function (error) {
          // The fallback reports profiles.fallback.id, so the header records
          // PBKDF2 rather than the Argon2id profile that was requested.
          return deriveWithFallback(passphrase, salt).catch(function (fallbackError) {
            throw new Error(`Argon2id failed: ${error.message}; PBKDF2 fallback failed: ${fallbackError.message}`);
          });
        });
      }
      return deriveWithFallback(passphrase, salt);
    });
  }

  global.__coldboxCrypto = Object.freeze({
    profiles: profiles,
    selfTest: selfTest,
    benchmarkProfiles: benchmarkProfiles,
    randomBytes: randomBytes,
    aesGcm: aesGcm,
    deriveKey: deriveKey,
    getKdfDetails: getKdfDetails,
    getWebCryptoState: function () { return webCryptoState; }
  });
  setKdfUi(activeKdf);
}(window));
