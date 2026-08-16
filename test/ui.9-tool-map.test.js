'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const warmHtml = fs.readFileSync(path.join(projectRoot, 'src', 'index.html'), 'utf8');
const warmScript = fs.readFileSync(path.join(projectRoot, 'src', 'main.js'), 'utf8');

test('Tool map is a built route with no hand-transcribed roadmap status in src', () => {
  assert.match(warmHtml, /href="#tool-map" data-route="tool-map"/);
  assert.match(warmHtml, /id="page-tool-map" data-page="tool-map"/);
  assert.match(warmHtml, /id="tool-map-list"/);
  assert.doesNotMatch(warmHtml, /data-roadmap-id="UI\.9"/);
  assert.match(warmScript, /var TOOL_MAP = __COLDBOX_TOOL_MAP__/);
  assert.match(warmScript, /'tool-map': Object\.freeze/);
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
