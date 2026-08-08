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

test('cold KDF benchmark keeps the design-system focus and mobile touch floors', () => {
  const coldStyles = fs.readFileSync(path.join(__dirname, '..', 'src', 'cold', 'styles.css'), 'utf8');

  assert.match(
    coldStyles,
    /#cold-kdf-benchmark-run:focus-visible\s*\{[\s\S]*?outline:\s*0\.2rem solid var\(--cold-pink\);[\s\S]*?outline-offset:\s*0\.18rem;/,
    'KDF benchmark must expose the documented focus-visible ring'
  );
  assert.match(
    coldStyles,
    /#cold-kdf-benchmark-run\s*\{[\s\S]*?min-width:\s*2\.75rem;[\s\S]*?min-height:\s*2\.75rem;/,
    'KDF benchmark must retain at least a 44 x 44 CSS-pixel target at the default root size'
  );
  assert.match(
    coldStyles,
    /#cold-kdf-benchmark-run:disabled\s*\{[\s\S]*?background:\s*var\(--cold-disabled-fill\);/,
    'KDF benchmark disabled fill must use a token rather than an inline hex'
  );
  assert.doesNotMatch(
    coldStyles.match(/#cold-kdf-benchmark-run:disabled\s*\{[\s\S]*?\}/)[0],
    /#[0-9a-fA-F]{6}/,
    'KDF benchmark disabled rule must not reintroduce a hard-coded colour'
  );
});

test('Entropy Lab special-case controls preserve the 44 x 44 mobile touch floor', () => {
  const coldStyles = fs.readFileSync(path.join(__dirname, '..', 'src', 'cold', 'styles.css'), 'utf8');

  assert.match(
    coldStyles,
    /#cold-entropy-lab button,[\s\S]*?#cold-entropy-mix-run\s*\{[\s\S]*?min-width:\s*2\.75rem;[\s\S]*?min-height:\s*2\.75rem;/,
    'Entropy Lab buttons, including Generate/Reset/Heads/Tails/Mix/Undo, must keep the 44 x 44 floor'
  );
  assert.match(
    coldStyles,
    /#cold-entropy-lab-inputs input,[\s\S]*?#cold-entropy-mix select\s*\{[\s\S]*?min-height:\s*2\.75rem;/,
    'Entropy Lab inputs/selects must keep the 44px height floor'
  );
  assert.match(
    coldStyles,
    /#cold-entropy-dice-random-row input,[\s\S]*?#cold-entropy-csprng-draw-row input\s*\{[\s\S]*?min-height:\s*2\.75rem;/,
    'Random-count and CSPRNG-count special-case rows must not shrink below 44px'
  );
  assert.match(
    coldStyles,
    /#cold-entropy-card-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(auto-fill,\s*minmax\(2\.75rem,\s*1fr\)\);/,
    'Card grid columns must reserve at least a 44px card width'
  );
  assert.match(
    coldStyles,
    /#cold-entropy-card-grid button\s*\{[\s\S]*?min-width:\s*2\.75rem;[\s\S]*?min-height:\s*2\.75rem;/,
    'Every card button must remain at least 44 x 44 CSS pixels'
  );
  assert.doesNotMatch(
    coldStyles.match(/#cold-entropy-card-grid button\s*\{[\s\S]*?\}/)[0],
    /min-(?:width|height):\s*(?:0|2\.[0-6]\d*rem)/,
    'Card-grid overrides must not reintroduce a sub-44px minimum'
  );
  assert.match(
    coldStyles,
    /#cold-entropy-mix-output\[hidden\],[\s\S]*?#cold-entropy-mix-output-label\[hidden\]\s*\{[\s\S]*?display:\s*none;/,
    'Mixed entropy output and warning label must stay visually hidden when the hidden attribute is set'
  );
});
