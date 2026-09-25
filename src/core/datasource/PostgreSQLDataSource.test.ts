/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Limited PG-0 verification for PostgreSQLDataSource.
 * No real PostgreSQL database is created or contacted.
 */
import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { PostgreSQLDataSource } from './PostgreSQLDataSource';
import { getPostgresConfig } from './postgresConfig';

const IDATA_SOURCE_METHODS = [
  'query',
  'queryOne',
  'execute',
  'transaction',
  'prepare',
  'count',
  'exists',
  'beginTransaction',
  'commit',
  'rollback',
];

describe('PostgreSQLDataSource', () => {
  it('implements every IDataSource method', () => {
    const ds = new PostgreSQLDataSource({
      connectionString: 'postgres://test:test@localhost:5432/test',
    });
    for (const m of IDATA_SOURCE_METHODS) {
      assert.strictEqual(typeof (ds as any)[m], 'function', `missing method: ${m}`);
    }
  });

  it('does not expose credentials via a public API', () => {
    const ds = new PostgreSQLDataSource({
      connectionString: 'postgres://alice:s3cr3t@db.example.com:5432/app',
    });
    assert.strictEqual((ds as any).connectionString, undefined);
    assert.strictEqual((ds as any).password, undefined);
    assert.strictEqual((ds as any).config, undefined);
  });
});

describe('getPostgresConfig credential handling', () => {
  const OLD = process.env.DATABASE_URL;
  after(() => {
    if (OLD === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = OLD;
  });

  it('parses DATABASE_URL but never logs the password', () => {
    process.env.DATABASE_URL = 'postgres://alice:s3cr3t@db.example.com:5432/school';

    const logs: string[] = [];
    const spy = (...args: any[]) => logs.push(args.map(String).join(' '));
    const origLog = console.log;
    const origErr = console.error;
    const origWarn = console.warn;
    console.log = spy as any;
    console.error = spy as any;
    console.warn = spy as any;

    try {
      const cfg = getPostgresConfig();
      assert.strictEqual(cfg.connectionString, 'postgres://alice:s3cr3t@db.example.com:5432/school');
      assert.ok(!logs.some((l) => l.includes('s3cr3t')), 'credential leaked to logs');
    } finally {
      console.log = origLog;
      console.error = origErr;
      console.warn = origWarn;
    }
  });
});
