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
