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

const groups = ['Forge', 'Derive', 'Split', 'Carry', 'Recover', 'Verify', 'Records', 'Money', 'Vault files', 'Reference'];
const warmMoreInventory = ['Devices', 'QR Studio', 'Address bench', 'Prices &amp; FX · P3.1 · Phase 3', 'Tax &amp; exports · P3.9 · Phase 3', 'Reference · P4.10 · Phase 4', 'Verify this file', 'Provenance &amp; legal', 'Learn', 'Tool map · UI.9 · UI 9', 'Enter sealed realm'];
const coldMoreInventory = ['Vault session', 'Entropy Lab', 'Validate phrase', 'Child seeds · P1.5 · Phase 1', 'Passphrase Studio · P4.5 · Phase 4', 'Descriptors · P4.9 · Phase 4', 'SeedQR studio', 'Backup Health', 'Recovery Assistant · P4.3 · Phase 4', 'Verify Bench', 'Reveal hidden', 'Secret notes', 'No secret yet', 'Lock &amp; wipe'];

test('UI.5 implements the ten approved realm navigation groups', () => {
  for (const label of groups.slice(0, 6)) {
    assert.match(coldHtml, new RegExp(`<nav class="cold-nav-group" aria-label="${label}">`), `cold group ${label} is missing`);
  }
  for (const label of groups.slice(6)) {
    assert.match(warmHtml, new RegExp(`<nav class="nav-group" aria-label="${label}">`), `warm group ${label} is missing`);
  }
});

test('unbuilt navigation entries are disabled controls with roadmap and phase labels', () => {
  const unavailable = warmHtml.match(/<button class="nav-link nav-link-unavailable"[\s\S]*?<\/button>/g) || [];
  const coldUnavailable = coldHtml.match(/<button class="cold-nav-link cold-nav-link-unavailable"[\s\S]*?<\/button>/g) || [];
  assert.ok(unavailable.length >= 4, 'warm rail must expose unavailable roadmap entries');
  assert.ok(coldUnavailable.length >= 4, 'cold rail must expose unavailable roadmap entries');
  for (const item of unavailable.concat(coldUnavailable)) {
    assert.match(item, /disabled/);
    assert.match(item, /aria-disabled="true"/);
    assert.match(item, /data-roadmap-id="[A-Z0-9.]+"/);
    assert.match(item, /data-phase="(?:Phase|UI) [0-9.]+"/);
    assert.match(item, /· Phase [0-9.]+/);
  }
  assert.match(coldHtml, /data-roadmap-id="P4\.3" data-phase="Phase 4"/);
  assert.doesNotMatch(coldHtml, /<a class="cold-nav-link" href="#cold-group-recovery">[\s\S]*Recovery Assistant/);
  assert.match(coldHtml, /cold-mobile-more-link-unavailable[\s\S]*Recovery Assistant · P4\.3 · Phase 4/);
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
  assert.match(warmHtml, /<button class="nav-link nav-link-unavailable" type="button" disabled/);
  assert.match(coldHtml, /<button class="cold-nav-link cold-nav-link-unavailable" type="button" disabled/);
  assert.match(warmHtml, /<button class="mobile-tab mobile-tab-unavailable" type="button" disabled[\s\S]*data-roadmap-id="P3\.4"/);
});

test('mobile More sheets match the approved route inventories', () => {
  for (const item of warmMoreInventory) assert.ok(warmHtml.includes(item), `warm More inventory is missing ${item}`);
  for (const item of coldMoreInventory) assert.ok(coldHtml.includes(item), `cold More inventory is missing ${item}`);
  assert.doesNotMatch(warmHtml, /<a class="mobile-tab" href="#(?:prices|portfolio)"/);
  assert.doesNotMatch(coldHtml, /SLIP-39 &amp; verification/);
  for (const id of ['UI.9', 'P3.1', 'P3.9', 'P4.10']) {
    assert.match(warmHtml, new RegExp(`mobile-more-link-unavailable[^>]*aria-disabled="true"[^>]*data-roadmap-id="${id.replace('.', '\\.') }"`));
  }
  for (const id of ['P1.5', 'P4.5', 'P4.9', 'P4.3']) {
    assert.match(coldHtml, new RegExp(`cold-mobile-more-link-unavailable[^>]*aria-disabled="true"[^>]*data-roadmap-id="${id.replace('.', '\\.') }"`));
  }
  assert.match(coldHtml, /href="#cold-concealment-controls" data-cold-more-target="cold-concealment-controls"/);
  assert.match(coldHtml, /href="#cold-secret-notes" data-cold-more-target="cold-secret-notes"/);
  assert.match(coldHtml, /href="#cold-vault-controls" data-cold-more-target="cold-vault-controls"/);
  assert.match(coldHtml, /<a class="cold-nav-link" href="#cold-secret-notes" data-cold-more-target="cold-secret-notes"[\s\S]*Secret notes/);
  assert.doesNotMatch(coldHtml, /<button class="cold-nav-link cold-nav-link-unavailable"[^>]*data-roadmap-id="P1\.7"[\s\S]*Secret notes/);
  assert.match(coldHtml, /P4\.6 · Phase 4/);
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
