import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
register('./asset-loader.mjs', pathToFileURL('./scripts/'));

const { default: run } = await import('../scripts/debug-repro.ts');
const code = typeof run === 'function' ? await run() : 0;
process.exit(code);
