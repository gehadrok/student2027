import { readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * esbuild plugin for the server production bundle.
 *
 * Mirrors the existing `scripts/asset-loader.mjs` (Node ESM loader used by
 * tsx smoke tests) as an esbuild onLoad resolver. It resolves Vite-specific
 * asset imports (`?raw`, `?url`) of `.sql` and `.wasm` files for the Node
 * server build:
 *
 * - `.sql?raw` imports (schema + seed) are inlined as their real file content,
 *   so the server can execute them against its sql.js database.
 * - `.wasm?url` imports (browser-only sql.js WASM bundle) are stubbed with an
 *   inert value. The server resolves the real WASM binary at runtime via
 *   `require.resolve('sql.js/dist/sql-wasm.wasm')` (see src/lib/sqlite-engine.ts).
 *
 * Usage:
 *   import { assetLoaderPlugin } from './esbuild-asset-loader.mjs';
 *   build({ plugins: [assetLoaderPlugin()] });
 */
export function assetLoaderPlugin() {
  return {
    name: 'asset-loader',
    setup(build) {
      build.onResolve({ filter: /\.(sql|wasm)\?/ }, (args) => {
        // Strip the Vite query suffix so the underlying file resolves normally,
        // then mark it as handled by our load stub below.
        const clean = args.path.split('?')[0];
        return {
          path: isAbsolute(clean) ? clean : join(args.resolveDir, clean),
          namespace: 'asset-stub',
        };
      });

      build.onLoad({ filter: /\.sql$/, namespace: 'asset-stub' }, (args) => {
        // Inline the real SQL text so the server can execute schema + seed.
        return {
          loader: 'text',
          contents: readFileSync(args.path, 'utf8'),
        };
      });

      build.onLoad({ filter: /\.wasm$/, namespace: 'asset-stub' }, () => {
        // Inert placeholder: the browser-only WASM bundle is resolved by the
        // server engine at runtime via require.resolve.
        return {
          loader: 'js',
          contents: 'export default "";',
        };
      });
    },
  };
}

export default assetLoaderPlugin;
