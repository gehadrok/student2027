/**
 * Node ESM loader for tsx that resolves Vite-specific asset imports
 * (`?raw`, `?url`) of `.sql` and `.wasm` files so the sqlite-engine
 * module works in a headless Node/tsx (dev server) environment.
 *
 * These asset imports are only understood by Vite at build time. The
 * esbuild production bundle uses `scripts/esbuild-asset-loader.mjs` to
 * inline the real SQL and stub the WASM. This loader mirrors that behavior
 * for the `tsx` dev server:
 *
 *   - `.sql?raw` (schema + seed) are inlined as their real file content so
 *     the server can execute them against its sql.js database.
 *   - `.wasm?url` (browser-only WASM bundle) is stubbed with an inert value.
 *     The server resolves the real binary at runtime via
 *     `require.resolve('sql.js/dist/sql-wasm.wasm')`.
 *
 * Usage:
 *   npx tsx --loader ./scripts/asset-loader.mjs server.ts
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

export function resolve(specifier, context, nextResolve) {
  // Vite-specific asset imports use `?url` / `?raw` suffixes (e.g.
  // `sql.js/dist/sql-wasm.wasm?url`, `./sqlite-schema.sql?raw`). tsx strips
  // the query suffix before invoking the loader, so we detect the asset by
  // its real extension instead. `.wasm.js` (e.g. sql-wasm.js) is excluded.
  const isWasm = /\.wasm(\?|$)/.test(specifier);
  const isSql = /\.sql(\?|$)/.test(specifier);
  if (isWasm || isSql) {
    const clean = specifier.split('?')[0];
    // Resolve the real file path via CJS require (handles package exports).
    const require = createRequire(context.parentURL || import.meta.url);
    const filePath = require.resolve(clean);

    let source;
    if (isWasm) {
      // The server engine reads this via the `?url` default export. In a
      // Node/ESM context `require` is undefined, so the engine cannot
      // `require.resolve` the WASM itself — return the real file path so
      // sql.js can locate and load the binary directly.
      source = `export default ${JSON.stringify(filePath)};`;
    } else {
      // Inline the real SQL text so the server can execute schema + seed.
      source = `export default ${JSON.stringify(readFileSync(filePath, 'utf8'))};`;
    }

    // Return a data: URL so Node's loaders never open the real .wasm binary
    // (which would otherwise be parsed as an ESM module and crash).
    const dataUrl = `data:text/javascript,${encodeURIComponent(source)}`;
    return { url: dataUrl, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}

export function load(url, context, nextLoad) {
  if (url.startsWith('data:text/javascript,')) {
    // tsx re-appends the original Vite query (`?url`/`?raw`) to the resolved
    // URL; strip it so it isn't treated as part of the module source.
    const raw = url.slice('data:text/javascript,'.length).split('?')[0];
    const source = decodeURIComponent(raw);
    return { format: 'module', source, shortCircuit: true };
  }
  return nextLoad(url, context);
}
