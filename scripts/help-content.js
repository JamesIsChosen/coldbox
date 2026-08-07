'use strict';

// P0.17 - Help framework build-time compiler.
//
// Compiles docs/00-overview/glossary.md and docs/03-guides/*.md into the
// three-depth content model described in docs/01-spec/SPEC.md #18 and
// docs/03-guides/README.md, so the app's Help section is single-sourced with
// the repository docs (no fact is authored twice).
//
// Depth-scoped content is written in markdown using fenced blocks:
//
//   ::: plain
//   No jargon. Analogy first.
//   :::
//
//   ::: working
//   Correct terms, defined on use.
//   :::
//
//   ::: technical
//   Full precision, spec references.
//   :::
//
// Everything in a source file *outside* a ::: group is "shared" content: it
// renders identically regardless of the reader's chosen depth (headings,
// step-by-step instructions, tables). Only prose actually wrapped in a :::
// group varies by depth. A document with zero groups is not a build error -
// the roadmap's own P0.17 acceptance criterion is that a missing depth
// produces a *warning*, not a failure - but it is reported as a warning so
// the gap is visible rather than silent, per doc-hygiene.md's rule that
// stale/incomplete docs are worse than absent ones when hidden.
//
// This module has no runtime dependencies and is never shipped: it only
// runs inside scripts/build.js, at build time, in Node.

const fs = require('node:fs');
const path = require('node:path');

const DEPTHS = Object.freeze(['plain', 'working', 'technical']);
const DEPTH_FENCE_OPEN = /^:::\s*(plain|working|technical)\s*$/;
const DEPTH_FENCE_CLOSE = /^:::\s*$/;

// ---------------------------------------------------------------------------
// ::: plain / working / technical block parsing
// ---------------------------------------------------------------------------

/**
 * Splits markdown source into an ordered sequence of nodes:
 *   { type: 'shared', markdown }
 *   { type: 'group', depths: { plain, working, technical }, present: Set, line }
 *
 * A 'group' node covers one ::: plain / ::: working / ::: technical trio.
 * The three blocks in a group may appear in any order and need not all be
 * present - `present` records which depths this particular group actually
 * supplied, so the caller can warn about partial groups distinctly from
 * documents with no groups at all.
 */
function parseDepthNodes(markdown, sourceLabel) {
  const lines = markdown.split('\n');
  const nodes = [];
  const warnings = [];
  let sharedBuffer = [];
  let index = 0;

  function flushShared() {
    if (sharedBuffer.length > 0) {
      const text = sharedBuffer.join('\n');
      if (text.trim().length > 0) {
        nodes.push({ type: 'shared', markdown: text });
      }
      sharedBuffer = [];
    }
  }

  while (index < lines.length) {
    const line = lines[index];
    const openMatch = DEPTH_FENCE_OPEN.exec(line.trim());
    if (!openMatch) {
      sharedBuffer.push(line);
      index += 1;
      continue;
    }

    // Found the start of a depth group. Consume consecutive ::: blocks
    // (allowing blank lines between them) until a non-fence, non-blank line
    // breaks the group.
    flushShared();
    const groupLine = index + 1;
    const depths = { plain: null, working: null, technical: null };
    const present = new Set();

    for (;;) {
      const fenceLine = lines[index];
      const fenceMatch = fenceLine ? DEPTH_FENCE_OPEN.exec(fenceLine.trim()) : null;
      if (!fenceMatch) {
        break;
      }
      const depthName = fenceMatch[1];
      index += 1;
      const bodyLines = [];
      let closed = false;
      while (index < lines.length) {
        if (DEPTH_FENCE_CLOSE.test(lines[index].trim())) {
          closed = true;
          index += 1;
          break;
        }
        bodyLines.push(lines[index]);
        index += 1;
      }
      if (!closed) {
        throw new Error(
          `${sourceLabel}: unterminated ::: ${depthName} block starting at line ${groupLine}`
        );
      }
      if (present.has(depthName)) {
        throw new Error(
          `${sourceLabel}: duplicate ::: ${depthName} block in the same group near line ${groupLine}`
        );
      }
      depths[depthName] = bodyLines.join('\n').trim();
      present.add(depthName);

      // Skip blank lines between fences within the same group.
      while (index < lines.length && lines[index].trim() === '') {
        index += 1;
      }
    }

    if (present.size < DEPTHS.length) {
      const missing = DEPTHS.filter((depth) => !present.has(depth));
      warnings.push(
        `${sourceLabel}: depth group at line ${groupLine} is missing ${missing.join(', ')} — ` +
        `readers at that depth will see the nearest available depth instead.`
      );
    }

    nodes.push({ type: 'group', depths, present, line: groupLine });
  }

  flushShared();
  return { nodes, warnings };
}

/** Resolves a group to the requested depth, falling back per §18.1's ordering
 * (plain is the safest fallback: no reader is worse off being shown less
 * jargon than they asked for) when the exact depth wasn't authored. */
function resolveGroupDepth(group, depth) {
  if (group.depths[depth]) {
    return group.depths[depth];
  }
  const fallbackOrder = depth === 'technical'
    ? ['working', 'plain']
    : depth === 'working'
      ? ['plain', 'technical']
      : ['working', 'technical'];
  for (const candidate of fallbackOrder) {
    if (group.depths[candidate]) {
      return group.depths[candidate];
    }
  }
  return '';
}

function hasAnyGroup(nodes) {
  return nodes.some((node) => node.type === 'group');
}

// ---------------------------------------------------------------------------
// Minimal, deliberately small markdown -> HTML renderer.
//
// This is NOT a general CommonMark implementation. It covers exactly the
// subset docs/03-guides and docs/00-overview/glossary.md actually use:
// headings, paragraphs, bold/italic/code spans, fenced code blocks, links,
// ordered/unordered lists, tables, blockquotes, and horizontal rules. Every
// other construct is passed through as an escaped literal paragraph rather
// than guessed at, so a markdown feature the compiler doesn't understand
// shows up as visibly wrong text in review rather than silently mis-render.
// ---------------------------------------------------------------------------

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInline(text) {
  let escaped = escapeHtml(text);
  // Code spans first, so markup inside them isn't interpreted.
  const codeSpans = [];
  escaped = escaped.replace(/`([^`]+)`/g, (match, code) => {
    codeSpans.push(code);
    return ` CODE${codeSpans.length - 1} `;
  });
  // Links: [text](target). Internal doc-relative targets (../00-overview/
  // glossary.md, ./first-wallet.md, etc.) become plain emphasized text -
  // there is no filesystem to navigate to inside the compiled app - while
  // bare informational text is kept so the reference isn't lost.
  escaped = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label) => `<em>${label}</em>`);
  escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  escaped = escaped.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
  escaped = escaped.replace(/ CODE(\d+) /g, (match, i) => `<code>${codeSpans[Number(i)]}</code>`);
  return escaped;
}

function renderTable(rows) {
  const [headerLine, dividerLine, ...bodyLines] = rows;
  if (!dividerLine || !/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?$/.test(dividerLine.trim())) {
    return null;
  }
  const splitRow = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
  const headerCells = splitRow(headerLine);
  const bodyRows = bodyLines.map(splitRow);
  const head = `<tr>${headerCells.map((cell) => `<th>${renderInline(cell)}</th>`).join('')}</tr>`;
  const body = bodyRows
    .map((cells) => `<tr>${cells.map((cell) => `<td>${renderInline(cell)}</td>`).join('')}</tr>`)
    .join('');
  return `<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

function renderMarkdownToHtml(markdown) {
  const lines = markdown.split('\n');
  const html = [];
  let index = 0;

  function isListLine(line) {
    return /^\s*([-*]|\d+\.)\s+/.test(line);
  }

  while (index < lines.length) {
    const line = lines[index];

    if (line.trim() === '') {
      index += 1;
      continue;
    }

    if (/^```/.test(line.trim())) {
      const codeLines = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index].trim())) {
        codeLines.push(lines[index]);
        index += 1;
      }
      index += 1; // closing fence
      html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      continue;
    }

    const headingMatch = /^(#{1,4})\s+(.*)$/.exec(line);
    if (headingMatch) {
      const level = headingMatch[1].length + 2; // shift so guide h1 isn't a document h1
      html.push(`<h${level}>${renderInline(headingMatch[2].trim())}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^-{3,}\s*$/.test(line.trim())) {
      html.push('<hr>');
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^>\s?/, ''));
        index += 1;
      }
      html.push(`<blockquote><p>${renderInline(quoteLines.join(' '))}</p></blockquote>`);
      continue;
    }

    if (line.trim().startsWith('|')) {
      const tableLines = [];
      while (index < lines.length && lines[index].trim().startsWith('|')) {
        tableLines.push(lines[index]);
        index += 1;
      }
      const rendered = renderTable(tableLines);
      if (rendered) {
        html.push(rendered);
        continue;
      }
      // Not actually a table (no valid divider row) - fall through and
      // render the collected lines as a paragraph instead of dropping them.
      html.push(`<p>${renderInline(tableLines.join(' '))}</p>`);
      continue;
    }

    if (isListLine(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const tag = ordered ? 'ol' : 'ul';
      const items = [];
      while (index < lines.length && isListLine(lines[index])) {
        items.push(lines[index].replace(/^\s*([-*]|\d+\.)\s+/, ''));
        index += 1;
      }
      html.push(`<${tag}>${items.map((item) => `<li>${renderInline(item)}</li>`).join('')}</${tag}>`);
      continue;
    }

    // Paragraph: consume until a blank line or a line starting a new block.
    const paragraphLines = [line];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() !== '' &&
      !/^(#{1,4})\s+/.test(lines[index]) &&
      !isListLine(lines[index]) &&
      !lines[index].trim().startsWith('|') &&
      !/^```/.test(lines[index].trim()) &&
      !/^-{3,}\s*$/.test(lines[index].trim()) &&
      !/^>\s?/.test(lines[index])
    ) {
      paragraphLines.push(lines[index]);
      index += 1;
    }
    html.push(`<p>${renderInline(paragraphLines.join(' ').trim())}</p>`);
  }

  return html.join('');
}

/** Renders a full node list to HTML at a given depth. The offline search
 * index does NOT get a separately precomputed plain-text copy here - that
 * would roughly triple the embedded text (once per depth, per term/guide,
 * on top of the byDepth HTML that already exists) for a 500+ KB bundle-size
 * cost with no functional benefit, since the same text is trivially
 * recoverable from byDepth's HTML at runtime via a single textContent read.
 * See src/main.js's buildHelpSearchCorpus(). */
function renderNodesAtDepth(nodes, depth) {
  return nodes
    .map((node) => {
      if (node.type === 'shared') {
        return renderMarkdownToHtml(node.markdown);
      }
      return renderMarkdownToHtml(resolveGroupDepth(node, depth));
    })
    .join('');
}

// ---------------------------------------------------------------------------
// Glossary compilation
// ---------------------------------------------------------------------------

const GLOSSARY_CATEGORY_PATTERN = /^##\s+(.*)$/;
const GLOSSARY_TERM_PATTERN = /^\*\*(.+?)\*\*(.*)$/;

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function compileGlossary(glossaryPath) {
  const source = fs.readFileSync(glossaryPath, 'utf8');
  const lines = source.split('\n');
  const warnings = [];
  const categories = [];
  let currentCategory = null;
  let currentTerm = null;
  const seenSlugs = new Set();

  function closeTerm() {
    if (!currentTerm) {
      return;
    }
    const { nodes, warnings: termWarnings } = parseDepthNodes(
      currentTerm.bodyLines.join('\n'),
      `glossary.md term "${currentTerm.term}"`
    );
    for (const warning of termWarnings) {
      warnings.push(warning);
    }
    if (!hasAnyGroup(nodes)) {
      warnings.push(
        `glossary.md term "${currentTerm.term}" has no ::: plain/working/technical blocks — ` +
        `the same text will be shown at every depth.`
      );
    }
    let slug = slugify(currentTerm.term);
    if (seenSlugs.has(slug)) {
      let suffix = 2;
      while (seenSlugs.has(`${slug}-${suffix}`)) {
        suffix += 1;
      }
      slug = `${slug}-${suffix}`;
    }
    seenSlugs.add(slug);
    const entry = {
      id: `glossary:${slug}`,
      term: currentTerm.term,
      aliases: currentTerm.aliases,
      category: currentCategory,
      byDepth: Object.fromEntries(DEPTHS.map((depth) => [depth, renderNodesAtDepth(nodes, depth)]))
    };
    if (!categories.length || categories[categories.length - 1].title !== currentCategory) {
      categories.push({ title: currentCategory, terms: [] });
    }
    categories[categories.length - 1].terms.push(entry);
    currentTerm = null;
  }

  for (const line of lines) {
    const categoryMatch = GLOSSARY_CATEGORY_PATTERN.exec(line);
    if (categoryMatch) {
      closeTerm();
      currentCategory = categoryMatch[1].trim();
      continue;
    }

    if (line.trim() === '---') {
      continue;
    }

    const termMatch = GLOSSARY_TERM_PATTERN.exec(line);
    if (termMatch && currentCategory) {
      closeTerm();
      const term = termMatch[1].trim();
      // The parenthetical after a term is only an alias list when it
      // explicitly says so ("(also X, Y)"); a bare qualifier like
      // "(in Coldbox)" or a definition fragment before a semicolon
      // ("(extended public key; also ypub, zpub)") is not an alias, and
      // treating it as one would both mislabel the term and pollute the
      // inline-glossary term index with common-word false positives.
      const parenMatch = /\(([^)]+)\)/.exec(termMatch[2]);
      const alsoMatch = parenMatch ? /\balso\b\s+(.+)$/i.exec(parenMatch[1]) : null;
      const aliases = alsoMatch
        ? alsoMatch[1].split(',').map((alias) => alias.trim().replace(/^\*+|\*+$/g, '')).filter(Boolean)
        : [];
      currentTerm = { term, aliases, bodyLines: [] };
      continue;
    }

    if (currentTerm) {
      currentTerm.bodyLines.push(line);
    }
  }
  closeTerm();

  const termCount = categories.reduce((total, category) => total + category.terms.length, 0);
  if (termCount === 0) {
    throw new Error(`glossary.md: no terms parsed from ${glossaryPath} — check the ## category / **Term** structure`);
  }

  return { categories, warnings };
}

// ---------------------------------------------------------------------------
// Guide compilation
// ---------------------------------------------------------------------------

function compileGuide(guidePath) {
  const source = fs.readFileSync(guidePath, 'utf8');
  const slug = path.basename(guidePath, '.md');
  const titleMatch = /^#\s+(.*)$/m.exec(source);
  const title = titleMatch ? titleMatch[1].trim() : slug;
  const body = titleMatch ? source.slice(titleMatch.index + titleMatch[0].length) : source;

  const { nodes, warnings } = parseDepthNodes(body, `docs/03-guides/${path.basename(guidePath)}`);
  if (!hasAnyGroup(nodes)) {
    warnings.push(
      `docs/03-guides/${path.basename(guidePath)} has no ::: plain/working/technical blocks — ` +
      `the guide will render identically at every depth.`
    );
  }

  return {
    id: `guide:${slug}`,
    slug,
    title,
    byDepth: Object.fromEntries(DEPTHS.map((depth) => [depth, renderNodesAtDepth(nodes, depth)])),
    warnings
  };
}

function compileGuides(guidesDir) {
  const files = fs.readdirSync(guidesDir)
    .filter((name) => name.endsWith('.md') && name !== 'README.md')
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  const warnings = [];
  const guides = files.map((file) => {
    const compiled = compileGuide(path.join(guidesDir, file));
    for (const warning of compiled.warnings) {
      warnings.push(warning);
    }
    return {
      id: compiled.id,
      slug: compiled.slug,
      title: compiled.title,
      byDepth: compiled.byDepth
    };
  });

  if (guides.length === 0) {
    throw new Error(`docs/03-guides: no guide files found in ${guidesDir}`);
  }

  return { guides, warnings };
}

// ---------------------------------------------------------------------------
// Top-level entry point
// ---------------------------------------------------------------------------

function compileHelpContent(projectRoot) {
  const glossaryPath = path.join(projectRoot, 'docs', '00-overview', 'glossary.md');
  const guidesDir = path.join(projectRoot, 'docs', '03-guides');

  const glossaryResult = compileGlossary(glossaryPath);
  const guidesResult = compileGuides(guidesDir);

  const searchIndex = [];
  for (const category of glossaryResult.categories) {
    for (const term of category.terms) {
      searchIndex.push({
        id: term.id,
        kind: 'glossary',
        title: term.term,
        aliases: term.aliases,
        category: category.title
      });
    }
  }
  for (const guide of guidesResult.guides) {
    searchIndex.push({
      id: guide.id,
      kind: 'guide',
      title: guide.title,
      aliases: [],
      category: 'Guides'
    });
  }
  searchIndex.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const content = {
    glossary: glossaryResult.categories,
    guides: guidesResult.guides,
    searchIndex
  };

  const warnings = [...glossaryResult.warnings, ...guidesResult.warnings].sort();

  return { content, warnings };
}

module.exports = {
  DEPTHS,
  parseDepthNodes,
  resolveGroupDepth,
  hasAnyGroup,
  renderMarkdownToHtml,
  renderInline,
  compileGlossary,
  compileGuide,
  compileGuides,
  compileHelpContent
};
