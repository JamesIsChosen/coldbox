'use strict';

// P0.18 - CI documentation-hygiene checks, per docs/05-development/doc-hygiene.md.
//
// This script is the machine-readable enforcement of the "Automated checks"
// table in doc-hygiene.md. It never touches the network and never mutates
// any file - it only reads the repository and reports.
//
// Checks, and their severity (matching doc-hygiene.md exactly):
//   1. Internal links resolve                                        FAIL
//   2. Review dates present on every dated doc                       FAIL
//   3. Review date within its documented max age                     WARN
//   4. Help content has all three depth blocks                       FAIL
//   5. docs/README.md and the doc tree cross-reference each other    FAIL
//   6. Roadmap item IDs referenced elsewhere resolve to a real item  FAIL
//   7. dependencies.md matches vendor/vendor-manifest.json           FAIL
//   8. No TODO or TBD in user-facing docs                            WARN
//
// Run standalone: `node scripts/check-docs.js [--root <dir>]`.
// Exit code is non-zero if any FAIL-severity finding exists. WARN-severity
// findings are printed but do not affect the exit code, matching the
// "an out-of-date review date warns" acceptance criterion for P0.18.

const fs = require('node:fs');
const path = require('node:path');

let compileHelpContent = null;
try {
  ({ compileHelpContent } = require('./help-content.js'));
} catch {
  // help-content.js is loaded relative to THIS script, which works when
  // check-docs.js runs from its normal location. Tests that copy check-docs.js
  // into a throwaway root also copy help-content.js alongside it - see
  // test/check-docs.test.js - so this should never actually throw in practice.
  compileHelpContent = null;
}

// ---------------------------------------------------------------------------
// Config: the authoritative table this script enforces. Mirrors, and must be
// kept in sync with, the table in docs/05-development/doc-hygiene.md#rule-2.
// ---------------------------------------------------------------------------

const DATED_DOCS = Object.freeze([
  Object.freeze({ path: 'docs/04-reference/us-tax-reporting.md', maxAgeMonths: 6 }),
  Object.freeze({ path: 'docs/04-reference/hardware-wallet-matrix.md', maxAgeMonths: 6 }),
  Object.freeze({ path: 'docs/04-reference/standards.md', maxAgeMonths: 12 }),
  Object.freeze({ path: 'docs/04-reference/api-sources.md', maxAgeMonths: 12 }),
  Object.freeze({ path: 'docs/02-security/crypto-choices.md', maxAgeMonths: 12 }),
  Object.freeze({ path: 'docs/04-reference/supported-chains.md', maxAgeMonths: 12 })
]);

// Root-level docs plus the whole docs/ tree - everything doc-hygiene.md's
// checks apply to.
const ROOT_MARKDOWN_FILES = Object.freeze([
  'README.md',
  'CONTRIBUTING.md',
  'AGENTS.md',
  'SECURITY.md',
  'CHANGELOG.md'
]);

const LAST_REVIEWED_PATTERN = /\*Last reviewed:\s*(\d{4})-(\d{2})-(\d{2})/;

// Check 8's scope: doc-hygiene.md scopes "user-facing docs" to the content
// that actually compiles into the app's Help system (see
// docs/05-development/build.md's "Compile help content" step) - the
// glossary and the guide tree. A TODO/TBD in a dev-facing doc (dependencies.md
// tracking not-yet-vendored libraries, this very roadmap noting deferred
// work) is normal project bookkeeping, not a stale-placeholder risk a reader
// could act on. Directories, not individual files, so a new guide is covered
// automatically.
const USER_FACING_DOC_ROOTS = Object.freeze([
  ['docs', '00-overview', 'glossary.md'],
  ['docs', '03-guides']
]);
const TODO_TBD_PATTERN = /\b(TODO|TBD)\b/g;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function compareBytewise(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function toPosix(relative) {
  return relative.split(path.sep).join('/');
}

function readFile(absolutePath) {
  return fs.readFileSync(absolutePath, 'utf8');
}

function collectMarkdownFiles(root) {
  const files = [];
  for (const relative of ROOT_MARKDOWN_FILES) {
    const absolute = path.join(root, relative);
    if (fs.existsSync(absolute)) {
      files.push(absolute);
    }
  }

  const docsRoot = path.join(root, 'docs');
  function visit(directory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => compareBytewise(left.name, right.name));
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(absolute);
      }
    }
  }
  if (fs.existsSync(docsRoot)) {
    visit(docsRoot);
  }

  return files.sort((left, right) => compareBytewise(toPosix(left), toPosix(right)));
}

// GitHub-compatible-enough heading slugifier: lowercase, strip characters
// that aren't word chars/spaces/hyphens, spaces -> hyphens, collapse
// duplicates with a numeric suffix. Good enough for this repo's headings;
// documented as an assumption in the PR packet.
function slugifyHeading(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s/g, '-');
}

function extractHeadingSlugs(markdown) {
  const slugs = new Set();
  const seen = new Map();
  const lines = markdown.split('\n');
  for (const line of lines) {
    const match = /^#{1,6}\s+(.*)$/.exec(line);
    if (!match) {
      continue;
    }
    let slug = slugifyHeading(match[1]);
    const count = seen.get(slug) || 0;
    seen.set(slug, count + 1);
    if (count > 0) {
      slug = `${slug}-${count}`;
    }
    slugs.add(slug);
  }
  return slugs;
}

// ---------------------------------------------------------------------------
// Check 1: internal links resolve
// ---------------------------------------------------------------------------

const MARKDOWN_LINK_PATTERN = /\[[^\]]*\]\(([^)]+)\)/g;

// A handful of links in docs/05-development/packets/*.review.md and *.md are
// deliberate verbatim quotes of text authored at a different directory depth
// (usually a ROADMAP.md acceptance-criterion line, quoted for the audit
// record) - the path was correct where it was written, not where it's
// quoted. Two markdown conventions mark that intent here: an inline code
// span (the link is illustrative text, not meant to be clickable - GitHub
// itself renders it as literal text, not a link, inside backticks) and a
// blockquote line (`> ...`), which by convention in this repo's packets
// reproduces another document's text for the record rather than authoring
// new navigation. Both are excluded from resolution checking. See
// docs/05-development/packets/p0.7-message-handshake.review.md's own
// "Known link artifact, deliberately not fixed" note, which anticipated
// exactly this check.
function stripCodeSpans(line) {
  return line.replace(/`[^`]*`/g, '');
}

function isBlockquoteLine(line) {
  return /^\s*>/.test(line);
}

function checkInternalLinks(root, files) {
  const findings = [];

  for (const file of files) {
    const relativeFile = toPosix(path.relative(root, file));
    const rawSource = readFile(file);
    const source = rawSource
      .split('\n')
      .map((line) => (isBlockquoteLine(line) ? '' : stripCodeSpans(line)))
      .join('\n');
    const headingSlugsCache = new Map();

    function headingSlugsFor(absolutePath) {
      if (headingSlugsCache.has(absolutePath)) {
        return headingSlugsCache.get(absolutePath);
      }
      let slugs = new Set();
      if (fs.existsSync(absolutePath)) {
        slugs = extractHeadingSlugs(readFile(absolutePath));
      }
      headingSlugsCache.set(absolutePath, slugs);
      return slugs;
    }

    let match = MARKDOWN_LINK_PATTERN.exec(source);
    while (match) {
      const rawTarget = match[1].trim();
      // Skip external URLs (scheme:...) and mailto - only internal, doc-tree
      // links are in scope for "internal link resolution".
      if (/^[a-z][a-z0-9+.-]*:/i.test(rawTarget)) {
        match = MARKDOWN_LINK_PATTERN.exec(source);
        continue;
      }

      const [targetPath, fragment] = rawTarget.split('#');

      if (targetPath === '') {
        // Pure same-file anchor: [text](#section).
        if (fragment && !headingSlugsFor(file).has(fragment)) {
          findings.push({
            file: relativeFile,
            link: rawTarget,
            reason: `anchor "#${fragment}" not found in ${relativeFile}`
          });
        }
        match = MARKDOWN_LINK_PATTERN.exec(source);
        continue;
      }

      const resolved = path.resolve(path.dirname(file), targetPath);
      if (!fs.existsSync(resolved)) {
        findings.push({
          file: relativeFile,
          link: rawTarget,
          reason: `target does not exist: ${toPosix(path.relative(root, resolved))}`
        });
      } else if (fragment && resolved.endsWith('.md')) {
        if (!headingSlugsFor(resolved).has(fragment)) {
          findings.push({
            file: relativeFile,
            link: rawTarget,
            reason: `anchor "#${fragment}" not found in ${toPosix(path.relative(root, resolved))}`
          });
        }
      }

      match = MARKDOWN_LINK_PATTERN.exec(source);
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Check 2 & 3: review dates present, and within max age
// ---------------------------------------------------------------------------

function monthsBetween(from, to) {
  return (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth())
    - (to.getUTCDate() < from.getUTCDate() ? 1 : 0);
}

function checkReviewDates(root, now) {
  const missing = [];
  const stale = [];

  for (const doc of DATED_DOCS) {
    const absolute = path.join(root, doc.path);
    if (!fs.existsSync(absolute)) {
      // Not every fixture root carries the full doc tree; a missing dated
      // doc that's supposed to exist is a different problem than a stale
      // date and out of scope for this check.
      continue;
    }
    const source = readFile(absolute);
    const match = LAST_REVIEWED_PATTERN.exec(source);
    if (!match) {
      missing.push(doc.path);
      continue;
    }
    const reviewed = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    const ageMonths = monthsBetween(reviewed, now);
    if (ageMonths > doc.maxAgeMonths) {
      stale.push({ path: doc.path, reviewed: match[0].replace('*Last reviewed: ', '').trim(), ageMonths, maxAgeMonths: doc.maxAgeMonths });
    }
  }

  return { missing, stale };
}

// ---------------------------------------------------------------------------
// Check 4: help content has all three depth blocks
// ---------------------------------------------------------------------------

function checkHelpContentDepths(root) {
  if (!compileHelpContent) {
    return { findings: [], skipped: true };
  }
  const glossaryPath = path.join(root, 'docs', '00-overview', 'glossary.md');
  const guidesDir = path.join(root, 'docs', '03-guides');
  if (!fs.existsSync(glossaryPath) || !fs.existsSync(guidesDir)) {
    return { findings: [], skipped: true };
  }
  const { warnings } = compileHelpContent(root);
  return { findings: warnings, skipped: false };
}

// ---------------------------------------------------------------------------
// Check 5: doc index consistency (docs/README.md <-> the doc tree)
// ---------------------------------------------------------------------------

function linkedRelativeTargets(indexAbsolutePath, indexRoot) {
  if (!fs.existsSync(indexAbsolutePath)) {
    return new Set();
  }
  const source = readFile(indexAbsolutePath);
  const targets = new Set();
  let match = MARKDOWN_LINK_PATTERN.exec(source);
  while (match) {
    const rawTarget = match[1].trim().split('#')[0];
    if (rawTarget && !/^[a-z][a-z0-9+.-]*:/i.test(rawTarget)) {
      const resolved = path.resolve(path.dirname(indexAbsolutePath), rawTarget);
      targets.add(toPosix(path.relative(indexRoot, resolved)));
    }
    match = MARKDOWN_LINK_PATTERN.exec(source);
  }
  return targets;
}

// docs/README.md is a curated top-level index (per docs/README.md's own
// "Conventions" section: "a *summary* that adds no detail" is the one
// permitted exception to single-sourcing) - it links every top-level doc and
// each subtree's own index page, but does not enumerate large subtrees
// itself. Two subtrees (guides, ADRs) maintain an exhaustive index of their
// own contents in their own README.md, by observed repo convention (every
// guide and every ADR is individually linked). The packets/ subtree is
// explicitly documented (packets/README.md) as a narrative index that shows
// the naming convention with "...", not an enumeration - per-item packets
// are not meant to be linked from anywhere except the PR that introduced
// them, since they are an append-only audit trail, not reading material. So
// packets/ only needs to exist and be linked from docs/README.md; its
// contents are not checked for exhaustive cross-linking.
const EXHAUSTIVELY_INDEXED_SUBTREES = Object.freeze([
  { dir: ['03-guides'], index: ['03-guides', 'README.md'] },
  { dir: ['05-development', 'adr'], index: ['05-development', 'adr', 'README.md'] }
]);
const NARRATIVELY_INDEXED_SUBTREES = Object.freeze([
  { dir: ['05-development', 'packets'], index: ['05-development', 'packets', 'README.md'] }
]);

function checkDocIndexConsistency(root) {
  const findings = [];
  const docsRoot = path.join(root, 'docs');
  if (!fs.existsSync(docsRoot)) {
    return findings;
  }

  const topIndex = path.join(docsRoot, 'README.md');
  const topLinked = linkedRelativeTargets(topIndex, root);

  const allSubtrees = [
    ...EXHAUSTIVELY_INDEXED_SUBTREES.map((entry) => ({ ...entry, exhaustive: true })),
    ...NARRATIVELY_INDEXED_SUBTREES.map((entry) => ({ ...entry, exhaustive: false }))
  ];

  for (const entry of allSubtrees) {
    const dir = path.join(docsRoot, ...entry.dir);
    const index = path.join(docsRoot, ...entry.index);
    const relativeDir = toPosix(path.relative(root, dir));
    const relativeIndex = toPosix(path.relative(root, index));
    if (!fs.existsSync(dir)) {
      continue;
    }
    if (!fs.existsSync(index)) {
      findings.push(`${relativeDir} has no README.md index`);
      continue;
    }
    if (!topLinked.has(relativeIndex)) {
      findings.push(`docs/README.md does not link its subtree index ${relativeIndex}`);
    }
    if (!entry.exhaustive) {
      continue;
    }
    const subLinked = linkedRelativeTargets(index, root);
    const subFiles = fs.readdirSync(dir, { withFileTypes: true })
      .filter((item) => item.isFile() && item.name.endsWith('.md') && item.name !== 'README.md')
      .sort((left, right) => compareBytewise(left.name, right.name));
    for (const file of subFiles) {
      const absolute = path.join(dir, file.name);
      const relativeToRoot = toPosix(path.relative(root, absolute));
      if (!subLinked.has(relativeToRoot)) {
        findings.push(`${relativeIndex} does not link ${relativeToRoot}`);
      }
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Check 6: roadmap item IDs referenced elsewhere resolve to a real item
// ---------------------------------------------------------------------------

const ROADMAP_ID_PATTERN = /\bP\d+\.\d+[a-z]?\b/g;

function collectRoadmapIds(roadmapSource) {
  const ids = new Set();
  let match = ROADMAP_ID_PATTERN.exec(roadmapSource);
  while (match) {
    ids.add(match[0]);
    match = ROADMAP_ID_PATTERN.exec(roadmapSource);
  }
  return ids;
}

function checkRoadmapIdReferences(root, files) {
  const roadmapPath = path.join(root, 'docs', '05-development', 'ROADMAP.md');
  if (!fs.existsSync(roadmapPath)) {
    return [];
  }
  const validIds = collectRoadmapIds(readFile(roadmapPath));
  const findings = [];

  for (const file of files) {
    if (file === roadmapPath) {
      continue;
    }
    const relativeFile = toPosix(path.relative(root, file));
    const source = readFile(file);
    const seenHere = new Set();
    let match = ROADMAP_ID_PATTERN.exec(source);
    while (match) {
      const id = match[0];
      if (!validIds.has(id) && !seenHere.has(id)) {
        seenHere.add(id);
        findings.push(`${relativeFile} references unknown roadmap item ${id}`);
      }
      match = ROADMAP_ID_PATTERN.exec(source);
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Check 7: dependencies.md matches vendor/vendor-manifest.json
// ---------------------------------------------------------------------------

function checkDependenciesMatchManifest(root) {
  const manifestPath = path.join(root, 'vendor', 'vendor-manifest.json');
  const dependenciesPath = path.join(root, 'docs', '05-development', 'dependencies.md');
  if (!fs.existsSync(manifestPath) || !fs.existsSync(dependenciesPath)) {
    return [];
  }

  const manifest = JSON.parse(readFile(manifestPath));
  const dependenciesSource = readFile(dependenciesPath);
  const dependenciesLines = dependenciesSource.split('\n');
  const findings = [];

  for (const artifact of manifest.artifacts || []) {
    if (!artifact.sha256 || artifact.sha256 === 'TBD') {
      continue;
    }
    const matchingLine = dependenciesLines.find((line) =>
      line.includes(artifact.name) &&
      line.includes(artifact.version) &&
      line.includes(artifact.sha256)
    );
    if (!matchingLine) {
      findings.push(
        `dependencies.md has no row matching vendor-manifest.json for ${artifact.name}@${artifact.version} ` +
        `(sha256 ${artifact.sha256})`
      );
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Check 8: no TODO or TBD in user-facing docs
// ---------------------------------------------------------------------------

function collectUserFacingDocs(root) {
  const files = [];
  for (const relativeParts of USER_FACING_DOC_ROOTS) {
    const absolute = path.join(root, ...relativeParts);
    if (!fs.existsSync(absolute)) {
      continue;
    }
    if (fs.statSync(absolute).isFile()) {
      files.push(absolute);
      continue;
    }
    function visit(directory) {
      const entries = fs.readdirSync(directory, { withFileTypes: true })
        .sort((left, right) => compareBytewise(left.name, right.name));
      for (const entry of entries) {
        const entryAbsolute = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          visit(entryAbsolute);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(entryAbsolute);
        }
      }
    }
    visit(absolute);
  }
  return files.sort((left, right) => compareBytewise(toPosix(left), toPosix(right)));
}

function checkNoTodoOrTbd(root) {
  const findings = [];
  for (const file of collectUserFacingDocs(root)) {
    const relativeFile = toPosix(path.relative(root, file));
    const source = readFile(file);
    const lines = source.split('\n');
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      TODO_TBD_PATTERN.lastIndex = 0;
      const match = TODO_TBD_PATTERN.exec(line);
      if (match) {
        findings.push(`${relativeFile}:${index + 1}: contains "${match[1]}"`);
      }
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function parseArgs() {
  let root = path.resolve(__dirname, '..');
  for (let index = 2; index < process.argv.length; index += 1) {
    const argument = process.argv[index];
    if (argument === '--root') {
      const value = process.argv[index + 1];
      if (!value) {
        throw new Error('--root requires a directory');
      }
      root = path.resolve(value);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  return { root };
}

function main() {
  const { root } = parseArgs();
  const now = new Date();
  const files = collectMarkdownFiles(root);

  const failures = [];
  const warnings = [];

  for (const finding of checkInternalLinks(root, files)) {
    failures.push(`[links] ${finding.file}: broken link "${finding.link}" — ${finding.reason}`);
  }

  const reviewDates = checkReviewDates(root, now);
  for (const doc of reviewDates.missing) {
    failures.push(`[review-date] ${doc}: missing "*Last reviewed: YYYY-MM-DD*"`);
  }
  for (const entry of reviewDates.stale) {
    warnings.push(
      `[review-date] ${entry.path}: last reviewed ${entry.reviewed} — ${entry.ageMonths} month(s) old, max age is ${entry.maxAgeMonths}`
    );
  }

  const helpDepths = checkHelpContentDepths(root);
  for (const finding of helpDepths.findings) {
    failures.push(`[help-depth] ${finding}`);
  }

  for (const finding of checkDocIndexConsistency(root)) {
    failures.push(`[doc-index] ${finding}`);
  }

  for (const finding of checkRoadmapIdReferences(root, files)) {
    failures.push(`[roadmap-id] ${finding}`);
  }

  for (const finding of checkDependenciesMatchManifest(root)) {
    failures.push(`[dependencies] ${finding}`);
  }

  for (const finding of checkNoTodoOrTbd(root)) {
    warnings.push(`[todo-tbd] ${finding}`);
  }

  for (const warning of warnings) {
    console.warn(`WARN ${warning}`);
  }
  for (const failure of failures) {
    console.error(`FAIL ${failure}`);
  }

  if (failures.length > 0) {
    throw new Error(`Documentation hygiene check failed with ${failures.length} finding(s), ${warnings.length} warning(s)`);
  }

  console.log(
    `Documentation hygiene check passed: ${files.length} markdown file(s) checked, ${warnings.length} warning(s).`
  );
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`Documentation hygiene check failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  collectMarkdownFiles,
  checkInternalLinks,
  checkReviewDates,
  checkHelpContentDepths,
  checkDocIndexConsistency,
  checkRoadmapIdReferences,
  checkDependenciesMatchManifest,
  checkNoTodoOrTbd,
  slugifyHeading,
  monthsBetween
};
