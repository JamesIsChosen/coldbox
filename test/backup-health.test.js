const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const NOW = '2026-08-14T00:00:00.000Z';

function loadHealth() {
  const window = {};
  const context = vm.createContext({ window });
  vm.runInContext(
    fs.readFileSync(path.join(projectRoot, 'src', 'backup-health.js'), 'utf8'),
    context,
    { filename: 'src/backup-health.js' }
  );
  return context.window.__coldboxBackupHealth;
}

function record(overrides = {}) {
  return {
    id: 'backup-' + (overrides.idSuffix || '1'),
    subjectId: overrides.subjectId || 'subject-1',
    method: overrides.method || 'slip39',
    shareLabel: overrides.shareLabel || 'backup share set',
    threshold: 2,
    createdAt: overrides.createdAt || '2026-01-01T00:00:00.000Z',
    verifyEveryDays: overrides.verifyEveryDays === undefined ? 365 : overrides.verifyEveryDays,
    location: overrides.location,
    custodian: overrides.custodian,
    lastVerifiedAt: overrides.lastVerifiedAt
  };
}

test('Backup Health evaluates current, overdue, and incomplete verification without rounding dates', () => {
  const health = loadHealth();
  const current = health.evaluate(record({ lastVerifiedAt: NOW, location: 'Bank safe' }), NOW);
  assert.equal(current.state, 'current');
  assert.equal(current.lastVerifiedDate, '2026-08-14');
  assert.equal(current.dueDate, '2027-08-14');
  assert.match(health.verificationLabel(current), /due 2027-08-14/);

  const overdue = health.evaluate(record({ lastVerifiedAt: '2025-08-13T00:00:00.000Z' }), NOW);
  assert.equal(overdue.state, 'overdue');
  assert.match(health.verificationLabel(overdue), /overdue since 2026-08-13/);

  const dueBoundary = health.evaluate(record({ lastVerifiedAt: '2025-08-14T00:00:00.000Z' }), NOW);
  assert.equal(dueBoundary.state, 'overdue');
  assert.equal(dueBoundary.dueDate, '2026-08-14');

  const future = health.evaluate(record({ lastVerifiedAt: '2026-08-14T00:00:00.001Z' }), NOW);
  assert.equal(future.state, 'invalid');
  assert.ok(future.issues.includes('future-last-verified-at'));
  assert.match(health.verificationLabel(future), /metadata is not valid/);

  const incomplete = health.evaluate(record({ location: 'Home safe' }), NOW);
  assert.equal(incomplete.state, 'unverified');
  assert.equal(incomplete.dueAt, null);
  assert.match(health.verificationLabel(incomplete), /backup is incomplete/);
});

test('Backup Health fails closed on malformed schedule, dates, and unsupported methods', () => {
  const health = loadHealth();
  const malformed = health.evaluate(record({ verifyEveryDays: 0, lastVerifiedAt: 'not-a-date' }), NOW);
  assert.equal(malformed.state, 'invalid');
  assert.deepEqual(
    [...malformed.issues].sort(),
    ['invalid-last-verified-at', 'invalid-verify-interval']
  );

  const unsupported = health.evaluate(record({ method: 'metal' }), NOW);
  assert.equal(unsupported.state, 'unverified');
  assert.equal(unsupported.verificationSupported, false);
  assert.match(health.verificationLabel(unsupported), /no in-app reconstruction workflow/);

  const unsupportedWithDate = health.evaluate(record({ method: 'metal', lastVerifiedAt: NOW }), NOW);
  assert.equal(unsupportedWithDate.state, 'unverified');
  assert.match(health.verificationLabel(unsupportedWithDate), /no in-app reconstruction workflow/);

  const missing = health.evaluate({ id: 'bad' }, NOW);
  assert.equal(missing.state, 'invalid');
  assert.ok(missing.issues.includes('missing-subject'));
  assert.ok(missing.issues.includes('invalid-created-at'));

  const missingSubject = Object.assign(record({ lastVerifiedAt: NOW }), { subjectId: '' });
  assert.equal(health.evaluate(missingSubject, NOW).state, 'invalid');

  const invalidThreshold = Object.assign(record({ lastVerifiedAt: NOW }), { threshold: 0 });
  assert.equal(health.evaluate(invalidThreshold, NOW).state, 'invalid');

  const maximumTimestamp = new Date(8640000000000000).toISOString();
  let overflow;
  assert.doesNotThrow(() => {
    overflow = health.evaluate(record({ lastVerifiedAt: maximumTimestamp, verifyEveryDays: 1 }), maximumTimestamp);
  });
  assert.equal(overflow.state, 'invalid');
  assert.ok(overflow.issues.includes('invalid-due-at'));
  assert.equal(overflow.dueAt, null);
});

test('Backup Health reports co-location and conservative placement status per subject', () => {
  const health = loadHealth();
  const summary = health.summarize([
    record({ idSuffix: 'home-1', location: 'Home safe' }),
    record({ idSuffix: 'home-2', location: '  home   safe ', custodian: 'Alex' }),
    record({ idSuffix: 'bank-1', location: 'Bank safe', custodian: 'Bank' })
  ], NOW);

  assert.equal(summary.totalCount, 3);
  assert.equal(summary.unverifiedCount, 3);
  assert.equal(summary.placementStatus, 'distributed-unproven');
  assert.equal(summary.subjects.length, 1);
  assert.equal(summary.subjects[0].locationCount, 2);
  assert.equal(summary.subjects[0].coLocated, true);
  assert.ok(summary.alerts.some((item) => item.code === 'co-located-placement'));
  assert.ok(summary.alerts.some((item) => item.code === 'placement-unproven'));
  assert.equal(summary.actionCount, 3);
});

test('Backup Health distinguishes missing placement metadata and never claims threshold reachability', () => {
  const health = loadHealth();
  const summary = health.summarize([
    record({ idSuffix: 'unknown', location: '', custodian: '' }),
    record({ idSuffix: 'known', location: 'Home safe', lastVerifiedAt: NOW })
  ], NOW);

  assert.equal(summary.placementStatus, 'unknown');
  assert.ok(summary.alerts.some((item) => item.code === 'missing-placement'));
  assert.ok(summary.alerts.some((item) => item.code === 'placement-unproven'));
  assert.equal(summary.subjects[0].placementStatus, 'unknown');
  assert.equal(Object.prototype.hasOwnProperty.call(summary, 'survivabilityScore'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(summary, 'thresholdReachable'), false);
});

test('Backup Health is a warm, public-metadata-only module', () => {
  const source = fs.readFileSync(path.join(projectRoot, 'src', 'backup-health.js'), 'utf8');
  assert.doesNotMatch(source, /\b(document|fetch|XMLHttpRequest|WebSocket|EventSource|crypto|postMessage)\b/);
  assert.doesNotMatch(source, /shareMaterial|storedSecret|mnemonic|passphrase|privateKey/);
});
