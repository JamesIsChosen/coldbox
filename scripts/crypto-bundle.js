'use strict';

const fs = require('node:fs');
const path = require('node:path');
const posixPath = require('node:path').posix;
const zlib = require('node:zlib');

const NOBLE_SEEDS = Object.freeze([
  '@noble/ciphers/aes.js',
  '@noble/hashes/hkdf.js',
  '@noble/hashes/pbkdf2.js',
  '@noble/hashes/sha2.js'
]);

const packageTarCache = new Map();
const manifestCache = new Map();

function readManifest(projectRoot) {
  if (!manifestCache.has(projectRoot)) {
    const manifestPath = path.join(projectRoot, 'vendor', 'vendor-manifest.json');
    manifestCache.set(projectRoot, JSON.parse(fs.readFileSync(manifestPath, 'utf8')));
  }
  return manifestCache.get(projectRoot);
}

function packageNameAndFile(moduleId) {
  const parts = moduleId.split('/');
  const packagePartCount = moduleId.startsWith('@') ? 2 : 1;
  return {
    packageName: parts.slice(0, packagePartCount).join('/'),
    file: parts.slice(packagePartCount).join('/')
  };
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

function readVendorFile(projectRoot, moduleId) {
  const { packageName, file } = packageNameAndFile(moduleId);
  const manifest = readManifest(projectRoot);
  const artifact = manifest.artifacts.find((entry) => entry.name === packageName);
  if (!artifact) {
    throw new Error(`No vendored artifact is declared for ${packageName}`);
  }
  const tarballPath = path.join(projectRoot, artifact.path);
  if (!packageTarCache.has(tarballPath)) {
    packageTarCache.set(tarballPath, readTarEntries(fs.readFileSync(tarballPath)));
  }
  const entry = packageTarCache.get(tarballPath).get(`package/${file}`);
  if (!entry) {
    throw new Error(`Vendored artifact ${packageName} is missing package/${file}`);
  }
  return Buffer.from(entry).toString('utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

function resolveModuleId(fromId, specifier) {
  if (!specifier.startsWith('.')) {
    return specifier;
  }
  const resolved = posixPath.normalize(posixPath.join(posixPath.dirname(fromId), specifier));
  return resolved.endsWith('.js') ? resolved : `${resolved}.js`;
}

function normalizeDoubleQuotedStrings(source) {
  let output = '';
  let state = 'code';
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (state === 'code') {
      if (character === '"') {
        output += "'";
        state = 'double';
      } else {
        output += character;
        if (character === "'") {
          state = 'single';
        } else if (character === '`') {
          state = 'template';
        }
      }
      continue;
    }
    if (state === 'double') {
      if (character === '\\') {
        const next = source[index + 1];
        if (next === '"') {
          output += '"';
        } else if (next === "'") {
          output += "\\'";
        } else {
          output += `\\${next}`;
        }
        index += 1;
      } else if (character === '"') {
        output += "'";
        state = 'code';
      } else if (character === "'") {
        output += "\\'";
      } else {
        output += character;
      }
      continue;
    }
    output += character;
    if (character === '\\') {
      output += source[index + 1] || '';
      index += 1;
    } else if (state === 'single' && character === "'") {
      state = 'code';
    } else if (state === 'template' && character === '`') {
      state = 'code';
    }
  }
  if (state !== 'code') {
    throw new Error('Could not normalize the Argon2 bundle string literals.');
  }
  return output;
}

function stripJavaScriptComments(source) {
  let output = '';
  let state = 'code';
  let regexClass = false;

  function regexStartsHere(index) {
    let previous = output.length - 1;
    while (previous >= 0 && /\s/.test(output[previous])) {
      previous -= 1;
    }
    if (previous < 0) {
      return true;
    }
    if (/[=(:,!&|?{}\[;\]]/.test(output[previous])) {
      return true;
    }
    return /(?:^|\s)(?:return|throw|case|delete|void|typeof|instanceof|in|of|yield|await)$/.test(
      output.slice(Math.max(0, previous - 12), previous + 1)
    );
  }

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (state === 'code') {
      if (character === '/' && next === '/') {
        state = 'line-comment';
        index += 1;
      } else if (character === '/' && next === '*') {
        state = 'block-comment';
        index += 1;
      } else if (character === '/' && regexStartsHere(index)) {
        output += character;
        state = 'regex';
        regexClass = false;
      } else {
        output += character;
        if (character === "'") {
          state = 'single';
        } else if (character === '"') {
          state = 'double';
        } else if (character === '`') {
          state = 'template';
        }
      }
      continue;
    }
    if (state === 'line-comment') {
      if (character === '\n' || character === '\r') {
        output += character;
        state = 'code';
      }
      continue;
    }
    if (state === 'block-comment') {
      if (character === '*' && next === '/') {
        state = 'code';
        index += 1;
      } else if (character === '\n' || character === '\r') {
        output += character;
      }
      continue;
    }
    if (state === 'regex') {
      output += character;
      if (character === '\\') {
        output += next || '';
        index += 1;
      } else if (character === '[') {
        regexClass = true;
      } else if (character === ']' && regexClass) {
        regexClass = false;
      } else if (character === '/' && !regexClass) {
        state = 'code';
      }
      continue;
    }
    output += character;
    if (character === '\\') {
      output += next || '';
      index += 1;
    } else if (state === 'single' && character === "'") {
      state = 'code';
    } else if (state === 'double' && character === '"') {
      state = 'code';
    } else if (state === 'template' && character === '`') {
      state = 'code';
    }
  }
  if (state === 'block-comment') {
    throw new Error(`Could not strip the crypto bundle comments (state ${state} at ${source.length}).`);
  }
  return output;
}

function parseImportBindings(clause) {
  const trimmed = clause.trim();
  if (trimmed.startsWith('* as ')) {
    return [{ imported: '*', local: trimmed.slice(5).trim() }];
  }
  if (trimmed.startsWith('{')) {
    return trimmed.slice(1, trimmed.lastIndexOf('}')).split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const parts = entry.split(/\s+as\s+/);
        return { imported: parts[0].trim(), local: (parts[1] || parts[0]).trim() };
      });
  }
  const comma = trimmed.indexOf(',');
  if (comma !== -1) {
    return [
      { imported: 'default', local: trimmed.slice(0, comma).trim() },
      ...parseImportBindings(trimmed.slice(comma + 1))
    ];
  }
  return [{ imported: 'default', local: trimmed }];
}

function transformModule(moduleId, originalSource) {
  let source = originalSource;
  let importCounter = 0;
  const exportedNames = [];

  source = source.replace(/\bimport\s+([\s\S]*?)\s+from\s+(["'])([^"']+)\2\s*;?/g, (_match, clause, _quote, specifier) => {
    const resolvedId = resolveModuleId(moduleId, specifier);
    const bindings = parseImportBindings(clause);
    const namespaceName = `__coldboxNobleImport${importCounter}`;
    importCounter += 1;
    const statements = [`var ${namespaceName} = load(${JSON.stringify(resolvedId)});`];
    bindings.forEach(({ imported, local }) => {
      if (imported === '*') {
        statements.push(`var ${local} = ${namespaceName};`);
      } else {
        statements.push(`var ${local} = ${namespaceName}.${imported};`);
      }
    });
    return statements.join('\n');
  });

  source = source.replace(/\bexport\s+(?=(?:async\s+)?function\s+([A-Za-z_$][\w$]*))/g, (_match, name) => {
    exportedNames.push({ name, exported: name });
    return '';
  });
  source = source.replace(/\bexport\s+(?=class\s+([A-Za-z_$][\w$]*))/g, (_match, name) => {
    exportedNames.push({ name, exported: name });
    return '';
  });
  source = source.replace(/\bexport\s+(?=(?:const|let|var)\s+([A-Za-z_$][\w$]*))/g, (_match, name) => {
    exportedNames.push({ name, exported: name });
    return '';
  });
  source = source.replace(/\bexport\s*\{([\s\S]*?)\}\s*;?/g, (_match, names) => {
    names.split(',').map((entry) => entry.trim()).filter(Boolean).forEach((entry) => {
      const parts = entry.split(/\s+as\s+/);
      exportedNames.push({ name: parts[0].trim(), exported: (parts[1] || parts[0]).trim() });
    });
    return '';
  });
  source = source.replace(/\bexport\s+default\s+([^;]+);?/g, (_match, expression) => {
    exportedNames.push({ name: expression.trim(), exported: 'default', expression: true });
    return '';
  });

  const exportStatements = exportedNames.map((entry) => (
    entry.expression
      ? `exports.${entry.exported} = ${entry.name};`
      : `exports.${entry.exported} = ${entry.name};`
  ));
  return `${source.trim()}\n${exportStatements.join('\n')}`;
}

function collectModuleGraph(projectRoot) {
  const modules = new Map();
  const pending = [...NOBLE_SEEDS];
  while (pending.length > 0) {
    const moduleId = pending.pop();
    if (modules.has(moduleId)) {
      continue;
    }
    let source;
    try {
      source = stripJavaScriptComments(readVendorFile(projectRoot, moduleId));
    } catch (error) {
      throw new Error(`${moduleId}: ${error.message}`);
    }
    modules.set(moduleId, source);
    const imports = [...source.matchAll(/\bimport\s+([\s\S]*?)\s+from\s+(["'])([^"']+)\2\s*;?/g)];
    imports.forEach((match) => {
      const dependency = resolveModuleId(moduleId, match[3]);
      if (dependency.startsWith('@noble/')) {
        pending.push(dependency);
      } else {
        throw new Error(`Unexpected crypto bundle dependency ${dependency}`);
      }
    });
  }
  return modules;
}

function createNobleBundle(projectRoot) {
  const modules = collectModuleGraph(projectRoot);
  const lines = [
    'var __coldboxNobleModules = Object.create(null);',
    'var __coldboxNobleCache = Object.create(null);',
    'function __coldboxNobleLoad(id) {',
    '  if (__coldboxNobleCache[id]) return __coldboxNobleCache[id];',
    '  var module = { exports: {} };',
    '  __coldboxNobleCache[id] = module.exports;',
    '  __coldboxNobleModules[id](module.exports, __coldboxNobleLoad);',
    '  return module.exports;',
    '}'
  ];
  [...modules.keys()].sort().forEach((moduleId) => {
    lines.push(`__coldboxNobleModules[${JSON.stringify(moduleId)}] = function (exports, load) {`);
    lines.push(transformModule(moduleId, modules.get(moduleId)));
    lines.push('};');
  });
  lines.push('var __coldboxNobleAes = __coldboxNobleLoad("@noble/ciphers/aes.js");');
  lines.push('var __coldboxNobleHash = __coldboxNobleLoad("@noble/hashes/sha2.js");');
  lines.push('var __coldboxNobleHkdf = __coldboxNobleLoad("@noble/hashes/hkdf.js");');
  lines.push('var __coldboxNoblePbkdf2 = __coldboxNobleLoad("@noble/hashes/pbkdf2.js");');
  lines.push('var __coldboxNobleHashUtils = __coldboxNobleLoad("@noble/hashes/utils.js");');
  lines.push('window.__coldboxNobleCrypto = Object.freeze({');
  lines.push('  gcm: __coldboxNobleAes.gcm,');
  lines.push('  hkdf: __coldboxNobleHkdf.hkdf,');
  lines.push('  pbkdf2: __coldboxNoblePbkdf2.pbkdf2,');
  lines.push('  pbkdf2Async: __coldboxNoblePbkdf2.pbkdf2Async,');
  lines.push('  sha256: __coldboxNobleHash.sha256,');
  lines.push('  sha512: __coldboxNobleHash.sha512,');
  lines.push('  utf8ToBytes: __coldboxNobleHashUtils.utf8ToBytes');
  lines.push('});');
  return `${lines.join('\n')}\n`;
}

function createCryptoVendorSource(projectRoot) {
  const argon2Source = normalizeDoubleQuotedStrings(
    readVendorFile(projectRoot, 'argon2-browser/dist/argon2-bundled.min.js')
  );
  return `${argon2Source}\n${createNobleBundle(projectRoot)}`;
}

module.exports = Object.freeze({
  createCryptoVendorSource
});
