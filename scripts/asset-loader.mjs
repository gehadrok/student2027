/**
 * Node ESM loader for tsx that stubs Vite-specific asset imports
 * (`?raw`, `?url`) of `.sql` and `.wasm` files so the sqlite-engine
 * module can be loaded in a headless Node/tsx environment.
 *
 * These asset imports are only understood by Vite at build time. In a
 * Node test/smoke context we replace them with inert values (empty string)
 * so the browser-only SQLite bootstrap is never actually executed.
 *
 * Usage:
 *   npx tsx --loader ./scripts/asset-loader.mjs scripts/verify-academic-smoke.ts
 */
export function resolve(specifier, context, nextResolve) {
  // Strip Vite query suffixes so the underlying file resolves normally.
  if (specifier.includes('.wasm?') || specifier.includes('.sql?raw')) {
    const clean = specifier.split('?')[0];
    return nextResolve(clean, context);
  }
  return nextResolve(specifier, context);
}

export function load(url, context, nextLoad) {
  if (url.endsWith('.wasm') || url.endsWith('.sql')) {
    return {
      format: 'module',
      source: 'export default "";',
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
}
