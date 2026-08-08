'use strict';

// P0.14 wiring checks. src/main.js is DOM-heavy warm-shell glue that the
// project tests by source pattern rather than full execution (see
// test/handshake.test.js and the boundary test in test/vault.test.js) - the
// decision logic itself is proven functionally in test/save-integrity.test.js.
// These tests confirm the glue actually calls that logic in the required
// order: only a verified File System Access save may ever clear the dirty
// flag or advance the save generation, and the two unverifiable save paths
// never do.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const mainSource = fs.readFileSync(path.join(projectRoot, 'src', 'main.js'), 'utf8');

// Extracts `function <name>(...) { ... }` by balanced-brace matching so
// nested blocks don't truncate the match the way a non-greedy regex would.
function extractFunction(source, name) {
  const declaration = new RegExp('function ' + name + '\\s*\\([^)]*\\)\\s*\\{');
  const match = declaration.exec(source);
  assert.ok(match, `function ${name} not found in source`);
  let depth = 0;
  let index = match.index + match[0].length - 1;
  const start = index;
  for (; index < source.length; index += 1) {
    if (source[index] === '{') {
      depth += 1;
    } else if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }
  throw new Error(`Unbalanced braces while extracting function ${name}`);
}

test('save-integrity module is assembled into the warm shell', () => {
  assert.match(mainSource, /__COLDBOX_SAVE_INTEGRITY__/);
  assert.match(mainSource, /var saveIntegrity = window\.__coldboxSaveIntegrity;/);
});

test('the FSA save path only completes a verified save after checking result.verified', () => {
  const body = extractFunction(mainSource, 'saveWithFileSystemAccess');
  assert.match(body, /saveIntegrity\.verifyAfterSave\(/, 'must call the shared verify-after-save orchestration');
  assert.match(body, /readVaultFile/, 'must read the file back rather than trusting the in-memory bytes');

  const verifiedCallIndex = body.indexOf('completeVerifiedSave()');
  const guardIndex = body.indexOf('!result.verified');
  assert.notEqual(verifiedCallIndex, -1, 'completeVerifiedSave() must be reachable from this path');
  assert.notEqual(guardIndex, -1, 'a !result.verified guard must exist');
  assert.ok(guardIndex < verifiedCallIndex, 'the verified guard must run before completeVerifiedSave() is called');
});

test('completeVerifiedSave clears the dirty flag and advances the generation together', () => {
  const body = extractFunction(mainSource, 'completeVerifiedSave');
  assert.match(body, /saveIntegrity\.nextCounter\(saveGeneration\)/);
  assert.match(body, /saveIntegrity\.writeGenerationFor\(/, 'modern vaults must persist per-vault generation state');
  assert.match(body, /saveIntegrity\.writeGeneration\(/, 'legacy/no-namespace fallback remains compatible');
  assert.match(body, /setVaultDirty\(false\)/);
  // The dirty flag must clear last, after the generation bookkeeping - not
  // as an independent step that could run without it.
  const writeIndex = body.indexOf('saveIntegrity.writeGenerationFor');
  const dirtyIndex = body.indexOf('setVaultDirty(false)');
  assert.ok(writeIndex < dirtyIndex, 'generation bookkeeping must precede clearing the dirty flag');
});

test('blob download never clears the dirty flag or advances the save generation', () => {
  const body = extractFunction(mainSource, 'saveAsDownload');
  assert.doesNotMatch(body, /setVaultDirty/, 'a save path with no read-back must never touch the dirty flag');
  assert.doesNotMatch(body, /completeVerifiedSave/);
  assert.doesNotMatch(body, /writeGeneration/);
});

test('manual/QR export never clears the dirty flag or advances the save generation', () => {
  const body = extractFunction(mainSource, 'saveAsManualText');
  assert.doesNotMatch(body, /setVaultDirty/, 'a save path with no read-back must never touch the dirty flag');
  assert.doesNotMatch(body, /completeVerifiedSave/);
  assert.doesNotMatch(body, /writeGeneration/);
});

test('setVaultDirty is the only place the dirty attribute is written', () => {
  const occurrences = (mainSource.match(/setAttribute\('data-vault-dirty'/g) || []).length;
  assert.equal(occurrences, 2, 'data-vault-dirty must only be set inside setVaultDirty (root + app)');
  const body = extractFunction(mainSource, 'setVaultDirty');
  assert.match(body, /root\.setAttribute\('data-vault-dirty'/);
  assert.match(body, /app\.setAttribute\('data-vault-dirty'/);
});

test('sendVaultOpen only marks a load pending after the message is actually queued', () => {
  const body = extractFunction(mainSource, 'sendVaultOpen');
  const postIndex = body.indexOf('coldMessagePort.postMessage(message)');
  const pendingIndex = body.indexOf('pendingVaultLoad = true');
  assert.notEqual(postIndex, -1);
  assert.notEqual(pendingIndex, -1);
  assert.ok(postIndex < pendingIndex, 'pendingVaultLoad must only become true once the message was sent');
  assert.match(body, /catch \(error\) \{\s*pendingVaultLoad = false;/, 'a send failure must not leave a stale pending load');
});

test('handleVaultOpened derives dirty state from whether a file load was pending, before clearing it', () => {
  const body = extractFunction(mainSource, 'handleVaultOpened');
  const capturedIndex = body.indexOf('var wasLoadedFile = pendingVaultLoad;');
  const clearedIndex = body.indexOf('pendingVaultLoad = false;');
  const dirtyIndex = body.indexOf('setVaultDirty(!wasLoadedFile);');
  assert.notEqual(capturedIndex, -1);
  assert.notEqual(clearedIndex, -1);
  assert.notEqual(dirtyIndex, -1);
  assert.ok(capturedIndex < clearedIndex, 'must snapshot pendingVaultLoad before resetting it');
  assert.ok(clearedIndex < dirtyIndex || capturedIndex < dirtyIndex, 'dirty state must derive from the snapshot');
  assert.match(body, /saveIntegrity\.evaluateRollback\(/, 'must run the rollback check on every loaded-file open');
  assert.match(body, /saveIntegrity\.parseVaultFilename\(/);
  assert.match(body, /saveIntegrity\.vaultNamespace\(vaultId\)/, 'authenticated Vault ID must select the bookkeeping namespace');
});

// Independent review finding F1: the browser's remembered high-water mark
// must advance on every opened file with a newer generation, not only on a
// verified save - otherwise it goes stale and a later older file evades
// the rollback warning after a reload.
test('handleVaultOpened advances and persists the high-water mark after evaluating rollback against the old one', () => {
  const body = extractFunction(mainSource, 'handleVaultOpened');
  assert.match(body, /saveIntegrity\.advanceGenerationOnOpen\(saveGeneration, fileInfo\)/);
  assert.match(body, /saveIntegrity\.writeGenerationFor\([\s\S]*activeVaultNamespace[\s\S]*saveGeneration\.counter[\s\S]*saveGeneration\.savedAt/, 'advanced high-water mark must persist under the active vault namespace');

  const evaluateIndex = body.indexOf('saveIntegrity.evaluateRollback(');
  const advanceIndex = body.indexOf('saveIntegrity.advanceGenerationOnOpen(');
  const persistIndex = body.indexOf('saveIntegrity.writeGenerationFor(');
  assert.notEqual(evaluateIndex, -1);
  assert.notEqual(advanceIndex, -1);
  assert.notEqual(persistIndex, -1);
  assert.ok(
    evaluateIndex < advanceIndex,
    'rollback must be evaluated against the OLD generation before it is advanced, or an opened file would always be compared against itself'
  );
  assert.ok(advanceIndex < persistIndex, 'the advanced generation must be computed before it is persisted');
});

test('the manual/QR load path never attaches file metadata (no filename exists for it)', () => {
  const body = extractFunction(mainSource, 'loadManualText');
  assert.doesNotMatch(body, /pendingLoadFileMeta\s*=/, 'must rely on sendVaultOpen\'s default of no file metadata');
  assert.match(body, /sendVaultOpen\(base64ToBytes\(qrText \|\| vaultManualData\.value\)\)/, 'must call sendVaultOpen with a single argument');
});

test('loadVaultFile captures filename and lastModified before the async read races a second load', () => {
  const body = extractFunction(mainSource, 'loadVaultFile');
  const metaIndex = body.indexOf('var fileMeta');
  const readIndex = body.indexOf('readVaultFile(file)');
  assert.notEqual(metaIndex, -1);
  assert.notEqual(readIndex, -1);
  assert.ok(metaIndex < readIndex, 'fileMeta must be captured synchronously before the async read starts');
  assert.match(body, /sendVaultOpen\(new Uint8Array\(buffer\), fileMeta\)/);
});


test('P0.19 primary save and named modern filename are first-class warm-shell actions', () => {
  const filenameBody = extractFunction(mainSource, 'nextSuggestedFilename');
  const primaryBody = extractFunction(mainSource, 'savePrimaryVault');
  assert.match(filenameBody, /saveIntegrity\.filenameForVault\(activeVaultName, activeVaultId, counter\)/);
  assert.match(primaryBody, /showSaveFilePicker/);
  assert.match(primaryBody, /saveWithFileSystemAccess\(\)/);
  assert.match(primaryBody, /saveAsDownload\(\)/, 'portable fallback must still save when File System Access is absent');
});

test('P0.19 normal lock warns on dirty state while emergency lock remains immediate', () => {
  const requestBody = extractFunction(mainSource, 'requestVaultLock');
  const immediateBody = extractFunction(mainSource, 'sendVaultLockImmediately');
  const panicBody = extractFunction(mainSource, 'panicHide');
  assert.match(requestBody, /vaultDirty/);
  assert.match(requestBody, /vaultLockWarning\.hidden = false/);
  assert.doesNotMatch(requestBody, /sendVaultMessage\('vault\.lock'/, 'dirty warning path must not itself send lock');
  assert.match(immediateBody, /sendVaultMessage\('vault\.lock', \{\}\)/);
  assert.match(panicBody, /sendVaultLockImmediately\(\)/, 'panic must never wait for save confirmation');
});

test('P0.19 creation keeps public name warm and sends only a payload-free prepare gate', () => {
  const body = extractFunction(mainSource, 'prepareNewVaultCreation');
  assert.match(body, /pendingCreateVaultName = name\.slice\(0, 80\)/);
  assert.match(body, /sendVaultMessage\('vault\.create\.prepare', \{\}\)/);
  assert.doesNotMatch(body, /sendVaultMessage\([^\n]*pendingCreateVaultName/, 'public name must not cross into cold');
});
