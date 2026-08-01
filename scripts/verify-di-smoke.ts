/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 4.1 DI smoke verification.
 * Verifies that initializeInfrastructure() registers all mandatory services
 * and that resolve() returns them without error. Run via: npx tsx scripts/verify-di-smoke.ts
 */

import { initializeInfrastructure, resolve, SERVICE_IDS, Container } from '../src/core/bootstrap';

const mandatoryServices: Array<{ id: string; label: string }> = [
  { id: SERVICE_IDS.Logger, label: 'Logger' },
  { id: SERVICE_IDS.Config, label: 'Config' },
  { id: SERVICE_IDS.Cache, label: 'Cache' },
  { id: SERVICE_IDS.EventBus, label: 'EventBus' },
  { id: SERVICE_IDS.Notification, label: 'Notification' },
  { id: SERVICE_IDS.Storage, label: 'Storage' },
  { id: SERVICE_IDS.Audit, label: 'Audit' },
  { id: SERVICE_IDS.Permission, label: 'Permission' },
  { id: SERVICE_IDS.DataSource, label: 'DataSource' },
  { id: SERVICE_IDS.Encryption, label: 'Encryption' },
  { id: SERVICE_IDS.Hash, label: 'Hash' },
  { id: SERVICE_IDS.Token, label: 'Token' },
  { id: SERVICE_IDS.Session, label: 'Session' },
  { id: SERVICE_IDS.Auth, label: 'Auth' },
  { id: SERVICE_IDS.StudentRepository, label: 'StudentRepository' },
  { id: SERVICE_IDS.TeacherRepository, label: 'TeacherRepository' },
  { id: SERVICE_IDS.FinancialRepository, label: 'FinancialRepository' },
  { id: SERVICE_IDS.MasterDataRepository, label: 'MasterDataRepository' },
  { id: SERVICE_IDS.DashboardRepository, label: 'DashboardRepository' },
  { id: SERVICE_IDS.DashboardService, label: 'DashboardService' },
];

let failures = 0;

initializeInfrastructure();

// Execute-once guard test: second call must not throw but early-return
initializeInfrastructure();

const container = Container.getInstance();

for (const svc of mandatoryServices) {
  const present = container.has(svc.id);
  if (!present) {
    console.error(`✗ MISSING registration: ${svc.label} (${svc.id})`);
    failures++;
    continue;
  }
  try {
    const value = resolve(svc.id);
    if (value === undefined || value === null) {
      console.error(`✗ Resolved to null/undefined: ${svc.label} (${svc.id})`);
      failures++;
    } else {
      console.log(`✓ Resolved: ${svc.label} (${svc.id})`);
    }
  } catch (err: any) {
    console.error(`✗ Resolve failed: ${svc.label} (${svc.id}) — ${err.message}`);
    failures++;
  }
}

const registered = container.getRegisteredServices();
console.log(`\nTotal registered services: ${registered.length}`);
console.log(`Registered list: ${registered.join(', ')}`);

if (failures > 0) {
  console.error(`\nDI SMOKE TEST FAILED: ${failures} failure(s)`);
  process.exit(1);
}

console.log('\nDI SMOKE TEST PASSED: all mandatory services registered and resolvable.');
process.exit(0);

