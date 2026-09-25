/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * C3.1 — Operational read port selection (Mock vs Real).
 *
 * USE_MOCK=true  -> existing browser SQLite read path.
 * USE_MOCK=false -> C3.1 GET endpoints through the shared ApiClient.
 * No silent fallback: the port is chosen once from the resolved mode.
 */

import { isMockMode } from '../../../lib/runtime/mode';
import type { OperationalReadPort } from './operationalReadPort';
import { mockOperationalReadPort } from './mockOperationalReadPort';
import { operationalRestReadPort } from './operationalRestReadPort';

let active: OperationalReadPort | null = null;

export function getOperationalReadPort(): OperationalReadPort {
  if (!active) {
    active = isMockMode() ? mockOperationalReadPort : operationalRestReadPort;
  }
  return active;
}

export function setOperationalReadPort(port: OperationalReadPort | null): void {
  active = port;
}
