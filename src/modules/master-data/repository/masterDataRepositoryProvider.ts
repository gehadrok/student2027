/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase C2 — Master Data repository selection.
 *
 *   USE_MOCK=true  → existing MockDataSource (browser SQLite `MasterDataRepository`)
 *   USE_MOCK=false → existing Kayan Master Data REST API (`MasterDataRestRepository`)
 *
 * There is no silent fallback: the implementation is chosen once, from the
 * resolved integration mode, and a Real Mode failure surfaces as an error.
 */

import { isMockMode } from '../../../lib/runtime/mode';
import type { IMasterDataRepository } from '../../../core/repositories/IMasterDataRepository';
import { masterDataRepository } from './masterDataRepository';
import { MasterDataRestRepository } from '../api/masterDataRestRepository';

let active: IMasterDataRepository | null = null;

export function getMasterDataRepository(): IMasterDataRepository {
  if (!active) {
    active = isMockMode() ? masterDataRepository : new MasterDataRestRepository();
  }
  return active;
}

export function setMasterDataRepository(repository: IMasterDataRepository | null): void {
  active = repository;
}

export function isServerSidePaginated(repository: IMasterDataRepository): boolean {
  return (repository as { paginatesServerSide?: boolean }).paginatesServerSide === true;
}
