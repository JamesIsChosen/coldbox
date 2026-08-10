(function (global) {
  'use strict';

  // Entropy Health Meter and Bias Analyzer (P1.2). This module deliberately
  // has no DOM, crypto, or network dependency. It receives a validated copy
  // of the physical/manual observations from main.js and returns diagnostics
  // only; the P1.1 integer entropy accounting remains the authority for
  // independent-source credit and mixing.
  //
  // The statistical definitions are recorded in ADR-0027:
  //   - frequency and empirical min-entropy use the configured finite alphabet;
  //   - Pearson chi-square is only reported when every expected bin is at
  //     least five observations;
  //   - the runs test uses NIST's binary Wald-Wolfowitz formulation, with
  //     multi-symbol sources split above/below the alphabet midpoint;
  //   - serial correlation is the NIST lag-one autocorrelation; and
  //   - pattern warnings are prompts to inspect a recording, never proofs of
  //     a bad source or proofs of a good one.

  var DEFAULT_ALPHA = 0.01;
  var MIN_RUN_SAMPLE_COUNT = 20;
  var MIN_EXPECTED_COUNT = 5;
  var LONG_RUN_LENGTH = 6;
  var ORDERED_SEQUENCE_LENGTH = 4;
  var ALTERNATING_LENGTH = 6;
  var REPEATED_BLOCK_LENGTH = 4;
  var NORMAL_95_Z = 1.959963984540054;

  function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function log2(value) {
    return Math.log(value) / Math.LN2;
  }

  function clampProbability(value) {
    if (value <= 0) {
      return 0;
    }
    if (value >= 1) {
      return 1;
    }
    return value;
  }

  // Abramowitz-Stegun 7.1.26 approximation. The analyzer uses this only for
  // a diagnostic p-value, not for key material or an entropy-count gate.
  function complementaryErrorFunction(value) {
    var sign = value < 0 ? -1 : 1;
    var x = Math.abs(value);
    var t = 1 / (1 + 0.5 * x);
    var polynomial = t * Math.exp(
      -x * x - 1.26551223
      + t * (1.00002368
        + t * (0.37409196
          + t * (0.09678418
            + t * (-0.18628806
              + t * (0.27886807
                + t * (-1.13520398
                  + t * (1.48851587
                    + t * (-0.82215223
                      + t * 0.17087277))))))))
    );
    return sign < 0 ? 2 - polynomial : polynomial;
  }

  function normalTwoSidedPValue(zScore) {
    return clampProbability(complementaryErrorFunction(Math.abs(zScore) / Math.sqrt(2)));
  }

  // Lanczos log-gamma approximation, followed by the standard series or
  // continued-fraction evaluation of the regularized upper incomplete gamma.
  // Chi-square upper-tail probabilities are Q(df/2, statistic/2).
  function logGamma(value) {
    var coefficients = [
      676.5203681218851,
      -1259.1392167224028,
      771.32342877765313,
      -176.61502916214059,
      12.507343278686905,
      -0.13857109526572012,
      9.9843695780195716e-6,
      1.5056327351493116e-7
    ];
    if (value < 0.5) {
      return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * value)) - logGamma(1 - value);
    }
    var z = value - 1;
    var x = 0.99999999999980993;
    for (var index = 0; index < coefficients.length; index += 1) {
      x += coefficients[index] / (z + index + 1);
    }
    var t = z + coefficients.length - 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }

  function regularizedGammaPSeries(a, x) {
    var sum = 1 / a;
    var term = sum;
    for (var index = 1; index <= 200; index += 1) {
      term *= x / (a + index);
      sum += term;
      if (Math.abs(term) <= Math.abs(sum) * 1e-14) {
        break;
      }
    }
    return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
  }

  function regularizedGammaQContinuedFraction(a, x) {
    var tiny = 1e-300;
    var b = x + 1 - a;
    var c = 1 / tiny;
    var d = 1 / Math.max(Math.abs(b), tiny);
    var h = d;
    for (var index = 1; index <= 200; index += 1) {
      var an = -index * (index - a);
      b += 2;
      d = an * d + b;
      d = Math.abs(d) < tiny ? tiny : d;
      c = b + an / c;
      c = Math.abs(c) < tiny ? tiny : c;
      d = 1 / d;
      var delta = d * c;
      h *= delta;
      if (Math.abs(delta - 1) <= 1e-14) {
        break;
      }
    }
    return Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
  }

  function regularizedGammaQ(a, x) {
    if (x < 0 || a <= 0 || !isFiniteNumber(a) || !isFiniteNumber(x)) {
      return NaN;
    }
    if (x === 0) {
      return 1;
    }
    if (x < a + 1) {
      return clampProbability(1 - regularizedGammaPSeries(a, x));
    }
    return clampProbability(regularizedGammaQContinuedFraction(a, x));
  }

  function validateOptions(options) {
    var config = options || {};
    if (!Number.isInteger(config.alphabetSize) || config.alphabetSize < 2 || config.alphabetSize > 256) {
      throw new Error('Entropy Health: alphabetSize must be an integer between 2 and 256.');
    }
    if (config.withoutReplacement !== undefined && typeof config.withoutReplacement !== 'boolean') {
      throw new Error('Entropy Health: withoutReplacement must be a boolean.');
    }
    if (config.targetBits !== undefined
        && (!isFiniteNumber(config.targetBits) || config.targetBits <= 0)) {
      throw new Error('Entropy Health: targetBits must be a positive number.');
    }
    if (config.claimedBits !== undefined
        && (!isFiniteNumber(config.claimedBits) || config.claimedBits < 0)) {
      throw new Error('Entropy Health: claimedBits must be a non-negative number.');
    }
    if (config.claimedBitsPerSymbol !== undefined
        && (!isFiniteNumber(config.claimedBitsPerSymbol) || config.claimedBitsPerSymbol < 0)) {
      throw new Error('Entropy Health: claimedBitsPerSymbol must be a non-negative number.');
    }
    if (config.claimedBits !== undefined && config.claimedBitsPerSymbol !== undefined) {
      throw new Error('Entropy Health: provide claimedBits or claimedBitsPerSymbol, not both.');
    }
    if (config.alpha !== undefined
        && (!isFiniteNumber(config.alpha) || config.alpha <= 0 || config.alpha >= 1)) {
      throw new Error('Entropy Health: alpha must be between 0 and 1.');
    }
    return config;
  }

  function validateValues(values, alphabetSize) {
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error('Entropy Health: values must be a non-empty array.');
    }
    for (var index = 0; index < values.length; index += 1) {
      if (!Number.isInteger(values[index]) || values[index] < 0 || values[index] >= alphabetSize) {
        throw new Error('Entropy Health: every symbol must be an integer in the configured alphabet.');
      }
    }
  }

  function frequencyCounts(values, alphabetSize) {
    var counts = new Array(alphabetSize).fill(0);
    for (var index = 0; index < values.length; index += 1) {
      counts[values[index]] += 1;
    }
    return counts;
  }

  function chiSquareGoodnessOfFit(counts, sampleCount, withoutReplacement, alpha) {
    if (withoutReplacement) {
      return {
        available: false,
        reason: 'without-replacement',
        statistic: null,
        degreesOfFreedom: null,
        expectedCount: null,
        pValue: null,
        biasDetected: false
      };
    }
    var expectedCount = sampleCount / counts.length;
    if (expectedCount < MIN_EXPECTED_COUNT) {
      return {
        available: false,
        reason: 'expected-counts-too-small',
        statistic: null,
        degreesOfFreedom: counts.length - 1,
        expectedCount: expectedCount,
        pValue: null,
        biasDetected: false
      };
    }
    var statistic = 0;
    for (var index = 0; index < counts.length; index += 1) {
      var difference = counts[index] - expectedCount;
      statistic += (difference * difference) / expectedCount;
    }
    var degreesOfFreedom = counts.length - 1;
    var pValue = regularizedGammaQ(degreesOfFreedom / 2, statistic / 2);
    return {
      available: true,
      reason: null,
      statistic: statistic,
      degreesOfFreedom: degreesOfFreedom,
      expectedCount: expectedCount,
      pValue: pValue,
      biasDetected: pValue < alpha
    };
  }

  function unavailableRuns(reason) {
    return {
      available: false,
      reason: reason,
      basis: null,
      runs: null,
      n1: null,
      n2: null,
      expectedRuns: null,
      standardDeviation: null,
      zScore: null,
      pValue: null,
      biasDetected: false
    };
  }

  function binaryRuns(values, basis, alpha) {
    var sampleCount = values.length;
    if (sampleCount < MIN_RUN_SAMPLE_COUNT) {
      return unavailableRuns('sample-too-small');
    }
    var n1 = 0;
    for (var index = 0; index < values.length; index += 1) {
      if (values[index] === 1) {
        n1 += 1;
      }
    }
    var n2 = sampleCount - n1;
    if (n1 === 0 || n2 === 0) {
      return unavailableRuns('one-symbol-only');
    }
    // The cited NIST normal approximation is a large-sample treatment. Keep
    // it unavailable until both projected symbol counts are strictly greater
    // than 10; smaller samples need a critical-value table that this layer
    // does not implement.
    if (n1 <= 10 || n2 <= 10) {
      return unavailableRuns('symbol-counts-too-small');
    }
    // NIST's large-sample binary runs test assumes the observed proportion is
    // close enough to 1/2 for the normal approximation to be meaningful.
    var proportion = n1 / sampleCount;
    if (Math.abs(proportion - 0.5) > 2 / Math.sqrt(sampleCount)) {
      return unavailableRuns('proportion-too-skewed');
    }
    var runs = 1;
    for (var runIndex = 1; runIndex < values.length; runIndex += 1) {
      if (values[runIndex] !== values[runIndex - 1]) {
        runs += 1;
      }
    }
    var expectedRuns = (2 * n1 * n2 / sampleCount) + 1;
    var variance = (2 * n1 * n2 * (2 * n1 * n2 - sampleCount))
      / (sampleCount * sampleCount * (sampleCount - 1));
    if (variance <= 0 || !isFiniteNumber(variance)) {
      return unavailableRuns('zero-variance');
    }
    var standardDeviation = Math.sqrt(variance);
    var zScore = (runs - expectedRuns) / standardDeviation;
    var pValue = normalTwoSidedPValue(zScore);
    return {
      available: true,
      reason: null,
      basis: basis,
      runs: runs,
      n1: n1,
      n2: n2,
      expectedRuns: expectedRuns,
      standardDeviation: standardDeviation,
      zScore: zScore,
      pValue: pValue,
      biasDetected: pValue < alpha
    };
  }

  function runsTest(values, alphabetSize, withoutReplacement, alpha) {
    if (withoutReplacement) {
      return unavailableRuns('without-replacement');
    }
    if (alphabetSize === 2) {
      return binaryRuns(values, 'binary-symbols', alpha);
    }
    var midpoint = (alphabetSize - 1) / 2;
    var aboveBelow = values.map(function (value) {
      return value > midpoint ? 1 : 0;
    });
    return binaryRuns(aboveBelow, 'above-below-midpoint', alpha);
  }

  function serialCorrelation(values, withoutReplacement) {
    if (withoutReplacement) {
      return {
        available: false,
        reason: 'without-replacement',
        value: null,
        confidenceBand: null,
        significant: false
      };
    }
    if (values.length < 3) {
      return {
        available: false,
        reason: 'sample-too-small',
        value: null,
        confidenceBand: null,
        significant: false
      };
    }
    var mean = values.reduce(function (sum, value) { return sum + value; }, 0) / values.length;
    var denominator = 0;
    for (var index = 0; index < values.length; index += 1) {
      var centered = values[index] - mean;
      denominator += centered * centered;
    }
    if (denominator === 0) {
      return {
        available: false,
        reason: 'zero-variance',
        value: null,
        confidenceBand: null,
        significant: false
      };
    }
    var numerator = 0;
    for (var pairIndex = 0; pairIndex < values.length - 1; pairIndex += 1) {
      numerator += (values[pairIndex] - mean) * (values[pairIndex + 1] - mean);
    }
    var value = numerator / denominator;
    var confidenceBand = NORMAL_95_Z / Math.sqrt(values.length);
    return {
      available: true,
      reason: null,
      value: value,
      confidenceBand: confidenceBand,
      significant: Math.abs(value) > confidenceBand
    };
  }

  function longestRun(values) {
    var bestLength = 1;
    var bestSymbol = values[0];
    var currentLength = 1;
    for (var index = 1; index < values.length; index += 1) {
      if (values[index] === values[index - 1]) {
        currentLength += 1;
      } else {
        currentLength = 1;
      }
      if (currentLength > bestLength) {
        bestLength = currentLength;
        bestSymbol = values[index];
      }
    }
    return { length: bestLength, symbol: bestSymbol };
  }

  function longestOrderedSequence(values) {
    var best = { length: 1, direction: null, start: 0 };
    var direction = 0;
    var length = 1;
    var start = 0;
    for (var index = 1; index < values.length; index += 1) {
      var nextDirection = values[index] > values[index - 1]
        ? 1
        : (values[index] < values[index - 1] ? -1 : 0);
      if (nextDirection !== 0 && nextDirection === direction) {
        length += 1;
      } else if (nextDirection !== 0) {
        direction = nextDirection;
        length = 2;
        start = index - 1;
      } else {
        direction = 0;
        length = 1;
        start = index;
      }
      if (length > best.length) {
        best = { length: length, direction: direction, start: start };
      }
    }
    return best;
  }

  function longestAlternation(values) {
    if (values.length < 3) {
      return { length: values.length, start: 0 };
    }
    var bestLength = 1;
    var bestStart = 0;
    var length = 2;
    var start = 0;
    for (var index = 2; index < values.length; index += 1) {
      if (values[index] === values[index - 2] && values[index] !== values[index - 1]) {
        length += 1;
      } else {
        length = 2;
        start = index - 1;
      }
      if (length > bestLength) {
        bestLength = length;
        bestStart = start;
      }
    }
    return { length: bestLength, start: bestStart };
  }

  function longestRepeatedBlock(values) {
    var best = { length: 0, blockLength: 0, start: 0 };
    for (var blockLength = 2; blockLength <= Math.floor(values.length / 2); blockLength += 1) {
      for (var start = 0; start + (2 * blockLength) <= values.length; start += 1) {
        // A repeated block warning is intended for copy/paste-like structure,
        // not a constant run already reported by the long-run detector.
        var blockIsConstant = true;
        for (var blockIndex = 1; blockIndex < blockLength; blockIndex += 1) {
          if (values[start + blockIndex] !== values[start]) {
            blockIsConstant = false;
            break;
          }
        }
        if (blockIsConstant) {
          continue;
        }
        var matches = true;
        for (var offset = 0; offset < blockLength; offset += 1) {
          if (values[start + offset] !== values[start + blockLength + offset]) {
            matches = false;
            break;
          }
        }
        if (matches && (2 * blockLength) > best.length) {
          best = {
            length: 2 * blockLength,
            blockLength: blockLength,
            start: start
          };
        }
      }
    }
    return best;
  }

  function patternWarnings(values) {
    var warnings = [];
    var run = longestRun(values);
    if (run.length >= LONG_RUN_LENGTH) {
      warnings.push({
        code: 'long-run',
        length: run.length,
        symbol: run.symbol
      });
    }
    var ordered = longestOrderedSequence(values);
    if (ordered.length >= ORDERED_SEQUENCE_LENGTH) {
      warnings.push({
        code: ordered.direction > 0 ? 'ascending-sequence' : 'descending-sequence',
        length: ordered.length,
        start: ordered.start
      });
    }
    var alternating = longestAlternation(values);
    if (alternating.length >= ALTERNATING_LENGTH) {
      warnings.push({
        code: 'alternation',
        length: alternating.length,
        start: alternating.start
      });
    }
    var repeated = longestRepeatedBlock(values);
    if (repeated.length >= REPEATED_BLOCK_LENGTH) {
      warnings.push({
        code: 'repeated-block',
        length: repeated.length,
        blockLength: repeated.blockLength,
        start: repeated.start
      });
    }
    return warnings;
  }

  function analyze(values, options) {
    var config = validateOptions(options);
    validateValues(values, config.alphabetSize);

    var counts = frequencyCounts(values, config.alphabetSize);
    var maxCount = counts[0];
    var maxSymbol = 0;
    for (var index = 1; index < counts.length; index += 1) {
      if (counts[index] > maxCount) {
        maxCount = counts[index];
        maxSymbol = index;
      }
    }
    var sampleCount = values.length;
    var claimedBits = config.claimedBits !== undefined
      ? config.claimedBits
      : sampleCount * (config.claimedBitsPerSymbol !== undefined
        ? config.claimedBitsPerSymbol
        : log2(config.alphabetSize));
    var measuredBits = config.withoutReplacement
      ? null
      : sampleCount * (-log2(maxCount / sampleCount));
    var alpha = config.alpha === undefined ? DEFAULT_ALPHA : config.alpha;
    var chiSquare = chiSquareGoodnessOfFit(
      counts, sampleCount, Boolean(config.withoutReplacement), alpha
    );
    var runs = runsTest(
      values, config.alphabetSize, Boolean(config.withoutReplacement), alpha
    );
    var correlation = serialCorrelation(values, Boolean(config.withoutReplacement));
    var warnings = patternWarnings(values);
    var state;
    if (config.withoutReplacement) {
      state = 'not-applicable';
    } else if (measuredBits < (config.targetBits || 0)) {
      state = 'insufficient';
    } else if (chiSquare.biasDetected) {
      state = 'marginal';
    } else if (measuredBits >= 256) {
      state = 'strong';
    } else {
      state = 'adequate';
    }

    var frequencies = counts.map(function (count, symbol) {
      return {
        symbol: symbol,
        count: count,
        probability: count / sampleCount
      };
    });

    return {
      sampleCount: sampleCount,
      alphabetSize: config.alphabetSize,
      counts: counts,
      frequencies: frequencies,
      maxCount: maxCount,
      maxSymbol: maxSymbol,
      maxProbability: maxCount / sampleCount,
      claimedBits: claimedBits,
      measuredBits: measuredBits,
      estimator: config.withoutReplacement ? null : 'empirical-maximum-frequency',
      chiSquare: chiSquare,
      runs: runs,
      serialCorrelation: correlation,
      patternWarnings: warnings,
      state: state,
      alpha: alpha
    };
  }

  global.__coldboxEntropyHealth = Object.freeze({
    DEFAULT_ALPHA: DEFAULT_ALPHA,
    MIN_RUN_SAMPLE_COUNT: MIN_RUN_SAMPLE_COUNT,
    MIN_EXPECTED_COUNT: MIN_EXPECTED_COUNT,
    analyze: analyze,
    patternWarnings: patternWarnings
  });
}(window));
