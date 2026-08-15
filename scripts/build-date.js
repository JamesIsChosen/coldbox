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

// `%ct` is an integer with no rendering to disagree about. The offset is read
// from `%ci` — git's long-standing "YYYY-MM-DD HH:MM:SS +HHMM" — but *only*
// the numeric offset is taken from it, never the instant, so even a change to
// how `%ci` renders dates cannot move the output.
const GIT_OUTPUT_PATTERN = /^(\d+) \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} ([+-])(\d{2})(\d{2})$/;

// Canonical form: seconds precision, explicit numeric offset, never "Z".
//
// Explicit-numeric is not an arbitrary pick — it is what every commit in this
// repository already embedded under the old `%cI` path, because every one of
// them was made at a non-zero offset. Choosing it makes this change
// byte-neutral on all existing history, so the recorded CI artifact hash stays
// valid and the fix can be verified by rebuilding a known commit.
function formatCommitDate(unixSeconds, offsetSign, offsetHours, offsetMinutes) {
  const seconds = Number(unixSeconds);
  const hours = Number(offsetHours);
  const minutes = Number(offsetMinutes);
  if (!Number.isSafeInteger(seconds) || !Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return null;
  }
  if (hours > 23 || minutes > 59) {
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
  const formatted = formatCommitDate(parsed[1], parsed[2], parsed[3], parsed[4]);
  return formatted === null ? BUILD_DATE_UNKNOWN : formatted;
}

module.exports = {
  BUILD_DATE_UNKNOWN,
  formatCommitDate,
  parseCommitDateOutput
};
