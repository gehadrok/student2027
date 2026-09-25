/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * R3 Master Data Runtime Schema Verification — Runner (REAL SQLite).
 *
 * Registers the Vite asset loader so any `.sql` / `.wasm` imports are stubbed
 * in the headless Node context, then runs the REAL-SQLite master-data
 * verification which initializes an actual sql.js Database using the SAME
 * schema-loading path as the application startup.
 *
 * Run via: npx tsx scripts/run-master-data-runtime.mjs
 */
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./asset-loader.mjs', pathToFileURL('./scripts/'));

const start = Date.now();

const { run } = await import('./verify-master-data-runtime.ts');

let code = 1;
try {
  code = await run();
} finally {
  const durationMs = Date.now() - start;
  console.log(`\nTotal duration: ${durationMs} ms`);
}

process.exit(code);
