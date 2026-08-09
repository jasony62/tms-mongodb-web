import { PgPool } from '../../pg/pool.js'
import { ISchemaRepository } from '../interfaces.js'
import type { SchemaDTO } from '../interfaces.js'

let schemaTableEnsured = false
async function ensureSchemaTable() {
  if (schemaTableEnsured) return
  await PgPool.query(`CREATE TABLE IF NOT EXISTS tmw_schema (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(255) DEFAULT '',
    description TEXT DEFAULT '',
    body JSONB DEFAULT '{}'::jsonb,
    scope VARCHAR(50) DEFAULT 'document',
    db_name VARCHAR(255) DEFAULT '',
    db_sysname VARCHAR(255) DEFAULT '',
    bucket VARCHAR(255) DEFAULT '',
    "order" INTEGER DEFAULT 0,
    creator VARCHAR(255) DEFAULT '',
    created_at VARCHAR(50) DEFAULT ''
  )`)
  schemaTableEnsured = true
}

function processRow(row: any): any {
  if (!row) return row
  const { id, db_name, db_sysname, ...rest } = row
  rest._id = String(id)
  rest.db = db_name ? { name: db_name, sysname: db_sysname } : null
  return rest
}

function processRows(rows: any[]): any[] {
  return rows.map(processRow)
}

export class PgSchemaRepository implements ISchemaRepository {
  async findById(id: string, bucket?: string, dbName?: string): Promise<SchemaDTO | null> {
    await ensureSchemaTable()
    let sql = 'SELECT * FROM tmw_schema WHERE id::text = $1'
    const params: any[] = [id]
    if (bucket) {
      sql += ' AND bucket = $2'
      params.push(bucket)
    }
    if (dbName) {
      sql += params.length === 1 ? ' AND db_name = $2' : ' AND db_name = $3'
      params.push(dbName)
    }
    const row = await PgPool.queryOne(sql, params)
    return processRow(row) as SchemaDTO | null
  }

  async findByIds(ids: any[], options?: { projection?: any }): Promise<SchemaDTO[]> {
    if (!ids || ids.length === 0) return []
    await ensureSchemaTable()
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',')
    const idStrings = ids.map((id) => id.toString())
    const sql = `SELECT * FROM tmw_schema WHERE id::text IN (${placeholders})`
    const result = await PgPool.query(sql, idStrings)
    return processRows(result.rows) as SchemaDTO[]
  }

  async findByName(
    name: string,
    options?: { onlyProperties?: boolean; dbName?: string | null; scope?: string; bucket?: string }
  ): Promise<any> {
    await ensureSchemaTable()
    const { dbName = null, scope = 'document', bucket } = options || {}
    let sql = 'SELECT * FROM tmw_schema WHERE name = $1 AND scope = $2'
    const params: any[] = [name, scope]
    if (dbName) {
      sql += ' AND (db_name = $3 OR db_name = \'\')'
      params.push(dbName)
    } else {
      sql += ' AND db_name = \'\''
    }
    if (bucket) {
      sql += params.length === 3 ? ' AND bucket = $4' : ' AND bucket = $3'
      params.push(bucket)
    }
    const row = await PgPool.queryOne(sql, params)
    return processRow(row) as SchemaDTO | null
  }

  async create(info: Partial<SchemaDTO>): Promise<{ insertedId: any }> {
    await ensureSchemaTable()
    const row = await PgPool.queryOne(
      `INSERT INTO tmw_schema (name, title, description, body, scope, db_name, db_sysname, bucket, "order", creator, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        info.name || '',
        info.title || '',
        info.description || '',
        JSON.stringify(info.body || {}),
        info.scope || 'document',
        info.db?.name || '',
        info.db?.sysname || '',
        info.bucket || '',
        info.order ?? 99999,
        info.creator || '',
        info.created_at || '',
      ]
    )
    return { insertedId: row?.id }
  }

  async list(
    scopes: string[],
    dbName?: string | null,
    bucket?: string
  ): Promise<SchemaDTO[]> {
    await ensureSchemaTable()
    let sql = 'SELECT * FROM tmw_schema'
    const params: any[] = []
    const conditions: string[] = []

    // scope 过滤
    conditions.push(
      'scope = ANY(string_to_array($' + (params.length + 1) + ', \',\'))'
    )
    params.push(scopes.join(','))

    // dbName 过滤
    if (dbName) {
      conditions.push('(db_name = $' + (params.length + 1) + ' OR db_name IS NULL OR db_name = \'\')')
      params.push(dbName)
    } else {
      conditions.push('(db_name IS NULL OR db_name = \'\')')
    }

    if (bucket) {
      conditions.push('bucket = $' + (params.length + 1))
      params.push(bucket)
    }

    if (conditions.length) {
      sql += ' WHERE ' + conditions.join(' AND ')
    }
    sql += ' ORDER BY "order" ASC'

    const result = await PgPool.query(sql, params)
    return processRows(result.rows) as SchemaDTO[]
  }

  async findByTag(tag: string, bucket?: string): Promise<SchemaDTO[]> {
    await ensureSchemaTable()
    let sql = 'SELECT * FROM tmw_schema WHERE tags @> $1::jsonb'
    const params: any[] = [JSON.stringify([tag])]
    if (bucket) {
      sql += ' AND bucket = $' + (params.length + 1)
      params.push(bucket)
    }
    sql += ' ORDER BY "order" ASC'
    const result = await PgPool.query(sql, params)
    return processRows(result.rows) as SchemaDTO[]
  }

  async updateById(id: string, info: Partial<SchemaDTO>): Promise<boolean> {
    await ensureSchemaTable()
    const params: any[] = []
    const sets: string[] = []
    for (const [key, value] of Object.entries(info)) {
      if (key === '_id' || key === 'type') continue
      if (key === 'body') {
        sets.push('body = $' + (params.length + 1) + '::jsonb')
        params.push(JSON.stringify(value))
      } else if (key === 'db') {
        if (value && typeof value === 'object') {
          sets.push('db_name = $' + (params.length + 1))
          params.push(value.name || '')
          sets.push('db_sysname = $' + (params.length + 1))
          params.push(value.sysname || '')
        } else {
          sets.push('db_name = $' + (params.length + 1))
          params.push('')
          sets.push('db_sysname = $' + (params.length + 1))
          params.push('')
        }
      } else {
        sets.push('"' + key + '" = $' + (params.length + 1))
        params.push(value)
      }
    }
    if (sets.length === 0) return true
    params.push(id)
    const sql = 'UPDATE tmw_schema SET ' + sets.join(', ') + ' WHERE id::text = $' + params.length
    const result = await PgPool.query(sql, params)
    return result.rowCount !== null && result.rowCount > 0
  }

  async listSimple(dbName: string, scope = 'document', bucket?: string): Promise<SchemaDTO[]> {
    await ensureSchemaTable()
    let sql = 'SELECT * FROM tmw_schema'
    const params: any[] = []
    const conditions: string[] = []
    if (dbName) {
      conditions.push('(db_name = $' + (params.length + 1) + ' OR db_name = \'\')')
      params.push(dbName)
    }
    conditions.push('scope = ANY(string_to_array($' + (params.length + 1) + ', \',\'))')
    params.push(scope)
    if (bucket) {
      conditions.push('bucket = $' + (params.length + 1))
      params.push(bucket)
    }
    if (conditions.length) {
      sql += ' WHERE ' + conditions.join(' AND ')
    }
    sql += ' ORDER BY "order" ASC'
    const result = await PgPool.query(sql, params)
    return processRows(result.rows) as SchemaDTO[]
  }

  async deleteById(id: string, bucket?: string): Promise<boolean> {
    await ensureSchemaTable()
    let sql = 'DELETE FROM tmw_schema WHERE id::text = $1'
    const params: any[] = [id]
    if (bucket) {
      sql += ' AND bucket = $2'
      params.push(bucket)
    }
    const result = await PgPool.query(sql, params)
    return result.rowCount !== null && result.rowCount > 0
  }
}
