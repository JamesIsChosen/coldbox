'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const checkDocsScript = path.join(projectRoot, 'scripts', 'check-docs.js');

function createRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'coldbox-check-docs-'));
}

// Every fixture root needs check-docs.js's own runtime dependency
// (help-content.js) alongside it, since it's required with a path relative
// to __dirname.
function seedScripts(root) {
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.copyFileSync(checkDocsScript, path.join(root, 'scripts', 'check-docs.js'));
  fs.copyFileSync(
    path.join(projectRoot, 'scripts', 'help-content.js'),
    path.join(root, 'scripts', 'help-content.js')
  );
}

function runCheckDocs(root) {
  return spawnSync(process.execPath, [path.join(root, 'scripts', 'check-docs.js'), '--root', root], {
    cwd: root,
    encoding: 'utf8'
  });
}

function combinedOutput(result) {
  return `${result.stdout}\n${result.stderr}`;
}

test('the real repository has zero doc-hygiene findings', () => {
  const result = spawnSync(process.execPath, [checkDocsScript], { cwd: projectRoot, encoding: 'utf8' });
  assert.equal(result.status, 0, combinedOutput(result));
  assert.match(result.stdout, /Documentation hygiene check passed/);
});

test('a broken internal link fails the check', () => {
  const root = createRoot();
  try {
    seedScripts(root);
    fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'docs', 'README.md'),
      '# Docs\n\n[Broken](does-not-exist.md)\n',
      'utf8'
    );
    const result = runCheckDocs(root);
    assert.notEqual(result.status, 0);
    assert.match(combinedOutput(result), /FAIL \[links\].*broken link "does-not-exist\.md"/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a valid same-file anchor link passes', () => {
  const root = createRoot();
  try {
    seedScripts(root);
    fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'docs', 'README.md'),
      '# Docs\n\n## Section One\n\n[Jump](#section-one)\n',
      'utf8'
    );
    const result = runCheckDocs(root);
    assert.equal(result.status, 0, combinedOutput(result));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a link inside an inline code span is not resolved as navigation', () => {
  const root = createRoot();
  try {
    seedScripts(root);
    fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'docs', 'README.md'),
      '# Docs\n\nQuoted verbatim: `[x](../nowhere/at/all.md)`\n',
      'utf8'
    );
    const result = runCheckDocs(root);
    assert.equal(result.status, 0, combinedOutput(result));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a link inside a blockquote is not resolved as navigation', () => {
  const root = createRoot();
  try {
    seedScripts(root);
    fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'docs', 'README.md'),
      '# Docs\n\n> Quoted from elsewhere: [x](../nowhere/at/all.md)\n',
      'utf8'
    );
    const result = runCheckDocs(root);
    assert.equal(result.status, 0, combinedOutput(result));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function seedDatedDoc(root, relativePath, body) {
  const absolute = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, body, 'utf8');
}

test('a missing review date on a dated doc fails the check', () => {
  const root = createRoot();
  try {
    seedScripts(root);
    seedDatedDoc(root, 'docs/02-security/crypto-choices.md', '# Crypto choices\n\nNo review-date line here.\n');
    const result = runCheckDocs(root);
    assert.notEqual(result.status, 0);
    assert.match(
      combinedOutput(result),
      /FAIL \[review-date\] docs\/02-security\/crypto-choices\.md: missing "\*Last reviewed: YYYY-MM-DD\*"/
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a review date within its max age is silent', () => {
  const root = createRoot();
  try {
    seedScripts(root);
    const recent = new Date();
    recent.setUTCMonth(recent.getUTCMonth() - 1);
    const dateString = recent.toISOString().slice(0, 10);
    seedDatedDoc(
      root,
      'docs/02-security/crypto-choices.md',
      `# Crypto choices\n\n*Last reviewed: ${dateString} · Max age: 12 months*\n`
    );
    const result = runCheckDocs(root);
    assert.equal(result.status, 0, combinedOutput(result));
    assert.doesNotMatch(combinedOutput(result), /review-date/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a review date past its max age warns but does not fail the check', () => {
  const root = createRoot();
  try {
    seedScripts(root);
    seedDatedDoc(
      root,
      'docs/02-security/crypto-choices.md',
      '# Crypto choices\n\n*Last reviewed: 2020-01-01 · Max age: 12 months*\n'
    );
    const result = runCheckDocs(root);
    assert.equal(result.status, 0, combinedOutput(result));
    assert.match(combinedOutput(result), /WARN \[review-date\] docs\/02-security\/crypto-choices\.md/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a reference to a nonexistent roadmap item ID fails the check', () => {
  const root = createRoot();
  try {
    seedScripts(root);
    fs.mkdirSync(path.join(root, 'docs', '05-development'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'docs', '05-development', 'ROADMAP.md'),
      '# Roadmap\n\n- [ ] **P0.1 — Foundation**\n',
      'utf8'
    );
    fs.mkdirSync(path.join(root, 'docs', '00-overview'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'docs', '00-overview', 'faq.md'),
      '# FAQ\n\nSee P9.99 for details.\n',
      'utf8'
    );
    const result = runCheckDocs(root);
    assert.notEqual(result.status, 0);
    assert.match(
      combinedOutput(result),
      /FAIL \[roadmap-id\] docs\/00-overview\/faq\.md references unknown roadmap item P9\.99/
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a roadmap item ID that exists is accepted', () => {
  const root = createRoot();
  try {
    seedScripts(root);
    fs.mkdirSync(path.join(root, 'docs', '05-development'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'docs', '05-development', 'ROADMAP.md'),
      '# Roadmap\n\n- [ ] **P0.1 — Foundation**\n',
      'utf8'
    );
    fs.mkdirSync(path.join(root, 'docs', '00-overview'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'docs', '00-overview', 'faq.md'),
      '# FAQ\n\nSee P0.1 for details.\n',
      'utf8'
    );
    const result = runCheckDocs(root);
    assert.equal(result.status, 0, combinedOutput(result));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('dependencies.md not matching vendor-manifest.json fails the check', () => {
  const root = createRoot();
  try {
    seedScripts(root);
    fs.mkdirSync(path.join(root, 'vendor'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'vendor', 'vendor-manifest.json'),
      JSON.stringify({
        manifestVersion: 1,
        artifacts: [{ name: '@noble/hashes', version: '2.2.0', sha256: 'a'.repeat(64) }]
      }),
      'utf8'
    );
    fs.mkdirSync(path.join(root, 'docs', '05-development'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'docs', '05-development', 'dependencies.md'),
      '# Dependencies\n\n| `@noble/hashes` | 2.2.0 | different hash entirely |\n',
      'utf8'
    );
    const result = runCheckDocs(root);
    assert.notEqual(result.status, 0);
    assert.match(combinedOutput(result), /FAIL \[dependencies\] dependencies\.md has no row matching/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('dependencies.md matching vendor-manifest.json passes', () => {
  const root = createRoot();
  try {
    seedScripts(root);
    fs.mkdirSync(path.join(root, 'vendor'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'vendor', 'vendor-manifest.json'),
      JSON.stringify({
        manifestVersion: 1,
        artifacts: [{ name: '@noble/hashes', version: '2.2.0', sha256: 'a'.repeat(64) }]
      }),
      'utf8'
    );
    fs.mkdirSync(path.join(root, 'docs', '05-development'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'docs', '05-development', 'dependencies.md'),
      `# Dependencies\n\n| \`@noble/hashes\` | 2.2.0 | ${'a'.repeat(64)} |\n`,
      'utf8'
    );
    const result = runCheckDocs(root);
    assert.equal(result.status, 0, combinedOutput(result));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a TODO in a guide warns but does not fail the check', () => {
  const root = createRoot();
  try {
    seedScripts(root);
    fs.mkdirSync(path.join(root, 'docs', '03-guides'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'docs', 'README.md'),
      '# Docs\n\n[Guides](03-guides/README.md)\n',
      'utf8'
    );
    fs.writeFileSync(
      path.join(root, 'docs', '03-guides', 'README.md'),
      '# Guides\n\n[A guide](a-guide.md)\n',
      'utf8'
    );
    fs.writeFileSync(
      path.join(root, 'docs', '03-guides', 'a-guide.md'),
      '# A guide\n\nTODO: finish this section.\n',
      'utf8'
    );
    const result = runCheckDocs(root);
    assert.equal(result.status, 0, combinedOutput(result));
    assert.match(combinedOutput(result), /WARN \[todo-tbd\] docs\/03-guides\/a-guide\.md:3: contains "TODO"/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a TBD in the glossary warns but does not fail the check', () => {
  const root = createRoot();
  try {
    seedScripts(root);
    fs.mkdirSync(path.join(root, 'docs', '00-overview'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'docs', '00-overview', 'glossary.md'),
      '# Glossary\n\n**Term**\n\nDefinition TBD.\n',
      'utf8'
    );
    const result = runCheckDocs(root);
    assert.equal(result.status, 0, combinedOutput(result));
    assert.match(combinedOutput(result), /WARN \[todo-tbd\] docs\/00-overview\/glossary\.md:5: contains "TBD"/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('TBD outside the user-facing doc scope is not flagged', () => {
  const root = createRoot();
  try {
    seedScripts(root);
    fs.mkdirSync(path.join(root, 'docs', '05-development'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'docs', '05-development', 'dependencies.md'),
      '# Dependencies\n\n| jsQR | TBD | Camera decoding | TBD |\n',
      'utf8'
    );
    const result = runCheckDocs(root);
    assert.equal(result.status, 0, combinedOutput(result));
    assert.doesNotMatch(combinedOutput(result), /todo-tbd/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a glossary term missing all three depth blocks fails the check', () => {
  const root = createRoot();
  try {
    seedScripts(root);
    fs.mkdirSync(path.join(root, 'docs', '00-overview'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'docs', '00-overview', 'glossary.md'),
      '# Glossary\n\n## Category\n\n**Term**\nNo depth blocks at all.\n',
      'utf8'
    );
    fs.mkdirSync(path.join(root, 'docs', '03-guides'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'docs', '03-guides', 'a-guide.md'),
      '# A guide\n\n::: plain\nplain text\n:::\n\n::: working\nworking text\n:::\n\n::: technical\ntechnical text\n:::\n',
      'utf8'
    );
    const result = runCheckDocs(root);
    assert.notEqual(result.status, 0);
    assert.match(combinedOutput(result), /FAIL \[help-depth\].*Term.*has no ::: plain\/working\/technical blocks/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
