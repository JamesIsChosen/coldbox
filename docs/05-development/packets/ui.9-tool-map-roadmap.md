# UI.9 Tool map compiled from ROADMAP.md

**Roadmap item:** [UI.9](../ROADMAP.md)  
**Status:** `[~]` — author implementation; independent review must set `[x]`  
**Branch:** `ui.9-tool-map-roadmap`

## Scope

UI.9 makes `docs/05-development/ROADMAP.md` the only source of in-app roadmap status. `scripts/tool-map.js` parses every roadmap item at build time, rejects malformed or duplicate entries, and supplies deterministic JSON to the warm Tool map route. The source HTML contains only the route shell and an empty list; it contains no hand-transcribed UI.9 status.

## Acceptance mapping

| Criterion | Implementation evidence |
|---|---|
| Content is generated at build time from ROADMAP.md | `scripts/build.js` imports `compileToolMap()` and injects `__COLDBOX_TOOL_MAP__`; `src/main.js` renders the injected object. |
| No item status is transcribed by hand in `src/` | `test/ui.9-tool-map.test.js` rejects `data-roadmap-id="UI.9"` in `src/index.html` and requires the build placeholder in `src/main.js`. |
| Build fails closed if ROADMAP cannot be parsed | `parseRoadmap()` rejects malformed checklist headings, duplicate IDs, missing files, and an empty item set; `npm run build` calls it before output assembly. |
| Output is deterministic | The parser preserves roadmap order and emits fixed-shape objects; `test/tool-map.test.js` compares two compilations and a marker-only mutation. |
| `scripts/check-docs.js` covers the relationship | `checkToolMapRelationship()` requires the compiler to identify `ROADMAP.md` and requires a parseable UI.9 item. |
| A status-only ROADMAP change changes the next build | `test/tool-map.test.js` changes only `[ ]` to `[x]` and observes the compiled status change; the build injects that object into the artifact. |

## Verification plan

```text
node --test test/tool-map.test.js test/ui.9-tool-map.test.js
npm test
npm run lint
npm run verify-vendor
npm run check-docs
npm run build
npm run test:browser
```

The independent reviewer must rerun the complete suite, build twice under differing locale/timezone, inspect the generated Tool map in Chromium and Firefox over `file://`, mutate a temporary ROADMAP fixture to confirm non-zero failure, and confirm the approved references remain outside the build-input graph.

## Review focus

- Treat parser coverage as the main risk: all legacy and bold roadmap heading forms must remain fail-closed rather than silently omitted.
- Confirm no status or phase is duplicated in `src/index.html`; generated statuses must come only from the injected object.
- Confirm the new route does not access the sealed realm or alter existing routes, CSP, or build reproducibility.

## Files

- `scripts/tool-map.js`
- `scripts/build.js`
- `scripts/check-docs.js`
- `src/index.html`
- `src/main.js`
- `src/styles.css`
- `test/tool-map.test.js`
- `test/ui.9-tool-map.test.js`
- `docs/05-development/ROADMAP.md`
- `CHANGELOG.md`
