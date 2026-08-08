/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Academic Runtime Persistence Verification — Runner (REAL SQLite).
 *
 * Registers the Vite asset loader so any `.sql` / `.wasm` imports are stubbed
 * in the headless Node context, then runs the REAL-SQLite runtime persistence
 * verification which initializes an actual sql.js Database using the SAME
 * schema-loading path as the application startup.
 *
 * Run via: npx node scripts/run-academic-runtime-persistence.mjs
 */
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./asset-loader.mjs', pathToFileURL('./scripts/'));

const start = Date.now();

const { run } = await import('./verify-academic-runtime-persistence.ts');

let code = 1;
try {
  code = await run();
} finally {
  const durationMs = Date.now() - start;
  console.log(`\nTotal duration: ${durationMs} ms`);
}

process.exit(code);
