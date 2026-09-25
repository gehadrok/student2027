/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Limited PG-0 security verification for AuthService.
 * Ensures password_hash is never returned to the caller, stored in the
 * current user, or carried by refreshSession.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AuthService } from './AuthService';
import type { IDataSource } from '../datasource/IDataSource';

function makeDataSource(passwordHash: string): IDataSource {
  const fullRow = {
    id: 'u1',
    name: 'Test User',
    email: 't@e.com',
    role: 'admin',
    password_hash: passwordHash,
  };
  const safeRow = {
    id: 'u1',
    name: 'Test User',
    email: 't@e.com',
    role: 'admin',
  };
  return {
    // When the SQL selects password_hash (login verification) the row includes
    // it; otherwise (refreshSession / others) it must NOT be present — this
    // validates that the source code only selects it where strictly needed.
    query: async (sql: string) =>
      sql.includes('FROM users')
        ? [sql.includes('password_hash') ? fullRow : safeRow]
        : [],
    queryOne: async (sql: string) =>
      sql.includes('FROM users')
        ? sql.includes('password_hash')
          ? fullRow
          : safeRow
        : null,
    execute: async () => ({ changes: 0, lastInsertRowid: 0 }),
    transaction: async () => ({ success: true }),
    prepare: async () => ({ run: () => {}, free: () => {} }),
    count: async () => 0,
    exists: async () => false,
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
  } as unknown as IDataSource;
}

function makeAuth(passwordHash: string): AuthService {
  const hashService = { verify: () => true, hash: () => 'x' } as any;
  const tokenService = { generate: () => 'tok' } as any;
  return new AuthService(makeDataSource(passwordHash), hashService, tokenService);
}

describe('AuthService security', () => {
  it('never returns password_hash in the login result', async () => {
    const auth = makeAuth('bcrypt$abc123');
    const result = await auth.login({ email: 't@e.com', password: 'pw' });
    assert.strictEqual(result.success, true);
    assert.strictEqual((result as any).passwordHash, undefined);
    assert.strictEqual((result as any).password_hash, undefined);
  });

  it('does not store password_hash in currentUser', async () => {
    const auth = makeAuth('bcrypt$abc123');
    await auth.login({ email: 't@e.com', password: 'pw' });
    const cur = auth.getCurrentUser();
    assert.strictEqual((cur as any)?.passwordHash, undefined);
    assert.strictEqual((cur as any)?.password_hash, undefined);
  });

  it('refreshSession does not carry password_hash', async () => {
    const auth = makeAuth('bcrypt$abc123');
    await auth.login({ email: 't@e.com', password: 'pw' });
    const ok = await auth.refreshSession();
    assert.strictEqual(ok, true);
    const cur = auth.getCurrentUser();
    assert.strictEqual((cur as any)?.password_hash, undefined);
  });
});
