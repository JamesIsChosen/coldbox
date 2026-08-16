'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'src', 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src', 'styles.css'), 'utf8');

test('UI.7 exposes one typed Send to region in the shared record menu', () => {
  assert.match(html, /id="record-menu-send-to"/);
  assert.match(html, /id="record-menu-send-to-list"/);
  assert.match(js, /function renderRecordMenuSendTo\(kind, record\)/);
  assert.match(js, /routes\.push\(\['Address bench', 'verify'\]\)/);
  assert.match(js, /routes\.push\(\['QR Studio', 'qr'\]\)/);
  assert.match(js, /routes\.push\(\['Verify shares in sealed realm', 'cold-backup-verify'\]\)/);
  assert.match(css, /\.record-menu-send-to-list/);
});

test('UI.7 routes public values directly and keeps cold sends off the clipboard', () => {
  assert.match(js, /window\.location\.hash = route/);
  assert.match(js, /addressVerifyRecord\.value = current\.id/);
  assert.match(js, /qrPublicAddress\.value = record\.address/);
  assert.match(js, /requestBackupVerification\(current\.id\)/);
  const sendBody = js.match(/function sendRecordToRoute\(route\) \{[\s\S]*?\n  \}/)?.[0] || '';
  assert.doesNotMatch(sendBody, /clipboard/i, 'send-to route must never call a clipboard API');
  assert.doesNotMatch(sendBody, /copyText/);
});

test('UI.7 route inventory is finite and each route has a consumer', () => {
  const routes = [...js.matchAll(/routes\.push\(\['[^']+', '([^']+)'\]\)/g)].map((match) => match[1]);
  assert.deepEqual(routes, ['verify', 'qr', 'cold-backup-verify']);
  assert.match(js, /route === 'cold-backup-verify' && current\.kind === 'backup'/);
  assert.match(js, /route === 'verify'/);
  assert.match(js, /route === 'qr'/);
});
