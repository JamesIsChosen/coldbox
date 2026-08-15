'use strict';

// The embedded provenance build date, and specifically its *spelling*.
//
// Split out of scripts/build.js so the formatter is a pure function that can
// be tested directly over a table of offsets, rather than only observed
// through a full build. See ADR-0015's 2026-08-15 amendment for why the
// spelling is ours rather than git's; the short version is that `%cI` renders
// a +0000 commit as "…+00:00" on git 2.43.0 and "…Z" on newer git, five bytes
// of difference that landed straight in the artifact and made the output hash
// depend on the builder's git version.

const BUILD_DATE_UNKNOWN = 'unknown (no git commit metadata available)';

// `%ct` is an integer with no rendering to disagree about. `%ci` is git's
// long-standing "YYYY-MM-DD HH:MM:SS +HHMM" spelling. We read its numeric
// offset, but also retain its calendar/time portion so malformed or
// contradictory output cannot be accepted on shape alone.
const GIT_OUTPUT_PATTERN = /^(\d+) (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) ([+-])(\d{2})(\d{2})$/;
const UNIX_SECONDS_PATTERN = /^\d+$/;
const OFFSET_SIGN_PATTERN = /^[+-]$/;
const OFFSET_HOURS_PATTERN = /^(?:[01]\d|2[0-3])$/;
const OFFSET_MINUTES_PATTERN = /^[0-5]\d$/;

// Canonical form: seconds precision, explicit numeric offset, never "Z".
//
// Explicit-numeric is not an arbitrary pick — it is what every commit in this
// repository already embedded under the old `%cI` path, because every one of
// them was made at a non-zero offset. Choosing it makes this change
// byte-neutral on all existing history, so the recorded CI artifact hash stays
// valid and the fix can be verified by rebuilding a known commit.
function formatCommitDate(unixSeconds, offsetSign, offsetHours, offsetMinutes) {
  // Keep the formatter fail-closed even when called directly. The parser
  // already enforces these shapes, but relying on the caller would make the
  // exported pure function accept malformed offsets and emit malformed dates.
  if (
    typeof unixSeconds !== 'string' ||
    !UNIX_SECONDS_PATTERN.test(unixSeconds) ||
    typeof offsetSign !== 'string' ||
    !OFFSET_SIGN_PATTERN.test(offsetSign) ||
    typeof offsetHours !== 'string' ||
    !OFFSET_HOURS_PATTERN.test(offsetHours) ||
    typeof offsetMinutes !== 'string' ||
    !OFFSET_MINUTES_PATTERN.test(offsetMinutes)
  ) {
    return null;
  }

  const seconds = Number(unixSeconds);
  const hours = Number(offsetHours);
  const minutes = Number(offsetMinutes);
  if (!Number.isSafeInteger(seconds)) {
    return null;
  }

  const offsetInMinutes = (offsetSign === '-' ? -1 : 1) * (hours * 60 + minutes);
  // Shift the instant by the committer's offset so the UTC-rendering call
  // below prints the committer's own wall clock. Deliberately NOT a plain
  // toISOString() of the unshifted value: that would re-express every commit
  // in UTC and change every date this project has already embedded.
  const shifted = new Date((seconds + offsetInMinutes * 60) * 1000);
  if (Number.isNaN(shifted.getTime())) {
    return null;
  }

  // toISOString() is UTC-only and locale-independent by specification, so it
  // is the same string on every platform and under every TZ/LC_ALL.
  const wallClock = shifted.toISOString();
  // Reject the expanded-year form (year < 0 or > 9999), which would produce a
  // malformed result from the slice below. Not reachable from a real commit;
  // refuse rather than guess.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(wallClock)) {
    return null;
  }

  return `${wallClock.slice(0, 19)}${offsetSign}${offsetHours}:${offsetMinutes}`;
}

// Takes the raw stdout of
//   git log -1 --format=%ct %ci HEAD -- <paths>
// and returns the string to embed. Anything unparseable degrades to the same
// labeled unknown that missing git metadata produces — this field is
// informational, not a security boundary, so it fails soft rather than failing
// the build, but it never guesses.
function parseCommitDateOutput(stdout) {
  if (typeof stdout !== 'string' || !stdout.trim()) {
    return BUILD_DATE_UNKNOWN;
  }
  const parsed = GIT_OUTPUT_PATTERN.exec(stdout.trim());
  if (!parsed) {
    return BUILD_DATE_UNKNOWN;
  }
  const formatted = formatCommitDate(parsed[1], parsed[3], parsed[4], parsed[5]);
  if (formatted === null) {
    return BUILD_DATE_UNKNOWN;
  }

  // Do not trust `%ci`'s calendar/time fields merely because they have the
  // right shape. Reconstruct the committer wall clock from `%ct` plus the
  // parsed offset, then require git's reported wall clock to match it. This
  // rejects impossible dates/times and syntactically valid but contradictory
  // `%ci` output without duplicating date-validation arithmetic here.
  const expectedCalendarTime = `${formatted.slice(0, 10)} ${formatted.slice(11, 19)}`;
  return parsed[2] === expectedCalendarTime ? formatted : BUILD_DATE_UNKNOWN;
}

module.exports = {
  BUILD_DATE_UNKNOWN,
  formatCommitDate,
  parseCommitDateOutput
};
