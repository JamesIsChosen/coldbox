'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const warmHtml = fs.readFileSync(path.join(root, 'src', 'index.html'), 'utf8');
const warmCss = fs.readFileSync(path.join(root, 'src', 'styles.css'), 'utf8');
const mainJs = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
const coldHtml = fs.readFileSync(path.join(root, 'src', 'cold', 'index.html'), 'utf8');
const coldCss = fs.readFileSync(path.join(root, 'src', 'cold', 'styles.css'), 'utf8');

// UI.10b replaced the ten tool-first navigation groups this item shipped with
// the eleven object-first groups of the maintainer-approved workstation design
// (ADR-0059, ui-parity.md section 6.2). The taxonomy itself is asserted against
// the approved manifest in test/ui.10b-workstation-shell.test.js; what stays
// here is UI.5's own durable contract - that both realms carry a grouped rail,
// that unbuilt entries are unfocusable disabled controls naming their owner,
// that the boundary strips are calm, that the phone navigation is five slots
// with a More sheet, and that both realms share one chrome vocabulary.
const warmGroups = ['Workspace', 'Records', 'Trust &amp; reference', 'Vault &amp; settings', 'Sealed work'];
const coldGroups = ['Seeds &amp; lineage', 'Forge', 'Derive', 'Split &amp; carry', 'Recover &amp; verify', 'Session'];
const warmMoreInventory = ['Devices', 'Security &amp; verify', 'Records &amp; registry', 'Backup Health', 'Prices &amp; FX · P3.1 · Phase 3', 'Tax &amp; exports · P3.9 · Phase 3', 'Reference &amp; help', 'Vault files', 'Settings', 'Every flow', 'Learn', 'Tool map'];
const coldMoreInventory = ['Vault session', 'Entropy Lab', 'Seed Forge', 'Child seeds · BIP-85 · P4.6 · Phase 4', 'Passphrase Studio · P4.5 · Phase 4', 'Descriptors · P4.9 · Phase 4', 'SeedQR studio', 'Backup Health', 'Recovery assistant · P4.3a · Phase 4', 'Verify Bench', 'Reveal hidden', 'Secret notes', 'Active secret', 'Lock &amp; wipe'];

test('UI.5 implements a grouped navigation rail in both realms', () => {
  for (const label of coldGroups) {
    assert.match(coldHtml, new RegExp(`<nav class="cold-nav-group" aria-label="${label}">`), `cold group ${label} is missing`);
  }
  for (const label of warmGroups) {
    assert.match(warmHtml, new RegExp(`<nav class="nav-group" aria-label="${label}">`), `warm group ${label} is missing`);
  }
});

test('unbuilt navigation entries are disabled controls with roadmap and phase labels', () => {
  const unavailable = warmHtml.match(/<button class="nav-link nav-link-unavailable"[\s\S]*?<\/button>/g) || [];
  const coldUnavailable = coldHtml.match(/<button class="cold-nav-link cold-nav-link-unavailable"[\s\S]*?<\/button>/g) || [];
  // UI.5 shipped four unavailable warm entries; Reference & help is a live
  // destination under the workstation design, so three remain. The exact set is
  // no longer this test's business - test/ui.10b-workstation-shell.test.js
  // asserts every rail entry against the approved manifest and every owner
  // against ROADMAP.md, which is strictly stronger than a count. What stays here
  // is UI.5's own contract: whatever is unavailable is a disabled, unfocusable
  // control that names its owner and phase.
  assert.ok(unavailable.length >= 1, 'warm rail must expose unavailable roadmap entries');
  assert.ok(coldUnavailable.length >= 4, 'cold rail must expose unavailable roadmap entries');
  for (const item of unavailable.concat(coldUnavailable)) {
    assert.match(item, /disabled/);
    assert.match(item, /aria-disabled="true"/);
    // Sub-items carry a lowercase suffix: P0.3a, P4.3a, SEC.7a, UI.10a.
    assert.match(item, /data-roadmap-id="[A-Z]+[0-9.]+[a-z]?"/);
    // Phases gained names when the SEC/SEED/WAL campaigns were accepted, so a
    // phase label is no longer always numeric.
    assert.match(item, /data-phase="(?:Phase|UI) [0-9A-Za-z.]+"/);
    assert.match(item, /· (?:Phase|UI) [0-9A-Za-z.]+/);
  }
  // P4.3 was never a roadmap item - it is split into P4.3a..P4.3e - so the
  // recovery assistant now names the item that actually exists.
  assert.match(coldHtml, /data-roadmap-id="P4\.3a" data-phase="Phase 4"/);
  assert.doesNotMatch(coldHtml, /<a class="cold-nav-link" href="#cold-group-recovery">[\s\S]*Recovery assistant/);
  assert.match(coldHtml, /cold-mobile-more-link-unavailable[\s\S]*Recovery assistant · P4\.3a · Phase 4/);
});

test('each realm has a calm striped boundary strip and five-slot phone navigation', () => {
  assert.match(warmHtml, /class="realm-strip realm-strip-warm"/);
  assert.match(coldHtml, /class="realm-strip realm-strip-cold"/);
  assert.match(warmCss, /\.realm-strip[\s\S]*?repeating-linear-gradient\(45deg/);
  assert.match(coldCss, /\.realm-strip-cold[\s\S]*?repeating-linear-gradient\(45deg/);
  assert.doesNotMatch(warmCss, /\.realm-strip[^{]*\{[^}]*animation/);
  assert.doesNotMatch(coldCss, /\.realm-strip[^{]*\{[^}]*animation/);
  assert.match(warmCss, /\.mobile-tabs[\s\S]*?grid-template-columns:\s*repeat\(5/);
  assert.match(coldCss, /\.cold-mobile-tabs[\s\S]*?grid-template-columns:\s*repeat\(5/);
});

test('navigation touch targets are at least 44px and unavailable items cannot receive focus', () => {
  assert.match(warmCss, /\.nav-link\s*\{[\s\S]*?min-height:\s*44px/);
  assert.match(warmCss, /\.mobile-tab\s*\{[\s\S]*?min-height:\s*3rem/);
  assert.match(warmCss, /\.mobile-more-link\s*\{[\s\S]*?min-height:\s*44px/);
  assert.match(warmCss, /\.icon-button-small\s*\{[\s\S]*?width:\s*44px[\s\S]*?min-height:\s*44px/);
  assert.match(coldCss, /\.cold-nav-link\s*\{[\s\S]*?min-height:\s*2\.75rem/);
  assert.match(coldCss, /\.cold-mobile-tabs a\s*\{[\s\S]*?min-height:\s*2\.75rem/);
  assert.match(coldCss, /\.cold-mobile-more-links a,\s*\.cold-mobile-more-links \.cold-mobile-more-link\s*\{[\s\S]*?min-height:\s*2\.75rem/);
  assert.match(warmHtml, /<button class="nav-link nav-link-unavailable"[^>]*type="button" disabled/);
  assert.match(coldHtml, /<button class="cold-nav-link cold-nav-link-unavailable" type="button" disabled/);
  // The approved bottom bar is five available object slots, so the phone bar no
  // longer carries an unavailable tab at all. Unavailable warm destinations live
  // in the More sheet, where they are still disabled controls naming an owner.
  assert.doesNotMatch(warmHtml, /class="mobile-tab mobile-tab-unavailable"/);
  assert.match(warmHtml, /mobile-more-link-unavailable[^>]*aria-disabled="true"[^>]*data-roadmap-id="P3\.4"/);
});

test('mobile More sheets match the approved route inventories', () => {
  for (const item of warmMoreInventory) assert.ok(warmHtml.includes(item), `warm More inventory is missing ${item}`);
  for (const item of coldMoreInventory) assert.ok(coldHtml.includes(item), `cold More inventory is missing ${item}`);
  assert.doesNotMatch(warmHtml, /<a class="mobile-tab" href="#(?:prices|portfolio)"/);
  assert.doesNotMatch(coldHtml, /SLIP-39 &amp; verification/);
  for (const id of ['P3.1', 'P3.9', 'P3.4']) {
    assert.match(warmHtml, new RegExp(`mobile-more-link-unavailable[^>]*aria-disabled="true"[^>]*data-roadmap-id="${id.replace('.', '\\.') }"`));
  }
  // P1.5 was the wrong owner for Child seeds - that is P4.6 - and P4.3 is not a
  // roadmap item at all; it is split into P4.3a..P4.3e.
  for (const id of ['P4.6', 'P4.5', 'P4.9', 'P4.3a']) {
    assert.match(coldHtml, new RegExp(`cold-mobile-more-link-unavailable[^>]*aria-disabled="true"[^>]*data-roadmap-id="${id.replace('.', '\\.') }"`));
  }
  assert.match(coldHtml, /href="#cold-concealment-controls" data-cold-more-target="cold-concealment-controls"/);
  assert.match(coldHtml, /href="#cold-secret-notes" data-cold-more-target="cold-secret-notes"/);
  assert.match(coldHtml, /href="#cold-vault-controls" data-cold-more-target="cold-vault-controls"/);
  assert.match(coldHtml, /<a class="cold-nav-link" href="#cold-secret-notes" data-cold-more-target="cold-secret-notes"[\s\S]*Secret notes/);
  assert.doesNotMatch(coldHtml, /<button class="cold-nav-link cold-nav-link-unavailable"[^>]*data-roadmap-id="P1\.7"[\s\S]*Secret notes/);
  assert.match(coldHtml, /P4\.6 · Phase 4/);
});

test('desktop rails expose the approved built and unavailable navigation entries', () => {
  for (const label of ['Verify this file', 'Tool map']) assert.ok(warmHtml.includes(`<span>${label}</span>`), `warm rail is missing ${label}`);
  assert.match(warmHtml, /<a class="nav-link" data-nav="verify-file" href="#reference\/verify"[\s\S]*Verify this file/);
  assert.match(warmHtml, /<a class="nav-link" data-nav="tool-map" href="#tool-map" data-route="tool-map"[\s\S]*Tool map/);
  // Tool map is a warm destination in the approved design, so the sealed rail no
  // longer carries a permanently-disabled copy of it. Reveal hidden and the
  // sealed secret list keep their sealed-rail shortcuts.
  for (const label of ['Reveal hidden', 'Lock / wipe', 'Seeds &amp; lineage']) assert.ok(coldHtml.includes(`<span>${label}</span>`), `cold rail is missing ${label}`);
  assert.match(coldHtml, /href="#cold-concealment-controls" data-cold-more-target="cold-concealment-controls"[\s\S]*Reveal hidden/);
  assert.match(coldHtml, /href="#cold-secret-switcher"[\s\S]*Seeds &amp; lineage/);
  assert.match(coldHtml, /href="#cold-vault-controls" data-cold-more-target="cold-vault-controls"[\s\S]*Lock \/ wipe/);
  assert.ok(coldHtml.includes('>Active secret<'), 'the sealed secret list keeps its mobile More entry');
});

test('warm and cold shells carry the same chrome vocabulary', () => {
  for (const token of ['app-bar', 'realm-strip', 'nav-rail']) {
    assert.match(warmHtml + warmCss, new RegExp(token));
    assert.match(coldHtml + coldCss, new RegExp(token));
  }
  assert.match(coldHtml, /class="cold-app-layout"/);
  assert.match(warmHtml, /class="app-layout"/);
});

test('sealed-realm shell links resolve to and focus the shared boundary target', () => {
  assert.match(warmHtml, /id="cold-realm-status" tabindex="-1"/);
  assert.match(mainJs, /route === 'cold-realm-status'/);
  assert.match(mainJs, /coldRealmStatus\.scrollIntoView/);
  assert.match(mainJs, /coldRealmStatus\.focus/);
});
