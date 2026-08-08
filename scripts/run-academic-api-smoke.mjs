/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 6.0 — Academic Application Layer API Smoke Test Runner.
 *
 * Registers the Vite asset loader (to stub `.sql` / `.wasm` imports so the
 * browser-only sql.js/WASM runtime is never executed in a headless Node
 * context), then executes the Academic Application Layer API smoke suite.
 *
 * Run via: npx node scripts/run-academic-api-smoke.mjs
 */
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

// Register the asset loader hook chain BEFORE importing the smoke test (which
// transitively pulls in sqlite-engine.ts imports of .sql / .wasm assets).
register('./asset-loader.mjs', pathToFileURL('./scripts/'));

const start = Date.now();

const { run } = await import('../scripts/verify-academic-api-smoke.ts');

let code = 1;
try {
  code = await run();
} finally {
  const durationMs = Date.now() - start;
  console.log(`\nTotal duration: ${durationMs} ms`);
}

process.exit(code);
