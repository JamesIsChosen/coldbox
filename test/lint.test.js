'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const lintScript = path.join(projectRoot, 'scripts', 'lint.js');
const buildScript = path.join(projectRoot, 'scripts', 'build.js');
const fixtureRoot = path.join(projectRoot, 'test', 'fixtures', 'lint');

function createLintRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coldbox-lint-'));
  fs.mkdirSync(path.join(root, 'src', 'cold'), { recursive: true });
  return root;
}

function runLint(root) {
  return spawnSync(process.execPath, [lintScript, '--root', root], {
    cwd: projectRoot,
    encoding: 'utf8'
  });
}

function combinedOutput(result) {
  return `${result.stdout}\n${result.stderr}`;
}

test('each forbidden-construct fixture is rejected', () => {
  const cases = [
    ['eval', 'eval.fixture'],
    ['new Function', 'new-function.fixture'],
    ['import', 'import.fixture'],
    ['require', 'require.fixture'],
    ['external URL', 'external-url.fixture'],
    ['localStorage', 'local-storage.fixture'],
    ['Math.random', 'math-random.fixture']
  ];

  for (const [name, fixture] of cases) {
    const root = createLintRoot();
    try {
      fs.copyFileSync(
        path.join(fixtureRoot, 'cold', fixture),
        path.join(root, 'src', 'cold', fixture.replace('.fixture', '.js'))
      );
      const result = runLint(root);
      assert.notEqual(result.status, 0, `${name} fixture unexpectedly passed`);
      assert.match(combinedOutput(result), new RegExp(`Forbidden construct \\"${name}\\"`));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});

test('external URLs and localStorage remain available in warm source', () => {
  const root = createLintRoot();
  try {
    fs.copyFileSync(
      path.join(fixtureRoot, 'warm-allowed.fixture'),
      path.join(root, 'src', 'warm-allowed.js')
    );
    const result = runLint(root);
    assert.equal(result.status, 0, combinedOutput(result));
    assert.match(result.stdout, /Lint passed/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('brand asset lint rejects external URLs in textual SVG assets', () => {
  const root = createLintRoot();
  try {
    const brandRoot = path.join(root, 'assets', 'brand');
    fs.mkdirSync(brandRoot, { recursive: true });
    fs.writeFileSync(
      path.join(brandRoot, 'external.svg'),
      '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil.example/icon.png"/></svg>\n',
      'utf8'
    );
    const result = runLint(root);
    assert.notEqual(result.status, 0);
    assert.match(combinedOutput(result), /Forbidden construct "external URL"/);
    assert.match(combinedOutput(result), /assets[\\/]brand[\\/]external\.svg/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('the required wasm-unsafe-eval CSP token is not treated as JavaScript eval', () => {
  const root = createLintRoot();
  try {
    const policyPath = path.join(root, 'src', 'index.html');
    fs.writeFileSync(policyPath, '<meta http-equiv="Content-Security-Policy" content="script-src \'wasm-unsafe-eval\'">\n', 'utf8');
    const result = runLint(root);
    assert.equal(result.status, 0, combinedOutput(result));
    assert.match(result.stdout, /Lint passed/);

    fs.writeFileSync(policyPath, '<meta http-equiv="Content-Security-Policy" content="script-src \'unsafe-eval\'">\n', 'utf8');
    const unsafeResult = runLint(root);
    assert.notEqual(unsafeResult.status, 0);
    assert.match(combinedOutput(unsafeResult), /Forbidden construct "eval"/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('the build invokes forbidden-construct lint and refuses a bad source file', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coldbox-build-lint-'));
  try {
    for (const directory of ['scripts', 'src', 'vendor']) {
      fs.cpSync(path.join(projectRoot, directory), path.join(root, directory), { recursive: true });
    }
    const mainPath = path.join(root, 'src', 'main.js');
    fs.appendFileSync(mainPath, "\nvar forbidden = eval;\n", 'utf8');

    const result = spawnSync(process.execPath, [buildScript.replace(projectRoot, root)], {
      cwd: root,
      encoding: 'utf8'
    });
    assert.notEqual(result.status, 0);
    assert.match(combinedOutput(result), /Forbidden construct "eval"/);
    assert.match(combinedOutput(result), /Build refused: source failed forbidden-construct lint/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
