/**
 * Database Client — Singleton Connection Pool for Azure SQL
 *
 * Provides a reusable, lazily-initialized mssql connection pool
 * with typed query helpers. Targets Azure SQL Serverless
 * (rm-sandbox.database.windows.net, database: TecFactory).
 *
 * Configuration is read from environment variables:
 *   - SQL_CONNECTION_STRING (preferred — full ADO.NET connection string)
 *   - OR individual: SQL_SERVER, SQL_DATABASE, SQL_USER, SQL_PASSWORD, SQL_ENCRYPT
 */

import sql from 'mssql';

/** Singleton pool instance (lazily created on first call to getPool). */
let pool: sql.ConnectionPool | null = null;

/** Promise guard to prevent multiple simultaneous connection attempts. */
let poolConnecting: Promise<sql.ConnectionPool> | null = null;

/**
 * Builds the mssql configuration from environment variables.
 * Prefers SQL_CONNECTION_STRING if set; otherwise assembles from individual vars.
 *
 * Returns either a connection string (string) or a config object — both are
 * accepted by the ConnectionPool constructor.
 */
function buildConfig(): sql.config | string {
  const connectionString = process.env['SQL_CONNECTION_STRING'];

  if (connectionString) {
    return connectionString;
  }

  const server = process.env['SQL_SERVER'];
  const database = process.env['SQL_DATABASE'];
  const user = process.env['SQL_USER'];
  const password = process.env['SQL_PASSWORD'];
  const encrypt = process.env['SQL_ENCRYPT'] !== 'false';

  if (!server || !database || !user || !password) {
    throw new Error(
      'Database configuration missing. Set SQL_CONNECTION_STRING or all of: SQL_SERVER, SQL_DATABASE, SQL_USER, SQL_PASSWORD.'
    );
  }

  return {
    server,
    database,
    user,
    password,
    options: {
      encrypt,
      trustServerCertificate: false,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30_000,
    },
  };
}

/**
 * Returns the singleton connection pool, creating it on first call.
 * Safe to call concurrently — only one connection attempt will be made.
 */
export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool?.connected) {
    return pool;
  }

  if (poolConnecting) {
    return poolConnecting;
  }

  poolConnecting = (async () => {
    const config = buildConfig();
    pool = new sql.ConnectionPool(config);

    pool.on('error', (err: Error) => {
      console.error('[db] Pool error:', err.message);
      pool = null;
      poolConnecting = null;
    });

    await pool.connect();
    poolConnecting = null;
    return pool;
  })();

  return poolConnecting;
}

/**
 * Executes a parameterized SQL query and returns typed results.
 *
 * @example
 * ```ts
 * interface Task { id: string; title: string; }
 * const result = await query<Task>('SELECT id, title FROM tasks WHERE state = @state', { state: 'todo' });
 * console.log(result.recordset); // Task[]
 * ```
 */
export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  queryText: string,
  params?: Record<string, unknown>
): Promise<sql.IResult<T>> {
  const connectionPool = await getPool();
  const request = connectionPool.request();

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      request.input(key, value);
    }
  }

  return request.query<T>(queryText);
}

/**
 * Executes a parameterized SQL query and returns only the first record,
 * or undefined if no rows match.
 *
 * @example
 * ```ts
 * interface Task { id: string; title: string; }
 * const task = await queryOne<Task>('SELECT * FROM tasks WHERE id = @id', { id: '123' });
 * ```
 */
export async function queryOne<T extends Record<string, unknown> = Record<string, unknown>>(
  queryText: string,
  params?: Record<string, unknown>
): Promise<T | undefined> {
  const result = await query<T>(queryText, params);
  return result.recordset[0];
}

/**
 * Executes a non-query SQL statement (INSERT, UPDATE, DELETE)
 * and returns the number of rows affected.
 *
 * @example
 * ```ts
 * const affected = await execute(
 *   'UPDATE tasks SET state = @state WHERE id = @id',
 *   { state: 'developed', id: '123' }
 * );
 * ```
 */
export async function execute(
  queryText: string,
  params?: Record<string, unknown>
): Promise<number> {
  const result = await query(queryText, params);
  return result.rowsAffected[0] ?? 0;
}

/**
 * Closes the connection pool gracefully.
 * Call during Azure Functions shutdown or in tests.
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
    poolConnecting = null;
  }
}
