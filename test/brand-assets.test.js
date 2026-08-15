'use strict';

// UI.2 - Brand assets: wordmark and favicons.
//
// The reason this suite exists at all is the last clause of the roadmap item:
// a new content type is entering the document, and it is checked rather than
// assumed. The CSP would block script execution from an inline SVG regardless,
// but "a later layer would have caught it" is not the same as "the build
// refuses to emit it", and only the second is testable here.
//
// Note for reviewers: scripts/lint.js scans src/ only, and these assets live
// under assets/ (see ADR-0047 for why binary artwork is not committed into the
// tree that lint reads as UTF-8 text). So `npm run lint` passing is NOT the
// evidence that the SVG is safe. The evidence is assertSafeSvg() failing the
// build closed, and the negative tests below that prove each rejection fires.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const zlib = require('node:zlib');

const {
  FAVICONS,
  assertSafeSvg,
  createFaviconLinks,
  createWordmarkMarkup,
  readWordmarkSource
} = require('../scripts/brand-assets.js');

const projectRoot = path.resolve(__dirname, '..');
const htmlPath = path.join(projectRoot, 'build', 'coldbox.html');
const wordmarkSvgPath = path.join(projectRoot, 'assets', 'brand', 'coldbox-wordmark.svg');
const buildScript = path.join(projectRoot, 'scripts', 'build.js');

function builtDocument() {
  if (!fs.existsSync(htmlPath)) {
    const result = spawnSync(process.execPath, [buildScript], { cwd: projectRoot, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
  return fs.readFileSync(htmlPath, 'utf8');
}

function createBuildRoot(label) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `coldbox-${label}-`));
  for (const directory of ['assets', 'scripts', 'src', 'vendor', 'docs']) {
    fs.cpSync(path.join(projectRoot, directory), path.join(root, directory), { recursive: true });
  }
  fs.copyFileSync(path.join(projectRoot, 'LICENSE'), path.join(root, 'LICENSE'));
  return root;
}

function runBuildIn(root) {
  return spawnSync(process.execPath, [path.join(root, 'scripts', 'build.js')], {
    cwd: root,
    encoding: 'utf8'
  });
}

function iconLinks(html) {
  return [...html.matchAll(/<link rel="icon"[^>]*>/g)].map((match) => match[0]);
}

function pngDimensions(bytes) {
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

// -- the committed asset -----------------------------------------------------

test('UI.2 the committed wordmark is a two-path SVG carrying the fill tokens and no literal colour', () => {
  const source = fs.readFileSync(wordmarkSvgPath, 'utf8');

  assert.equal(source.includes('\r'), false, 'source assets are LF-only');
  assert.match(source, /^<svg\b/, 'the asset is an <svg> document');
  assert.equal((source.match(/<path\b/g) || []).length, 2, 'exactly two paths: ink and cyan');
  assert.match(source, /<path class="wordmark-ink" fill="var\(--fill-ink\)"/);
  assert.match(source, /<path class="wordmark-cyan" fill="var\(--fill-cyan\)"/);
  assert.equal(/#[0-9a-f]{3,8}\b/i.test(source), false, 'no literal hex colour; design-system §3');
  assert.match(source, /viewBox="0 0 1494 514"/, 'the source artwork is 1494x514');

  // readWordmarkSource() runs the same validator the build runs, so a change
  // that broke the asset would fail here as well as in the build.
  assert.doesNotThrow(() => readWordmarkSource(projectRoot));
});

test('UI.2 the wordmark contains no script, no foreignObject, no href, and no external reference', () => {
  const source = fs.readFileSync(wordmarkSvgPath, 'utf8');

  for (const forbidden of [/<\s*script\b/i, /<\s*foreignObject\b/i, /<\s*image\b/i, /<\s*use\b/i, /<\s*style\b/i, /<!ENTITY\b/i, /<!DOCTYPE\b/i]) {
    assert.equal(forbidden.test(source), false, `forbidden construct present: ${forbidden}`);
  }
  assert.equal(/\bhref\s*=/i.test(source), false, 'no href');
  assert.equal(/\bxlink:href\s*=/i.test(source), false, 'no xlink:href');
  assert.equal(/\bon[a-z]+\s*=/i.test(source), false, 'no inline event handler');
  assert.equal(/\burl\s*\(/i.test(source), false, 'no url() reference');

  // The single permitted URI-shaped string is the SVG namespace *name*, which
  // is not dereferenced and which keeps the committed file valid as a
  // standalone document. Nothing else may look like a location.
  const uriShaped = source.match(/[a-z][a-z0-9+.-]{1,31}:\/\/[^\s"'<>]*/gi) || [];
  assert.deepEqual(uriShaped, ['http://www.w3.org/2000/svg']);
});

test('UI.2 the SVG validator rejects each forbidden construct rather than passing it through', () => {
  const source = fs.readFileSync(wordmarkSvgPath, 'utf8');
  const mutations = [
    ['script element', source.replace('<title>Coldbox</title>', '<title>Coldbox</title><script>fetch("https://evil.example")</script>')],
    ['foreignObject', source.replace('<title>Coldbox</title>', '<title>Coldbox</title><foreignObject width="1" height="1"></foreignObject>')],
    ['image element', source.replace('<title>Coldbox</title>', '<title>Coldbox</title><image width="1" height="1"/>')],
    ['use element', source.replace('<title>Coldbox</title>', '<title>Coldbox</title><use/>')],
    ['style element', source.replace('<title>Coldbox</title>', '<title>Coldbox</title><style>.wordmark-ink{fill:red}</style>')],
    ['anchor', source.replace('<title>Coldbox</title>', '<title>Coldbox</title><a></a>')],
    ['href', source.replace('<g ', '<g href="https://evil.example" ')],
    ['xlink:href', source.replace('<g ', '<g xlink:href="https://evil.example" ')],
    ['event handler', source.replace('<g ', '<g onload="fetch(1)" ')],
    ['url() reference', source.replace('fill="var(--fill-ink)"', 'fill="url(https://evil.example/g.svg#a)"')],
    ['entity declaration', source.replace('<svg ', '<!ENTITY x SYSTEM "file:///etc/passwd">\n<svg ')],
    ['doctype', `<!DOCTYPE svg SYSTEM "svg.dtd">\n${source}`],
    ['literal hex colour', source.replace('fill="var(--fill-cyan)"', 'fill="#00f0ff"')],
    ['second external reference', source.replace('<title>Coldbox</title>', '<title>Coldbox</title><!-- https://evil.example -->')]
  ];

  for (const [label, mutated] of mutations) {
    assert.throws(
      () => assertSafeSvg(mutated, 'mutated.svg'),
      /forbidden construct|external reference|hex colour|namespace/,
      `validator accepted a mutation it should have refused: ${label}`
    );
  }
});

test('UI.2 a wordmark that grew a script tag fails the build closed with a non-zero exit', () => {
  const root = createBuildRoot('brand-svg-negative');
  try {
    const assetPath = path.join(root, 'assets', 'brand', 'coldbox-wordmark.svg');
    const poisoned = fs.readFileSync(assetPath, 'utf8')
      .replace('<title>Coldbox</title>', '<title>Coldbox</title><script>1</script>');
    fs.writeFileSync(assetPath, poisoned);

    const result = runBuildIn(root);
    assert.notEqual(result.status, 0, 'the build must refuse a wordmark carrying a script element');
    assert.match(result.stderr, /forbidden construct: <script>/);
    assert.equal(
      fs.existsSync(path.join(root, 'build', 'coldbox.html')),
      false,
      'no artifact is written when the wordmark is rejected'
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// -- the favicons ------------------------------------------------------------

test('UI.2 the built document carries data: favicons at 16, 32 and 48 px and nothing else', () => {
  const html = builtDocument();
  const links = iconLinks(html);

  assert.equal(links.length, 3, 'exactly three icon links');
  for (const [index, { size }] of FAVICONS.entries()) {
    assert.match(links[index], new RegExp(`sizes="${size}x${size}"`));
    assert.match(links[index], /type="image\/png"/);
    assert.match(links[index], /href="data:image\/png;base64,[A-Za-z0-9+/=]+"/);
  }

  // No sibling file, and no other icon relationship that could reach for one.
  assert.equal(/<link[^>]*rel="[^"]*icon[^"]*"[^>]*href="(?!data:)/.test(html), false);
  assert.equal(/rel="(apple-touch-icon|shortcut icon|mask-icon|manifest)"/.test(html), false);
});

test('UI.2 each embedded favicon decodes to a PNG of the size it declares', () => {
  const html = builtDocument();
  for (const [index, { size }] of FAVICONS.entries()) {
    const link = iconLinks(html)[index];
    const encoded = /href="data:image\/png;base64,([^"]+)"/.exec(link)[1];
    const bytes = Buffer.from(encoded, 'base64');

    assert.equal(bytes.subarray(1, 4).toString('ascii'), 'PNG', 'decodes to PNG bytes');
    assert.deepEqual(pngDimensions(bytes), { width: size, height: size });
    // The bytes are the committed artwork, unmodified - the build encodes, it
    // does not re-render.
    assert.ok(
      bytes.equals(fs.readFileSync(path.join(projectRoot, 'assets', 'brand', FAVICONS[index].file))),
      'the embedded bytes are the committed source PNG'
    );
    assert.doesNotThrow(() => zlib.inflateSync(idatOf(bytes)), 'the PNG image data inflates');
  }
});

function idatOf(bytes) {
  const chunks = [];
  for (let offset = 8; offset + 8 <= bytes.length; ) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString('ascii');
    if (type === 'IDAT') {
      chunks.push(bytes.subarray(offset + 8, offset + 8 + length));
    }
    if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }
  return Buffer.concat(chunks);
}

test('UI.2 a favicon whose bytes are not the size it claims fails the build closed', () => {
  const root = createBuildRoot('brand-favicon-negative');
  try {
    // Swap the 16px artwork for the 48px artwork. Both are valid PNGs, so only
    // the declared-versus-actual dimension check can catch this.
    fs.copyFileSync(
      path.join(root, 'assets', 'brand', 'favicon-c-lower-48x48.png'),
      path.join(root, 'assets', 'brand', 'favicon-c-lower-16x16.png')
    );

    const result = runBuildIn(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /favicon-c-lower-16x16\.png is 48x48, expected 16x16/i);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('UI.2 a favicon that is not a PNG at all fails the build closed', () => {
  const root = createBuildRoot('brand-favicon-not-png');
  try {
    fs.writeFileSync(path.join(root, 'assets', 'brand', 'favicon-c-lower-32x32.png'), 'GIF89a not a png');
    const result = runBuildIn(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /favicon-c-lower-32x32\.png is not a PNG/i);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// -- the app bar -------------------------------------------------------------

test('UI.2 the app bar holds the inline wordmark with an accessible name of Coldbox', () => {
  const html = builtDocument();
  const bar = /<header class="app-bar">([\s\S]*?)<\/header>/.exec(html);
  assert.ok(bar, 'the app bar is present');

  assert.match(bar[1], /<svg[^>]*class="brand-wordmark"/);
  assert.match(bar[1], /<svg[^>]*role="img"/);
  assert.match(bar[1], /<svg[^>]*aria-label="Coldbox"/);
  assert.match(bar[1], /<title>Coldbox<\/title>/);
  assert.match(bar[1], /<svg[^>]*focusable="false"/, 'not a tab stop in engines that focus SVG');

  // The markup the build inlines is the committed asset, not a re-derivation.
  assert.ok(bar[1].includes(createWordmarkMarkup(projectRoot)));

  // The badge and the copy rules §2 requires are untouched by this item.
  assert.match(bar[1], /<p class="brand-badge">Pre-release · Not audited<\/p>/);
});

test('UI.2 the replaced text wordmark is gone from source and from the artifact', () => {
  const html = builtDocument();
  const styles = fs.readFileSync(path.join(projectRoot, 'src', 'styles.css'), 'utf8');
  const markup = fs.readFileSync(path.join(projectRoot, 'src', 'index.html'), 'utf8');

  assert.equal(markup.includes('brand-name'), false, 'no .brand-name element remains');
  assert.equal(styles.includes('.brand-name'), false, 'no .brand-name rule remains');
  assert.equal(html.includes('brand-name'), false, 'and none of it reached the artifact');
});

test('UI.2 the wordmark is themed through tokens in the stylesheet, with no hex in the rule', () => {
  const styles = fs.readFileSync(path.join(projectRoot, 'src', 'styles.css'), 'utf8');
  const block = /\.brand-wordmark \{[\s\S]*?\.brand-wordmark \.wordmark-cyan \{[^}]*\}/.exec(styles);
  assert.ok(block, 'the wordmark rules are present');

  assert.match(block[0], /\.brand-wordmark \.wordmark-ink \{\s*fill: var\(--fill-ink\);\s*\}/);
  assert.match(block[0], /\.brand-wordmark \.wordmark-cyan \{\s*fill: var\(--fill-cyan\);\s*\}/);
  assert.equal(/#[0-9a-f]{3,8}\b/i.test(block[0]), false, 'design-system §3: no hex in a rule');
});

// -- provenance --------------------------------------------------------------

test('UI.2 assets/ feeds the build date, so brand artwork cannot change under a fixed provenance', () => {
  const build = fs.readFileSync(path.join(projectRoot, 'scripts', 'build.js'), 'utf8');
  const declaration = /const BUILD_DATE_SOURCE_PATHS = Object\.freeze\(\[([^\]]*)\]\)/.exec(build);
  assert.ok(declaration, 'the build-date path list is declared');
  assert.match(declaration[1], /'assets'/);
});

test('UI.2 the favicon links and the wordmark are byte-stable across two reads', () => {
  // Determinism of the whole document is covered by build.test.js's
  // "two builds are byte-identical regardless of caller locale and timezone".
  // This narrows that to the two new injections: neither may depend on
  // filesystem enumeration order, a map iteration, or anything else that could
  // reorder between runs.
  assert.equal(createFaviconLinks(projectRoot), createFaviconLinks(projectRoot));
  assert.equal(createWordmarkMarkup(projectRoot), createWordmarkMarkup(projectRoot));
  assert.match(createFaviconLinks(projectRoot), /sizes="16x16"[\s\S]*sizes="32x32"[\s\S]*sizes="48x48"/);
});
