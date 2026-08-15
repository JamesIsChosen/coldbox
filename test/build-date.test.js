'use strict';

// The embedded provenance build date, and specifically its spelling.
//
// The defect these tests exist for: scripts/build.js used to embed whatever
// string `git log --format=%cI` returned. For a commit made at a +0000 offset,
// git 2.43.0 returns "2026-08-15T04:18:45+00:00" and a newer git returns
// "2026-08-15T04:18:45Z" — the same instant, the same commit object, five
// bytes of difference in build/coldbox.html. The artifact hash therefore
// depended on which git the builder had installed, which is a direct
// violation of the reproducibility contract in AGENTS.md §3.
//
// It stayed hidden because every commit in this repository's history was made
// at a non-zero UTC offset, and both git versions spell those identically. A
// container-based session commits at +0000, which is what exposed it.
//
// The vectors below are not hand-written strings. They are produced by
// creating real commits with real git at each offset and asking git itself
// what it thinks the date is — so "our formatter agrees with git" is checked
// against git rather than against my assumption about git.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const test = require('node:test');

const {
  BUILD_DATE_UNKNOWN,
  formatCommitDate,
  parseCommitDateOutput
} = require('../scripts/build-date.js');

const projectRoot = path.resolve(__dirname, '..');

const GIT_IDENTITY = Object.freeze({
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.invalid',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.invalid'
});

// A scratch repository must not inherit the developer's global git config.
//
// `core.autocrlf=true` is the default on a standard Windows git install, and
// these temporary roots have no .gitattributes of their own — the repository's
// `* text=auto eol=lf` rule is not among the files copied in. Without this,
// `git add` rewrites line endings on the way into the index and prints a
// warning per file, which on Windows buries `npm test` output under several
// hundred lines of noise and makes the fixture's on-disk bytes depend on the
// machine running it.
//
// Pinning it here is the same principle this whole change is about, one level
// down: a test that asserts build determinism should not itself vary with the
// tester's git configuration.
function initScratchRepository(root) {
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['config', 'core.autocrlf', 'false'], { cwd: root });
  execFileSync('git', ['config', 'core.safecrlf', 'false'], { cwd: root });
}

// Creates a throwaway repository with one commit at the requested offset and
// returns what git reports for it: the raw `%ct %ci` line the build reads, and
// git's own `%cI` rendering for comparison.
function commitAt(dateWithOffset) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coldbox-build-date-'));
  try {
    initScratchRepository(root);
    fs.writeFileSync(path.join(root, 'file.txt'), 'x\n');
    execFileSync('git', ['add', '-A'], { cwd: root });
    execFileSync('git', ['commit', '-q', '-m', 'commit'], {
      cwd: root,
      env: { ...process.env, ...GIT_IDENTITY, GIT_AUTHOR_DATE: dateWithOffset, GIT_COMMITTER_DATE: dateWithOffset }
    });
    const read = (format) => execFileSync('git', ['log', '-1', `--format=${format}`], {
      cwd: root,
      encoding: 'utf8'
    }).trim();
    return { machine: read('%ct %ci'), gitStrictIso: read('%cI') };
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('the build date agrees with git for every non-UTC offset, so existing history is byte-neutral', () => {
  // Every commit this repository has ever had is one of these shapes. If the
  // formatter disagreed with git on any of them, this change would rewrite
  // history's embedded dates and invalidate the recorded CI artifact hash.
  for (const stamp of [
    '2026-08-14T11:28:26-07:00',
    '2020-01-01T00:00:00+01:00',
    '2026-03-01T12:00:00+05:30',
    '2026-12-31T23:59:59+14:00',
    '2026-06-15T00:00:00-11:00',
    '2024-02-29T12:34:56-03:30'
  ]) {
    const { machine, gitStrictIso } = commitAt(stamp);
    assert.equal(
      parseCommitDateOutput(machine),
      gitStrictIso,
      `formatter disagreed with git for ${stamp}`
    );
  }
});

test('a UTC commit always embeds +00:00 and never Z, whatever this git version spells it', () => {
  const { machine, gitStrictIso } = commitAt('2026-08-15T04:18:45+00:00');
  const embedded = parseCommitDateOutput(machine);

  assert.equal(embedded, '2026-08-15T04:18:45+00:00');
  assert.equal(embedded.includes('Z'), false, 'the Z spelling must never reach the artifact');

  // The point of the fix, stated as an assertion: git's own answer here is
  // version-dependent and is allowed to be either spelling. Ours is not.
  assert.ok(
    gitStrictIso === '2026-08-15T04:18:45+00:00' || gitStrictIso === '2026-08-15T04:18:45Z',
    `unexpected git rendering: ${gitStrictIso}`
  );
  assert.equal(
    embedded.length,
    25,
    'the canonical form is fixed-length, so the artifact size cannot move with it'
  );
});

test('the formatter is independent of the caller locale and timezone', () => {
  // toISOString() is specified as UTC-only, but this is the property the whole
  // determinism claim rests on, so it is asserted rather than assumed.
  const original = { TZ: process.env.TZ, LC_ALL: process.env.LC_ALL };
  const results = [];
  try {
    for (const zone of ['UTC', 'Asia/Tokyo', 'Pacific/Honolulu', 'Europe/Berlin']) {
      process.env.TZ = zone;
      process.env.LC_ALL = zone === 'Europe/Berlin' ? 'de_DE.UTF-8' : 'C';
      results.push(formatCommitDate('1786767525', '+', '00', '00'));
    }
  } finally {
    process.env.TZ = original.TZ;
    process.env.LC_ALL = original.LC_ALL;
    if (original.TZ === undefined) {
      delete process.env.TZ;
    }
    if (original.LC_ALL === undefined) {
      delete process.env.LC_ALL;
    }
  }
  assert.deepEqual(new Set(results), new Set(['2026-08-15T04:18:45+00:00']));
});

test('unparseable git output degrades to the labeled unknown rather than a guess', () => {
  for (const bad of [
    '',
    '   \n',
    'fatal: not a git repository',
    '1786767525',
    '1786767525 Z',
    '1786767525 2026-08-15 04:18:45',
    '1786767525 2026-08-15 04:18:45 +0000 extra',
    'notanumber 2026-08-15 04:18:45 +0000',
    '1786767525 2026-08-15T04:18:45 +0000',
    undefined,
    null,
    42
  ]) {
    assert.equal(
      parseCommitDateOutput(bad),
      BUILD_DATE_UNKNOWN,
      `accepted malformed git output: ${JSON.stringify(bad)}`
    );
  }
});

test('semantically malformed or contradictory git timestamps degrade to the labeled unknown', () => {
  const valid = '1786767525 2026-08-15 04:18:45 +0000';
  assert.equal(parseCommitDateOutput(valid), '2026-08-15T04:18:45+00:00');

  for (const bad of [
    '1786767525 2026-99-99 99:99:99 +0000',
    '1786767525 2026-02-31 04:18:45 +0000',
    '1786767525 2026-08-15 24:00:00 +0000',
    '1786767525 2026-08-15 04:18:46 +0000'
  ]) {
    assert.equal(
      parseCommitDateOutput(bad),
      BUILD_DATE_UNKNOWN,
      `accepted semantically malformed or contradictory git output: ${bad}`
    );
  }
});

test('direct formatter inputs fail closed for invalid sign, negative, and noncanonical offsets', () => {
  for (const [label, seconds, sign, hours, minutes] of [
    ['invalid sign', '1786767525', 'x', '00', '00'],
    ['missing sign', '1786767525', '', '00', '00'],
    ['negative hours', '1786767525', '+', '-1', '00'],
    ['negative minutes', '1786767525', '+', '00', '-1'],
    ['one-digit hours', '1786767525', '+', '0', '00'],
    ['one-digit minutes', '1786767525', '+', '00', '0'],
    ['numeric hours', '1786767525', '+', 0, '00'],
    ['numeric minutes', '1786767525', '+', '00', 0],
    ['whitespace in hours', '1786767525', '+', ' 00', '00'],
    ['whitespace in minutes', '1786767525', '+', '00', '00 '],
    ['negative seconds', '-1', '+', '00', '00'],
    ['noncanonical seconds', ' 1786767525', '+', '00', '00']
  ]) {
    assert.equal(
      formatCommitDate(seconds, sign, hours, minutes),
      null,
      `${label} must be rejected by the formatter itself`
    );
  }
});

test('an out-of-range offset or an unrepresentable instant is refused, not rounded', () => {
  assert.equal(formatCommitDate('1786767525', '+', '24', '00'), null, 'hour 24 is not a valid offset');
  assert.equal(formatCommitDate('1786767525', '+', '00', '60'), null, 'minute 60 is not a valid offset');
  assert.equal(formatCommitDate('999999999999999', '+', '00', '00'), null, 'beyond year 9999');
  assert.equal(formatCommitDate('-999999999999999', '+', '00', '00'), null, 'before year 0');
  assert.equal(formatCommitDate('not-a-number', '+', '00', '00'), null);
});

test('a real build of a UTC product commit embeds +00:00, end to end', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coldbox-build-date-e2e-'));
  try {
    for (const directory of ['assets', 'scripts', 'src', 'vendor', 'docs']) {
      fs.cpSync(path.join(projectRoot, directory), path.join(root, directory), { recursive: true });
    }
    fs.copyFileSync(path.join(projectRoot, 'LICENSE'), path.join(root, 'LICENSE'));

    initScratchRepository(root);
    execFileSync('git', ['add', '-A'], { cwd: root });
    execFileSync('git', ['commit', '-q', '-m', 'product commit at UTC'], {
      cwd: root,
      env: {
        ...process.env,
        ...GIT_IDENTITY,
        GIT_AUTHOR_DATE: '2026-08-15T04:18:45+00:00',
        GIT_COMMITTER_DATE: '2026-08-15T04:18:45+00:00'
      }
    });

    const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'build.js')], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, LC_ALL: 'C', TZ: 'UTC' }
    });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);

    const html = fs.readFileSync(path.join(root, 'build', 'coldbox.html'), 'utf8');
    const match = html.match(/var PROVENANCE_BUILD_DATE = "([^"]*)";/);
    assert.ok(match, 'the built document embeds a build date');
    assert.equal(match[1], '2026-08-15T04:18:45+00:00');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
