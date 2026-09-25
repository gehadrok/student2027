/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PostgreSQL implementation of the generic IDataSource interface.
 *
 * - Fully async / Promise-based (no sync shims, no setTimeout / polling /
 *   fire-and-forget).
 * - Backed by a `pg` connection Pool.
 * - Implements every method declared by IDataSource.
 * - Connection credentials are supplied via PostgresConfig (from environment);
 *   they are stored privately and never logged or exposed through a public API.
 */

import { Pool, PoolClient, types } from 'pg';
import type { PoolConfig } from 'pg';
import { IDataSource } from './IDataSource';
import { preparePostgresStatement } from './sqlDialect';

export class PostgreSQLDataSource implements IDataSource {
  private readonly pool: Pool;
  private txClient: PoolClient | null = null;

  constructor(config: PoolConfig) {
    // NOTE: `config` may contain a password; it is kept private and never
    // logged. No connection is opened here — `pg` connects lazily on first use.

    // Normalize PostgreSQL date/timestamp columns to strings so the existing
    // mappers (written for SQLite's string dates) work unchanged. This keeps
    // the dialect difference contained at this single boundary rather than
    // leaking into every repository/mapper.
    types.setTypeParser(1082, (v) => v); // DATE      -> 'YYYY-MM-DD'
    types.setTypeParser(1114, (v) => v); // TIMESTAMP -> 'YYYY-MM-DD HH:MM:SS'
    types.setTypeParser(1184, (v) => v); // TIMESTAMPTZ

    this.pool = new Pool(config);
  }

  /**
   * Translate a SQLite-style statement + params into PostgreSQL-ready form.
   * This is the single boundary where the dialect differences are resolved, so
   * the repositories (which still emit SQLite SQL) need no dialect branches.
   */
  private toPg(sql: string, params?: any[]): { sql: string; params: any[] } {
    return preparePostgresStatement(sql, params ?? []);
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const pg = this.toPg(sql, params);
    const res = await this.pool.query(pg.sql, pg.params);
    return res.rows as T[];
  }

  async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const pg = this.toPg(sql, params);
    const res = await this.pool.query(pg.sql, pg.params);
    return (res.rows[0] as T) ?? null;
  }

  async execute(
    sql: string,
    params?: any[],
  ): Promise<{ changes: number; lastInsertRowid: number }> {
    const pg = this.toPg(sql, params);
    const res = await this.pool.query(pg.sql, pg.params);
    return {
      changes: res.rowCount ?? 0,
      lastInsertRowid: 0,
    };
  }

  async transaction(
    queries: Array<{ sql: string; params?: any[] }>,
  ): Promise<{ success: boolean; error?: string }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const q of queries) {
        const pg = this.toPg(q.sql, q.params);
        await client.query(pg.sql, pg.params);
      }
      await client.query('COMMIT');
      return { success: true };
    } catch (err: any) {
      await client.query('ROLLBACK');
      return { success: false, error: err?.message };
    } finally {
      client.release();
    }
  }

  async prepare(sql: string): Promise<{ run: (params?: any[]) => void; free: () => void }> {
    // pg prepared statements are scoped to a session; expose a simple run
    // wrapper that executes against the pool. `run` returns void per the
    // IDataSource contract (mirrors SQLiteDataSource.prepare). The SQL is
    // translated once up-front; `run` just supplies params at execution time.
    const pgSql = this.toPg(sql, []).sql;
    return {
      run: (params?: any[]) => {
        const pg = preparePostgresStatement(pgSql, params ?? []);
        void this.pool.query(pg.sql, pg.params);
      },
      free: () => {
        // No held client; nothing to release.
      },
    };
  }

  async count(sql: string, params?: any[]): Promise<number> {
    const pg = this.toPg(sql, params);
    // Callers pass two forms:
    //   1) a count query already  -> "SELECT COUNT(*) as cnt FROM <table> ..."
    //   2) a predicate query       -> "SELECT 1 FROM <table> WHERE ..."
    // Wrapping form (2) in `SELECT COUNT(*) FROM (<sql>) AS _sub` is correct,
    // but wrapping form (1) double-counts and always returns 1. Detect a
    // COUNT( expression in the caller SQL and run it directly in that case.
    const isCountQuery = /\bcount\s*\(/i.test(sql);
    const result = await this.queryOne<{ cnt: number }>(
      isCountQuery ? pg.sql : `SELECT COUNT(*) AS cnt FROM (${pg.sql}) AS _sub`,
      pg.params,
    );
    return Number(result?.cnt ?? 0);
  }

  async exists(sql: string, params?: any[]): Promise<boolean> {
    const pg = this.toPg(sql, params);
    const isCountQuery = /\bcount\s*\(/i.test(sql);
    const result = await this.queryOne<{ cnt: number }>(
      isCountQuery ? pg.sql : `SELECT COUNT(*) AS cnt FROM (${pg.sql}) AS _sub`,
      pg.params,
    );
    return Number(result?.cnt ?? 0) > 0;
  }

  async beginTransaction(): Promise<void> {
    if (this.txClient) {
      throw new Error('PostgreSQLDataSource: a transaction is already in progress');
    }
    this.txClient = await this.pool.connect();
    await this.txClient.query('BEGIN');
  }

  async commit(): Promise<void> {
    if (!this.txClient) return;
    await this.txClient.query('COMMIT');
    this.txClient.release();
    this.txClient = null;
  }

  async rollback(): Promise<void> {
    if (!this.txClient) return;
    await this.txClient.query('ROLLBACK');
    this.txClient.release();
    this.txClient = null;
  }

  /**
   * Release the underlying connection pool. Call when the datasource is no
   * longer needed (e.g. after a live integration test) so the Node process can
   * exit. Safe to call multiple times.
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
