import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient, QueryResult, QueryResultRow, types } from 'pg';

// pg parses `date` columns as JavaScript Date objects (midnight in server TZ),
// which shifts the date by -1 day when converted to UTC via toISOString().
// Override OID 1082 (date) to return the raw "YYYY-MM-DD" string instead.
types.setTypeParser(1082, (val: string) => val);

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.pool = new Pool({
      host: this.config.get<string>('DATABASE_HOST', 'localhost'),
      port: this.config.get<number>('DATABASE_PORT', 5432),
      database: this.config.get<string>('DATABASE_NAME', 'ruts_realaids'),
      user: this.config.get<string>('DATABASE_USER', 'realaids'),
      password: this.config.get<string>('DATABASE_PASSWORD', 'realaids1234'),
      max: 20,                    // max pool size
      idleTimeoutMillis: 30_000,  // close idle clients after 30s
      connectionTimeoutMillis: 10_000,
    });

    this.pool.on('error', (err: Error) => {
      this.logger.error('Unexpected error on idle PostgreSQL client', err.stack);
    });

    this.logger.log(
      `PostgreSQL pool connected → ${this.config.get('DATABASE_HOST')}:${this.config.get('DATABASE_PORT')}/${this.config.get('DATABASE_NAME')}`,
    );
  }

  async onModuleDestroy() {
    await this.pool.end();
    this.logger.log('PostgreSQL pool closed');
  }

  // ── Core query methods ────────────────────────────────────────────────────

  /**
   * Execute a parameterized query and return the full QueryResult.
   * Always use $1, $2... placeholders — never string interpolation.
   */
  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query<T>(text, values);
      const ms = Date.now() - start;
      this.logger.debug(
        `query [${ms}ms] rows=${result.rowCount} | ${text.substring(0, 120).replace(/\s+/g, ' ')}`,
      );
      return result;
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(`Query failed: ${error.message}\nSQL: ${text}`);
      throw new InternalServerErrorException('Database query failed');
    }
  }

  /**
   * Return the first row or null. Useful for SELECT … LIMIT 1 or findById.
   */
  async queryOne<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<T | null> {
    const result = await this.query<T>(text, values);
    return result.rows[0] ?? null;
  }

  /**
   * Return all rows as a typed array.
   */
  async queryMany<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<T[]> {
    const result = await this.query<T>(text, values);
    return result.rows;
  }

  /**
   * Execute INSERT/UPDATE/DELETE and return affected row count.
   */
  async execute(text: string, values?: unknown[]): Promise<number> {
    const result = await this.query(text, values);
    return result.rowCount ?? 0;
  }

  // ── Transaction support ───────────────────────────────────────────────────

  /**
   * Run multiple queries inside a single ACID transaction.
   * Automatically rolls back on any thrown error.
   *
   * @example
   * const result = await db.transaction(async (client) => {
   *   const row = await client.query('INSERT INTO ... RETURNING *', [...]);
   *   await client.query('INSERT INTO audit_logs ...', [...]);
   *   return row.rows[0];
   * });
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ── Pagination helper ─────────────────────────────────────────────────────

  /**
   * Execute a paginated query.
   *
   * @param countSql   - SELECT COUNT(*) query (same WHERE conditions, no ORDER/LIMIT)
   * @param dataSql    - SELECT ... query (without LIMIT/OFFSET — added automatically)
   * @param values     - Shared parameterized values for both queries
   * @param options    - { page, limit }
   */
  async queryPaginated<T extends QueryResultRow = QueryResultRow>(
    countSql: string,
    dataSql: string,
    values: unknown[],
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<T>> {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));
    const offset = (page - 1) * limit;

    const [countResult, dataResult] = await Promise.all([
      this.query<{ count: string }>(countSql, values),
      this.query<T>(`${dataSql} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, [
        ...values,
        limit,
        offset,
      ]),
    ]);

    const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

    return {
      data: dataResult.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
