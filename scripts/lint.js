'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const projectRoot = path.resolve(__dirname, '..');
const sourceRootName = 'src';
const secretSourcePrefixes = Object.freeze([
  'src/cold/'
]);
const toolingJavaScriptFiles = Object.freeze([
  path.join(projectRoot, 'scripts', 'brand-assets.js'),
  path.join(projectRoot, 'scripts', 'build.js'),
  path.join(projectRoot, 'scripts', 'build-date.js'),
  path.join(projectRoot, 'scripts', 'crypto-bundle.js'),
  path.join(projectRoot, 'scripts', 'font-bundle.js'),
  path.join(projectRoot, 'scripts', 'help-content.js'),
  path.join(projectRoot, 'scripts', 'lint.js'),
  path.join(projectRoot, 'scripts', 'verify-vendor.js'),
  path.join(projectRoot, 'scripts', 'run-browser-harness.js'),
  path.join(projectRoot, 'scripts', 'trace-brand-wordmark.js'),
  path.join(projectRoot, 'scripts', 'ui11-parity.js')
]);

const forbiddenConstructs = Object.freeze([
  Object.freeze({ name: 'eval', pattern: /(?<!wasm-unsafe-)\beval\b/g }),
  Object.freeze({ name: 'new Function', pattern: /\bnew\s+Function\b/g }),
  Object.freeze({ name: 'import', pattern: /\bimport\b/g }),
  Object.freeze({ name: 'require', pattern: /\brequire\b/g })
]);
const externalUrlPattern = /\b[a-z][a-z0-9+.-]{1,31}:\/\/[^\s"'<>]+/gi;
const protocolRelativeUrlPattern = /(?<![:\w])\/\/[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}(?::\d+)?(?:[/?#][^\s"'<>]*)?/gi;
const allowedBrandNamespace = 'http://www.w3.org/2000/svg';
const localStoragePattern = /\blocalStorage\b/g;
const executableMathRandomPattern = /\bMath\.random\s*\(/g;

function parseArgs() {
  let root = projectRoot;

  for (let index = 2; index < process.argv.length; index += 1) {
    const argument = process.argv[index];
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

  return { root };
}

function compareBytewise(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function collectSourceFiles(root) {
  const sourceRoot = path.join(root, sourceRootName);
  if (!fs.existsSync(sourceRoot)) {
    throw new Error(`Source directory is missing: ${sourceRootName}`);
  }

  const files = [];
  function visit(directory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => compareBytewise(left.name, right.name));
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(`Symlink found in source tree: ${path.relative(root, absolutePath).replace(/\\/g, '/')}`);
      }
      if (entry.isDirectory()) {
        visit(absolutePath);
      } else if (entry.isFile()) {
        files.push(absolutePath);
      }
    }
  }

  visit(sourceRoot);
  return files.sort((left, right) => compareBytewise(
    path.relative(root, left).replace(/\\/g, '/'),
    path.relative(root, right).replace(/\\/g, '/')
  ));
}

function collectBrandTextFiles(root) {
  const brandRoot = path.join(root, 'assets', 'brand');
  if (!fs.existsSync(brandRoot)) {
    return [];
  }

  const files = [];
  function visit(directory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => compareBytewise(left.name, right.name));
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(`Symlink found in brand asset tree: ${relativePath(root, absolutePath)}`);
      }
      if (entry.isDirectory()) {
        visit(absolutePath);
      } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.svg') {
        files.push(absolutePath);
      }
    }
  }

  visit(brandRoot);
  return files.sort((left, right) => compareBytewise(
    relativePath(root, left),
    relativePath(root, right)
  ));
}

function relativePath(root, file) {
  return path.relative(root, file).replace(/\\/g, '/');
}

function isSecretHandlingPath(relative) {
  return secretSourcePrefixes.some((prefix) => relative.startsWith(prefix));
}

function lineAndColumn(source, index) {
  const before = source.slice(0, index);
  const line = before.split('\n').length;
  const lastNewline = before.lastIndexOf('\n');
  return { line, column: index - lastNewline };
}

function findMatches(source, pattern) {
  const matches = [];
  pattern.lastIndex = 0;
  let match = pattern.exec(source);
  while (match) {
    matches.push(match.index);
    match = pattern.exec(source);
  }
  pattern.lastIndex = 0;
  return matches;
}

function addFindings(findings, root, file, source, rule, pattern) {
  for (const index of findMatches(source, pattern)) {
    const location = lineAndColumn(source, index);
    findings.push({
      index,
      file: relativePath(root, file),
      line: location.line,
      column: location.column,
      name: rule
    });
  }
}

function scanSourceFile(root, file, source, findings) {
  const relative = relativePath(root, file);
  const extension = path.extname(file).toLowerCase();

  for (const construct of forbiddenConstructs) {
    addFindings(findings, root, file, source, construct.name, construct.pattern);
  }

  if (isSecretHandlingPath(relative)) {
    addFindings(findings, root, file, source, 'external URL', externalUrlPattern);
    addFindings(findings, root, file, source, 'external URL', protocolRelativeUrlPattern);
    addFindings(findings, root, file, source, 'localStorage', localStoragePattern);
  }

  if (isSecretHandlingPath(relative) || relative === 'src/capabilities.js') {
    addFindings(findings, root, file, source, 'Math.random', executableMathRandomPattern);
  }

  if (extension === '.js') {
    try {
      new vm.Script(source, { filename: relative });
    } catch (error) {
      throw new Error(`JavaScript syntax error in ${relative}: ${error.message}`);
    }
  }
}

function scanBrandAssetFile(root, file, source, findings) {
  for (const pattern of [externalUrlPattern, protocolRelativeUrlPattern]) {
    pattern.lastIndex = 0;
    let match = pattern.exec(source);
    while (match) {
      if (match[0] !== allowedBrandNamespace) {
        const location = lineAndColumn(source, match.index);
        findings.push({
          index: match.index,
          file: relativePath(root, file),
          line: location.line,
          column: location.column,
          name: 'external URL'
        });
      }
      match = pattern.exec(source);
    }
    pattern.lastIndex = 0;
  }
}

function checkLineEndings(root, file, source) {
  if (source.includes('\r')) {
    throw new Error(`CRLF line ending found in ${relativePath(root, file)}`);
  }
}

function checkToolingSyntax() {
  for (const file of toolingJavaScriptFiles) {
    const source = fs.readFileSync(file, 'utf8');
    new vm.Script(source, { filename: relativePath(projectRoot, file) });
  }
}

function checkVendorManifest(root) {
  const file = path.join(root, 'vendor', 'vendor-manifest.json');
  if (!fs.existsSync(file)) {
    return;
  }

  const source = fs.readFileSync(file, 'utf8');
  checkLineEndings(root, file, source);
  JSON.parse(source);
}

function reportFindings(findings) {
  findings.sort((left, right) => {
    const byFile = compareBytewise(left.file, right.file);
    if (byFile !== 0) {
      return byFile;
    }
    if (left.index !== right.index) {
      return left.index - right.index;
    }
    return compareBytewise(left.name, right.name);
  });

  for (const finding of findings) {
    console.error(`Forbidden construct "${finding.name}" in ${finding.file}:${finding.line}:${finding.column}`);
  }
  if (findings.length > 0) {
    throw new Error(`Forbidden-construct lint failed with ${findings.length} finding(s)`);
  }
}

function main() {
  const { root } = parseArgs();
  checkToolingSyntax();
  const sourceFiles = collectSourceFiles(root);
  const findings = [];

  for (const file of sourceFiles) {
    const source = fs.readFileSync(file, 'utf8');
    checkLineEndings(root, file, source);
    scanSourceFile(root, file, source, findings);
  }
  for (const file of collectBrandTextFiles(root)) {
    const source = fs.readFileSync(file, 'utf8');
    checkLineEndings(root, file, source);
    scanBrandAssetFile(root, file, source, findings);
  }
  checkVendorManifest(root);
  reportFindings(findings);

  console.log('Lint passed: forbidden constructs, JavaScript syntax, and LF source line endings are valid.');
}

try {
  main();
} catch (error) {
  console.error(`Lint failed: ${error.message}`);
  process.exitCode = 1;
}
