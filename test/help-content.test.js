'use strict';

// P0.17 - Help framework.
//
// Covers the build-time compiler (scripts/help-content.js) in isolation with
// small fixtures - not the real docs/ tree, so these tests pin down the
// parser/renderer's actual contract rather than accidentally depending on
// today's glossary wording. The real docs/ tree is exercised indirectly by
// running the full build (see the assertions against build/coldbox.html
// below and in test/build.test.js), which is what actually proves the
// integration works end to end.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const buildScript = path.join(projectRoot, 'scripts', 'build.js');
const htmlPath = path.join(projectRoot, 'build', 'coldbox.html');

const {
  parseDepthNodes,
  resolveGroupDepth,
  hasAnyGroup,
  renderMarkdownToHtml,
  renderInline,
  compileGlossary,
  compileGuide,
  compileHelpContent
} = require('../scripts/help-content.js');

// ---------------------------------------------------------------------------
// ::: plain/working/technical block parsing
// ---------------------------------------------------------------------------

test('a document with no ::: blocks parses as a single shared node', () => {
  const { nodes, warnings } = parseDepthNodes('Just a sentence.\n\nAnother one.', 'fixture');
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].type, 'shared');
  assert.equal(hasAnyGroup(nodes), false);
  assert.deepEqual(warnings, []);
});

test('a complete ::: plain/working/technical group parses with no warnings', () => {
  const markdown = [
    '::: plain',
    'Simple.',
    ':::',
    '::: working',
    'Correct terms.',
    ':::',
    '::: technical',
    'Full precision.',
    ':::'
  ].join('\n');
  const { nodes, warnings } = parseDepthNodes(markdown, 'fixture');
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].type, 'group');
  assert.equal(nodes[0].depths.plain, 'Simple.');
  assert.equal(nodes[0].depths.working, 'Correct terms.');
  assert.equal(nodes[0].depths.technical, 'Full precision.');
  assert.deepEqual(warnings, []);
});

test('shared content before and after a group is preserved and ordered', () => {
  const markdown = [
    '# Heading',
    '',
    '::: plain',
    'Body.',
    ':::',
    '',
    'Trailing paragraph.'
  ].join('\n');
  const { nodes } = parseDepthNodes(markdown, 'fixture');
  assert.equal(nodes.length, 3);
  assert.equal(nodes[0].type, 'shared');
  assert.match(nodes[0].markdown, /# Heading/);
  assert.equal(nodes[1].type, 'group');
  assert.equal(nodes[2].type, 'shared');
  assert.match(nodes[2].markdown, /Trailing paragraph/);
});

test('a group missing one depth produces a warning naming exactly the missing depth', () => {
  const markdown = ['::: plain', 'Simple.', ':::'].join('\n');
  const { nodes, warnings } = parseDepthNodes(markdown, 'fixture.md');
  assert.equal(nodes[0].present.size, 1);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /fixture\.md/);
  assert.match(warnings[0], /working, technical/);
});

test('an unterminated ::: block throws rather than silently truncating content', () => {
  const markdown = ['::: plain', 'Never closed'].join('\n');
  assert.throws(() => parseDepthNodes(markdown, 'fixture.md'), /unterminated/i);
});

test('a duplicate depth within the same group throws', () => {
  const markdown = ['::: plain', 'One.', ':::', '::: plain', 'Two.', ':::'].join('\n');
  assert.throws(() => parseDepthNodes(markdown, 'fixture.md'), /duplicate/i);
});

test('resolveGroupDepth falls back toward plain, never toward silently empty text', () => {
  const group = { depths: { plain: 'P', working: null, technical: null } };
  assert.equal(resolveGroupDepth(group, 'plain'), 'P');
  assert.equal(resolveGroupDepth(group, 'working'), 'P');
  assert.equal(resolveGroupDepth(group, 'technical'), 'P');
});

test('resolveGroupDepth prefers the exact depth when present', () => {
  const group = { depths: { plain: 'P', working: 'W', technical: 'T' } };
  assert.equal(resolveGroupDepth(group, 'plain'), 'P');
  assert.equal(resolveGroupDepth(group, 'working'), 'W');
  assert.equal(resolveGroupDepth(group, 'technical'), 'T');
});

// ---------------------------------------------------------------------------
// Markdown -> HTML rendering
// ---------------------------------------------------------------------------

test('renderMarkdownToHtml escapes HTML-significant characters rather than interpreting them', () => {
  const html = renderMarkdownToHtml('An <script>alert(1)</script> & "quoted".');
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&amp;/);
});

test('renderMarkdownToHtml renders headings, lists, tables, and code blocks', () => {
  const markdown = [
    '## A heading',
    '',
    '- one',
    '- two',
    '',
    '| A | B |',
    '|---|---|',
    '| 1 | 2 |',
    '',
    '```',
    'const x = 1;',
    '```'
  ].join('\n');
  const html = renderMarkdownToHtml(markdown);
  assert.match(html, /<h4>A heading<\/h4>/);
  assert.match(html, /<ul><li>one<\/li><li>two<\/li><\/ul>/);
  assert.match(html, /<table>/);
  assert.match(html, /<th>A<\/th><th>B<\/th>/);
  assert.match(html, /<td>1<\/td><td>2<\/td>/);
  assert.match(html, /<pre><code>const x = 1;<\/code><\/pre>/);
});

test('renderInline handles bold, italic, code spans, and strips link targets to plain emphasis', () => {
  assert.equal(renderInline('**bold**'), '<strong>bold</strong>');
  assert.equal(renderInline('*italic*'), '<em>italic</em>');
  assert.equal(renderInline('`code`'), '<code>code</code>');
  assert.equal(renderInline('[a guide](../guides/x.md)'), '<em>a guide</em>');
});

// ---------------------------------------------------------------------------
// Glossary compilation
// ---------------------------------------------------------------------------

function withTempFile(contents, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coldbox-help-'));
  const file = path.join(dir, 'glossary.md');
  fs.writeFileSync(file, contents, 'utf8');
  try {
    return fn(file);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('compileGlossary parses categories, terms, aliases, and produces stable ids', () => {
  const source = [
    '# Glossary',
    '',
    '## Seeds and keys',
    '',
    '**Seed phrase** (also *recovery phrase*, *mnemonic*)',
    '::: plain',
    'Plain text.',
    ':::',
    '::: working',
    'Working text.',
    ':::',
    '::: technical',
    'Technical text.',
    ':::',
    '',
    '**Entropy**',
    'Plain single-depth text with no blocks.'
  ].join('\n');

  withTempFile(source, (file) => {
    const { categories, warnings } = compileGlossary(file);
    assert.equal(categories.length, 1);
    assert.equal(categories[0].title, 'Seeds and keys');
    assert.equal(categories[0].terms.length, 2);

    const seedPhrase = categories[0].terms[0];
    assert.equal(seedPhrase.term, 'Seed phrase');
    assert.deepEqual(seedPhrase.aliases, ['recovery phrase', 'mnemonic']);
    assert.equal(seedPhrase.id, 'glossary:seed-phrase');
    assert.match(seedPhrase.byDepth.plain, /Plain text/);
    assert.match(seedPhrase.byDepth.working, /Working text/);
    assert.match(seedPhrase.byDepth.technical, /Technical text/);

    const entropy = categories[0].terms[1];
    assert.equal(entropy.id, 'glossary:entropy');
    // No ::: blocks at all - every depth falls back to the same shared text,
    // and the gap is reported rather than silently accepted.
    assert.equal(entropy.byDepth.plain, entropy.byDepth.technical);
    assert.ok(warnings.some((warning) => /"Entropy"/.test(warning)));
  });
});

test('compileGlossary de-duplicates a repeated term name into distinct ids', () => {
  const source = [
    '## Category',
    '',
    '**Term** ',
    'First.',
    '',
    '**Term** ',
    'Second.'
  ].join('\n');
  withTempFile(source, (file) => {
    const { categories } = compileGlossary(file);
    const ids = categories[0].terms.map((term) => term.id);
    assert.deepEqual(ids, ['glossary:term', 'glossary:term-2']);
  });
});

test('compileGlossary throws if no terms are found, rather than silently shipping an empty glossary', () => {
  withTempFile('# Glossary\n\nNo categories or terms here.\n', (file) => {
    assert.throws(() => compileGlossary(file), /no terms parsed/);
  });
});

// ---------------------------------------------------------------------------
// Guide compilation
// ---------------------------------------------------------------------------

test('compileGuide extracts the title from the first H1 and reports a warning when no depth blocks exist', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coldbox-help-guide-'));
  try {
    const file = path.join(dir, 'example-guide.md');
    fs.writeFileSync(file, '# Example guide\n\nJust a walkthrough, no depth blocks.\n', 'utf8');
    const compiled = compileGuide(file);
    assert.equal(compiled.title, 'Example guide');
    assert.equal(compiled.slug, 'example-guide');
    assert.equal(compiled.id, 'guide:example-guide');
    assert.ok(compiled.warnings.some((warning) => /no ::: plain\/working\/technical blocks/.test(warning)));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// End-to-end: the real docs/ tree compiles, and the compiled output reaches
// the built artifact.
// ---------------------------------------------------------------------------

function runBuild() {
  const result = spawnSync(process.execPath, [buildScript], {
    cwd: projectRoot,
    env: { ...process.env, LC_ALL: 'C', TZ: 'UTC' },
    encoding: 'utf8'
  });
  return result;
}

test('the real docs/00-overview/glossary.md and docs/03-guides compile without throwing', () => {
  const { content, warnings } = compileHelpContent(projectRoot);
  assert.ok(content.glossary.length > 0);
  assert.ok(content.guides.length > 0);
  assert.ok(Array.isArray(content.searchIndex));
  assert.ok(content.searchIndex.length >= content.guides.length);
  // Warnings are allowed (backfill is tracked, not silently hidden) but must
  // be an array of strings, never an exception.
  assert.ok(Array.isArray(warnings));
});

test('a build with the real docs tree embeds HELP_CONTENT into build/coldbox.html and exits 0 even with backfill warnings pending', () => {
  const result = runBuild();
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert.match(html, /var HELP_CONTENT = \{"glossary"/);
  assert.doesNotMatch(html, /__COLDBOX_HELP_CONTENT__/);
});

test('the real docs/ tree now builds with zero help-content warnings (full P0.17 backfill)', () => {
  const result = runBuild();
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.doesNotMatch(
    result.stderr,
    /Help content warning:/,
    'a regression here means a guide or glossary term lost its three-depth content - re-run npm run build and see which one'
  );
});

test('a missing depth block is reported on stderr as a warning, not a build failure (roadmap P0.17 acceptance criterion)', () => {
  // Exercised against a synthetic fixture, not the real docs/ tree, since
  // the real tree is now fully backfilled (see the test above) and would
  // otherwise make this test pass or fail based on unrelated future edits
  // to prose rather than on the mechanism this test actually targets.
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coldbox-help-warn-'));
  try {
    for (const directory of ['scripts', 'src', 'vendor', 'docs']) {
      fs.cpSync(path.join(projectRoot, directory), path.join(root, directory), { recursive: true });
    }
    // P0.20: build.js reads the repository LICENSE file directly; every
    // isolated build root needs a copy or a build expected to succeed fails
    // with ENOENT before reaching this test's actual assertions.
    fs.copyFileSync(path.join(projectRoot, 'LICENSE'), path.join(root, 'LICENSE'));
    fs.writeFileSync(
      path.join(root, 'docs', '03-guides', 'zzz-fixture-no-depth-blocks.md'),
      '# Fixture guide with no depth blocks\n\nPlain prose only, deliberately, for this test.\n',
      'utf8'
    );
    const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'build.js')], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, LC_ALL: 'C', TZ: 'UTC' }
    });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stderr, /Help content warning:.*zzz-fixture-no-depth-blocks\.md.*no ::: plain\/working\/technical blocks/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('the compiled help content in the build round-trips the real dependencies-free structural shape (glossary categories, guide slugs)', () => {
  runBuild();
  const html = fs.readFileSync(htmlPath, 'utf8');
  const match = html.match(/var HELP_CONTENT = (\{[\s\S]*?\});\s*\n/);
  assert.ok(match, 'HELP_CONTENT must be embedded as a single JSON statement');
  const embedded = JSON.parse(match[1]);
  const { content } = compileHelpContent(projectRoot);
  assert.deepEqual(embedded, content);
});

test('an unterminated ::: block in a guide fails the build closed with a non-zero exit, not a silently broken page', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coldbox-help-fail-'));
  try {
    for (const directory of ['scripts', 'src', 'vendor', 'docs']) {
      fs.cpSync(path.join(projectRoot, directory), path.join(root, directory), { recursive: true });
    }
    // P0.20: build.js reads the repository LICENSE file directly; every
    // isolated build root needs a copy or a build expected to succeed fails
    // with ENOENT before reaching this test's actual assertions.
    fs.copyFileSync(path.join(projectRoot, 'LICENSE'), path.join(root, 'LICENSE'));
    const guidePath = path.join(root, 'docs', '03-guides', 'first-wallet.md');
    fs.appendFileSync(guidePath, '\n::: plain\nNever closed.\n', 'utf8');
    const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'build.js')], {
      cwd: root,
      encoding: 'utf8'
    });
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /unterminated/i);
    assert.equal(fs.existsSync(path.join(root, 'build', 'coldbox.html')), false, 'a failed build must not emit a partial artifact');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
