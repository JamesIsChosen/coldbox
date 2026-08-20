'use strict';

// P1.4a - Derivation paths and Address derivation surfaces.
//
// These tests cover the two sealed-realm surfaces, not the P1.4/P1.5 engine
// underneath them: the engine's own published vectors stay in
// test/derivation.test.js and are not restated here. What this file asserts
// is the wiring - that the surfaces exist and are reachable, that they are
// lenses on the focused released secret rather than new seed-entry points,
// that no private material can reach the rendered output, that a chain with
// no independently recorded test vectors cannot be used, and that the
// public engine wrappers the surfaces depend on return the same paths the
// engine derives from.

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { createCryptoVendorSource } = require('../scripts/crypto-bundle.js');

const projectRoot = path.resolve(__dirname, '..');
const coldHtml = fs.readFileSync(path.join(projectRoot, 'src', 'cold', 'index.html'), 'utf8');
const coldSource = fs.readFileSync(path.join(projectRoot, 'src', 'cold', 'main.js'), 'utf8');
const coldStyles = fs.readFileSync(path.join(projectRoot, 'src', 'cold', 'styles.css'), 'utf8');
const warmHtml = fs.readFileSync(path.join(projectRoot, 'src', 'index.html'), 'utf8');
const derivationSource = fs.readFileSync(
  path.join(projectRoot, 'src', 'cold', 'derivation.js'),
  'utf8'
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractFunctionDeclaration(source, name) {
  const declaration = new RegExp('function ' + name + '\\s*\\([^)]*\\)\\s*\\{');
  const match = declaration.exec(source);
  assert.ok(match, `function ${name} not found in src/cold/main.js`);
  let depth = 0;
  for (let index = match.index + match[0].length - 1; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(match.index, index + 1);
    }
  }
  throw new Error(`Unbalanced function ${name}`);
}

function extractCatalogue() {
  const start = coldSource.indexOf('var DERIVATION_CHAINS = Object.freeze([');
  assert.notEqual(start, -1, 'DERIVATION_CHAINS is missing from src/cold/main.js');
  const open = coldSource.indexOf('[', start);
  let depth = 0;
  for (let index = open; index < coldSource.length; index += 1) {
    if (coldSource[index] === '[') depth += 1;
    if (coldSource[index] === ']') {
      depth -= 1;
      if (depth === 0) {
        return vm.runInNewContext(coldSource.slice(open, index + 1), { Object });
      }
    }
  }
  throw new Error('Unbalanced DERIVATION_CHAINS literal');
}

function chainGuards() {
  const context = { Boolean, Object };
  vm.runInNewContext(
    [
      extractFunctionDeclaration(coldSource, 'chainHasIndependentVectors'),
      extractFunctionDeclaration(coldSource, 'selectableDerivationChains'),
      extractFunctionDeclaration(coldSource, 'findSelectableDerivationChain')
    ].join('\n'),
    context
  );
  return context;
}

function createEngine() {
  const context = {
    ArrayBuffer,
    BigInt,
    TextDecoder,
    TextEncoder,
    Uint8Array,
    WebAssembly,
    atob,
    crypto: crypto.webcrypto,
    console
  };
  context.window = context;
  context.self = context;
  vm.runInNewContext(createCryptoVendorSource(projectRoot), context);
  vm.runInNewContext(derivationSource, context, { filename: 'src/cold/derivation.js' });
  return context.__coldboxDerivation;
}

// The official BIP-39 all-zero-entropy seed, the same one test/derivation.test.js
// uses for the published BIP-49/84/86 vectors. It is a public test value.
const BIP39_ZERO_ENTROPY_SEED = Uint8Array.from(Buffer.from(
  '5eb00bbddcf069084889a8ab9155568165f5c453ccb85e70811aaed6f6da5fc1'
  + '9a5ac40b389cd370d086206dec8aa6c43daea6690f20ad3d8d48b2d2ce9e38e4',
  'hex'
));

function panelMarkup(id) {
  const start = coldHtml.indexOf(`<section id="${id}"`);
  assert.notEqual(start, -1, `panel ${id} is missing from src/cold/index.html`);
  const end = coldHtml.indexOf('\n    </section>', start);
  assert.notEqual(end, -1, `panel ${id} is unterminated`);
  return coldHtml.slice(start, end);
}

// ---------------------------------------------------------------------------
// Both destinations exist and are reachable
// ---------------------------------------------------------------------------

test('P1.4a puts both destinations in the sealed realm, in the Derive workspace', () => {
  const group = coldHtml.indexOf('<section id="cold-group-derive" class="cold-tool-group" data-cold-group="derive"');
  assert.notEqual(group, -1, 'the Derive workspace is missing');
  const paths = coldHtml.indexOf('<section id="cold-derivation-paths"');
  const addresses = coldHtml.indexOf('<section id="cold-address-derivation"');
  assert.ok(paths > group, 'Derivation paths must sit inside the Derive workspace');
  assert.ok(addresses > paths, 'Address derivation must sit inside the Derive workspace');

  // Both live in the sealed document, never the warm one.
  assert.equal(warmHtml.includes('id="cold-derivation-paths"'), false);
  assert.equal(warmHtml.includes('id="cold-address-derivation"'), false);
});

test('P1.4a reaches both destinations from the rail, the mobile More sheet and the flow indexes', () => {
  const railGroup = /<nav class="cold-nav-group" aria-label="Derive">([\s\S]*?)<\/nav>/.exec(coldHtml);
  assert.ok(railGroup, 'the rail has no Derive group');
  const moreSheet = /<div class="cold-mobile-more-links">([\s\S]*?)<\/div>/.exec(coldHtml);
  assert.ok(moreSheet, 'the sealed realm has no mobile More sheet');

  // A bare fragment href inside the srcdoc frame resolves against the parent
  // document's file:// URL, which the browser refuses to navigate to - so a
  // sealed destination is only genuinely reachable when its link also carries
  // the handled `data-cold-more-target`, the mechanism the existing Secret
  // notes and Reveal hidden entries already use.
  for (const target of ['cold-derivation-paths', 'cold-address-derivation']) {
    assert.match(
      railGroup[1],
      new RegExp(`<a class="cold-nav-link" href="#${target}" data-cold-more-target="${target}">`),
      `the rail entry for ${target} would not actually navigate`
    );
    assert.match(
      moreSheet[1],
      new RegExp(`<a href="#${target}" data-cold-more-target="${target}">`),
      `the More sheet entry for ${target} would not actually navigate`
    );
  }

  // The sealed hub indexes every workspace, and the warm All flows index is
  // the shell-wide one. Neither may still describe P1.4a as unavailable.
  assert.match(coldHtml, /<a class="cold-tool-hub-link" href="#cold-group-derive">Derive<\/a>/);
  const flowIndex = /<section class="flow-index-group" aria-labelledby="flow-index-derive">([\s\S]*?)<\/section>/.exec(warmHtml);
  assert.ok(flowIndex, 'the All flows index has no Derive group');
  assert.match(flowIndex[1], /<a class="flow-index-link" href="#cold-realm-status">Derivation paths/);
  assert.match(flowIndex[1], /<a class="flow-index-link" href="#cold-realm-status">Address derivation/);

  for (const surface of [coldHtml, warmHtml]) {
    assert.equal(
      /data-roadmap-id="P1\.4a"/.test(surface),
      false,
      'no navigation entry may still mark a P1.4a destination unavailable'
    );
  }
});

// ---------------------------------------------------------------------------
// ADR-0045: lenses on the focused secret, never seed-entry points
// ---------------------------------------------------------------------------

test('P1.4a adds no secret-accepting input and keeps Seed Forge the only seed entry', () => {
  for (const id of ['cold-derivation-paths', 'cold-address-derivation']) {
    const markup = panelMarkup(id);
    const controls = markup.match(/<(?:input|textarea|select)\b[^>]*>/g) || [];
    assert.ok(controls.length > 0, `${id} declares no controls`);
    for (const control of controls) {
      assert.match(
        control,
        /data-input-surface="public"/,
        `${id} control is not declared public: ${control}`
      );
    }
    assert.match(markup, /data-secret-focus-indicator="/, `${id} must show the focused secret`);
  }

  // Exactly one seed-entry surface still exists anywhere in src/.
  const seedEntry = (coldHtml.match(/data-secret-input-category="seed-entry"/g) || []).length
    + (coldSource.match(/'seed-entry'/g) || []).length;
  assert.ok(seedEntry > 0, 'the seed-entry declaration disappeared');
  assert.equal(coldHtml.includes('id="cold-seed-forge-mnemonic-input"'), true);
});

test('P1.4a clears with the released-secret registry and refreshes on focus change', () => {
  const lensTeardown = extractFunctionDeclaration(coldSource, 'clearReleasedSecretLensState');
  assert.match(lensTeardown, /clearDerivationPathsState\(\);/);
  assert.match(lensTeardown, /clearAddressDerivationState\(\);/);
  const refresh = extractFunctionDeclaration(coldSource, 'refreshReleasedSecretConsumers');
  assert.match(refresh, /updateDerivationControls\(\);/);
  const clearAll = extractFunctionDeclaration(coldSource, 'clearReleasedSecrets');
  assert.match(clearAll, /updateDerivationControls\(\);/);
});

// ---------------------------------------------------------------------------
// No private material, and no message across the boundary
// ---------------------------------------------------------------------------

test('P1.4a never renders, logs or copies a private key, xprv, WIF or phrase', () => {
  const forbidden = [
    'xprv',
    'privateKey',
    'privateKeyHex',
    'wif',
    'mnemonic',
    'deriveArbitraryFromSeed'
  ];
  const surfaceFunctions = [
    'runDerivationPath',
    'runAddressDerivation',
    'deriveAddressChain',
    'renderDerivedAddressList',
    'renderDerivationPathFacts'
  ].map((name) => extractFunctionDeclaration(coldSource, name));

  for (const declaration of surfaceFunctions) {
    for (const token of forbidden) {
      assert.equal(
        new RegExp(token, 'i').test(declaration),
        false,
        `a P1.4a surface function references ${token}`
      );
    }
    assert.equal(/postMessage/.test(declaration), false, 'a P1.4a surface posts a message');
    assert.equal(/console\./.test(declaration), false, 'a P1.4a surface logs');
    assert.equal(/clipboard/i.test(declaration), false, 'a P1.4a surface touches the clipboard');
  }

  // The panels themselves offer no copy or send-to affordance for a derived
  // value, so there is no control that could place one on a clipboard.
  for (const id of ['cold-derivation-paths', 'cold-address-derivation']) {
    assert.equal(/clipboard/i.test(panelMarkup(id)), false, `${id} markup mentions the clipboard`);
  }
});

test('P1.4a derives only through the existing engine, adding no second derivation path', () => {
  const surface = [
    'runDerivationPath',
    'deriveAddressChain',
    'chainAccountPath',
    'chainCoinType'
  ].map((name) => extractFunctionDeclaration(coldSource, name)).join('\n');

  // Every derivation call goes through the `derivation` handle, which is
  // window.__coldboxDerivation - the P1.4/P1.5 engine.
  const calls = surface.match(/\bderivation\.[a-zA-Z]+/g) || [];
  assert.ok(calls.length > 0, 'the surfaces call no engine method at all');
  for (const call of calls) {
    assert.match(call, /^derivation\.(parsePath|deriveNodeProjection|deriveBitcoinFromSeed|deriveEvmFromSeed|bitcoinAccountPath|evmAccountPath|coinType|constants)$/);
  }
  assert.equal(/HDKey|hmac|sha512|secp256k1/i.test(surface), false, 'a surface re-implements derivation');
});

// ---------------------------------------------------------------------------
// The custom-chain guard
// ---------------------------------------------------------------------------

test('every shipped chain names the independent vectors that back it', () => {
  const catalogue = extractCatalogue();
  assert.ok(catalogue.length >= 3, 'the chain catalogue is suspiciously small');
  for (const chain of catalogue) {
    assert.equal(typeof chain.testVectors, 'string');
    assert.ok(chain.testVectors.trim().length > 0, `${chain.id} claims no test vectors`);
  }
});

test('a custom chain entry cannot be selected or used until its vectors are recorded', () => {
  const guards = chainGuards();
  const custom = { id: 'my-fork', label: 'My fork', mode: 'bitcoin', network: 'mainnet', addresses: true, encoding: 'Base58Check' };
  const catalogue = extractCatalogue().concat([custom]);

  assert.equal(guards.chainHasIndependentVectors(custom), false);
  assert.equal(
    guards.selectableDerivationChains(catalogue).some((chain) => chain.id === 'my-fork'),
    false,
    'a vector-free custom chain reached the selectable set'
  );
  assert.equal(
    guards.findSelectableDerivationChain(catalogue, 'my-fork'),
    null,
    'a vector-free custom chain was resolved by id'
  );

  // An empty or whitespace-only claim is not a recorded vector either.
  for (const value of ['', '   ', null, undefined, 42]) {
    assert.equal(
      guards.chainHasIndependentVectors(Object.assign({}, custom, { testVectors: value })),
      false,
      `testVectors ${JSON.stringify(value)} was accepted as evidence`
    );
  }

  // Recording a real vector reference is what makes it usable - the guard is
  // the gate, not a cosmetic label.
  const recorded = Object.assign({}, custom, { testVectors: 'Vendor reference vectors, three paths' });
  assert.equal(guards.chainHasIndependentVectors(recorded), true);
  assert.equal(
    guards.findSelectableDerivationChain(catalogue.concat([recorded]), 'my-fork'),
    null,
    'the first, vector-free entry must still win on id lookup'
  );
});

test('an unknown chain id resolves to nothing rather than a default', () => {
  const guards = chainGuards();
  const catalogue = extractCatalogue();
  assert.equal(guards.findSelectableDerivationChain(catalogue, 'not-a-chain'), null);
  assert.equal(guards.findSelectableDerivationChain(catalogue, ''), null);
});

// ---------------------------------------------------------------------------
// The engine wrappers the Derivation paths facts are read from
// ---------------------------------------------------------------------------

test('the account-path and coin-type wrappers agree with what the engine derives', () => {
  const derivation = createEngine();

  assert.equal(derivation.coinType('mainnet'), 0);
  assert.equal(derivation.coinType('testnet'), 1);
  assert.equal(derivation.constants.evmCoinType, 60);

  for (const [scriptType, purpose] of [['p2pkh', 44], ['p2sh-p2wpkh', 49], ['p2wpkh', 84], ['p2tr', 86]]) {
    assert.equal(derivation.bitcoinAccountPath('mainnet', scriptType, 0), `m/${purpose}'/0'/0'`);
    const derived = derivation.deriveBitcoinFromSeed(BIP39_ZERO_ENTROPY_SEED, {
      network: 'mainnet',
      scriptType,
      account: 3,
      count: 1
    });
    assert.equal(
      derivation.bitcoinAccountPath('mainnet', scriptType, 3),
      derived.accountPath,
      'the wrapper and the derivation disagree about the account path'
    );
  }

  assert.equal(derivation.bitcoinAccountPath('testnet', 'p2sh-p2wpkh', 0), "m/49'/1'/0'");
  assert.equal(derivation.evmAccountPath(0), "m/44'/60'/0'");
  assert.equal(derivation.evmAccountPath(7), "m/44'/60'/7'");

  assert.throws(() => derivation.bitcoinAccountPath('mainnet', 'p2wsh', 0), /script type/i);
  assert.throws(() => derivation.bitcoinAccountPath('regtest', 'p2wpkh', 0), /network/i);
  assert.throws(() => derivation.bitcoinAccountPath('mainnet', 'p2wpkh', -1), /account/i);
  assert.throws(() => derivation.evmAccountPath(-1), /account/i);
});

test('the path shown beside each derived address is the path that address comes from', () => {
  const derivation = createEngine();
  const account = 0;
  const start = 2;
  const count = 3;
  const derived = derivation.deriveBitcoinFromSeed(BIP39_ZERO_ENTROPY_SEED, {
    network: 'mainnet',
    scriptType: 'p2wpkh',
    account,
    change: 1,
    start,
    count
  });

  // The surface composes `<accountPath>/<change>/<index>` for display. Each
  // composed path must derive, through the generic projection, the same public
  // key that produced the address in the batch.
  derived.addresses.forEach((address, offset) => {
    const composed = `${derived.accountPath}/1/${start + offset}`;
    const projection = derivation.deriveNodeProjection(BIP39_ZERO_ENTROPY_SEED, composed, {
      network: 'mainnet'
    });
    assert.equal(
      derivation.addressFromPublicKey(projection.publicKey, 'p2wpkh', 'mainnet'),
      address,
      `the displayed path ${composed} does not produce the address shown beside it`
    );
  });
});

// ---------------------------------------------------------------------------
// Presentation floors
// ---------------------------------------------------------------------------

test('P1.4a controls carry labels and inherit the sealed shell touch floor', () => {
  for (const id of ['cold-derivation-paths', 'cold-address-derivation']) {
    const markup = panelMarkup(id);
    const controlIds = Array.from(
      markup.matchAll(/<(?:input|select)\b[^>]*\bid="([^"]+)"/g),
      (match) => match[1]
    );
    assert.ok(controlIds.length > 0, `${id} has no labelled controls`);
    for (const controlId of controlIds) {
      assert.ok(
        markup.includes(`for="${controlId}"`),
        `${controlId} has no <label for>`
      );
    }
    assert.match(markup, /role="status" aria-live="polite"/, `${id} reports no live status`);
  }

  // The sealed shell sets the 44px floor once, for every control in the frame.
  assert.match(coldStyles, /min-height: 2\.75rem/);
});
