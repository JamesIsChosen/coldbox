'use strict';

// UI.10b - the warm shell navigates the maintainer-approved workstation
// hierarchy, every specialist capability is still reachable, and no destination
// claims a capability the roadmap has not shipped.
//
// The point of the first test here is that the rail is not checked against a
// second hand-written list. It is checked against the approved manifest UI.10a
// imported, so "the exact hierarchy approved in UI.10a" is a machine-checked
// claim rather than a promise. The manifest is read as test data only: the
// approved package must never enter the product build-input graph, which
// test/ui.10a-workstation-reference.test.js proves separately.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { currentSet, readManifest, parseRoadmapStatuses } = require('../scripts/ui-reference-manifest.js');

const root = path.resolve(__dirname, '..');
const warmHtml = fs.readFileSync(path.join(root, 'src', 'index.html'), 'utf8');
const warmCss = fs.readFileSync(path.join(root, 'src', 'styles.css'), 'utf8');
const mainJs = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
const coldHtml = fs.readFileSync(path.join(root, 'src', 'cold', 'index.html'), 'utf8');

const approved = currentSet(readManifest());

function decode(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

function railGroups() {
  return Array.from(
    warmHtml.matchAll(/<nav class="nav-group" aria-label="([^"]+)">([\s\S]*?)<\/nav>/g),
    (match) => ({ label: decode(match[1]), markup: match[2] })
  );
}

function entriesOf(markup) {
  return Array.from(
    markup.matchAll(/<(a|button) class="nav-link([^"]*)"([\s\S]*?)<\/\1>/g),
    (match) => ({
      tag: match[1],
      modifier: match[2].trim(),
      markup: match[0],
      label: decode((/<span>([^<]+)<\/span>/.exec(match[3]) || [, ''])[1])
    })
  );
}

test('the warm rail groups are exactly the approved warm taxonomy, in order', () => {
  const expected = approved.navigation.groups
    .filter((group) => group.realm === 'warm')
    .map((group) => group.label);

  assert.deepEqual(railGroups().map((group) => group.label), expected);

  // The visible group heading and its accessible name must agree. They drifted
  // apart in the cold rail once already - a group titled "Split & Carry" kept
  // aria-label="Split" - which reads correctly on screen and wrongly to a screen
  // reader.
  for (const group of railGroups()) {
    assert.ok(
      warmHtml.includes(`<p class="nav-group-title">${group.label.replace(/&/g, '&amp;')}</p>`),
      `Rail group ${group.label} has no visible heading matching its accessible name`
    );
  }
});

test('every approved warm destination is present exactly once, in its approved group', () => {
  // Destination labels, per group, transcribed from the approved desktop rail.
  const expected = {
    Workspace: ['Home', 'Wallets', 'Backup & recovery', 'Portfolio & records', 'Security & verify'],
    Records: ['Records & registry', 'Devices', 'Prices & FX', 'Tax & exports', 'Backup Health'],
    'Trust & reference': ['Verify this file', 'Provenance & legal', 'Learn', 'Tool map', 'Reference & help'],
    'Vault & settings': ['Vault files', 'Vault session', 'Device transfer (QR)', 'Settings', 'All flows index'],
    'Sealed work': ['Seeds & secrets']
  };

  const groups = railGroups();
  assert.deepEqual(Object.keys(expected), groups.map((group) => group.label));

  for (const group of groups) {
    assert.deepEqual(
      entriesOf(group.markup).map((entry) => entry.label),
      expected[group.label],
      `Rail group ${group.label} does not carry its approved destinations in order`
    );
  }

  const all = groups.flatMap((group) => entriesOf(group.markup).map((entry) => entry.label));
  assert.equal(new Set(all).size, all.length, 'A destination appears twice in the rail');
});

test('an unavailable destination is a disabled control naming a real roadmap owner', () => {
  const statuses = parseRoadmapStatuses();
  const entries = railGroups().flatMap((group) => entriesOf(group.markup));

  const unavailable = entries.filter((entry) => entry.modifier.includes('nav-link-unavailable'));
  assert.ok(unavailable.length > 0, 'The rail must show at least one unavailable destination');

  for (const entry of unavailable) {
    assert.equal(entry.tag, 'button', `${entry.label} must be a button, not a link`);
    assert.match(entry.markup, /disabled/, `${entry.label} must be disabled`);
    assert.match(entry.markup, /aria-disabled="true"/, `${entry.label} must be aria-disabled`);
    const owner = /data-roadmap-id="([^"]+)"/.exec(entry.markup);
    assert.ok(owner, `${entry.label} must name its roadmap owner`);
    assert.ok(statuses.has(owner[1]), `${entry.label} names ${owner[1]}, which is not in ROADMAP.md`);
    assert.notEqual(
      statuses.get(owner[1]),
      'x',
      `${entry.label} is shown unavailable but ${owner[1]} is complete`
    );
    assert.match(entry.markup, /data-phase="(?:Phase|UI) [0-9A-Za-z.]+"/, `${entry.label} must name its phase`);
    assert.doesNotMatch(entry.markup, /href=/, `${entry.label} must not be routable`);
  }

  // The converse: a live destination must not claim an unbuilt owner.
  for (const entry of entries.filter((item) => item.tag === 'a')) {
    const owner = /data-roadmap-id="([^"]+)"/.exec(entry.markup);
    assert.equal(owner, null, `${entry.label} is routable and must not carry a roadmap-owner badge`);
  }
});

test('every routable destination resolves to a built page and an announced route', () => {
  const routes = Array.from(warmHtml.matchAll(/data-route="([a-z-]+)"/g), (match) => match[1]);
  const pages = Array.from(warmHtml.matchAll(/data-page="([a-z-]+)"/g), (match) => match[1]);

  for (const route of new Set(routes)) {
    assert.ok(pages.includes(route), `route ${route} has no built page`);
    assert.match(
      mainJs,
      new RegExp(`(?:^|[\\s{])'?${route}'?: Object\\.freeze\\(\\{ label:`, 'm'),
      `route ${route} has no routeDetails entry, so its breadcrumb and announcement are undefined`
    );
  }

  // No page may be stranded: every built page is either routable, or is the
  // approved unavailable treatment for an unbuilt owner.
  const unavailableOwners = Array.from(
    warmHtml.matchAll(/<button class="nav-link nav-link-unavailable"[\s\S]*?<\/button>/g),
    (match) => (/data-roadmap-id="([^"]+)"/.exec(match[0]) || [, ''])[1]
  );
  assert.ok(unavailableOwners.includes('P3.4'), 'Portfolio & records must be the approved unavailable treatment');
  for (const page of new Set(pages)) {
    if (new Set(routes).has(page)) {
      continue;
    }
    assert.ok(
      ['portfolio', 'prices'].includes(page),
      `page ${page} is orphaned: no rail, tab or index entry reaches it`
    );
  }
});

test('the All flows index keeps every specialist capability reachable', () => {
  const index = /<section class="page" id="page-advanced"[\s\S]*?\n        <\/section>/.exec(warmHtml);
  assert.ok(index, 'The All flows index page is missing');
  const markup = index[0];

  // Every flow family the approved design names has a group here.
  for (const title of ['Forge', 'Derive', 'Split & carry', 'Recover & verify', 'Records', 'Trust & reference', 'Vault', 'Wallet']) {
    assert.ok(
      markup.includes(`class="flow-index-title">${title.replace(/&/g, '&amp;')}`),
      `The All flows index has no ${title} group`
    );
  }

  // The tools that used to be top-level destinations are still reachable by
  // name. This is the reachability guarantee the reorganisation has to keep.
  for (const label of [
    'Entropy Lab', 'Seed Forge', 'Split lab', 'SeedQR studio', 'Verify Bench',
    'Records &amp; registry', 'Device registry', 'Backup Health', 'Verify this file',
    'Provenance &amp; legal', 'Learn', 'Tool map', 'Vault session'
  ]) {
    assert.ok(markup.includes(label), `The All flows index lost ${label}`);
  }

  const statuses = parseRoadmapStatuses();
  const unavailable = markup.match(/<button class="flow-index-link flow-index-link-unavailable"[\s\S]*?<\/button>/g) || [];
  assert.ok(unavailable.length > 0);
  for (const entry of unavailable) {
    const owner = /data-roadmap-id="([^"]+)"/.exec(entry);
    assert.ok(owner, `An index entry is unavailable without naming an owner: ${entry.slice(0, 80)}`);
    assert.ok(statuses.has(owner[1]), `The index names ${owner[1]}, which is not in ROADMAP.md`);
    assert.notEqual(statuses.get(owner[1]), 'x', `${owner[1]} is complete but shown unavailable in the index`);
    assert.match(entry, /disabled/);
    assert.match(entry, /aria-disabled="true"/);
  }

  // Every roadmap-owned wallet flow in the approved set is represented, and
  // named as unavailable rather than omitted.
  for (const flow of approved.flows.filter((entry) => entry.availability === 'roadmap-owned')) {
    if (flow.id === 'signing' || flow.id === 'source') {
      continue; // sealed-realm and trust families, asserted by label below
    }
    assert.ok(
      markup.includes(flow.title.replace(/&/g, '&amp;')),
      `The All flows index omits the roadmap-owned flow ${flow.title}`
    );
  }
  assert.ok(markup.includes('Level 3 signing'));
  assert.ok(markup.includes('Source &amp; transport'));
});

test('the mobile bottom bar is the approved five slots and the More sheet is realm-aware', () => {
  const tabs = Array.from(
    warmHtml.matchAll(/<(a|button) class="mobile-tab"[\s\S]*?<span>([^<]+)<\/span>/g),
    (match) => decode(match[2])
  );
  assert.deepEqual(tabs, approved.navigation.mobileBottomBar);

  // Seeds is the only cold slot, and it leaves the warm shell.
  assert.match(
    warmHtml,
    /<a class="mobile-tab" href="#cold-realm-status">[\s\S]*?<span>Seeds<\/span>/,
    'The Seeds tab must enter the sealed realm'
  );

  // The warm More sheet carries the approved warm destinations and no sealed
  // capability: on mobile a sealed tool is never reached through a warm
  // destination, which is what makes the realm boundary legible on a phone.
  const sheet = /<div class="mobile-more-links" id="mobile-more-links-warm">([\s\S]*?)<\/div>/.exec(warmHtml);
  assert.ok(sheet, 'The warm More sheet is missing');
  for (const label of approved.navigation.mobileMore.warm) {
    const needle = label === 'Every flow' ? 'Every flow' : label.replace(/&/g, '&amp;');
    assert.ok(
      sheet[1].includes(needle) || sheet[1].includes(needle.replace(' · panic', '')),
      `The warm More sheet is missing ${label}`
    );
  }
  for (const label of ['Entropy Lab', 'Seed Forge', 'Split lab', 'Passphrase Studio', 'Child seeds']) {
    assert.ok(!sheet[1].includes(label), `The warm More sheet must not reach the sealed capability ${label}`);
  }
});

test('the reorganised shell gains no secret-capable control and no funding prompt', () => {
  const rail = /<div class="nav-scroll">([\s\S]*?)<div class="nav-footer">/.exec(warmHtml);
  assert.ok(rail);
  assert.doesNotMatch(rail[1], /<(?:input|textarea)\b|data-secret=/i, 'Navigation must not gain secret-capable controls');

  // The one sealed destination sits in its own group and is the only entry in
  // it, so entering the sealed realm is never one item in a list of warm work.
  const sealed = /<nav class="nav-group" aria-label="Sealed work">([\s\S]*?)<\/nav>/.exec(warmHtml);
  assert.ok(sealed, 'Sealed work must be its own rail group');
  assert.equal(entriesOf(sealed[1]).length, 1);
  assert.match(sealed[1], /href="#cold-realm-status"/);
  for (const group of railGroups().filter((entry) => entry.label !== 'Sealed work')) {
    assert.doesNotMatch(
      group.markup,
      /href="#cold-realm-status"/,
      `Warm workspace group ${group.label} must not carry the sealed-realm entry`
    );
  }

  // ADR-0059's funding constraint. Scoped to interactive elements: the Settings
  // page legitimately says in prose that there is no subscription and no
  // advertising, and a scan over all text would flag that denial as a prompt.
  const interactive = warmHtml.match(/<(?:a|button)\b[\s\S]*?<\/(?:a|button)>/g) || [];
  for (const term of ['donate', 'donation', 'sponsor', 'subscribe', 'subscription', 'upgrade to pro', 'sign in', 'log in', 'activate']) {
    for (const element of interactive) {
      const text = element.replace(/<[^>]*>/g, ' ');
      assert.ok(
        !new RegExp(`\\b${term}\\b`, 'i').test(text),
        `The warm shell must not offer "${term}" as a control: ${element.slice(0, 90)}`
      );
    }
  }
});

test('new destinations meet the shell touch-target and focus floors', () => {
  assert.match(warmCss, /\.flow-index-link \{[\s\S]*?min-height: 44px/);
  assert.match(warmCss, /\.mobile-more-link-action \{/);
  assert.match(warmCss, /\.nav-link \{[\s\S]*?min-height: 44px/);
  assert.match(warmCss, /\.mobile-more-link \{[\s\S]*?min-height: 44px/);

  // A disabled index entry is a real disabled control, so it cannot be tabbed to.
  const index = /<section class="page" id="page-advanced"[\s\S]*?\n        <\/section>/.exec(warmHtml)[0];
  for (const entry of index.match(/<button class="flow-index-link flow-index-link-unavailable"[\s\S]*?<\/button>/g) || []) {
    assert.match(entry, /type="button" disabled/);
  }

  // The superseded single-entry sealed strip is gone rather than left as dead
  // markup and dead CSS.
  assert.doesNotMatch(warmHtml, /nav-sealed-entry/);
  assert.doesNotMatch(warmCss, /\.nav-sealed-entry/);
});

// ---------------------------------------------------------------------------
// Sealed realm
// ---------------------------------------------------------------------------

function coldRailGroups() {
  return Array.from(
    coldHtml.matchAll(/<nav class="cold-nav-group" aria-label="([^"]+)">([\s\S]*?)<\/nav>/g),
    (match) => ({ label: decode(match[1]), markup: match[2] })
  );
}

test('the sealed rail groups are exactly the approved cold taxonomy, in order', () => {
  const expected = approved.navigation.groups
    .filter((group) => group.realm === 'cold')
    .map((group) => group.label);

  assert.deepEqual(coldRailGroups().map((group) => group.label), expected);

  // The defect this replaces: the sealed rail carried a group titled
  // "Split & Carry" whose accessible name was still "Split", and two groups
  // whose visible heading had been emptied to `aria-hidden="true"` while the
  // group kept an accessible name. Screen and screen reader disagreed.
  for (const group of coldRailGroups()) {
    assert.ok(
      coldHtml.includes(`<p class="cold-nav-group-title">${group.label.replace(/&/g, '&amp;')}</p>`),
      `Sealed rail group ${group.label} has no visible heading matching its accessible name`
    );
  }
  assert.doesNotMatch(
    coldHtml,
    /<p class="cold-nav-group-title"[^>]*aria-hidden="true"[^>]*><\/p>/,
    'A sealed rail group has an emptied heading'
  );
});

test('the sealed rail carries the approved cold destinations plus only its known production extras', () => {
  const approvedByGroup = {
    'Seeds & lineage': ['Seeds & lineage', 'Selected seed', 'Secret QR'],
    Forge: ['Entropy Lab', 'Seed Forge', 'Passphrase Studio', 'Secret notes'],
    Derive: ['Derivation paths', 'Address derivation', 'Child seeds · BIP-85', 'Descriptors'],
    'Split & carry': ['Split lab', 'Verify / combine', 'SeedQR studio'],
    'Recover & verify': ['Recovery assistant', 'Verify Bench', 'Level 3 signing'],
    Session: ['Lock / wipe']
  };

  // Production has three sealed surfaces the prototype folds into other
  // screens, and they keep their sealed-rail shortcut rather than losing
  // keyboard access to satisfy a mock. Each is listed here so the rail cannot
  // quietly grow a fourth.
  const productionExtras = {
    Forge: ['Reveal hidden'],
    'Split & carry': ['Backup Health'],
    Session: ['Vault session']
  };

  for (const group of coldRailGroups()) {
    const labels = Array.from(
      group.markup.matchAll(/<(?:a|button|span) class="cold-nav-link[^"]*"[\s\S]*?<span>([^<]+)<\/span>/g),
      (match) => decode(match[1])
    );
    const allowed = approvedByGroup[group.label].concat(productionExtras[group.label] || []);
    assert.deepEqual(
      labels.slice().sort(),
      allowed.slice().sort(),
      `Sealed rail group ${group.label} does not carry its approved destinations`
    );
  }

  // "Return to warm shell" is the one approved cold entry deliberately absent.
  // The sealed frame is sandboxed with allow-scripts, allow-downloads and
  // allow-modals only - no allow-top-navigation and no allow-same-origin - so it
  // cannot navigate its parent, and granting it that permission to satisfy a
  // rail entry would weaken realm isolation for a shortcut. PAR-003 puts realm
  // isolation above prototype treatment. The warm masthead's realm switcher is
  // visible above the sealed frame at all times and is the return path.
  assert.match(mainJs, /setAttribute\('sandbox', 'allow-scripts allow-downloads allow-modals'\)/);
  assert.ok(!coldHtml.includes('Return to warm shell'));
});

test('no sealed destination claims a completed roadmap item, and none is a dead anchor', () => {
  const statuses = parseRoadmapStatuses();

  for (const entry of coldHtml.match(/<button class="cold-nav-link cold-nav-link-unavailable"[\s\S]*?<\/button>/g) || []) {
    const owner = /data-roadmap-id="([^"]+)"/.exec(entry);
    assert.ok(owner, `A sealed rail entry is unavailable without naming an owner: ${entry.slice(0, 90)}`);
    assert.ok(statuses.has(owner[1]), `The sealed rail names ${owner[1]}, which is not in ROADMAP.md`);
    assert.notEqual(
      statuses.get(owner[1]),
      'x',
      `The sealed rail shows ${owner[1]} as unavailable but the roadmap has it complete`
    );
    assert.match(entry, /type="button" disabled/);
    assert.match(entry, /aria-disabled="true"/);
  }

  for (const entry of coldHtml.match(/<span class="cold-mobile-more-link cold-mobile-more-link-unavailable"[\s\S]*?<\/span>/g) || []) {
    const owner = /data-roadmap-id="([^"]+)"/.exec(entry);
    assert.ok(owner, 'A sealed More entry is unavailable without naming an owner');
    assert.ok(statuses.has(owner[1]), `The sealed More sheet names ${owner[1]}, which is not in ROADMAP.md`);
    assert.notEqual(statuses.get(owner[1]), 'x', `${owner[1]} is complete but shown unavailable in the sealed More sheet`);
  }

  // Every sealed anchor resolves inside the sealed document. The sealed realm is
  // one scrolling document rather than a router, so a rail entry pointing at a
  // removed id fails silently in a browser and would never be caught by a
  // routing assertion.
  const ids = new Set(Array.from(coldHtml.matchAll(/\sid="([^"]+)"/g), (match) => match[1]));
  const anchors = Array.from(
    coldHtml.matchAll(/<a[^>]*class="cold-nav-link"[^>]*href="#([^"]+)"|<a href="#([^"]+)"/g),
    (match) => match[1] || match[2]
  );
  assert.ok(anchors.length > 0);
  for (const anchor of new Set(anchors)) {
    assert.ok(ids.has(anchor), `Sealed navigation points at #${anchor}, which does not exist`);
  }
});

test('the sealed More sheet reaches only sealed capability', () => {
  const sheet = /<div class="cold-mobile-more-links">([\s\S]*?)<\/div>/.exec(coldHtml);
  assert.ok(sheet, 'The sealed More sheet is missing');

  for (const label of ['Entropy Lab', 'Seed Forge', 'Secret notes', 'Split lab', 'SeedQR studio', 'Verify Bench', 'Lock &amp; wipe']) {
    assert.ok(sheet[1].includes(label), `The sealed More sheet is missing ${label}`);
  }

  // A warm destination is never reached from the sealed sheet: that is what
  // makes the realm boundary legible on a phone.
  for (const label of ['Portfolio', 'Prices &amp; FX', 'Tax &amp; exports', 'Records &amp; registry', 'Reference &amp; help', 'Tool map']) {
    assert.ok(!sheet[1].includes(label), `The sealed More sheet must not reach the warm destination ${label}`);
  }
});

test('every rail destination has a unique stable handle, and deep links resolve', () => {
  // Three approved destinations resolve to the vault page and three to the
  // reference page, so a selector keyed on the route matches several elements.
  // `data-nav` gives each destination one stable handle, which is what the
  // committed browser harness addresses them by; without it the harness needed
  // `.first()` and silently depended on DOM order.
  const navs = Array.from(warmHtml.matchAll(/data-nav="([a-z-]+)"/g), (match) => match[1]);
  const railNavs = railGroups().flatMap((group) => Array.from(
    group.markup.matchAll(/data-nav="([a-z-]+)"/g),
    (match) => match[1]
  ));
  assert.equal(new Set(navs).size, navs.length, 'A data-nav handle is used twice');
  assert.equal(
    railNavs.length,
    railGroups().reduce((total, group) => total + entriesOf(group.markup).length, 0),
    'Every rail destination must carry a data-nav handle'
  );

  // Each `#route/section` deep link must name a section main.js knows about,
  // and that section must exist in the document. A typo here produces a link
  // that navigates to the right page and then silently does nothing.
  const sections = /var routeSections = Object\.freeze\(\{([\s\S]*?)\}\);/.exec(mainJs);
  assert.ok(sections, 'main.js declares no routeSections map');
  const declared = new Map(
    Array.from(sections[1].matchAll(/(\w+): Object\.freeze\(\{([^}]*)\}\)/g), (match) => [
      match[1],
      new Map(Array.from(match[2].matchAll(/(\w+): '([^']+)'/g), (pair) => [pair[1], pair[2]]))
    ])
  );
  assert.ok(declared.size > 0);

  const deepLinks = Array.from(
    warmHtml.matchAll(/href="#([a-z-]+)\/([a-z-]+)"/g),
    (match) => ({ route: match[1], section: match[2] })
  );
  assert.ok(deepLinks.length >= 5, `expected the approved sub-destinations to deep link, saw ${deepLinks.length}`);
  for (const link of deepLinks) {
    const routeSections = declared.get(link.route);
    assert.ok(routeSections, `#${link.route}/${link.section} has no routeSections entry for ${link.route}`);
    const targetId = routeSections.get(link.section);
    assert.ok(targetId, `#${link.route}/${link.section} names a section main.js does not map`);
    assert.ok(
      warmHtml.includes(`id="${targetId}"`),
      `#${link.route}/${link.section} maps to #${targetId}, which does not exist`
    );
  }

  // Focus must be confirmed, not assumed: a panel that is not rendered yet -
  // Backup Health's list while the vault is locked - accepts neither focus nor
  // a useful scroll, and reporting success there strands focus on the rail link
  // the user just activated.
  assert.match(mainJs, /return document\.activeElement === target;/);
});

test('no surface anywhere in src claims a completed roadmap item as unavailable', () => {
  // The rail, the flow index, the More sheets and now the Wallets balance column
  // all name a roadmap owner. One assertion over every `data-roadmap-id` in the
  // product source catches the next one too, wherever it is added.
  const statuses = parseRoadmapStatuses();
  const sources = [
    ['src/index.html', warmHtml],
    ['src/cold/index.html', coldHtml],
    ['src/main.js', mainJs]
  ];
  let seen = 0;
  for (const [name, source] of sources) {
    for (const match of source.matchAll(/data-roadmap-id="([^"]+)"|setAttribute\('data-roadmap-id', '([^']+)'\)/g)) {
      const id = match[1] || match[2];
      seen += 1;
      assert.ok(statuses.has(id), `${name} names ${id}, which is not a roadmap item`);
      assert.notEqual(
        statuses.get(id),
        'x',
        `${name} presents ${id} as unavailable, but the roadmap has it complete`
      );
    }
  }
  assert.ok(seen >= 20, `expected the product source to name roadmap owners, saw ${seen}`);
});

test('the Wallets workspace reads the shipped registry and invents no balance', () => {
  const page = /<section class="page" id="page-wallets"[\s\S]*?\n        <\/section>/.exec(warmHtml);
  assert.ok(page, 'The Wallets page is missing');
  const markup = page[0];

  // Locked-first: wallet records live inside the encrypted vault, so the screen
  // must say so rather than render an empty table that reads as "no wallets".
  assert.match(markup, /id="wallets-locked"/);
  assert.match(markup, /id="wallets-workspace"[^>]*hidden/);
  assert.match(markup, /Unlock a vault to see your wallets/);

  // The approved columns, in the approved order.
  const headers = Array.from(markup.matchAll(/<th scope="col">(?:<span class="sr-only">)?([^<]+)</g), (m) => m[1].trim());
  assert.deepEqual(headers, ['Wallet', 'Lineage', 'Balance', 'Addresses', 'Mode', 'Record']);

  // No literal balance figure anywhere in the markup, and the render path emits
  // an owner-named unavailable state instead.
  assert.doesNotMatch(markup, /[0-9]+\.[0-9]{4,}/, 'The Wallets markup must not contain a balance figure');
  assert.match(mainJs, /balance\.setAttribute\('data-roadmap-id', 'WAL\.3'\)/);
  assert.match(mainJs, /balance\.textContent = 'Unavailable · WAL\.3'/);

  // Mode is derived from what the vault recorded, not from what Coldbox can do.
  assert.match(mainJs, /function walletMode\(wallet\) \{/);
  assert.match(mainJs, /wallet\.type === 'watch-only' \|\| \(!wallet\.seedId && !wallet\.fingerprint\)/);
  assert.doesNotMatch(markup, />\s*Spend\s*</, 'No wallet surface may offer a spend mode in this build');

  // Every cell carries its column heading so the mobile block layout stays
  // labelled, and the table actually transforms below the phone breakpoint.
  assert.match(mainJs, /cell\.setAttribute\('data-label', label\)/);
  assert.match(warmCss, /@media \(max-width: 720px\)[\s\S]*?\.wallets-table td::before[\s\S]*?content: attr\(data-label\)/);

  // The object carries its own actions, outside the locked gate: opening QR
  // Studio does not require an unlocked vault and must not be hidden behind one.
  const workspace = /<section class="wallets-workspace"[\s\S]*?<\/section>/.exec(markup)[0];
  for (const nav of ['wallets-registry', 'wallets-qr-studio', 'wallets-verify']) {
    assert.ok(markup.includes(`data-nav="${nav}"`), `The Wallets page is missing its ${nav} action`);
    assert.ok(!workspace.includes(`data-nav="${nav}"`), `${nav} must stay reachable while the vault is locked`);
  }

  // The record menu is the one interaction pattern for public records; the
  // Wallets rows reuse it rather than introducing a second one.
  assert.match(mainJs, /actionCell\.appendChild\(recordMenuTrigger\('wallet', entry\.wallet\.id\)\)/);
});
