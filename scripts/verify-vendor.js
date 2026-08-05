'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const defaultProjectRoot = path.resolve(__dirname, '..');
const maximumArtifactSize = 10 * 1024 * 1024;
const maximumUncompressedSize = 20 * 1024 * 1024;
const requiredPackages = Object.freeze([
  '@fontsource/bangers',
  '@fontsource/comic-neue',
  '@noble/ciphers',
  '@noble/curves',
  '@noble/hashes',
  '@scure/base',
  '@scure/bip32',
  '@scure/bip39',
  'argon2-browser'
]);

function parseArgs() {
  let root = defaultProjectRoot;
  let offline = false;

  for (let index = 2; index < process.argv.length; index += 1) {
    const argument = process.argv[index];
    if (argument === '--offline') {
      offline = true;
      continue;
    }
    if (argument === '--root') {
      const value = process.argv[index + 1];
      if (!value) {
        throw new Error('--root requires a directory');
      }
      root = path.resolve(value);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }

  return { offline, root };
}

function compareBytewise(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function packageNamePart(name) {
  const separator = name.indexOf('/');
  return separator === -1 ? name : name.slice(separator + 1);
}

function canonicalVendorPath(name, version) {
  return `vendor/npm/${name}/${version}/package.tgz`;
}

function canonicalNpmTarballUrl(name, version) {
  return `https://registry.npmjs.org/${name}/-/${packageNamePart(name)}-${version}.tgz`;
}

function assertManifestArtifactIdentity(artifact) {
  if (!/^(?:@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*)$/.test(artifact.name)) {
    throw new Error(`Unsupported npm package name: ${artifact.name}`);
  }
  if (!/^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(artifact.version)) {
    throw new Error(`Unsupported npm package version: ${artifact.version}`);
  }

  const expectedPath = canonicalVendorPath(artifact.name, artifact.version);
  if (artifact.path !== expectedPath) {
    throw new Error(`Non-canonical vendor path for ${artifact.name}@${artifact.version}: expected ${expectedPath}`);
  }

  const expectedUrl = canonicalNpmTarballUrl(artifact.name, artifact.version);
  if (artifact.url !== expectedUrl) {
    throw new Error(`Non-canonical npm tarball URL for ${artifact.name}@${artifact.version}: expected ${expectedUrl}`);
  }
}

function readManifest(root) {
  const manifestPath = path.join(root, 'vendor', 'vendor-manifest.json');
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read vendor manifest: ${error.message}`);
  }

  if (manifest.manifestVersion !== 1) {
    throw new Error('Unsupported vendor manifest version');
  }
  if (manifest.registry !== 'https://registry.npmjs.org/') {
    throw new Error('Vendor manifest registry must be the official npm registry');
  }
  if (!Array.isArray(manifest.artifacts) || manifest.artifacts.length === 0) {
    throw new Error('Vendor manifest contains no artifacts');
  }

  const seen = new Set();
  let previousName = '';
  for (const artifact of manifest.artifacts) {
    for (const field of ['name', 'version', 'path', 'url', 'sha256', 'integrity']) {
      if (typeof artifact[field] !== 'string' || artifact[field].length === 0) {
        throw new Error(`Vendor manifest has an invalid ${field} field`);
      }
    }
    if (!Number.isSafeInteger(artifact.size) || artifact.size <= 0) {
      throw new Error(`Vendor manifest has an invalid size for ${artifact.name}`);
    }
    if (!/^([0-9a-f]{64})$/.test(artifact.sha256)) {
      throw new Error(`Vendor manifest has an invalid SHA-256 for ${artifact.name}`);
    }
    if (!/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(artifact.integrity)) {
      throw new Error(`Vendor manifest has an invalid npm integrity value for ${artifact.name}`);
    }

    assertManifestArtifactIdentity(artifact);

    const normalizedPath = artifact.path.replace(/\\/g, '/');
    if (normalizedPath !== artifact.path || normalizedPath.startsWith('/') || normalizedPath.includes('../') || !normalizedPath.startsWith('vendor/')) {
      throw new Error(`Vendor path is not a safe repository-relative path: ${artifact.path}`);
    }

    const key = `${artifact.name}@${artifact.version}`;
    if (seen.has(key)) {
      throw new Error(`Duplicate vendor artifact: ${key}`);
    }
    seen.add(key);
    if (previousName && compareBytewise(previousName, artifact.name) > 0) {
      throw new Error('Vendor manifest artifacts are not sorted by package name');
    }
    previousName = artifact.name;
  }

  for (const packageName of requiredPackages) {
    if (!manifest.artifacts.some((artifact) => artifact.name === packageName)) {
      throw new Error(`Required vendor package is missing from the manifest: ${packageName}`);
    }
  }

  return manifest.artifacts;
}

function collectVendorFiles(root) {
  const vendorRoot = path.join(root, 'vendor');
  const files = [];

  function visit(directory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => compareBytewise(left.name, right.name));
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      const relativePath = path.relative(root, absolutePath).replace(/\\/g, '/');
      if (entry.isSymbolicLink()) {
        throw new Error(`Symlink found in vendor tree: ${relativePath}`);
      }
      if (entry.isDirectory()) {
        visit(absolutePath);
        continue;
      }
      if (entry.isFile() && entry.name !== '.gitkeep' && relativePath !== 'vendor/vendor-manifest.json') {
        files.push(relativePath);
      }
    }
  }

  visit(vendorRoot);
  return files.sort(compareBytewise);
}

function verifyVendorCompleteness(root, artifacts) {
  const expectedFiles = new Set(artifacts.map((artifact) => artifact.path));
  const actualFiles = collectVendorFiles(root);
  for (const actualFile of actualFiles) {
    if (!expectedFiles.has(actualFile)) {
      throw new Error(`Unmanifested vendor artifact: ${actualFile}`);
    }
  }
  for (const expectedFile of expectedFiles) {
    if (!actualFiles.includes(expectedFile)) {
      throw new Error(`Manifested vendor artifact is missing: ${expectedFile}`);
    }
  }
}

function digestBytes(bytes) {
  return {
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    integrity: `sha512-${crypto.createHash('sha512').update(bytes).digest('base64')}`
  };
}

function readTarString(header, start, length) {
  return header.subarray(start, start + length).toString('utf8').replace(/\0.*$/, '');
}

function readTarOctal(header, start, length) {
  const value = readTarString(header, start, length).trim();
  if (value === '') {
    return 0;
  }
  if (!/^[0-7]+$/.test(value)) {
    throw new Error('Vendor tarball contains an invalid tar size field');
  }
  return Number.parseInt(value, 8);
}

function inspectPackageMetadata(bytes, artifact, source) {
  let tar;
  try {
    tar = zlib.gunzipSync(bytes);
  } catch (error) {
    throw new Error(`${source} is not a valid gzip tarball for ${artifact.name}@${artifact.version}: ${error.message}`);
  }
  if (tar.length > maximumUncompressedSize) {
    throw new Error(`${source} exceeds the uncompressed size limit for ${artifact.name}@${artifact.version}`);
  }

  let offset = 0;
  let zeroBlocks = 0;
  let packageJson = null;
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    const name = readTarString(header, 0, 100);
    if (name === '') {
      zeroBlocks += 1;
      offset += 512;
      if (zeroBlocks === 2) {
        break;
      }
      continue;
    }
    zeroBlocks = 0;

    const type = header[156] === 0 ? '0' : String.fromCharCode(header[156]);
    if (type !== '0' && type !== '5') {
      throw new Error(`${source} contains a non-regular tar entry: ${name}`);
    }
    if (name.startsWith('/') || name.includes('..\\') || name.includes('../')) {
      throw new Error(`${source} contains an unsafe tar entry: ${name}`);
    }

    const size = readTarOctal(header, 124, 12);
    const dataStart = offset + 512;
    const dataEnd = dataStart + size;
    if (dataEnd > tar.length) {
      throw new Error(`${source} contains a truncated tar entry: ${name}`);
    }
    if (name === 'package/package.json' && type === '0') {
      try {
        packageJson = JSON.parse(tar.subarray(dataStart, dataEnd).toString('utf8'));
      } catch (error) {
        throw new Error(`${source} contains invalid package/package.json: ${error.message}`);
      }
    }
    offset = dataStart + Math.ceil(size / 512) * 512;
  }

  if (zeroBlocks < 2) {
    throw new Error(`${source} is missing the tar end-of-archive marker`);
  }
  if (!packageJson || packageJson.name !== artifact.name || packageJson.version !== artifact.version) {
    const actual = packageJson ? `${packageJson.name}@${packageJson.version}` : 'missing package/package.json';
    throw new Error(`${source} package identity mismatch: expected ${artifact.name}@${artifact.version}, got ${actual}`);
  }
}

function readLocalArtifact(root, artifact) {
  const absolutePath = path.resolve(root, artifact.path);
  const relativePath = path.relative(root, absolutePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(`Vendor path escapes repository root: ${artifact.path}`);
  }
  const file = fs.readFileSync(absolutePath);
  if (file.length > maximumArtifactSize) {
    throw new Error(`Vendor artifact exceeds size limit: ${artifact.name}`);
  }
  if (file.length !== artifact.size) {
    throw new Error(`Vendor size mismatch for ${artifact.name}@${artifact.version}: expected ${artifact.size}, got ${file.length}`);
  }
  const digest = digestBytes(file);
  if (digest.sha256 !== artifact.sha256) {
    throw new Error(`Vendor SHA-256 mismatch for ${artifact.name}@${artifact.version}`);
  }
  if (digest.integrity !== artifact.integrity) {
    throw new Error(`Vendor integrity mismatch for ${artifact.name}@${artifact.version}`);
  }
  inspectPackageMetadata(file, artifact, `Local vendor ${artifact.path}`);
}

async function readRemoteArtifact(artifact) {
  const response = await fetch(artifact.url, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`Upstream download failed for ${artifact.name}@${artifact.version}: HTTP ${response.status}`);
  }
  const file = Buffer.from(await response.arrayBuffer());
  if (file.length > maximumArtifactSize) {
    throw new Error(`Upstream artifact exceeds size limit: ${artifact.name}`);
  }
  if (file.length !== artifact.size) {
    throw new Error(`Upstream size mismatch for ${artifact.name}@${artifact.version}: expected ${artifact.size}, got ${file.length}`);
  }
  const digest = digestBytes(file);
  if (digest.sha256 !== artifact.sha256 || digest.integrity !== artifact.integrity) {
    throw new Error(`Upstream hash mismatch for ${artifact.name}@${artifact.version}`);
  }
  inspectPackageMetadata(file, artifact, `Upstream ${artifact.url}`);
}

async function main() {
  const { offline, root } = parseArgs();
  const artifacts = readManifest(root);
  verifyVendorCompleteness(root, artifacts);

  for (const artifact of artifacts) {
    readLocalArtifact(root, artifact);
    console.log(`Local vendor verified: ${artifact.name}@${artifact.version}`);
  }

  if (!offline) {
    for (const artifact of artifacts) {
      await readRemoteArtifact(artifact);
      console.log(`Upstream release verified: ${artifact.name}@${artifact.version}`);
    }
  }

  console.log(offline
    ? 'Vendor verification passed in offline mode.'
    : 'Vendor verification passed against local files and upstream releases.');
}

main().catch((error) => {
  console.error(`Vendor verification failed: ${error.message}`);
  process.exitCode = 1;
});
