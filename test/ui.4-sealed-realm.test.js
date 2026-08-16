'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const sourceRoot = path.join(projectRoot, 'src');

function walkFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(absolute));
    } else {
      files.push(absolute);
    }
  }
  return files;
}

function loadSourceFiles(extension) {
  const files = new Map();
  for (const absolute of walkFiles(sourceRoot).filter((file) => file.endsWith(extension))) {
    const relative = path.relative(projectRoot, absolute).replaceAll(path.sep, '/');
    files.set(relative, fs.readFileSync(absolute, 'utf8'));
  }
  return files;
}

const sourceHtmlFiles = loadSourceFiles('.html');
const sourceJsFiles = loadSourceFiles('.js');
const coldHtml = sourceHtmlFiles.get('src/cold/index.html');
const coldSource = sourceJsFiles.get('src/cold/main.js');

function parseAttributes(tag) {
  const attributes = new Map();
  for (const match of tag.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attributes;
}

function extractRegistry(source) {
  const marker = 'var COLD_SECRET_INPUT_REGISTRY = Object.freeze(';
  const start = source.indexOf(marker);
  assert.ok(start >= 0, 'ADR-0045 registry declaration is missing');
  const arrayStart = source.indexOf('[', start + marker.length);
  assert.ok(arrayStart >= 0, 'ADR-0045 registry array is missing');

  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = arrayStart; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === '[') depth += 1;
    if (character === ']') {
      depth -= 1;
      if (depth === 0) {
        return vm.runInNewContext(source.slice(arrayStart, index + 1));
      }
    }
  }
  throw new Error('ADR-0045 registry array is unbalanced');
}

function registryModel(registry) {
  const exact = new Map();
  const prefixes = [];
  for (const entry of registry) {
    assert.equal(typeof entry.category, 'string');
    for (const id of entry.ids || []) {
      assert.equal(exact.has(id), false, `duplicate registry declaration for ${id}`);
      exact.set(id, entry.category);
    }
    for (const prefix of entry.prefixes || []) {
      assert.equal(prefixes.some((record) => record.prefix === prefix), false, `duplicate registry prefix for ${prefix}`);
      prefixes.push({ prefix, category: entry.category });
    }
  }
  return {
    categoryFor(id) {
      if (exact.has(id)) return exact.get(id);
      const match = prefixes.find((record) => id.startsWith(record.prefix));
      if (match && /^\d+$/.test(id.slice(match.prefix.length))) return match.category;
      return null;
    },
    exact,
    prefixes
  };
}

function extractFunctionDeclaration(source, name) {
  const declaration = new RegExp('function ' + name + '\\s*\\([^)]*\\)\\s*\\{');
  const match = declaration.exec(source);
  assert.ok(match, `function ${name} not found in source`);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = match.index + match[0].length - 1; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(match.index, index + 1);
    }
  }
  throw new Error(`Unbalanced function ${name}`);
}

function auditStaticInputSurfaces(htmlFiles, model) {
  const seen = new Set();
  for (const [file, source] of htmlFiles) {
    for (const match of source.matchAll(/<(input|textarea|select)\b[^>]*>/gi)) {
      const attributes = parseAttributes(match[0]);
      const id = attributes.get('id');
      assert.ok(id, `${file} has a form control without an id`);
      assert.equal(seen.has(`${file}:${id}`), false, `duplicate form-control id ${file}:${id}`);
      seen.add(`${file}:${id}`);

      const surface = attributes.get('data-input-surface');
      assert.ok(
        surface === 'public' || surface === 'secret',
        `${file}#${id} must declare data-input-surface=public or secret`
      );
      const category = attributes.get('data-secret-input-category');
      if (surface === 'secret') {
        assert.equal(file, 'src/cold/index.html', `${file}#${id} cannot accept sealed secret material outside cold`);
        assert.equal(category, model.categoryFor(id), `${file}#${id} category must match ADR-0045 registry`);
        assert.notEqual(category, null, `${file}#${id} is secret but undeclared`);
      } else {
        assert.equal(category, undefined, `${file}#${id} public control must not carry a secret category`);
        assert.equal(model.categoryFor(id), null, `${file}#${id} is registry-declared but marked public`);
      }

      if ((attributes.get('type') || '').toLowerCase() === 'password') {
        assert.equal(surface, 'secret', `${file}#${id} password input must be marked secret`);
      }
    }
  }

  for (const [id, category] of model.exact) {
    const staticMatches = [...htmlFiles].flatMap(([file, source]) => {
      return [...source.matchAll(new RegExp(`<(?:input|textarea|select)\\b[^>]*\\bid="${id}"[^>]*>`, 'gi'))]
        .map((match) => ({ file, tag: match[0] }));
    });
    assert.ok(staticMatches.length > 0, `${id} is declared but has no static source control`);
    assert.equal(staticMatches.length, 1, `${id} must have one static source control`);
    const attributes = parseAttributes(staticMatches[0].tag);
    assert.equal(attributes.get('data-input-surface'), 'secret');
    assert.equal(attributes.get('data-secret-input-category'), category);
  }
}

function auditDynamicInputSurfaces(jsFiles) {
  const dynamicControls = [];
  const creationPattern = /\b(?:[A-Za-z_$][\w$]*\.)*createElement\s*\(\s*([^)]*?)\s*\)/g;
  for (const [file, source] of jsFiles) {
    for (const match of source.matchAll(creationPattern)) {
      const argument = match[1].trim();
      const literal = /^(['"])([^'"]+)\1$/.exec(argument);
      assert.ok(literal, `${file} dynamic element type must be a quoted literal`);
      const tag = literal[2].toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag)) {
        dynamicControls.push({ file, tag, index: match.index });
      }
    }
  }

  const inputControls = dynamicControls.filter((control) => control.tag === 'input');
  assert.equal(inputControls.length, 1, 'all dynamic secret inputs must use one declared factory');
  assert.equal(inputControls[0].file, 'src/cold/main.js');
  const currentColdSource = jsFiles.get('src/cold/main.js');
  const factory = extractFunctionDeclaration(currentColdSource, 'createDeclaredSecretInput');
  assert.match(factory, /declaredSecretInputCategory\(id\) !== category/);
  assert.match(factory, /data-input-surface', 'secret'/);
  assert.match(factory, /data-secret-input-category', category/);

  const textareaControls = dynamicControls.filter((control) => control.tag === 'textarea');
  assert.equal(textareaControls.length, 1, 'unexpected dynamic textarea surface');
  assert.equal(textareaControls[0].file, 'src/capabilities.js');
  assert.match(
    jsFiles.get('src/capabilities.js'),
    /textarea\.setAttribute\('data-input-surface', 'public'\)/
  );

  assert.equal(dynamicControls.some((control) => control.tag === 'select'), false, 'dynamic select surfaces need a declaration');
  const registry = extractRegistry(currentColdSource);
  const model = registryModel(registry);
  for (const entry of model.prefixes) {
    const occurrences = (currentColdSource.match(new RegExp(entry.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    assert.ok(occurrences >= 2, `${entry.prefix} must appear in its registry and dynamic factory call`);
  }
}

function assertRemovedDuplicateSources() {
  const coldDocumentIds = new Set(
    Array.from(coldHtml.matchAll(/\bid="([^"]+)"/g), (match) => match[1])
  );
  for (const removedId of [
    'cold-seed-xor-source',
    'cold-codex32-secret-hex',
    'cold-shamir39-source',
    'cold-raw-sss-source',
    'cold-slip39-seed-source'
  ]) {
    assert.equal(coldDocumentIds.has(removedId), false);
    assert.equal(coldSource.includes(removedId), false, `${removedId} must not remain in cold code`);
  }
}

test('UI.4 keeps one declared seed-entry surface and audits every source form control', () => {
  const registry = extractRegistry(coldSource);
  const seedEntries = registry.filter((entry) => entry.category === 'seed-entry');
  assert.equal(seedEntries.length, 1, 'exactly one registry entry may carry category seed-entry');
  assert.deepEqual(Array.from(seedEntries[0].ids), ['cold-seed-forge-mnemonic-input']);
  assert.equal(seedEntries[0].prefixes, undefined);

  const model = registryModel(registry);
  auditStaticInputSurfaces(sourceHtmlFiles, model);
  auditDynamicInputSurfaces(sourceJsFiles);
  assert.equal(model.categoryFor('cold-seed-forge-mnemonic-input'), 'seed-entry');
  assertRemovedDuplicateSources();
});

test('UI.4 registry audit rejects unmarked static and dynamic secret controls', () => {
  const model = registryModel(extractRegistry(coldSource));
  const mutatedHtml = new Map(sourceHtmlFiles);
  mutatedHtml.set(
    'src/index.html',
    `${sourceHtmlFiles.get('src/index.html')}\n<input id="undeclared-static-secret" type="password">\n`
  );
  assert.throws(
    () => auditStaticInputSurfaces(mutatedHtml, model),
    /data-input-surface|password input must be marked secret/
  );

  const mutatedJs = new Map(sourceJsFiles);
  mutatedJs.set(
    'src/cold/new-tool.js',
    "function undeclaredDynamicSecret() { return document.createElement('input'); }"
  );
  assert.throws(
    () => auditDynamicInputSurfaces(mutatedJs),
    /dynamic secret inputs/
  );

  const nonLiteralDynamic = new Map(sourceJsFiles);
  nonLiteralDynamic.set(
    'src/cold/new-tool.js',
    "function undeclaredDynamicSurface(tag) { return document.createElement(tag); }"
  );
  assert.throws(
    () => auditDynamicInputSurfaces(nonLiteralDynamic),
    /quoted literal/
  );
});

test('UI.4 creates six sealed groups and leaves the cold CSP network rule unchanged', () => {
  const groups = Array.from(coldHtml.matchAll(/<section\b[^>]*data-cold-group="([^"]+)"/g), (match) => match[1]);
  assert.deepEqual(groups, ['session', 'entropy', 'seed-forge', 'backups', 'qr', 'recovery']);
  const policy = /<meta http-equiv="Content-Security-Policy" content="([^"]+)">/i.exec(coldHtml);
  assert.ok(policy, 'cold CSP meta tag is missing');
  assert.equal(
    policy[1],
    "default-src 'none'; script-src __COLDBOX_COLD_SCRIPT_HASHES__ 'wasm-unsafe-eval'; style-src __COLDBOX_COLD_STYLE_HASHES__; img-src data: blob:; media-src blob:; font-src data:; connect-src 'none'; form-action 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; worker-src blob:;"
  );
  assert.equal(coldHtml.includes('id="cold-tool-hub"'), true);
  const hubTargets = Array.from(
    coldHtml.matchAll(/<a\b[^>]*class="cold-tool-hub-link"[^>]*href="#([^"]+)"/g),
    (match) => match[1]
  );
  assert.deepEqual(hubTargets, groups.map((group) => `cold-group-${group}`));
});
