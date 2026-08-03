'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const styles = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles.css'), 'utf8');

function readToken(block, name) {
  const match = block.match(new RegExp('\\s' + name + ':\\s*(#[0-9a-fA-F]{6})'));
  assert.ok(match, `Missing CSS token ${name}`);
  return match[1];
}

function channel(value) {
  const normalized = value / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  return (0.2126 * channel(Number.parseInt(hex.slice(1, 3), 16)))
    + (0.7152 * channel(Number.parseInt(hex.slice(3, 5), 16)))
    + (0.0722 * channel(Number.parseInt(hex.slice(5, 7), 16)));
}

function contrast(foreground, background) {
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

test('navigation faint text meets the documented 4.5:1 contrast floor', () => {
  const lightBlock = styles.match(/html\[data-theme="light"\]\s*\{([\s\S]*?)\n\}/);
  assert.ok(lightBlock, 'Light theme token block is missing');
  const themes = [
    {
      name: 'dark',
      block: styles.slice(0, styles.indexOf('html[data-theme="light"]'))
    },
    { name: 'light', block: lightBlock[1] }
  ];

  themes.forEach(function (theme) {
    const faint = readToken(theme.block, '--faint');
    const backgrounds = ['--surface', '--surface-raised', '--bg'];
    backgrounds.forEach(function (backgroundName) {
      const background = readToken(theme.block, backgroundName);
      assert.ok(
        contrast(faint, background) >= 4.5,
        `${theme.name} ${backgroundName} contrast is below 4.5:1`
      );
    });
  });
});
