'use strict';

// UI.2 - Brand assets: the wordmark and the favicons.
//
// Both are embedded, both are offline, both are reproducible. Nothing here
// fetches anything and nothing here is generated at build time: the wordmark
// SVG is a committed source asset (regenerated only by the maintenance script
// scripts/trace-brand-wordmark.js), and the favicons are committed PNGs that
// this module base64-encodes into `data:` URIs.
//
// Why assets/ and not src/. scripts/lint.js reads every file under src/ as
// UTF-8 text and fails the build on a CR byte, which is exactly what it should
// do for source. Committing binary PNGs under src/ would mean weakening that
// check to skip files by extension - trading a real guard on the source tree
// for a directory name. The PNGs are build inputs like vendor/, so they live
// beside vendor/ rather than inside the linted source tree. See ADR-0047.
//
// The lint has a separate binary-safe side scan for textual SVG files under
// assets/brand/. The structural checks below remain the build-time authority:
// they reject unsafe SVG content and fully parse/decode the favicon PNGs, with
// negative tests proving that each guard fails closed.

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const brandRoot = ['assets', 'brand'];
const wordmarkFile = 'coldbox-wordmark.svg';

// Order matters: it is the order the links are emitted in, and the built
// document is byte-compared across builds.
const FAVICONS = Object.freeze([
  Object.freeze({ size: 16, file: 'favicon-c-lower-16x16.png' }),
  Object.freeze({ size: 32, file: 'favicon-c-lower-32x32.png' }),
  Object.freeze({ size: 48, file: 'favicon-c-lower-48x48.png' })
]);

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const MAX_DECODED_PNG_BYTES = 16 * 1024 * 1024;

function createCrc32Table() {
  const table = [];
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) ? ((value >>> 1) ^ 0xedb88320) : (value >>> 1);
    }
    table.push(value >>> 0);
  }
  return Object.freeze(table);
}

const CRC32_TABLE = createCrc32Table();

function crc32(bytes) {
  let value = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    value = (value >>> 8) ^ CRC32_TABLE[(value ^ bytes[index]) & 0xff];
  }
  return (value ^ 0xffffffff) >>> 0;
}

// A favicon that grew to a megabyte by accident should stop the build rather
// than quietly land in an artifact with a 4 MB budget. The supplied set is
// 629 / 1712 / 3334 bytes, so this ceiling is generous by two orders of
// magnitude and still catches "someone dropped a photograph in here".
const FAVICON_BYTE_CEILING = 65536;

// The whole point of this item is that a new content type enters the document.
// Each of these is checked rather than assumed. The CSP would block script
// execution regardless, but "the CSP would have caught it" is not a reason to
// let it through the build.
const FORBIDDEN_SVG_PATTERNS = Object.freeze([
  Object.freeze({ name: '<script>', pattern: /<\s*script\b/i }),
  Object.freeze({ name: '<foreignObject>', pattern: /<\s*foreignObject\b/i }),
  Object.freeze({ name: '<image>', pattern: /<\s*image\b/i }),
  Object.freeze({ name: '<use>', pattern: /<\s*use\b/i }),
  Object.freeze({ name: '<style>', pattern: /<\s*style\b/i }),
  Object.freeze({ name: '<a>', pattern: /<\s*a\b/i }),
  Object.freeze({ name: 'href', pattern: /\bhref\s*=/i }),
  Object.freeze({ name: 'xlink:href', pattern: /\bxlink:href\s*=/i }),
  Object.freeze({ name: 'url() reference', pattern: /\burl\s*\(/i }),
  Object.freeze({ name: 'inline event handler', pattern: /\bon[a-z]+\s*=/i }),
  Object.freeze({ name: 'entity declaration', pattern: /<!ENTITY\b/i }),
  Object.freeze({ name: 'DOCTYPE', pattern: /<!DOCTYPE\b/i })
]);

// §3 of design-system.md: never hard-code a hex value. The wordmark is themed,
// so a literal colour in it would be a colour that ignores the theme.
const HEX_COLOUR_PATTERN = /#[0-9a-f]{3,8}\b/i;

// The one URI-shaped string permitted in the asset, and the reason the
// external-URL check is written as an allowlist rather than a plain "no ://".
//
// This is a namespace *name*, not a location: nothing dereferences it, and the
// SVG renders identically with it absent (the HTML parser puts <svg> in the
// SVG namespace regardless). It is kept so the committed file is a valid
// standalone SVG that opens correctly on its own, which is what makes the
// trace independently checkable. Any other scheme-and-authority string in the
// asset is a finding.
const ALLOWED_NAMESPACE_DECLARATION = 'xmlns="http://www.w3.org/2000/svg"';
const URI_SHAPED_PATTERN = /[a-z][a-z0-9+.-]{1,31}:\/\//gi;

function brandAssetPath(projectRoot, file) {
  return path.join(projectRoot, ...brandRoot, file);
}

function assertSafeSvg(source, label) {
  for (const rule of FORBIDDEN_SVG_PATTERNS) {
    if (rule.pattern.test(source)) {
      throw new Error(`Brand SVG ${label} contains a forbidden construct: ${rule.name}`);
    }
  }
  if (HEX_COLOUR_PATTERN.test(source)) {
    throw new Error(`Brand SVG ${label} contains a literal hex colour; use a fill token`);
  }
  const withoutNamespace = source.split(ALLOWED_NAMESPACE_DECLARATION).join('');
  URI_SHAPED_PATTERN.lastIndex = 0;
  const strayUri = URI_SHAPED_PATTERN.exec(withoutNamespace);
  URI_SHAPED_PATTERN.lastIndex = 0;
  if (strayUri) {
    throw new Error(`Brand SVG ${label} contains an external reference: ${strayUri[0]}`);
  }
  if (source.split(ALLOWED_NAMESPACE_DECLARATION).length !== 2) {
    throw new Error(`Brand SVG ${label} must declare the SVG namespace exactly once`);
  }
  if (!/^<svg\b/.test(source.trim())) {
    throw new Error(`Brand SVG ${label} does not start with an <svg> element`);
  }
  if (!/\bfill="var\(--fill-cyan\)"/.test(source) || !/\bfill="var\(--fill-ink\)"/.test(source)) {
    throw new Error(`Brand SVG ${label} must carry both --fill-cyan and --fill-ink`);
  }
  if (!/\brole="img"/.test(source) || !/\baria-label="Coldbox"/.test(source)) {
    throw new Error(`Brand SVG ${label} must carry role="img" and an accessible name of Coldbox`);
  }
  return source;
}

function readPngDimensions(bytes, label) {
  const fail = (reason) => {
    throw new Error(`Favicon ${label} ${reason}`);
  };

  if (!Buffer.isBuffer(bytes) || bytes.length < PNG_SIGNATURE.length) {
    fail('is truncated');
  }
  if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    fail('is not a PNG');
  }

  let offset = PNG_SIGNATURE.length;
  let dimensions = null;
  let idatSeen = false;
  let idatEnded = false;
  let iendSeen = false;
  const idatChunks = [];

  while (offset < bytes.length) {
    if (bytes.length - offset < 12) {
      fail('has a truncated PNG chunk');
    }

    const length = bytes.readUInt32BE(offset);
    const typeBytes = bytes.subarray(offset + 4, offset + 8);
    const type = typeBytes.toString('ascii');
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const crcOffset = dataEnd;
    const nextOffset = crcOffset + 4;
    if (!/^[A-Za-z]{4}$/.test(type) || dataEnd > bytes.length || nextOffset > bytes.length) {
      fail(`has a truncated or invalid ${type || 'unknown'} chunk`);
    }
    if (type[0] === type[0].toUpperCase() && !['IHDR', 'IDAT', 'IEND'].includes(type)) {
      fail(`contains an unsupported critical ${type} chunk`);
    }

    const data = bytes.subarray(dataStart, dataEnd);
    const expectedCrc = bytes.readUInt32BE(crcOffset);
    const actualCrc = crc32(Buffer.concat([typeBytes, data]));
    if (actualCrc !== expectedCrc) {
      fail(`has an invalid CRC in its ${type} chunk`);
    }

    if (offset === PNG_SIGNATURE.length && type !== 'IHDR') {
      fail('does not begin with IHDR');
    }

    if (type === 'IHDR') {
      if (dimensions !== null || length !== 13) {
        fail('has an invalid IHDR chunk');
      }
      const width = data.readUInt32BE(0);
      const height = data.readUInt32BE(4);
      if (width === 0 || height === 0) {
        fail('has zero-sized dimensions');
      }
      if (data[8] !== 8 || data[9] !== 6 || data[10] !== 0 || data[11] !== 0 || data[12] !== 0) {
        fail('uses an unsupported PNG format; expected 8-bit RGBA, non-interlaced data');
      }
      dimensions = { width, height };
    } else if (dimensions === null) {
      fail(`contains ${type} before IHDR`);
    }

    if (type === 'IDAT') {
      if (idatEnded || iendSeen) {
        fail('has non-consecutive IDAT chunks');
      }
      idatSeen = true;
      idatChunks.push(data);
    } else if (idatSeen && type !== 'IEND') {
      idatEnded = true;
    }

    if (type === 'IEND') {
      if (length !== 0 || iendSeen || !idatSeen) {
        fail('has an invalid IEND chunk');
      }
      iendSeen = true;
      if (nextOffset !== bytes.length) {
        fail('has trailing bytes after IEND');
      }
    }

    offset = nextOffset;
    if (iendSeen) {
      break;
    }
  }

  if (dimensions === null || !idatSeen || !iendSeen) {
    fail('is missing a complete IHDR/IDAT/IEND structure');
  }

  const rowLength = dimensions.width * 4 + 1;
  const decodedLength = rowLength * dimensions.height;
  if (!Number.isSafeInteger(decodedLength) || decodedLength > MAX_DECODED_PNG_BYTES) {
    fail('exceeds the safe PNG decode limit');
  }

  let decoded;
  try {
    decoded = zlib.inflateSync(Buffer.concat(idatChunks), { maxOutputLength: MAX_DECODED_PNG_BYTES });
  } catch (error) {
    fail(`is not decodable image data: ${error.message}`);
  }
  if (decoded.length !== decodedLength) {
    fail(`has ${decoded.length} decoded bytes, expected ${decodedLength}`);
  }
  for (let row = 0; row < dimensions.height; row += 1) {
    const filter = decoded[row * rowLength];
    if (filter > 4) {
      fail(`has an invalid scanline filter byte ${filter}`);
    }
  }

  return dimensions;
}

// Kept private so the build owns one complete PNG validation path; callers use
// createFaviconLinks() rather than depending on a header-only helper.
function readWordmarkSource(projectRoot) {
  const file = brandAssetPath(projectRoot, wordmarkFile);
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes('\r')) {
    throw new Error(`Brand SVG ${wordmarkFile} contains a CR byte; source assets are LF-only`);
  }
  return assertSafeSvg(source, wordmarkFile);
}

// The markup that replaces the CSS text wordmark in .app-bar. Trailing newline
// stripped so the token substitutes cleanly inside the anchor.
function createWordmarkMarkup(projectRoot) {
  return readWordmarkSource(projectRoot).replace(/\n+$/, '');
}

// `<link rel="icon">` with a `data:` URI. img-src in both realm CSPs is
// `data: blob:`, so this resolves with no network, no sibling file, and no
// implicit /favicon.ico request - which is the behaviour the item asks for
// from `file://`.
function createFaviconLinks(projectRoot) {
  return FAVICONS.map(({ size, file }) => {
    const bytes = fs.readFileSync(brandAssetPath(projectRoot, file));
    if (bytes.length > FAVICON_BYTE_CEILING) {
      throw new Error(`Favicon ${file} is ${bytes.length} bytes, over the ${FAVICON_BYTE_CEILING}-byte ceiling`);
    }
    const dimensions = readPngDimensions(bytes, file);
    if (dimensions.width !== size || dimensions.height !== size) {
      throw new Error(
        `Favicon ${file} is ${dimensions.width}x${dimensions.height}, expected ${size}x${size}`
      );
    }
    const encoded = bytes.toString('base64');
    return `  <link rel="icon" type="image/png" sizes="${size}x${size}" href="data:image/png;base64,${encoded}">`;
  }).join('\n');
}

module.exports = {
  FAVICONS,
  FAVICON_BYTE_CEILING,
  FORBIDDEN_SVG_PATTERNS,
  assertSafeSvg,
  createFaviconLinks,
  createWordmarkMarkup,
  readWordmarkSource
};
