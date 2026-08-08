'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const warmSource = fs.readFileSync(path.join(projectRoot, 'src', 'main.js'), 'utf8');
const warmHtml = fs.readFileSync(path.join(projectRoot, 'src', 'index.html'), 'utf8');
const coldSource = fs.readFileSync(path.join(projectRoot, 'src', 'cold', 'main.js'), 'utf8');
const vaultSource = fs.readFileSync(path.join(projectRoot, 'src', 'cold', 'vault.js'), 'utf8');
const coldHtml = fs.readFileSync(path.join(projectRoot, 'src', 'cold', 'index.html'), 'utf8');

function extractFunction(source, name) {
  const declaration = new RegExp('function ' + name + '\\s*\\([^)]*\\)\\s*\\{');
  const match = declaration.exec(source);
  assert.ok(match, `function ${name} not found in source`);
  let depth = 0;
  let index = match.index + match[0].length - 1;
  const start = index;
  for (; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Unbalanced function ${name}`);
}

test('P0.19 warm reachability probes are content-free, allowlisted, and online-safe on uncertainty', () => {
  assert.match(warmSource, /https:\/\/api\.coinbase\.com\/v2\/time/);
  assert.match(warmSource, /https:\/\/mempool\.space\/api\/blocks\/tip\/height/);
  const probe = extractFunction(warmSource, 'probeReachabilityUrl');
  assert.match(probe, /method: 'GET'/);
  assert.match(probe, /mode: 'no-cors'/, 'file:// probes must not depend on provider CORS response headers');
  assert.match(probe, /credentials: 'omit'/);
  assert.match(probe, /referrerPolicy: 'no-referrer'/);
  assert.doesNotMatch(probe, /body\s*:/, 'reachability probes must not send a body');

  const banner = extractFunction(warmSource, 'updateAirgapBanner');
  assert.match(banner, /sendColdMode\(reachabilityState !== 'unreachable'\)/);
  assert.match(banner, /No external reachability detected \/ cold sealed/);
  assert.doesNotMatch(banner, /physical airgap confirmed/i);
  assert.match(
    banner,
    /data-vault-operations', 'guarded'[\s\S]*updateVaultControls\(\)/,
    'vault controls must refresh after the guarded gate opens'
  );
});

test('P0.19 network observation stays warm while validated mode.set is the sole cold vault authority', () => {
  assert.match(warmHtml, /id="warm-reachability-status"/);
  assert.match(warmHtml, /id="cold-isolation-status"/);
  assert.match(coldHtml, /connect-src 'none'/);
  assert.doesNotMatch(coldSource, /api\.coinbase\.com|mempool\.space/, 'cold realm must never know probe hosts');

  const networkState = extractFunction(vaultSource, 'networkState');
  const executableNetworkState = networkState.replace(/\/\/.*$/gm, '');
  assert.match(executableNetworkState, /rootAttribute\('data-warm-network-online'\)/);
  assert.doesNotMatch(executableNetworkState, /navigator\.onLine|__coldboxAirgap|getNetworkSnapshot/);
  assert.match(executableNetworkState, /return 'unknown'/, 'missing validated mode.set state must fail closed as unknown');
});

test('P0.19 creation confirmation and random Vault ID are cold-only', () => {
  assert.match(coldHtml, /id="cold-vault-passphrase-confirm"/);
  const createBody = extractFunction(coldSource, 'createEmptyVault');
  assert.match(createBody, /passphrase !== confirmation/);
  assert.match(createBody, /publicData: \{ id: generateVaultUuid\(\) \}/);

  const uuidBody = extractFunction(coldSource, 'generateVaultUuid');
  assert.match(uuidBody, /cryptoLayer\.randomBytes\(16\)/);
  assert.match(uuidBody, /bytes\[6\].*0x40/);
  assert.match(uuidBody, /bytes\[8\].*0x80/);
  assert.match(uuidBody, /zeroBytes\(bytes\)/, 'raw UUID randomness must be zeroed after formatting');
});

test('P0.19 Vault Library and first-class Save controls exist in the warm UI', () => {
  assert.match(warmHtml, /id="vault-file-input"[^>]*multiple/);
  assert.match(warmHtml, /id="vault-library-list"/);
  assert.match(warmHtml, /id="vault-create-name"/);
  assert.match(warmHtml, /id="vault-save-primary"/);
  assert.match(warmHtml, /id="vault-lock-warning"/);
  assert.match(warmHtml, /id="vault-lock-save"/);
  assert.match(warmHtml, /id="vault-lock-without-save"/);
  assert.match(warmHtml, /id="vault-lock-cancel"/);
});

test('P0.19 switching vault identity clears stale manual and QR export state', () => {
  const clearExport = extractFunction(warmSource, 'clearManualVaultExport');
  assert.match(clearExport, /vaultManualData\.value = ''/);
  assert.match(clearExport, /clearQrExport\(\)/);

  const prepareCreate = extractFunction(warmSource, 'prepareNewVaultCreation');
  assert.match(prepareCreate, /clearManualVaultExport\(\)[\s\S]*pendingCreateVaultName/);

  const loadFile = extractFunction(warmSource, 'loadVaultFile');
  assert.match(loadFile, /pendingCreateVaultName = ''[\s\S]*clearManualVaultExport\(\)[\s\S]*setActiveVaultMeta/);
});
