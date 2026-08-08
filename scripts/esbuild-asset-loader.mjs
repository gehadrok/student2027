/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * esbuild plugin for the server production bundle.
 *
 * Mirrors the existing `scripts/asset-loader.mjs` (Node ESM loader used by
 * tsx smoke tests) as an esbuild onLoad resolver. It stubs Vite-specific
 * asset imports (`?raw`, `?url`) of `.sql` and `.wasm` files so the
 * browser-only sql.js/WASM runtime is never bundled or executed in the Node
 * server build.
 *
 * These asset imports are only understood by Vite at client build time. At
 * server runtime the SQLite bootstrap (which reads `localStorage`) is never
 * invoked, so the assets are replaced with inert empty values.
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
          path: clean,
          namespace: 'asset-stub',
        };
      });

      build.onLoad({ filter: /.*/, namespace: 'asset-stub' }, () => {
        // Inert placeholder: the browser-only SQLite asset content is never
        // needed at server runtime.
        return {
          loader: 'js',
          contents: 'export default "";',
        };
      });
    },
  };
}

export default assetLoaderPlugin;
