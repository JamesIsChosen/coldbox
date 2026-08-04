'use strict';

const assert = require('node:assert/strict');

const NETWORK_PRIMITIVES = Object.freeze([
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
  'sendBeacon'
]);
const WARM_CANARY_URL = 'https://coldbox.invalid/csp-canary';
const COLD_CANARY_URL = 'http://localhost:9/cold-csp-canary';

async function createHarness(page) {
  const consoleErrors = [];
  const consoleWarnings = [];
  const pageErrors = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    } else if (message.type() === 'warning') {
      consoleWarnings.push(message.text());
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

  function matchesDirective(violation, directive) {
    const acceptedDirectives = new Set([
      directive,
      `${directive}-elem`,
      `${directive}-attr`
    ]);
    return acceptedDirectives.has(violation.effectiveDirective)
      || acceptedDirectives.has(violation.violatedDirective);
  }

  function findDirectiveViolation(violations, directive, blockedURI) {
    return violations.find((violation) => (
      matchesDirective(violation, directive)
      && (blockedURI === undefined || violation.blockedURI === blockedURI)
    ));
  }

  return Object.freeze({
    async expectNoConsoleErrors({ allowedFragments = [] } = {}) {
      assert.ok(Array.isArray(allowedFragments), 'Allowed console-error fragments must be an array');
      const isAllowed = (message) => allowedFragments.some((fragment) => (
        typeof fragment === 'string' && message.includes(fragment)
      ));
      const details = [
        ...consoleErrors
          .filter((message) => !isAllowed(message))
          .map((message) => `console.error: ${message}`),
        ...pageErrors
          .filter((message) => !isAllowed(message))
          .map((message) => `pageerror: ${message}`)
      ];
      assert.equal(details.length, 0, details.join('\n'));
    },

    async expectConsoleWarning(fragment) {
      assert.equal(typeof fragment, 'string');
      assert.ok(
        consoleWarnings.some((message) => message.includes(fragment)),
        `Expected console warning containing ${fragment}; observed ${JSON.stringify(consoleWarnings)}`
      );
    },

    async expectNoCspViolations() {
      const violations = await getCspViolations();
      assert.equal(
        violations.length,
        0,
        `Unexpected CSP violations: ${JSON.stringify(violations)}`
      );
    },

    async expectCspViolation(directive, { blockedURI } = {}) {
      assert.equal(typeof directive, 'string');
      const violations = await getCspViolations();
      const matchingViolation = findDirectiveViolation(violations, directive, blockedURI);
      assert.ok(
        matchingViolation,
        `Expected CSP violation for ${directive}${blockedURI ? ` at ${blockedURI}` : ''}; observed ${JSON.stringify(violations)}`
      );
      return matchingViolation;
    },

    async expectOnlyCspViolations(directives) {
      assert.ok(Array.isArray(directives), 'CSP directives must be an array');
      const violations = await getCspViolations();
      const allowed = new Set(directives);
      const unexpected = violations.filter((violation) => (
        !allowed.has(violation.effectiveDirective)
        && !allowed.has(violation.violatedDirective)
      ));
      assert.equal(
        unexpected.length,
        0,
        `Unexpected CSP violations: ${JSON.stringify(unexpected)}`
      );
      return violations;
    },

    async expectCspViolationInFrame(frame, directive, { blockedURI } = {}) {
      assert.ok(frame && typeof frame.evaluate === 'function', 'A Playwright frame is required');
      const violations = await frame.evaluate(
        () => Array.from(window.__coldboxCspViolations || [])
      );
      const matchingViolation = findDirectiveViolation(violations, directive, blockedURI);
      assert.ok(
        matchingViolation,
        `Expected frame CSP violation for ${directive}${blockedURI ? ` at ${blockedURI}` : ''}; observed ${JSON.stringify(violations)}`
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

    async expectNetworkPrimitiveBlocked(
      name,
      frame,
      { requireCspViolation = false, requireRuntimeBlock = false } = {}
    ) {
      assert.ok(frame && typeof frame.evaluate === 'function', 'A Playwright frame is required');
      assert.ok(NETWORK_PRIMITIVES.includes(name), `Unsupported network primitive: ${name}`);

      const result = await frame.evaluate(async ({
        primitive,
        requireCspViolation: requireViolation
      }) => {
        const url = primitive === 'WebSocket'
          ? 'wss://coldbox.invalid/network-primitive-test'
          : 'https://coldbox.invalid/network-primitive-test';
        const blocked = (signal, error = '') => ({ blocked: true, error, signal });
        const allowed = (signal) => ({ blocked: false, error: '', signal });
        const connectViolationCount = () => Array.from(
          window.__coldboxCspViolations || []
        ).filter((violation) => (
          (violation.effectiveDirective === 'connect-src'
            || violation.violatedDirective === 'connect-src')
          && violation.blockedURI === url
        )).length;
        const waitForConnectViolation = (initialCount) => new Promise((resolve) => {
          const currentCount = connectViolationCount();
          if (currentCount > initialCount) {
            resolve(true);
            return;
          }

          let settled = false;
          let timer;
          const finish = (observed) => {
            if (settled) {
              return;
            }
            settled = true;
            clearTimeout(timer);
            document.removeEventListener('securitypolicyviolation', onViolation);
            resolve(observed);
          };
          const onViolation = (event) => {
            if ((event.effectiveDirective === 'connect-src'
              || event.violatedDirective === 'connect-src')
              && event.blockedURI === url) {
              finish(true);
            }
          };
          document.addEventListener('securitypolicyviolation', onViolation);
          timer = setTimeout(() => finish(false), 500);
        });

        const initialViolationCount = connectViolationCount();
        const outcome = await (async () => {
          try {
            switch (primitive) {
              case 'fetch':
                await globalThis.fetch(url);
                return allowed('resolved');
              case 'XMLHttpRequest': {
                const request = new XMLHttpRequest();
                request.open('GET', url);
                return await new Promise((resolve) => {
                  let settled = false;
                  let timer;
                  const finish = (result) => {
                    if (settled) {
                      return;
                    }
                    settled = true;
                    clearTimeout(timer);
                    resolve(result);
                  };
                  request.addEventListener('error', () => finish(blocked('error-event')));
                  request.addEventListener('abort', () => finish(blocked('abort-event')));
                  request.addEventListener('load', () => finish(allowed('load-event')));
                  request.addEventListener('timeout', () => finish(blocked('timeout-event')));
                  timer = setTimeout(() => finish(allowed('timeout')), 1500);
                  try {
                    request.send();
                  } catch (error) {
                    finish(blocked('threw', String(error)));
                  }
                });
              }
              case 'WebSocket': {
                return await new Promise((resolve) => {
                  let settled = false;
                  let socket;
                  let timer;
                  const finish = (result) => {
                    if (settled) {
                      return;
                    }
                    settled = true;
                    clearTimeout(timer);
                    if (socket) {
                      socket.close();
                    }
                    resolve(result);
                  };
                  try {
                    socket = new WebSocket(url);
                    socket.addEventListener('error', () => finish(blocked('error-event')));
                    socket.addEventListener('open', () => finish(allowed('open-event')));
                    socket.addEventListener('close', () => finish(blocked('close-event')));
                    timer = setTimeout(() => finish(allowed('timeout')), 1500);
                  } catch (error) {
                    finish(blocked('threw', String(error)));
                  }
                });
              }
              case 'EventSource': {
                return await new Promise((resolve) => {
                  let settled = false;
                  let source;
                  let timer;
                  const finish = (result) => {
                    if (settled) {
                      return;
                    }
                    settled = true;
                    clearTimeout(timer);
                    if (source) {
                      source.close();
                    }
                    resolve(result);
                  };
                  try {
                    source = new EventSource(url);
                    source.addEventListener('error', () => finish(blocked('error-event')));
                    source.addEventListener('open', () => finish(allowed('open-event')));
                    timer = setTimeout(() => finish(allowed('timeout')), 1500);
                  } catch (error) {
                    finish(blocked('threw', String(error)));
                  }
                });
              }
              case 'sendBeacon': {
                const beaconInitialViolationCount = connectViolationCount();
                const accepted = navigator.sendBeacon(url, 'coldbox');
                if (!accepted) {
                  return blocked('returned-false');
                }
                const violationObserved = await waitForConnectViolation(beaconInitialViolationCount);
                return violationObserved
                  ? blocked('returned-true-csp-violation')
                  : allowed('accepted');
              }
              default:
                throw new Error(`Unsupported network primitive: ${primitive}`);
            }
          } catch (error) {
            return blocked('threw', String(error));
          }
        })();
        const cspViolation = requireViolation
          ? await waitForConnectViolation(initialViolationCount)
          : null;
        return {
          ...outcome,
          cspViolation,
          runtimeBlock: outcome.signal === 'threw'
            && outcome.error.includes('Coldbox airgap blocked')
        };
      }, { primitive: name, requireCspViolation, requireRuntimeBlock });

      assert.equal(
        result.blocked,
        true,
        `${name} did not signal a blocked request (result: ${JSON.stringify(result)})`
      );
      if (requireCspViolation) {
        assert.equal(
          result.cspViolation,
          true,
          `${name} did not produce a matching connect-src violation; DNS or another non-CSP failure may have satisfied the probe: ${JSON.stringify(result)}`
        );
      }
      if (requireRuntimeBlock) {
        assert.equal(
          result.runtimeBlock,
          true,
          `${name} did not hit the labelled runtime airgap blocker; DNS or another non-runtime failure may have satisfied the probe: ${JSON.stringify(result)}`
        );
      }
      return result;
    },

    async expectParentCannotReadFrame({ selector = '#cold-frame' } = {}) {
      const result = await page.evaluate((frameSelector) => {
        const iframe = document.querySelector(frameSelector);
        if (!iframe) {
          throw new Error(`Frame not found: ${frameSelector}`);
        }
        let domReadable = false;
        let variableReadable = false;
        let contentDocumentReadable = false;
        const errors = [];
        try {
          domReadable = Boolean(iframe.contentWindow.document);
        } catch (error) {
          errors.push(`document: ${String(error)}`);
        }
        try {
          variableReadable = iframe.contentWindow.__coldboxColdRealmMarker === 'cold-realm-ready';
        } catch (error) {
          errors.push(`variable: ${String(error)}`);
        }
        try {
          contentDocumentReadable = Boolean(iframe.contentDocument);
        } catch (error) {
          errors.push(`contentDocument: ${String(error)}`);
        }
        return {
          readable: domReadable || variableReadable || contentDocumentReadable,
          error: errors.join('; '),
          domReadable,
          variableReadable,
          contentDocumentReadable
        };
      }, selector);

      assert.equal(
        result.readable,
        false,
        `Parent could read the frame DOM or variables: ${JSON.stringify(result)}`
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
