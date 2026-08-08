/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 6.2 Build Closure — Server production bundle.
 *
 * Produces `dist/server.cjs` using the esbuild JavaScript API, preserving the
 * exact flags previously baked into the `package.json` `build` script:
 *
 *   esbuild server.ts --bundle --platform=node --format=cjs
 *     --packages=external --sourcemap --outfile=dist/server.cjs
 *
 * The only addition is the `assetLoaderPlugin` (see esbuild-asset-loader.mjs),
 * which stubs Vite-only `.sql?raw` / `.wasm?url` asset imports à la
 * `scripts/asset-loader.mjs`, so the browser-only sql.js/WASM runtime is never
 * bundled or executed in the Node server build.
 *
 * Run via: node scripts/build-server.mjs
 */
import { build } from 'esbuild';
import { assetLoaderPlugin } from './esbuild-asset-loader.mjs';

async function main() {
  try {
    await build({
      entryPoints: ['server.ts'],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      packages: 'external',
      sourcemap: true,
      outfile: 'dist/server.cjs',
      plugins: [assetLoaderPlugin()],
    });
    console.log('✅ Server bundle built: dist/server.cjs');
  } catch (err) {
    console.error('❌ Server build failed:', err);
    process.exit(1);
  }
}

main();
