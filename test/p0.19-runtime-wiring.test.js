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

  const check = extractFunction(warmSource, 'runReachabilityCheck');
  assert.match(
    check,
    /data-reachability-checking', 'true'[\s\S]*if \(reachabilityState === 'unreachable'\)[\s\S]*setReachabilityState\('unknown'\)/,
    'a fresh probe must invalidate a stale offline classification before awaiting network I/O'
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
  assert.match(coldHtml, /id="cold-vault-create-error"[^>]*role="alert"/);
  const createBody = extractFunction(coldSource, 'createEmptyVault');
  assert.match(createBody, /passphrase !== confirmation/);
  assert.match(createBody, /setCreateConfirmationError\('Unlock phrases do not match/);
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

test('P0.19 switching vault identity clears stale encrypted-text handoff and has no downloadable QR export surface', () => {
  const clearExport = extractFunction(warmSource, 'clearManualVaultExport');
  assert.match(clearExport, /vaultManualData\.value = ''/);
  assert.doesNotMatch(warmHtml, /vault-manual-qr-|Download QR|Save QR frames|animated PNG/i);

  const prepareCreate = extractFunction(warmSource, 'prepareNewVaultCreation');
  assert.match(prepareCreate, /clearManualVaultExport\(\)[\s\S]*pendingCreateVaultName/);

  const loadFile = extractFunction(warmSource, 'loadVaultFile');
  assert.match(loadFile, /pendingCreateVaultName = ''[\s\S]*clearManualVaultExport\(\)[\s\S]*setActiveVaultMeta/);
});

test('P0.19 cold visible normal lock routes through the warm warning gate', () => {
  assert.match(coldHtml, /id="cold-vault-lock"[^>]*>Request lock<\/button>/);
  assert.match(coldSource, /postVaultMessage\(requestId, 'vault\.lockRequest', \{\}\)/);
  assert.doesNotMatch(coldSource, /lockVaultSession\(nextVaultMessageId\('local-lock'\)/);
  assert.match(warmSource, /message\.type === 'vault\.lockRequest'[\s\S]*requestVaultLock\(\)/);
});


test('P0.19 live animated QR is device-to-device transfer only and sender requires an unlocked vault', () => {
  assert.match(warmHtml, /id="vault-transfer-start"[^>]*>Show animated QR<\/button>/);
  assert.match(warmHtml, /Animated QR is a live transfer only/);
  assert.match(warmHtml, /nothing can be downloaded from this QR surface/i);
  assert.doesNotMatch(warmHtml, /id="vault-transfer-(?:download|save|export)[^"]*"/i, 'live QR surface must expose no downloadable/saved QR artifact control');

  const controls = extractFunction(warmSource, 'updateVaultControls');
  assert.match(controls, /vaultTransferStart\.disabled = !channelReady \|\| !unlocked \|\| !activeVaultId \|\| !vaultHasDurableTransferSource\(\) \|\| liveTransferFrames\.length > 0/);
  const start = extractFunction(warmSource, 'startLiveVaultTransfer');
  assert.match(start, /vaultState !== 'unlocked'/);
  assert.match(start, /vaultHasDurableTransferSource\(\)/, 'sender must already have a durable local vault before live transfer is allowed');
  assert.match(start, /requestVaultBytes\(\)/, 'sender must transfer fresh encrypted .cbx bytes, not cold plaintext');
  assert.match(start, /vaultTransfer\.createFrames/);
  assert.match(start, /transferId\(\)/);
  assert.match(start, /sha256Hex\(bytes\)/);
  assert.doesNotMatch(start, /passphrase|mnemonic|privateKey|seed/i);
});

test('P0.19 live receiver is user-initiated, optional, integrity-checked, and still uses normal vault.open', () => {
  assert.match(warmHtml, /id="vault-transfer-receive"[^>]*>Start camera scanner<\/button>/);
  assert.match(warmHtml, /Camera permission is requested only after you choose Start camera scanner/);
  const receiver = extractFunction(warmSource, 'startLiveTransferReceiver');
  assert.match(receiver, /mediaDevices\.getUserMedia/);
  assert.match(receiver, /BarcodeDetector/);
  assert.match(receiver, /Use the canonical \.cbx file instead/);
  const finish = extractFunction(warmSource, 'finishLiveTransferReceipt');
  assert.match(finish, /sha256Hex\(bytes\)/);
  assert.match(finish, /actualHash !== assembled\.hash/);
  assert.match(finish, /grantedLibraryAlreadyHasVault\(assembled\.vaultId\)/, 'receiver must refuse a transfer when the same vault is already locally granted');
  const load = extractFunction(warmSource, 'loadReceivedTransfer');
  assert.match(load, /source: 'qr-transfer'/);
  assert.match(load, /sendVaultOpen\(/, 'receiver must feed encrypted bytes through the ordinary locked-vault open path');
  assert.doesNotMatch(load, /unlock|passphrase|credential/i, 'transfer must never carry unlock authority');

  const capabilityProbe = extractFunction(warmSource, 'probeLiveTransferReceiverCapability');
  assert.match(capabilityProbe, /mediaDevices[\s\S]*getUserMedia/);
  assert.match(capabilityProbe, /BarcodeDetector/);
  assert.match(capabilityProbe, /getSupportedFormats/);
  assert.match(capabilityProbe, /new window\.BarcodeDetector/);
  assert.match(capabilityProbe, /setLiveQrReceiverState\('unavailable'\)/);
  const controls = extractFunction(warmSource, 'updateVaultControls');
  assert.match(controls, /liveQrReceiverState !== 'available'/, 'receive must stay disabled unless camera QR decoding is actually available');
  assert.match(warmSource, /Use the canonical \.cbx file instead/);
});

test('P0.19 live transfer clears when the vault locks or panic hide runs', () => {
  const status = extractFunction(warmSource, 'handleVaultStatus');
  assert.match(status, /clearLiveTransferSender\('Live transfer stopped because the vault locked\.'\)/);
  const panic = extractFunction(warmSource, 'panicHide');
  assert.match(panic, /clearLiveTransferSender/);
  assert.match(panic, /stopLiveTransferReceiver/);
});

test('P0.19 browser harness reloads downloaded canonical bytes under the real .cbx filename', () => {
  const harness = fs.readFileSync(path.join(projectRoot, 'scripts', 'run-browser-harness.js'), 'utf8');
  assert.match(harness, /name:\s*canonicalFilename[\s\S]*buffer:\s*fs\.readFileSync\(downloadedVaultPath\)/);
  assert.doesNotMatch(harness, /setInputFiles\(downloadedVaultPath\)/);
});


test('P0.19 browser harness observes duplicate-name refusal on the vault status surface', () => {
  const harness = fs.readFileSync(path.join(projectRoot, 'scripts', 'run-browser-harness.js'), 'utf8');
  const libraryFlow = extractFunction(harness, 'verifyVaultLibrary');
  assert.match(libraryFlow, /duplicateNameNotice\s*=\s*page\.locator\('#vault-status-copy'\)/);
  assert.match(libraryFlow, /duplicateNameNotice\.filter\(\{ hasText: \/different vault already uses that public name\/i \}\)/);
  assert.doesNotMatch(libraryFlow, /#vault-dirty-notice.*different vault already uses that public name/i);
});

test('P2.5 recovery shares stay cold-only and the offline mode refreshes their controls', () => {
  assert.match(coldHtml, /id="cold-vault-recovery"/);
  assert.match(coldHtml, /id="cold-vault-recovery-passphrase"/);
  assert.match(coldHtml, /additional offline unlock route/);
  assert.match(coldHtml, /does not add a share passphrase/);
  assert.match(vaultSource, /METHOD_RECOVERY_SHARES/);
  assert.match(vaultSource, /function compartmentAad\(/);
  assert.match(vaultSource, /recoveryHeaderMarker/);
  assert.match(vaultSource, /operationInFlight/);
  assert.match(vaultSource, /suppliedGroupIndexes\.length !== metadata\.groupThreshold/);
  assert.doesNotMatch(vaultSource, /state\.dek\s*=|state\.wrappingKey\s*=/);

  const configure = extractFunction(coldSource, 'configureVaultRecoveryShares');
  assert.match(configure, /normalPassphrase/);
  assert.match(configure, /operationSession/);
  assert.match(configure, /operationGeneration/);
  assert.match(configure, /operationGeneration !== vaultSessionGeneration/);
  assert.match(configure, /postVaultMessage\([^;]*'vault\.dirty', \{ dirty: true \}\)/);
  assert.doesNotMatch(configure, /postVaultMessage\([^;]*shares/);

  const recoveryBrowserFlow = extractFunction(
    fs.readFileSync(path.join(projectRoot, 'scripts', 'run-browser-harness.js'), 'utf8'),
    'verifyVaultRecoveryShares'
  );
  assert.match(recoveryBrowserFlow, /__coldboxRecoveryConfigurationGate\.arm\(\)/);
  assert.match(recoveryBrowserFlow, /__coldboxRecoveryConfigurationGate\.held\(\)/);
  assert.match(recoveryBrowserFlow, /__coldboxRecoveryConfigurationGate\.release\(\)/);
  assert.match(recoveryBrowserFlow, /stale recovery completion must not repaint/);

  const recoveryUnlock = extractFunction(coldSource, 'unlockLoadedVaultWithRecoveryShares');
  assert.match(recoveryUnlock, /openSession\(bytes, undefined, 'offline', null, shares\)/);
  assert.doesNotMatch(recoveryUnlock, /keyfileBytes/);

  assert.match(
    coldSource,
    /message\.type === 'mode\.set'[\s\S]*updateVaultControls\(\)/,
    'mode changes must refresh the recovery controls for a pending vault'
  );
  assert.match(warmSource, /message\.type === 'vault\.dirty'[\s\S]*setVaultPersistenceState\('unsaved'\)/);
  assert.doesNotMatch(warmSource, /vaultRecoveryShareText|recoveryShares/);

  const harness = fs.readFileSync(path.join(projectRoot, 'scripts', 'run-browser-harness.js'), 'utf8');
  const recoveryFlow = extractFunction(harness, 'verifyVaultRecoveryShares');
  assert.match(recoveryFlow, /#cold-vault-recovery-passphrase/);
  assert.match(recoveryFlow, /#cold-vault-recovery-replace/);
  assert.match(recoveryFlow, /slice\(0, 2\)/);
  assert.match(recoveryFlow, /Saved\.\*unverified/);
});

test('P2.6 BackupRecords keep verification metadata public while reconstruction stays cold-only', () => {
  const harness = fs.readFileSync(path.join(projectRoot, 'scripts', 'run-browser-harness.js'), 'utf8');
  assert.match(warmHtml, /id="backup-form"/);
  assert.match(warmHtml, /Share material never enters this form or the warm shell/);
  assert.match(warmHtml, /id="backup-list"/);
  assert.doesNotMatch(warmHtml, /cold-backup-verification-input/);
  assert.match(coldHtml, /id="cold-backup-verification"/);
  assert.match(coldHtml, /the warm shell receives only a success or failure code/);

  assert.match(warmSource, /sendVaultMessage\('backup\.verifyRequest'/);
  assert.match(warmSource, /registryStore\.recordColdBackupVerification/);
  assert.doesNotMatch(warmSource, /backupVerification(?:Input|Passphrase|Language)/);
  const warmResult = extractFunction(warmSource, 'handleBackupVerificationResult');
  assert.match(warmResult, /setVaultPersistenceState\('unsaved'\)/, 'a successful cold verification must require a durable save');

  const request = extractFunction(coldSource, 'handleBackupVerificationRequest');
  assert.match(request, /findPublicRecord\(publicData\.backups/);
  assert.match(request, /method: record\.method/);
  assert.match(request, /threshold: record\.threshold/);
  assert.doesNotMatch(request, /shareMaterial|mnemonic|privateKey|secret/i);

  const run = extractFunction(coldSource, 'runBackupVerification');
  assert.match(run, /slip39\.recover/);
  assert.match(run, /codex32\.recover/);
  assert.match(run, /seedXor\.combine/);
  assert.match(run, /shamir\.shamir39\.combine/);
  assert.match(run, /shamir\.raw\.combine/);
  assert.match(run, /currentVaultSession\.markBackupVerified/);
  assert.match(run, /sendBackupVerificationResult\('verified'/);
  assert.doesNotMatch(run, /postVaultMessage\([^;]*(?:lines|recoveredBytes|mnemonic|secret)/i);

  assert.match(vaultSource, /function markBackupVerified\(backupId, method, candidateBytes, verifiedAt\)/);
  assert.match(vaultSource, /backupCandidateMatchesSubject\(backup, method, candidateBytes\)/);
  assert.match(vaultSource, /sameBackupIdentity/);
  assert.match(vaultSource, /lastVerifiedAt/);

  const browserFlow = extractFunction(harness, 'verifyBackupRecordVerification');
  assert.match(browserFlow, /#backup-list \[data-registry-action="verify"\]/);
  assert.match(browserFlow, /#cold-backup-verification-input/);
  assert.match(browserFlow, /includes\(shares\[0\]\)/);
});
