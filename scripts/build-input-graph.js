'use strict';

const fs = require('node:fs');
const path = require('node:path');

const BUILD_ENTRY = 'scripts/build.js';

// These are the non-module files and directories read by the product builder.
// Keeping this list beside the graph walker gives the isolation test one
// canonical build-input definition rather than another hand-picked list of
// scripts. The module portion is discovered transitively from BUILD_ENTRY.
const PRODUCT_DATA_INPUTS = Object.freeze([
  'src',
  'assets',
  'docs/00-overview/glossary.md',
  'docs/03-guides',
  'LICENSE',
  'package.json',
  'vendor'
]);

const APPROVED_REFERENCE_PATTERN = /(?:ui-reference[\\/]|\.html\.reference|coldbox-(?:desktop|mobile)-mockup\.html)/i;
const TEXT_EXTENSIONS = new Set([
  '',
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.svg',
  '.txt'
]);
const BINARY_EXTENSIONS = new Set([
  '.gif',
  '.ico',
  '.jpeg',
  '.jpg',
  '.png',
  '.tgz',
  '.wasm',
  '.woff',
  '.woff2'
]);

function comparePaths(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function relativePath(projectRoot, absolutePath) {
  return path.relative(projectRoot, absolutePath).replace(/\\/g, '/');
}

function assertInsideProject(projectRoot, absolutePath, label) {
  const relative = path.relative(projectRoot, absolutePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`${label} escapes the project root: ${absolutePath}`);
  }
}

function assertNoSymlinkPath(projectRoot, absolutePath, label) {
  const relative = path.relative(projectRoot, absolutePath);
  let current = projectRoot;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    if (!fs.existsSync(current)) {
      continue;
    }
    if (fs.lstatSync(current).isSymbolicLink()) {
      throw new Error(`${label} contains a symlink: ${relativePath(projectRoot, current)}`);
    }
  }
}

function readDirectoryFiles(projectRoot, relativeDirectory) {
  const directory = path.resolve(projectRoot, relativeDirectory);
  assertInsideProject(projectRoot, directory, `Build input directory ${relativeDirectory}`);
  assertNoSymlinkPath(projectRoot, directory, `Build input directory ${relativeDirectory}`);
  const files = [];

  function visit(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true })
      .sort((left, right) => comparePaths(left.name, right.name));
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(`Symlink found in product build input: ${relativePath(projectRoot, absolute)}`);
      }
      if (entry.isDirectory()) {
        visit(absolute);
      } else if (entry.isFile()) {
        files.push(absolute);
      } else {
        throw new Error(`Unsupported product build input entry: ${relativePath(projectRoot, absolute)}`);
      }
    }
  }

  if (!fs.existsSync(directory)) {
    throw new Error(`Missing product build input directory: ${relativeDirectory}`);
  }
  visit(directory);
  return files;
}

function resolveLocalModule(projectRoot, fromFile, specifier) {
  if (!specifier.startsWith('.')) {
    return null;
  }

  const base = path.resolve(path.dirname(fromFile), specifier);
  assertInsideProject(projectRoot, base, `Local module ${specifier}`);
  const candidates = [base, `${base}.js`, `${base}.json`, path.join(base, 'index.js')];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      assertNoSymlinkPath(projectRoot, candidate, `Local module ${specifier}`);
      if (!fs.lstatSync(candidate).isFile()) {
        continue;
      }
      return candidate;
    }
  }
  throw new Error(`Missing local module ${specifier} imported by ${relativePath(projectRoot, fromFile)}`);
}

function extractRequireSpecifiers(source, label) {
  const specifiers = [];
  const requirePattern = /\brequire\s*\(/g;
  for (const match of source.matchAll(requirePattern)) {
    const remainder = source.slice(match.index + match[0].length);
    const literal = /^\s*(['"])([^'"\\]*)\1\s*\)/.exec(remainder);
    if (!literal) {
      throw new Error(`Dynamic or malformed require in ${label}; build-input graph cannot safely resolve it`);
    }
    specifiers.push(literal[2]);
  }
  return specifiers;
}

function collectTransitiveModules(projectRoot, entryPath) {
  const entry = path.resolve(projectRoot, entryPath);
  assertInsideProject(projectRoot, entry, 'Build entry');
  const visited = new Set();
  const queue = [entry];

  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) {
      continue;
    }
    assertNoSymlinkPath(projectRoot, current, 'Build module');
    if (!fs.existsSync(current) || !fs.statSync(current).isFile()) {
      throw new Error(`Missing product build module: ${relativePath(projectRoot, current)}`);
    }
    visited.add(current);

    const extension = path.extname(current).toLowerCase();
    if (extension !== '.js') {
      continue;
    }
    const source = fs.readFileSync(current, 'utf8');
    for (const specifier of extractRequireSpecifiers(source, relativePath(projectRoot, current))) {
      const dependency = resolveLocalModule(projectRoot, current, specifier);
      if (dependency !== null) {
        queue.push(dependency);
      }
    }
  }

  return [...visited].sort((left, right) => comparePaths(relativePath(projectRoot, left), relativePath(projectRoot, right)));
}

function collectProductBuildInputFiles(projectRoot, options = {}) {
  const entryPath = options.entryPath || BUILD_ENTRY;
  const dataInputs = options.dataInputs || PRODUCT_DATA_INPUTS;
  const files = new Set(collectTransitiveModules(projectRoot, entryPath));

  for (const relativeInput of dataInputs) {
    const absoluteInput = path.resolve(projectRoot, relativeInput);
    assertInsideProject(projectRoot, absoluteInput, `Product build input ${relativeInput}`);
    if (!fs.existsSync(absoluteInput)) {
      throw new Error(`Missing product build input: ${relativeInput}`);
    }
    if (fs.statSync(absoluteInput).isDirectory()) {
      for (const file of readDirectoryFiles(projectRoot, relativeInput)) {
        files.add(file);
      }
    } else if (fs.statSync(absoluteInput).isFile()) {
      files.add(absoluteInput);
    } else {
      throw new Error(`Unsupported product build input: ${relativeInput}`);
    }
  }

  return [...files].sort((left, right) => comparePaths(relativePath(projectRoot, left), relativePath(projectRoot, right)));
}

function isTextCandidate(file) {
  const extension = path.extname(file).toLowerCase();
  return !BINARY_EXTENSIONS.has(extension) && TEXT_EXTENSIONS.has(extension);
}

function findApprovedReferenceBuildInputs(projectRoot, options = {}) {
  const files = collectProductBuildInputFiles(projectRoot, options);
  return files
    .filter(isTextCandidate)
    .filter((file) => APPROVED_REFERENCE_PATTERN.test(fs.readFileSync(file, 'utf8')))
    .map((file) => relativePath(projectRoot, file));
}

function assertNoApprovedReferenceBuildInputs(projectRoot, options = {}) {
  const violations = findApprovedReferenceBuildInputs(projectRoot, options);
  if (violations.length > 0) {
    throw new Error(`Approved UI reference entered the product build-input graph: ${violations.join(', ')}`);
  }
  return violations;
}

module.exports = {
  APPROVED_REFERENCE_PATTERN,
  BUILD_ENTRY,
  PRODUCT_DATA_INPUTS,
  assertNoApprovedReferenceBuildInputs,
  collectProductBuildInputFiles,
  collectTransitiveModules,
  findApprovedReferenceBuildInputs
};
