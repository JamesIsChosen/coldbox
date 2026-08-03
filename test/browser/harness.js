'use strict';

const assert = require('node:assert/strict');

const NETWORK_PRIMITIVES = Object.freeze([
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
  'sendBeacon'
]);

async function createHarness(page) {
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  await page.addInitScript(() => {
    const violations = [];
    Object.defineProperty(window, '__coldboxCspViolations', {
      configurable: false,
      enumerable: false,
      value: violations,
      writable: false
    });
    document.addEventListener('securitypolicyviolation', (event) => {
      violations.push({
        blockedURI: event.blockedURI,
        effectiveDirective: event.effectiveDirective,
        violatedDirective: event.violatedDirective
      });
    }, true);
  });

  async function getCspViolations() {
    return page.evaluate(() => Array.from(window.__coldboxCspViolations || []));
  }

  return Object.freeze({
    async expectNoConsoleErrors() {
      const details = [
        ...consoleErrors.map((message) => `console.error: ${message}`),
        ...pageErrors.map((message) => `pageerror: ${message}`)
      ];
      assert.equal(details.length, 0, details.join('\n'));
    },

    async expectNoCspViolations() {
      const violations = await getCspViolations();
      assert.equal(
        violations.length,
        0,
        `Unexpected CSP violations: ${JSON.stringify(violations)}`
      );
    },

    async expectCspViolation(directive) {
      assert.equal(typeof directive, 'string');
      const violations = await getCspViolations();
      const acceptedDirectives = new Set([
        directive,
        `${directive}-elem`,
        `${directive}-attr`
      ]);
      const matchingViolation = violations.find((violation) => (
        acceptedDirectives.has(violation.effectiveDirective)
        || acceptedDirectives.has(violation.violatedDirective)
      ));
      assert.ok(
        matchingViolation,
        `Expected CSP violation for ${directive}; observed ${JSON.stringify(violations)}`
      );
      return matchingViolation;
    },

    async expectScriptRejected({ marker = '__coldboxTamperScriptRan' } = {}) {
      const markerValue = await page.evaluate((name) => window[name], marker);
      assert.notEqual(
        markerValue,
        true,
        `Tampered inline script ran and set ${marker}`
      );
      return this.expectCspViolation('script-src');
    },

    async expectNetworkPrimitiveThrows(name, frame) {
      assert.ok(frame && typeof frame.evaluate === 'function', 'A Playwright frame is required');
      assert.ok(NETWORK_PRIMITIVES.includes(name), `Unsupported network primitive: ${name}`);

      const result = await frame.evaluate(async (primitive) => {
        const url = 'https://coldbox.invalid/network-primitive-test';
        try {
          switch (primitive) {
            case 'fetch':
              await globalThis.fetch(url);
              break;
            case 'XMLHttpRequest': {
              const request = new XMLHttpRequest();
              request.open('GET', url);
              request.send();
              break;
            }
            case 'WebSocket': {
              const socket = new WebSocket(url);
              socket.close();
              break;
            }
            case 'EventSource': {
              const source = new EventSource(url);
              source.close();
              break;
            }
            case 'sendBeacon':
              navigator.sendBeacon(url, 'coldbox');
              break;
            default:
              throw new Error(`Unsupported network primitive: ${primitive}`);
          }
          return { threw: false, error: '' };
        } catch (error) {
          return { threw: true, error: String(error) };
        }
      }, name);

      assert.equal(
        result.threw,
        true,
        `${name} did not throw inside the frame (result: ${JSON.stringify(result)})`
      );
      return result.error;
    },

    async expectParentCannotReadFrame({ selector = '#cold-frame' } = {}) {
      const result = await page.evaluate((frameSelector) => {
        const iframe = document.querySelector(frameSelector);
        if (!iframe) {
          throw new Error(`Frame not found: ${frameSelector}`);
        }
        try {
          void iframe.contentWindow.document;
          return { readable: true, error: '' };
        } catch (error) {
          return { readable: false, error: String(error) };
        }
      }, selector);

      assert.equal(
        result.readable,
        false,
        `Parent could read the frame DOM: ${JSON.stringify(result)}`
      );
      return result.error;
    },

    async expectElementVisible(selector) {
      await assert.doesNotReject(async () => {
        await page.locator(selector).waitFor({ state: 'visible' });
      }, `Element is not visible: ${selector}`);
    },

    async atViewport(width, height) {
      assert.ok(Number.isInteger(width) && width > 0, 'Viewport width must be a positive integer');
      assert.ok(Number.isInteger(height) && height > 0, 'Viewport height must be a positive integer');
      await page.setViewportSize({ width, height });
      const viewport = await page.evaluate(() => ({
        height: window.innerHeight,
        width: window.innerWidth
      }));
      assert.deepEqual(viewport, { height, width });
      return viewport;
    }
  });
}

module.exports = Object.freeze({ createHarness });
