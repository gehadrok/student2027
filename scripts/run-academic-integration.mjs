/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 5.3 — Academic Integration Test Runner.
 *
 * Registers the Vite asset loader (to stub `.sql` / `.wasm` imports so the
 * browser-only sql.js/WASM runtime is never executed in a headless Node
 * context), then executes the Academic Integration test suite.
 *
 * Run via: npx node scripts/run-academic-integration.mjs
 */
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

// Register the asset loader hook chain BEFORE importing the test (which
// transitively pulls in sqlite-engine.ts imports of .sql / .wasm assets).
register('./asset-loader.mjs', pathToFileURL('./scripts/'));

const start = Date.now();

const { run } = await import(
  '../src/modules/academic/tests/integration/academicIntegration.test.ts'
);

let code = 1;
try {
  code = await run();
} finally {
  const durationMs = Date.now() - start;
  console.log(`\nTotal duration: ${durationMs} ms`);
}

process.exit(code);
