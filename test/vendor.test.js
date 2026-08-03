'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const verifier = path.join(projectRoot, 'scripts', 'verify-vendor.js');
const buildScript = path.join(projectRoot, 'scripts', 'build.js');
const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, 'vendor', 'vendor-manifest.json'), 'utf8'));

function createTestRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coldbox-vendor-'));
  fs.cpSync(path.join(projectRoot, 'vendor'), path.join(root, 'vendor'), { recursive: true });
  fs.cpSync(path.join(projectRoot, 'scripts'), path.join(root, 'scripts'), { recursive: true });
  fs.cpSync(path.join(projectRoot, 'src'), path.join(root, 'src'), { recursive: true });
  return root;
}

function runNode(script, args) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: projectRoot,
    encoding: 'utf8'
  });
}

function runOffline(root) {
  return spawnSync(process.execPath, [verifier, '--offline', '--root', root], {
    cwd: projectRoot,
    encoding: 'utf8'
  });
}

function copyManifest() {
  return JSON.parse(JSON.stringify(manifest));
}

function writeManifest(root, value) {
  fs.writeFileSync(path.join(root, 'vendor', 'vendor-manifest.json'), `${JSON.stringify(value, null, 2)}\n`);
}

test('offline vendor verification accepts the pinned artifacts', () => {
  const result = runNode(verifier, ['--offline']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Vendor verification passed in offline mode\./);
});

test('a corrupted vendor artifact fails verification and blocks the build', () => {
  const root = createTestRoot();
  try {
    const artifact = manifest.artifacts[0];
    const artifactPath = path.join(root, artifact.path);
    const bytes = fs.readFileSync(artifactPath);
    bytes[0] ^= 0xff;
    fs.writeFileSync(artifactPath, bytes);

    const verification = spawnSync(process.execPath, [path.join(root, 'scripts', 'verify-vendor.js'), '--offline'], {
      cwd: root,
      encoding: 'utf8'
    });
    assert.notEqual(verification.status, 0);
    assert.match(`${verification.stdout}\n${verification.stderr}`, /Vendor (SHA-256|integrity) mismatch/);

    const build = spawnSync(process.execPath, [path.join(root, 'scripts', 'build.js')], {
      cwd: root,
      encoding: 'utf8'
    });
    assert.notEqual(build.status, 0);
    assert.match(`${build.stdout}\n${build.stderr}`, /Build refused|Vendor (SHA-256|integrity) mismatch/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('canonical path, URL, and package metadata identity mismatches fail closed', () => {
  const cases = [
    {
      label: 'path',
      mutate(value) {
        value.artifacts[0].path = value.artifacts[1].path;
      },
      expected: /Non-canonical vendor path/
    },
    {
      label: 'URL',
      mutate(value) {
        value.artifacts[0].url = value.artifacts[1].url;
      },
      expected: /Non-canonical npm tarball URL/
    },
    {
      label: 'package metadata',
      mutate(value, root) {
        const labelled = value.artifacts[0];
        const actual = value.artifacts[2];
        fs.copyFileSync(path.join(root, actual.path), path.join(root, labelled.path));
        labelled.size = actual.size;
        labelled.sha256 = actual.sha256;
        labelled.integrity = actual.integrity;
      },
      expected: /package identity mismatch/
    }
  ];

  for (const currentCase of cases) {
    const root = createTestRoot();
    try {
      const changed = copyManifest();
      currentCase.mutate(changed, root);
      writeManifest(root, changed);
      const result = runOffline(root);
      assert.notEqual(result.status, 0, `${currentCase.label} mismatch was accepted`);
      assert.match(`${result.stdout}\n${result.stderr}`, currentCase.expected);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});

test('an unmanifested vendor artifact fails closed', () => {
  const root = createTestRoot();
  try {
    const source = path.join(root, manifest.artifacts[0].path);
    fs.copyFileSync(source, path.join(root, 'vendor', 'unlisted-malicious.tgz'));
    const result = runOffline(root);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /Unmanifested vendor artifact/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
