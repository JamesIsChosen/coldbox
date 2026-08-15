'use strict';

// UI.2 - Maintenance tool, NOT part of the build.
//
// Regenerates assets/brand/coldbox-wordmark.svg from assets/brand/
// coldbox-wordmark.png. The traced SVG is committed as a source asset and is
// what the build embeds; nothing is traced at build or run time, so `potrace`
// is not a build dependency and this script never runs in CI.
//
// It exists so the committed SVG is reproducible rather than trusted. A
// reviewer with potrace 1.16 can run
//
//   node scripts/trace-brand-wordmark.js --check
//
// and get a byte-for-byte comparison against the committed file instead of
// having to take the author's word for where 15 KB of path data came from.
//
// Masks. The artwork is two flat colours over transparency. Two masks are
// traced:
//
//   ink  - every pixel with alpha >= 128, i.e. the whole silhouette
//   cyan - the subset of those pixels that are the cyan fill
//
// The ink mask is the silhouette rather than the black-only region because
// the cyan path is painted on top of it. Tracing black-only would put two
// independently-fitted curves along every black/cyan boundary, and wherever
// they disagreed by a fraction of a unit the background would show through as
// a hairline. Painting cyan over a solid silhouette cannot produce a seam.
// The rendered result is identical; see the packet for the pixel diff.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const sourcePng = path.join(projectRoot, 'assets', 'brand', 'coldbox-wordmark.png');
const targetSvg = path.join(projectRoot, 'assets', 'brand', 'coldbox-wordmark.svg');

// Fixed in the roadmap item. Changing any of these changes the committed
// artwork, so they are written down here rather than passed in.
const POTRACE_ARGUMENTS = Object.freeze(['--flat', '-O', '1.0', '-t', '8', '-a', '1.3', '-u', '10', '-s']);
const ALPHA_THRESHOLD = 128;

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// Decodes 8-bit RGBA, non-interlaced PNG only - which is what the supplied
// artwork is, asserted below. A general decoder would be more code to review
// for no gain.
function decodeRgbaPng(file) {
  const bytes = fs.readFileSync(file);
  if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error(`Not a PNG: ${file}`);
  }

  let header = null;
  const dataChunks = [];
  for (let offset = 8; offset + 8 <= bytes.length; ) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString('ascii');
    const body = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      header = {
        width: body.readUInt32BE(0),
        height: body.readUInt32BE(4),
        bitDepth: body[8],
        colourType: body[9],
        interlace: body[12]
      };
    } else if (type === 'IDAT') {
      dataChunks.push(Buffer.from(body));
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }

  if (!header) {
    throw new Error(`PNG has no IHDR: ${file}`);
  }
  if (header.bitDepth !== 8 || header.colourType !== 6 || header.interlace !== 0) {
    throw new Error(
      `Unsupported PNG (want 8-bit RGBA, non-interlaced; got bitDepth=${header.bitDepth} `
      + `colourType=${header.colourType} interlace=${header.interlace}): ${file}`
    );
  }

  const { width, height } = header;
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const raw = zlib.inflateSync(Buffer.concat(dataChunks));
  if (raw.length !== (stride + 1) * height) {
    throw new Error(`Unexpected inflated size for ${file}`);
  }

  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = pixels.subarray(y * stride, (y + 1) * stride);
    const prior = y === 0 ? null : pixels.subarray((y - 1) * stride, y * stride);
    for (let x = 0; x < stride; x += 1) {
      const rawByte = line[x];
      const left = x >= bytesPerPixel ? out[x - bytesPerPixel] : 0;
      const up = prior ? prior[x] : 0;
      const upLeft = prior && x >= bytesPerPixel ? prior[x - bytesPerPixel] : 0;
      let value;
      switch (filter) {
        case 0: value = rawByte; break;
        case 1: value = rawByte + left; break;
        case 2: value = rawByte + up; break;
        case 3: value = rawByte + ((left + up) >> 1); break;
        case 4: value = rawByte + paeth(left, up, upLeft); break;
        default: throw new Error(`Unknown PNG filter type ${filter} on row ${y} of ${file}`);
      }
      out[x] = value & 0xff;
    }
  }

  return { width, height, pixels };
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) {
    return a;
  }
  return pb <= pc ? b : c;
}

// Blue-dominant, bright, and not near-black. The artwork's flat cyan is
// approximately #2fb2e5 and its flat ink approximately #010001, so this
// classifier has an enormous margin; it is written as a range rather than an
// equality only because the PNG is antialiased at every edge.
function isCyan(r, g, b) {
  return b > 120 && g > 90 && b - r > 60;
}

// PBM P4: 1 bit per pixel, MSB first, rows padded to a byte. potrace traces
// the *black* (bit set) region.
function toPortableBitmap(width, height, test) {
  const rowBytes = Math.ceil(width / 8);
  const header = Buffer.from(`P4\n${width} ${height}\n`, 'ascii');
  const body = Buffer.alloc(rowBytes * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (test(x, y)) {
        body[y * rowBytes + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }
  return Buffer.concat([header, body]);
}

function tracePath(bitmap, scratchDirectory, name) {
  const bitmapPath = path.join(scratchDirectory, `${name}.pbm`);
  const svgPath = path.join(scratchDirectory, `${name}.svg`);
  fs.writeFileSync(bitmapPath, bitmap);

  const result = spawnSync('potrace', [...POTRACE_ARGUMENTS, '-o', svgPath, bitmapPath], {
    encoding: 'utf8'
  });
  if (result.error && result.error.code === 'ENOENT') {
    throw new Error('potrace is not installed. Install potrace 1.16 to regenerate the wordmark.');
  }
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`potrace failed on ${name}: ${result.stderr || `exit ${result.status}`}`);
  }

  const traced = fs.readFileSync(svgPath, 'utf8');
  const match = /<path d="([^"]*)"\/>/.exec(traced);
  if (!match) {
    throw new Error(`potrace produced no path for ${name}`);
  }
  return match[1];
}

// Rebuilt from scratch rather than edited: potrace's own document carries an
// external DTD reference in its DOCTYPE, and the acceptance criterion for this
// item is that the SVG entering the document has no external reference of any
// kind. Only the path data is taken from potrace's output.
function composeDocument(width, height, inkPath, cyanPath) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Coldbox" focusable="false" class="brand-wordmark">`,
    '<title>Coldbox</title>',
    `<g transform="translate(0,${height}) scale(0.1,-0.1)" stroke="none">`,
    `<path class="wordmark-ink" fill="var(--fill-ink)" d="${inkPath}"/>`,
    `<path class="wordmark-cyan" fill="var(--fill-cyan)" d="${cyanPath}"/>`,
    '</g>',
    '</svg>',
    ''
  ].join('\n');
}

function generate() {
  const { width, height, pixels } = decodeRgbaPng(sourcePng);
  const alphaAt = (x, y) => pixels[(y * width + x) * 4 + 3];
  const opaque = (x, y) => alphaAt(x, y) >= ALPHA_THRESHOLD;
  const cyan = (x, y) => {
    const index = (y * width + x) * 4;
    return opaque(x, y) && isCyan(pixels[index], pixels[index + 1], pixels[index + 2]);
  };

  const scratchDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'coldbox-trace-'));
  try {
    const inkPath = tracePath(toPortableBitmap(width, height, opaque), scratchDirectory, 'ink');
    const cyanPath = tracePath(toPortableBitmap(width, height, cyan), scratchDirectory, 'cyan');
    return composeDocument(width, height, inkPath, cyanPath);
  } finally {
    fs.rmSync(scratchDirectory, { recursive: true, force: true });
  }
}

function main() {
  const check = process.argv.includes('--check');
  const document = generate();

  if (!check) {
    fs.writeFileSync(targetSvg, document, 'utf8');
    console.log(`Wrote ${path.relative(projectRoot, targetSvg)} (${Buffer.byteLength(document, 'utf8')} bytes)`);
    return;
  }

  const committed = fs.readFileSync(targetSvg, 'utf8');
  if (committed === document) {
    console.log('Traced wordmark matches the committed asset byte for byte.');
    return;
  }
  throw new Error(
    'Traced wordmark does NOT match the committed asset. '
    + `Regenerated ${Buffer.byteLength(document, 'utf8')} bytes, committed ${Buffer.byteLength(committed, 'utf8')} bytes.`
  );
}

try {
  main();
} catch (error) {
  console.error(`Wordmark trace failed: ${error.message}`);
  process.exitCode = 1;
}
