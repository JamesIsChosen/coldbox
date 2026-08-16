'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const warmHtml = fs.readFileSync(path.join(root, 'src', 'index.html'), 'utf8');
const warmCss = fs.readFileSync(path.join(root, 'src', 'styles.css'), 'utf8');

const groups = {
  Records: ['registry', 'devices', 'verify', 'qr'],
  Money: ['dashboard'],
  'Vault files': ['vault', 'backup'],
  Reference: ['reference', 'learn']
};

test('UI.8 exposes exactly four warm workspace groups with built routes', () => {
  const navGroups = [...warmHtml.matchAll(/<nav class="nav-group" aria-label="([^"]+)">/g)].map((match) => match[1]);
  assert.deepEqual(navGroups, Object.keys(groups));
  for (const [label, routes] of Object.entries(groups)) {
    const groupMatch = warmHtml.match(new RegExp(`<nav class="nav-group" aria-label="${label}">([\\s\\S]*?)</nav>`));
    assert.ok(groupMatch, `${label} group is missing`);
    for (const route of routes) {
      assert.match(groupMatch[1], new RegExp(`href="#${route}" data-route="${route}"`), `${label} is missing its ${route} route`);
      assert.match(warmHtml, new RegExp(`<section class="page" id="page-${route}" data-page="${route}"`), `${route} has no built warm page`);
    }
  }
});

test('UI.8 keeps the sealed realm entry outside warm workspaces and preserves reference routing', () => {
  assert.match(warmHtml, /<div class="nav-sealed-entry" aria-label="Sealed realm navigation">/);
  assert.doesNotMatch(warmHtml, /<nav class="nav-group[^"]*" aria-label="Sealed work">/);
  assert.equal((warmHtml.match(/data-route="reference"/g) || []).length, 3, 'built desktop and mobile Reference links must participate in route highlighting');
  assert.match(warmHtml, /nav-sealed-entry[\s\S]*href="#cold-realm-status"/);
  const workspaceMarkup = warmHtml.match(/<nav class="nav-group" aria-label="Records">([\s\S]*?)<div class="nav-sealed-entry" aria-label="Sealed realm navigation">/)[1];
  assert.doesNotMatch(workspaceMarkup, /<(?:input|textarea)\b|data-secret=/i, 'workspace navigation must not gain secret-capable controls');
  assert.match(warmCss, /\.nav-sealed-entry\s*\{/);
});
