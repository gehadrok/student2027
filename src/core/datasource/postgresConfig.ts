/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PostgreSQL connection configuration.
 *
 * Reads connection details exclusively from environment variables so that no
 * credentials (username, password, or full DATABASE_URL) are ever hard-coded in
 * source code or committed to the repository.
 */

import type { PoolConfig } from 'pg';

/**
 * Resolve the PostgreSQL configuration from the environment.
 *
 * Priority:
 *   1. DATABASE_URL (full connection string, including credentials).
 *   2. Individual PGHOST / PGPORT / PGUSER / PGPASSWORD / PGDATABASE / PGSSL.
 *
 * The returned object may contain a password (required by `pg`); callers must
 * never log or serialize it. The DataSource stores it privately and never
 * exposes it through a public API.
 */
export function getPostgresConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString) {
    return { connectionString };
  }

  const ssl =
    process.env.PGSSL === 'true'
      ? { rejectUnauthorized: false }
      : undefined;

  return {
    host: process.env.PGHOST ?? 'localhost',
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl,
  } as PoolConfig;
}
