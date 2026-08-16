'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const warmHtml = fs.readFileSync(path.join(projectRoot, 'src', 'index.html'), 'utf8');
const warmScript = fs.readFileSync(path.join(projectRoot, 'src', 'main.js'), 'utf8');

function copyBuildFixture() {
  const root = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'coldbox-tool-map-build-'));
  fs.cpSync(projectRoot, root, {
    recursive: true,
    filter(source) {
      return !['node_modules', 'build', '.git', '.codex'].some((excluded) =>
        source === path.join(projectRoot, excluded) || source.startsWith(path.join(projectRoot, excluded) + path.sep)
      );
    }
  });
  return root;
}

test('Tool map is a built route with no hand-transcribed roadmap status in src', () => {
  assert.match(warmHtml, /href="#tool-map" data-route="tool-map"/);
  assert.match(warmHtml, /id="page-tool-map" data-page="tool-map"/);
  assert.match(warmHtml, /id="tool-map-list"/);
  assert.doesNotMatch(warmHtml, /data-roadmap-id="UI\.9"/);
  const sourceFiles = [];
  function collect(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) collect(absolute);
      else if (entry.isFile() && /\.(html|js|css)$/.test(entry.name)) sourceFiles.push(absolute);
    }
  }
  collect(path.join(projectRoot, 'src'));
  for (const file of sourceFiles) {
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /data-roadmap-id="UI\.9"|data-phase="UI 9"/, file);
  }
  assert.match(warmScript, /var TOOL_MAP = __COLDBOX_TOOL_MAP__/);
  assert.match(warmScript, /'tool-map': Object\.freeze/);
});

test('the build fails non-zero for malformed and duplicate ROADMAP fixtures', () => {
  for (const replacement of [
    '# Roadmap\n\n- [ ] **P0.1**\n',
    '# Roadmap\n\n- [ ] **P0.1 — One**\n- [x] **P0.1 — Duplicate**\n'
  ]) {
    const fixture = copyBuildFixture();
    try {
      const roadmapPath = path.join(fixture, 'docs', '05-development', 'ROADMAP.md');
      fs.writeFileSync(roadmapPath, replacement, 'utf8');
      const result = spawnSync(process.execPath, [path.join(fixture, 'scripts', 'build.js')], {
        cwd: fixture,
        encoding: 'utf8'
      });
      assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
      assert.equal(fs.existsSync(path.join(fixture, 'build', 'coldbox.html')), false);
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  }
});

test('built Tool map contains the current roadmap status and all parsed items', () => {
  const build = spawnSync(process.execPath, [path.join(projectRoot, 'scripts', 'build.js')], {
    cwd: projectRoot,
    encoding: 'utf8'
  });
  assert.equal(build.status, 0, `${build.stdout}\n${build.stderr}`);
  const built = fs.readFileSync(path.join(projectRoot, 'build', 'coldbox.html'), 'utf8');
  assert.match(built, /"source":"docs\/05-development\/ROADMAP\.md"/);
  assert.match(built, /"id":"UI\.9"[\s\S]{0,240}"status":"in-progress"/);
  assert.match(built, /"id":"P0\.1"/);
  assert.doesNotMatch(built, /__COLDBOX_TOOL_MAP__/);
});
