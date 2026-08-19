'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const warmHtml = fs.readFileSync(path.join(root, 'src', 'index.html'), 'utf8');
const warmCss = fs.readFileSync(path.join(root, 'src', 'styles.css'), 'utf8');

// UI.8 grouped the warm shell into Records / Money / Vault files / Reference.
// UI.10b replaced that taxonomy with the maintainer-approved object-first one
// (ADR-0059, ui-parity.md section 6.2), so the group names this item shipped are
// superseded. What UI.8 actually guaranteed - that the warm rail is grouped,
// that every group's routes resolve to a built warm page, and that navigation
// never gains a secret-capable control - is unchanged and is what this file now
// asserts. The taxonomy itself is checked against the approved manifest in
// test/ui.10b-workstation-shell.test.js.
const groups = {
  Workspace: ['dashboard', 'wallets', 'backup', 'security'],
  Records: ['registry', 'devices'],
  'Trust &amp; reference': ['reference', 'learn', 'tool-map'],
  'Vault &amp; settings': ['vault', 'settings', 'advanced'],
  'Sealed work': []
};

test('UI.8 groups the warm workspace and every grouped route has a built page', () => {
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

test('UI.8 keeps the sealed realm entry out of every warm workspace and preserves reference routing', () => {
  // The approved design gives the sealed destination its own terminal rail
  // group instead of a single strip appended after the warm workspaces. The
  // guarantee is the same one UI.8 made - entering the sealed realm is never one
  // item inside a list of warm work - and it is now expressed as a group of one.
  const sealed = /<nav class="nav-group" aria-label="Sealed work">([\s\S]*?)<\/nav>/.exec(warmHtml);
  assert.ok(sealed, 'the sealed destination must have its own rail group');
  assert.match(sealed[1], /href="#cold-realm-status"/);
  assert.equal((sealed[1].match(/class="nav-link"/g) || []).length, 1, 'the sealed group holds exactly one destination');

  const warmWorkspaces = [...warmHtml.matchAll(/<nav class="nav-group" aria-label="([^"]+)">([\s\S]*?)<\/nav>/g)]
    .filter((match) => match[1] !== 'Sealed work');
  for (const [, label, markup] of warmWorkspaces) {
    assert.doesNotMatch(markup, /href="#cold-realm-status"/, `${label} must not carry the sealed-realm entry`);
    assert.doesNotMatch(markup, /<(?:input|textarea)\b|data-secret=/i, `${label} navigation must not gain secret-capable controls`);
  }

  // The original assertion pinned a count of three. Counting links is a proxy
  // for the property that actually matters and it breaks every time a page gains
  // a cross-link, so state the property instead: every anchor that navigates to
  // a built route declares that route, and therefore participates in rail
  // highlighting and the announced breadcrumb.
  //
  // Scoped to the navigation surfaces themselves - the rail, the phone bar, the
  // More sheet and the flow index. A call-to-action button inside a page body
  // legitimately links to a route without claiming to be the current
  // destination, and the realm switcher carries its own active state.
  const navSelectors = /class="(?:nav-link|mobile-tab|mobile-more-link|flow-index-link)"/;
  const anchors = [...warmHtml.matchAll(/<a\b[^>]*href="#([a-z-]+)"[^>]*>/g)];
  assert.ok(anchors.length > 0);
  const routed = new Set([...warmHtml.matchAll(/data-page="([a-z-]+)"/g)].map((match) => match[1]));
  let checked = 0;
  for (const [tag, target] of anchors) {
    if (!routed.has(target) || !navSelectors.test(tag)) {
      continue;
    }
    checked += 1;
    assert.match(
      tag,
      new RegExp(`data-route="${target}"`),
      `a navigation anchor to #${target} does not declare its route: ${tag}`
    );
  }
  assert.ok(checked >= 15, `expected the warm navigation surfaces to be checked, saw ${checked}`);
  assert.ok([...warmHtml.matchAll(/data-route="reference"/g)].length >= 3, 'the Reference destinations must remain routed');
  assert.match(warmCss, /\.nav-group\[aria-label="Sealed work"\]\s*\{/);
});
