'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROADMAP_RELATIVE_PATH = 'docs/05-development/ROADMAP.md';
const ROADMAP_ID = '[A-Z]+(?:\\d+)?\\.\\d+[a-z]?';
const ITEM_HEADING_PATTERN = new RegExp(`^- \\[([ x~])\\] \\*\\*(${ROADMAP_ID})(?:\\s+—\\s+|\\s+)([^*]+)\\*\\*(.*)$`);
const LEGACY_ITEM_HEADING_PATTERN = new RegExp(`^- \\[([ x~])\\] (${ROADMAP_ID})\\s+(.+)$`);
const PHASE_HEADING_PATTERN = /^## (.+)$/;

function normalizeLineEndings(source) {
  return source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

function parseRoadmap(source, label = ROADMAP_RELATIVE_PATH) {
  const lines = normalizeLineEndings(source).split('\n');
  const items = [];
  let phase = 'Uncategorized';

  lines.forEach((line, index) => {
    const phaseMatch = PHASE_HEADING_PATTERN.exec(line);
    if (phaseMatch) {
      phase = phaseMatch[1].trim();
      return;
    }
    if (!line.startsWith('- [')) {
      return;
    }
    const match = ITEM_HEADING_PATTERN.exec(line);
    const legacyMatch = match ? null : LEGACY_ITEM_HEADING_PATTERN.exec(line);
    if (!match && !legacyMatch) {
      throw new Error(`Cannot parse roadmap item at ${label}:${index + 1}`);
    }
    const marker = (match || legacyMatch)[1];
    const id = (match || legacyMatch)[2];
    const title = match ? match[3].trim() : legacyMatch[3].trim();
    const suffix = match ? (match[4] || '') : title;
    items.push(Object.freeze({
      id,
      title,
      status: marker === 'x' ? 'complete' : marker === '~' ? 'in-progress' : 'not-started',
      phase,
      humanRequired: suffix.includes('👤'),
      browserVerified: suffix.includes('🌐')
    }));
  });

  if (items.length === 0) {
    throw new Error(`No roadmap items found in ${label}`);
  }

  const ids = new Set();
  for (const item of items) {
    if (ids.has(item.id)) {
      throw new Error(`Duplicate roadmap item ${item.id} in ${label}`);
    }
    ids.add(item.id);
  }
  return items;
}

function compileToolMap(projectRoot) {
  const roadmapPath = path.join(projectRoot, ROADMAP_RELATIVE_PATH);
  let source;
  try {
    source = fs.readFileSync(roadmapPath, 'utf8');
  } catch (error) {
    throw new Error(`Cannot read ${ROADMAP_RELATIVE_PATH}: ${error.message}`);
  }
  return Object.freeze({
    source: ROADMAP_RELATIVE_PATH,
    items: parseRoadmap(source)
  });
}

module.exports = {
  ITEM_HEADING_PATTERN,
  ROADMAP_RELATIVE_PATH,
  compileToolMap,
  parseRoadmap
};
