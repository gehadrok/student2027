import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import schemaSql from './sqlite-schema.sql?raw';
import seedSql from './sqlite-seed.sql?raw';

/**
 * Server (Node) runtime support.
 *
 * The Academic REST API runs inside the Express server (bundled to CJS), while
 * the rest of the SPA runs in the browser (Vite). The browser keeps using
 * `localStorage` + the Vite-resolved `?url` WASM bundle exactly as before.
 * In Node we instead: locate the sql.js WASM binary via `require.resolve`,
 * persist the exported DB binary to a file under `data/`, and load the schema
 * + seed content that the esbuild asset-loader now inlines into the server
 * bundle. All Node-only globals are accessed only inside the guarded
 * `getNodeRuntime()` path so the browser bundle is never affected.
 */
interface NodeRuntime {
  fs: {
    readFileSync: (p: string) => Buffer;
    writeFileSync: (p: string, data: Buffer) => void;
    mkdirSync: (p: string, opts?: { recursive?: boolean }) => void;
    unlinkSync: (p: string) => void;
  };
  path: {
    join: (...segments: string[]) => string;
    dirname: (p: string) => string;
  };
  resolve: (id: string) => string;
}

function getNodeRuntime(): NodeRuntime | null {
  if (typeof window !== 'undefined') return null;
  try {
    // eslint-disable-next-line no-undef
    const req = typeof require !== 'undefined' ? require : undefined;
    if (!req || typeof req.resolve !== 'function') return null;
    return {
      fs: req('fs'),
      path: req('path'),
      resolve: (id: string) => req.resolve(id),
    };
  } catch {
    return null;
  }
}

const nodeRuntime = getNodeRuntime();

function persistFilePath(): string {
  return nodeRuntime!.path.join(process.cwd(), 'data', 'al-salam-server.db');
}

function resolveWasmLocator(): (file: string) => string {
  if (nodeRuntime) {
    try {
      const wasmPath = nodeRuntime.resolve('sql.js/dist/sql-wasm.wasm');
      if (wasmPath) return () => wasmPath;
    } catch {
      /* fall through to the bundled URL */
    }
  }
  return () => sqlWasmUrl;
}

const wasmLocator = resolveWasmLocator();

let SQL: SqlJsStatic | null = null;
let dbInstance: Database | null = null;
const DB_PERSIST_KEY = 'al_salam_school_sqlite_db_v1';

/**
 * Load a previously persisted database binary.
 * - Node: reads the file under `data/`.
 * - Browser: reads the base64 value from localStorage.
 */
function loadPersistedDB(): Uint8Array | null {
  if (nodeRuntime) {
    try {
      return new Uint8Array(nodeRuntime.fs.readFileSync(persistFilePath()));
    } catch {
      return null;
    }
  }
  try {
    const savedDbBase64 = localStorage.getItem(DB_PERSIST_KEY);
    if (!savedDbBase64) return null;
    return Uint8Array.from(atob(savedDbBase64), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

export async function getSQLiteDB(): Promise<Database> {
  if (dbInstance) return dbInstance;

  try {
    if (!SQL) {
      try {
        SQL = await initSqlJs({
          locateFile: wasmLocator
        });
      } catch (e1) {
        console.warn('⚠️ Local WASM bundle load failed, trying cdnjs fallback...', e1);
        try {
          SQL = await initSqlJs({
            locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}`
          });
        } catch (e2) {
          console.warn('⚠️ cdnjs WASM load failed, trying jsdelivr fallback...', e2);
          SQL = await initSqlJs({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/sql.js@1.12.0/dist/${file}`
          });
        }
      }
    }

    // Check if a persisted database binary already exists
    const savedDbBinary = loadPersistedDB();
    if (savedDbBinary) {
      try {
        dbInstance = new SQL.Database(savedDbBinary);
        // Ensure pragma foreign keys is ON
        dbInstance.run('PRAGMA foreign_keys = ON;');
        console.log(`✅ SQLite Database loaded successfully from ${nodeRuntime ? 'file persistence' : 'local persistence'}.`);
        return dbInstance;
      } catch (err) {
        console.warn('⚠️ Failed to parse saved SQLite DB binary. Re-initializing fresh DB...', err);
      }
    }

    // Initialize fresh Database instance
    dbInstance = new SQL.Database();
    dbInstance.run('PRAGMA foreign_keys = ON;');

    // Execute Schema
    dbInstance.run(schemaSql);

    // Execute Seed Data
    dbInstance.run(seedSql);

    // Persist initial DB state
    persistSQLiteDB();

    console.log('✨ Fresh SQLite Database created with 3NF Schema and Seed Data.');
    return dbInstance;
  } catch (error) {
    console.error('❌ Error initializing SQLite Engine:', error);
    throw error;
  }
}

/**
 * Persist SQLite Database binary state.
 * - Node: writes the binary to `data/al-salam-server.db`.
 * - Browser: stores a base64 value in localStorage.
 */
export function persistSQLiteDB(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    if (nodeRuntime) {
      const filePath = persistFilePath();
      nodeRuntime.fs.mkdirSync(nodeRuntime.path.dirname(filePath), { recursive: true });
      nodeRuntime.fs.writeFileSync(filePath, Buffer.from(data));
      return;
    }
    // Convert Uint8Array to base64 string
    let binary = '';
    const bytes = new Uint8Array(data);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    localStorage.setItem(DB_PERSIST_KEY, base64);
  } catch (e) {
    console.error('Failed to persist SQLite DB:', e);
  }
}

/**
 * Reset and reload fresh database from schema & seed
 */
export async function resetSQLiteDBToSeed(): Promise<Database> {
  if (nodeRuntime) {
    try {
      nodeRuntime.fs.unlinkSync(persistFilePath());
    } catch {
      /* file does not exist — fine */
    }
  } else {
    localStorage.removeItem(DB_PERSIST_KEY);
  }
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
  return getSQLiteDB();
}

/**
 * Execute a SQL query returning an array of objects
 */
export async function querySql<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = await getSQLiteDB();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return results;
}

/**
 * Execute a query returning a single object or null
 */
export async function queryOneSql<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const list = await querySql<T>(sql, params);
  return list.length > 0 ? list[0] : null;
}

/**
 * Execute an INSERT, UPDATE, or DELETE SQL statement with automatic persistence
 */
export async function runSql(sql: string, params: any[] = []): Promise<{ changes: number; lastInsertRowid: number }> {
  const db = await getSQLiteDB();
  db.run(sql, params);
  
  const changesRes = db.exec("SELECT changes() as cnt, last_insert_rowid() as id;");
  let changes = 0;
  let lastInsertRowid = 0;
  if (changesRes.length > 0 && changesRes[0].values.length > 0) {
    changes = changesRes[0].values[0][0] as number;
    lastInsertRowid = changesRes[0].values[0][1] as number;
  }
  
  persistSQLiteDB();
  return { changes, lastInsertRowid };
}

/**
 * Synchronous version for instant UI bindings if DB is ready
 */
export function querySqlSync<T = any>(sql: string, params: any[] = []): T[] {
  if (!dbInstance) {
    console.warn('SQLite DB instance not ready for sync query. Returning empty.');
    return [];
  }
  try {
    const stmt = dbInstance.prepare(sql);
    stmt.bind(params);
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as T);
    }
    stmt.free();
    return results;
  } catch (err) {
    console.error('SQL Sync Query Error:', sql, err);
    return [];
  }
}

export function runSqlSync(sql: string, params: any[] = []): void {
  if (!dbInstance) return;
  try {
    dbInstance.run(sql, params);
    persistSQLiteDB();
  } catch (err) {
    console.error('SQL Sync Run Error:', sql, err);
  }
}

/**
 * Begin a SQLite transaction
 */
export function beginTransaction(): void {
  if (!dbInstance) return;
  dbInstance.run('BEGIN TRANSACTION;');
}

/**
 * Commit the current transaction
 */
export function commitTransaction(): void {
  if (!dbInstance) return;
  dbInstance.run('COMMIT;');
  persistSQLiteDB();
}

/**
 * Rollback the current transaction
 */
export function rollbackTransaction(): void {
  if (!dbInstance) return;
  dbInstance.run('ROLLBACK;');
}

/**
 * Execute multiple SQL statements inside an async transaction.
 * Auto-commits on success, rollbacks on any failure.
 */
export async function runTransaction(
  queries: Array<{ sql: string; params?: any[] }>
): Promise<{ success: boolean; error?: string }> {
  const db = await getSQLiteDB();
  try {
    db.run('BEGIN TRANSACTION;');
    for (const q of queries) {
      db.run(q.sql, q.params || []);
    }
    db.run('COMMIT;');
    persistSQLiteDB();
    return { success: true };
  } catch (err: any) {
    try {
      db.run('ROLLBACK;');
    } catch {
      /* ignore rollback failure */
    }
    console.error('Transaction failed, rolled back:', err);
    return { success: false, error: err.message || 'Transaction failed' };
  }
}

/**
 * Execute multiple SQL statements inside a transaction
 * Auto-commits on success, rollbacks on any failure
 */
export function runTransactionSync(queries: Array<{ sql: string; params?: any[] }>): { success: boolean; error?: string } {
  if (!dbInstance) {
    return { success: false, error: 'Database not initialized' };
  }

  try {
    beginTransaction();
    for (const q of queries) {
      dbInstance.run(q.sql, q.params || []);
    }
    commitTransaction();
    return { success: true };
  } catch (err: any) {
    rollbackTransaction();
    console.error('Transaction failed, rolled back:', err);
    return { success: false, error: err.message || 'Transaction failed' };
  }
}
