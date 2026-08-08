/**
 * Preload script that registers the asset loader hook chain.
 * Run via: node --import ./scripts/register-asset-loader.mjs
 */
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./asset-loader.mjs', pathToFileURL('./scripts/'));
