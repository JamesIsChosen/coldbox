'use strict';

// Emits @font-face rules whose src is a base64 data: URI, so the display
// typefaces travel inside build/coldbox.html and nothing is fetched at build or
// run time. The bytes come from the same pinned, hash-verified vendor tarballs
// the crypto layer uses; see docs/05-development/dependencies.md.
//
// Output must be byte-stable: the face list below is explicit and ordered, and
// base64 encoding of fixed input bytes is deterministic.

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

// Latin subsets only. The extended subsets would roughly double the cost for
// glyphs this interface does not render.
const FONT_FACES = Object.freeze([
  Object.freeze({
    family: 'Coldbox Display',
    packageName: '@fontsource/bangers',
    file: 'files/bangers-latin-400-normal.woff2',
    weight: '400',
    style: 'normal'
  }),
  Object.freeze({
    family: 'Coldbox Text',
    packageName: '@fontsource/comic-neue',
    file: 'files/comic-neue-latin-400-normal.woff2',
    weight: '400',
    style: 'normal'
  }),
  Object.freeze({
    family: 'Coldbox Text',
    packageName: '@fontsource/comic-neue',
    file: 'files/comic-neue-latin-700-normal.woff2',
    weight: '700',
    style: 'normal'
  })
]);

// U+0000-00FF plus the punctuation and symbols the shell actually uses. Keeping
// this explicit means a font swap cannot silently widen the glyph surface.
const UNICODE_RANGE = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, '
  + 'U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, '
  + 'U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';

const WOFF2_SIGNATURE = 0x774f4632; // 'wOF2'
const maximumFontSize = 512 * 1024;

const tarCache = new Map();

function readManifest(projectRoot) {
  const manifestPath = path.join(projectRoot, 'vendor', 'vendor-manifest.json');
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function readTarEntries(tarball) {
  const bytes = zlib.gunzipSync(tarball);
  const entries = new Map();
  let offset = 0;
  while (offset + 512 <= bytes.length) {
    const header = bytes.subarray(offset, offset + 512);
    if (header.every((value) => value === 0)) {
      break;
    }
    const name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/, '');
    const prefix = header.subarray(345, 500).toString('utf8').replace(/\0.*$/, '');
    const entryName = prefix ? `${prefix}/${name}` : name;
    const sizeText = header.subarray(124, 136).toString('ascii').replace(/\0.*$/, '').trim();
    const size = sizeText ? parseInt(sizeText, 8) : 0;
    const type = String.fromCharCode(header[156] || 0);
    const dataStart = offset + 512;
    if (type === '\0' || type === '0') {
      entries.set(entryName, bytes.subarray(dataStart, dataStart + size));
    }
    offset = dataStart + Math.ceil(size / 512) * 512;
  }
  return entries;
}

function readVendorFile(projectRoot, packageName, file) {
  const manifest = readManifest(projectRoot);
  const artifact = manifest.artifacts.find((entry) => entry.name === packageName);
  if (!artifact) {
    throw new Error(`No vendored artifact is declared for ${packageName}`);
  }
  const tarballPath = path.join(projectRoot, artifact.path);
  if (!tarCache.has(tarballPath)) {
    tarCache.set(tarballPath, readTarEntries(fs.readFileSync(tarballPath)));
  }
  const entry = tarCache.get(tarballPath).get(`package/${file}`);
  if (!entry) {
    throw new Error(`Vendored font file is missing: ${packageName}/${file}`);
  }
  return entry;
}

// Fail closed on anything that is not a plausible WOFF2 payload rather than
// base64-ing whatever happened to be at that path.
function assertWoff2(bytes, label) {
  if (bytes.length < 48) {
    throw new Error(`Vendored font is implausibly small: ${label}`);
  }
  if (bytes.length > maximumFontSize) {
    throw new Error(`Vendored font exceeds the size ceiling: ${label}`);
  }
  if (bytes.readUInt32BE(0) !== WOFF2_SIGNATURE) {
    throw new Error(`Vendored font is not a WOFF2 file: ${label}`);
  }
}

function createFontFaceSource(projectRoot) {
  const blocks = FONT_FACES.map((face) => {
    const label = `${face.packageName}/${face.file}`;
    const bytes = readVendorFile(projectRoot, face.packageName, face.file);
    assertWoff2(bytes, label);
    const encoded = bytes.toString('base64');
    return [
      `/* ${label} - SIL Open Font License 1.1 */`,
      '@font-face {',
      `  font-family: '${face.family}';`,
      `  font-style: ${face.style};`,
      `  font-weight: ${face.weight};`,
      '  font-display: block;',
      `  src: url(data:font/woff2;base64,${encoded}) format('woff2');`,
      `  unicode-range: ${UNICODE_RANGE};`,
      '}'
    ].join('\n');
  });

  return `${blocks.join('\n\n')}\n`;
}

module.exports = Object.freeze({
  createFontFaceSource,
  FONT_FACES
});
