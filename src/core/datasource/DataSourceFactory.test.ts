/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Limited PG-0 verification for DataSourceFactory selection.
 * No real PostgreSQL database is created or contacted.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { DataSourceFactory } from './DataSourceFactory';
import { SQLiteDataSource } from './SQLiteDataSource';
import { PostgreSQLDataSource } from './PostgreSQLDataSource';

describe('DataSourceFactory selection', () => {
  before(() => DataSourceFactory.reset());
  after(() => DataSourceFactory.reset());

  it('sqlite -> SQLiteDataSource', async () => {
    const ds = await DataSourceFactory.createDataSource('sqlite');
    assert.ok(ds instanceof SQLiteDataSource);
  });

  it('postgresql -> PostgreSQLDataSource', async () => {
    const ds = await DataSourceFactory.createDataSource('postgresql');
    assert.ok(ds instanceof PostgreSQLDataSource);
  });

  it('default is sqlite', async () => {
    const ds = await DataSourceFactory.createDataSource();
    assert.ok(ds instanceof SQLiteDataSource);
  });

  it('initialize() honors DATA_SOURCE_TYPE=postgresql', async () => {
    const OLD = process.env.DATA_SOURCE_TYPE;
    process.env.DATA_SOURCE_TYPE = 'postgresql';
    try {
      const ds = await DataSourceFactory.initialize();
      assert.ok(ds instanceof PostgreSQLDataSource);
    } finally {
      if (OLD === undefined) delete process.env.DATA_SOURCE_TYPE;
      else process.env.DATA_SOURCE_TYPE = OLD;
      DataSourceFactory.reset();
    }
  });

  it('getInstance() remains synchronous and defaults to sqlite', () => {
    const ds = DataSourceFactory.getInstance();
    assert.ok(ds instanceof SQLiteDataSource);
  });
});
