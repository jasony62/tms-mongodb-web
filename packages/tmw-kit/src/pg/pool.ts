import pg from 'pg'
import log4js from '@log4js-node/log4js-api'
import Debug from 'debug'

const logger = log4js.getLogger('tms-mongodb-web')
const debug = Debug('tmw-kit:pg')

const BACKEND = process.env.TMW_STORAGE_BACKEND || 'mongodb'
const PG_URI = process.env.TMW_POSTGRES_URI || ''
const PG_MAX_POOL = parseInt(process.env.TMW_POSTGRES_MAX_POOL || '10')

export function isFerretdb(): boolean {
  return BACKEND === 'ferretdb'
}

export function isMongodb(): boolean {
  return BACKEND !== 'ferretdb'
}

export class PgPool {
  private static _pool: pg.Pool | null = null
  private static _queries: Record<string, string> = {}

  static registerQueries(queries: Record<string, string>) {
    Object.assign(PgPool._queries, queries)
  }

  static getQuery(name: string): string | undefined {
    return PgPool._queries[name]
  }

  static available(): boolean {
    return isFerretdb() && !!PG_URI
  }

  static async query(text: string, params?: any[]) {
    if (!PgPool._pool) {
      PgPool._pool = new pg.Pool({
        connectionString: PG_URI,
        max: PG_MAX_POOL,
      })
      PgPool._pool.on('error', (err) => {
        logger.error(`PG pool error: ${err.message}`)
      })
    }
    debug(`PG query: %s %O`, text, params)
    const start = Date.now()
    const result = await PgPool._pool.query(text, params)
    const duration = Date.now() - start
    debug(`PG query done (%dms): %s`, duration, text)
    return result
  }

  static async queryOne(text: string, params?: any[]) {
    const result = await PgPool.query(text, params)
    return result.rows[0] || null
  }

  static async end() {
    if (PgPool._pool) {
      await PgPool._pool.end()
      PgPool._pool = null
    }
  }
}
