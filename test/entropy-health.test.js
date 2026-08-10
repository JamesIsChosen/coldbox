'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const healthSource = fs.readFileSync(
  path.join(projectRoot, 'src', 'cold', 'entropy-health.js'),
  'utf8'
);

function createHealth() {
  const context = { console };
  context.window = context;
  context.self = context;
  vm.runInNewContext(healthSource, context);
  return context.__coldboxEntropyHealth;
}

test('analyze() reports exact frequencies and claimed-versus-measured min-entropy', () => {
  const health = createHealth();
  const result = health.analyze([0, 1, 2, 0, 1, 2], {
    alphabetSize: 3,
    targetBits: 16,
    claimedBitsPerSymbol: Math.log2(3)
  });

  assert.deepEqual(Array.from(result.counts), [2, 2, 2]);
  assert.equal(result.sampleCount, 6);
  assert.ok(Math.abs(result.claimedBits - (6 * Math.log2(3))) < 1e-12);
  assert.ok(Math.abs(result.measuredBits - result.claimedBits) < 1e-12);
  assert.equal(result.maxCount, 2);
  assert.equal(result.maxSymbol, 0);
  assert.equal(result.state, 'insufficient');
});

test('chi-square goodness-of-fit uses the NIST statistic and upper-tail p-value', () => {
  const health = createHealth();
  const values = [];
  values.push(...new Array(20).fill(0));
  values.push(...new Array(10).fill(1));
  values.push(...new Array(10).fill(2));
  values.push(...new Array(10).fill(3));
  values.push(...new Array(5).fill(4));
  values.push(...new Array(5).fill(5));
  const result = health.analyze(values, {
    alphabetSize: 6,
    targetBits: 1,
    claimedBitsPerSymbol: Math.log2(6)
  });

  assert.equal(result.chiSquare.available, true);
  assert.equal(result.chiSquare.degreesOfFreedom, 5);
  assert.equal(result.chiSquare.expectedCount, 10);
  assert.equal(result.chiSquare.statistic, 15);
  // Independent chi-square tables put df=5, alpha=.01 at 15.086. This
  // statistic is just below that critical value, so the upper-tail p-value
  // must be above .01 while remaining below .02.
  assert.ok(result.chiSquare.pValue > 0.01);
  assert.ok(result.chiSquare.pValue < 0.02);
  assert.equal(result.chiSquare.biasDetected, false);
});

test('chi-square flags a strongly skewed source and refuses small expected counts', () => {
  const health = createHealth();
  const skewed = [];
  skewed.push(...new Array(30).fill(0));
  skewed.push(...new Array(6).fill(1));
  skewed.push(...new Array(6).fill(2));
  skewed.push(...new Array(6).fill(3));
  skewed.push(...new Array(6).fill(4));
  skewed.push(...new Array(6).fill(5));
  const result = health.analyze(skewed, {
    alphabetSize: 6,
    targetBits: 1,
    claimedBitsPerSymbol: Math.log2(6)
  });

  assert.equal(result.chiSquare.biasDetected, true);
  assert.ok(result.chiSquare.pValue < 0.001);

  const small = health.analyze([0, 1, 2, 3, 4, 5], {
    alphabetSize: 6,
    targetBits: 1,
    claimedBitsPerSymbol: Math.log2(6)
  });
  assert.equal(small.chiSquare.available, false);
  assert.equal(small.chiSquare.reason, 'expected-counts-too-small');
});

test('runs test follows the NIST binary formulation and detects extreme clustering', () => {
  const health = createHealth();
  const alternating = Array.from({ length: 22 }, (_, index) => index % 2);
  const grouped = [
    ...new Array(11).fill(0),
    ...new Array(11).fill(1)
  ];

  const alternatingResult = health.analyze(alternating, {
    alphabetSize: 2,
    targetBits: 1,
    claimedBitsPerSymbol: 1
  });
  const groupedResult = health.analyze(grouped, {
    alphabetSize: 2,
    targetBits: 1,
    claimedBitsPerSymbol: 1
  });

  assert.equal(alternatingResult.runs.available, true);
  assert.equal(alternatingResult.runs.runs, 22);
  assert.equal(groupedResult.runs.runs, 2);
  assert.ok(alternatingResult.runs.pValue < 0.001);
  assert.ok(groupedResult.runs.pValue < 0.001);
  assert.equal(alternatingResult.runs.biasDetected, true);
  assert.equal(groupedResult.runs.biasDetected, true);

  const belowLargeSample = health.analyze(
    Array.from({ length: 20 }, (_, index) => index % 2),
    { alphabetSize: 2, targetBits: 1, claimedBitsPerSymbol: 1 }
  );
  assert.equal(belowLargeSample.runs.available, false);
  assert.equal(belowLargeSample.runs.reason, 'symbol-counts-too-small');
});

test('lag-one serial correlation uses the published autocorrelation definition', () => {
  const health = createHealth();
  const result = health.analyze([1, 2, 3, 4, 5], {
    alphabetSize: 6,
    targetBits: 1,
    claimedBitsPerSymbol: Math.log2(6)
  });

  assert.equal(result.serialCorrelation.available, true);
  assert.ok(Math.abs(result.serialCorrelation.value - 0.4) < 1e-12);
  assert.ok(result.serialCorrelation.confidenceBand > 0);

  const constant = health.analyze([2, 2, 2, 2], {
    alphabetSize: 6,
    targetBits: 1,
    claimedBitsPerSymbol: Math.log2(6)
  });
  assert.equal(constant.serialCorrelation.available, false);
  assert.equal(constant.serialCorrelation.reason, 'zero-variance');
});

test('pattern warnings identify runs, sequences, alternation, and repeated blocks', () => {
  const health = createHealth();
  const result = health.analyze([
    1, 1, 1, 1, 1, 1,
    2, 3, 4, 5,
    6, 5, 6, 5, 6,
    2, 3, 2, 3
  ], {
    alphabetSize: 7,
    targetBits: 1,
    claimedBitsPerSymbol: Math.log2(7)
  });

  assert.deepEqual(
    Array.from(result.patternWarnings, (warning) => warning.code),
    ['long-run', 'ascending-sequence', 'alternation', 'repeated-block']
  );

  const repeatedBlockWithMatchingPrefix = health.analyze([0, 0, 1, 0, 0, 1], {
    alphabetSize: 2,
    targetBits: 1,
    claimedBitsPerSymbol: 1
  });
  assert.ok(
    repeatedBlockWithMatchingPrefix.patternWarnings.some(
      (warning) => warning.code === 'repeated-block'
    )
  );
});

test('health states use the selected target without overlapping thresholds', () => {
  const health = createHealth();
  const balanced = Array.from({ length: 128 }, (_, index) => index % 2);
  const expectedStates = new Map([
    [128, 'adequate'],
    [160, 'insufficient'],
    [192, 'insufficient'],
    [224, 'insufficient'],
    [256, 'insufficient']
  ]);

  for (const [targetBits, expectedState] of expectedStates) {
    const result = health.analyze(balanced, {
      alphabetSize: 2,
      targetBits,
      claimedBitsPerSymbol: 1
    });
    assert.equal(result.measuredBits, 128);
    assert.equal(result.state, expectedState, `target ${targetBits} must use the selected-target threshold`);
  }
});

test('without-replacement sources do not pretend card frequencies are iid tests', () => {
  const health = createHealth();
  const result = health.analyze(Array.from({ length: 52 }, (_, index) => index), {
    alphabetSize: 52,
    targetBits: 128,
    claimedBits: 225.58,
    withoutReplacement: true
  });

  assert.equal(result.chiSquare.available, false);
  assert.equal(result.chiSquare.reason, 'without-replacement');
  assert.equal(result.runs.available, false);
  assert.equal(result.runs.reason, 'without-replacement');
  assert.equal(result.serialCorrelation.available, false);
  assert.equal(result.serialCorrelation.reason, 'without-replacement');
  assert.equal(result.measuredBits, null);
});

test('invalid analyzer input fails closed instead of silently changing the alphabet', () => {
  const health = createHealth();
  assert.throws(
    () => health.analyze([0, 2], { alphabetSize: 2, targetBits: 1 }),
    /symbol must be an integer in the configured alphabet/i
  );
  assert.throws(
    () => health.analyze([0], { alphabetSize: 1, targetBits: 1 }),
    /alphabetSize must be an integer between 2 and 256/i
  );
  assert.throws(
    () => health.analyze([], { alphabetSize: 2, targetBits: 1 }),
    /values must be a non-empty array/i
  );
  assert.throws(
    () => health.analyze([0, 1], { alphabetSize: 2, claimedBits: 2, claimedBitsPerSymbol: 1 }),
    /provide claimedBits or claimedBitsPerSymbol, not both/i
  );
  assert.throws(
    () => health.analyze([0, 1], { alphabetSize: 2, withoutReplacement: 'false' }),
    /withoutReplacement must be a boolean/i
  );
});
