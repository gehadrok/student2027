# PHASE 6.2 — Build Closure Report

Status: **DONE**

## Scope
Close the Phase 6.2 server production build failure related to `.sql?raw` /
`.wasm` asset handling. This phase ONLY touches the build/asset-loader
infrastructure. No Academic Domain, repositories, API, database, SQL schema,
or Academic UI behavior was modified.

## Root Cause
`npm run build` runs two steps:

1. `vite build` — the client (frontend) production bundle. **Passed.**
2. `esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs` — the server bundle.

The server bundle step failed because `server.ts` → Academic API → repositories
→ `DataSourceFactory` → `SQLiteDataSource` → `src/lib/sqlite-engine.ts`
transitively imports Vite-only asset modules:

- `./sqlite-schema.sql?raw`
- `./sqlite-seed.sql?raw`
- `sql.js/dist/sql-wasm.wasm?url`

esbuild does not understand Vite's `?raw` / `?url` query-suffix import
syntax, producing:

```
[ERROR] No loader is configured for ".sql" files: src/lib/sqlite-seed.sql?raw
[ERROR] No loader is configured for ".sql" files: src/lib/sqlite-schema.sql?raw
```

These assets are browser-only: the SQLite bootstrap reads `localStorage` and
is never executed in the Node server runtime. The `.wasm` import is a package
subpath (`sql.js/...`) already treated as external via `--packages=external`,
so only the `.sql` errors surfaced.

## Fix Approach
Reused the existing project asset-handling approach (`scripts/asset-loader.mjs`,
which stubs Vite asset imports to `export default "";` for headless tsx runs)
and mirrored it as an **esbuild plugin** so the production server bundle can
resolve the same `.sql?raw` / `.wasm?url` imports without executing the
browser-only SQLite runtime.

## Files Modified
| File | Change |
|------|--------|
| `scripts/esbuild-asset-loader.mjs` | **Added.** esbuild plugin that intercepts `.sql?raw` / `.wasm?url` imports, strips the query suffix, and stubs them to `export default "";` (mirrors the existing `scripts/asset-loader.mjs`). |
| `scripts/build-server.mjs` | **Added.** esbuild JS API build that preserves the prior flags (`bundle`, `platform=node`, `format=cjs`, `packages=external`, `sourcemap`, `outfile=dist/server.cjs`) and adds the `assetLoaderPlugin`. |
| `package.json` | **Modified.** `"build"` now runs `vite build && node scripts/build-server.mjs` (was the inline `esbuild server.ts ...` command). |

## Build Configuration Change
- **Before:** `"build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs"`
- **After:** `"build": "vite build && node scripts/build-server.mjs"`

The same esbuild flags are preserved in `scripts/build-server.mjs`; the only
addition is the asset-loader plugin. No new architecture was introduced.

## Verification

### 1. TypeScript (`npx tsc --noEmit`)
Executed successfully. No **new** errors were introduced by this change.
The only reported errors are the pre-existing baseline errors in
`src/App.tsx`, `src/components/ActiveReportPrintView.tsx`, and
`src/components/GlobalSearchBar.tsx` (already documented in
`TODO-phase6.2.md` as pre-existing baseline errors, unrelated to this build
closure).

### 2. Frontend Build (`vite build`)
```
vite v6.4.3 building for production...
transforming...
✓ 2404 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                    0.41 kB │ gzip: 0.28 kB
dist/assets/sql-wasm-UFUCzYNW.wasm 659.73 kB │ gzip: 323.01 kB
dist/assets/index-Th9CtiGM.css    127.84 kB │ gzip: 17.44 kB
dist/assets/index-BWADmFAx.js    1,537.24 kB │ gzip: 371.34 kB
✓ built in 59.56s
```
Result: **PASS**

### 3. Server Build (`node scripts/build-server.mjs`)
```
✅ Server bundle built: dist/server.cjs
```
`dist/server.cjs` produced (≈ 94 KB). Result: **PASS**

### 4. Full `npm run build`
Result: **PASS** (exit code 0). Both the Vite frontend build and the esbuild
server bundle completed successfully end-to-end.

## Final Status
**Phase 6.2 Build Closure: COMPLETE ✅**

The server production build failure is fixed. `npm run build` now passes
completely, including the previously failing server/esbuild step. The `.sql` /
`.wasm` handling is confined to the build pipeline (esbuild plugin) and does
not alter runtime source (`src/lib/sqlite-engine.ts` and all other source
files are untouched).

## Remaining Blockers
- **None for the build pipeline.**
- Pre-existing TypeScript baseline errors remain in `src/App.tsx`,
  `src/components/ActiveReportPrintView.tsx`, and
  `src/components/GlobalSearchBar.tsx`. These are unrelated to this build
  closure and are out of scope for Phase 6.2.

## Constraints Respected
- ✅ Fixed ONLY the server production build configuration.
- ✅ Reused the existing `scripts/asset-loader.mjs` approach (as an esbuild plugin).
- ✅ Did NOT modify `src/lib/sqlite-engine.ts`.
- ✅ Did NOT modify Academic Domain, repositories, API, database, SQL schema, or UI behavior.
- ✅ Did NOT introduce a new architecture.
- ✅ `.sql`/`.wasm` handling limited to the build pipeline.
- ✅ Minimized changes to `package.json` and build configuration.

## Next Phases
**Stopped.** Phase 6.3 and Phase 7 are NOT started.
