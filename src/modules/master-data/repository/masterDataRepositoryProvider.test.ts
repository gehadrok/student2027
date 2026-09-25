process.env.USE_MOCK = 'false';

import test from 'node:test';
import assert from 'node:assert/strict';

const { getMasterDataRepository, isServerSidePaginated } = await import(
  '../repository/masterDataRepositoryProvider'
);
const { MasterDataRestRepository } = await import('../api/masterDataRestRepository');
const { masterDataRepository } = await import('../repository/masterDataRepository');
const { isMockMode } = await import('../../../lib/runtime/mode');

test('USE_MOCK=false selects the real Kayan Master Data REST repository', () => {
  assert.equal(isMockMode(), false);
  const selected = getMasterDataRepository();
  assert.ok(selected instanceof MasterDataRestRepository);
  assert.notEqual(selected, masterDataRepository);
});

test('the REST repository is the same instance across calls (no silent switch)', () => {
  assert.equal(getMasterDataRepository(), getMasterDataRepository());
});

test('the REST repository declares server-side pagination so the service does not re-page it', () => {
  assert.equal(isServerSidePaginated(getMasterDataRepository()), true);
  assert.equal(isServerSidePaginated(masterDataRepository), false);
});
