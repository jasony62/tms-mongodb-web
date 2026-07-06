import { PgPool } from '../../pg/pool.js'
import { ISchemaRepository } from '../interfaces.js'
import type { SchemaDTO } from '../interfaces.js'

let schemaTableEnsured = false
async function ensureSchemaTable() {
  if (schemaTableEnsured) return
  await PgPool.query(`CREATE TABLE IF NOT EXISTS tms_schema (
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

export class PgSchemaRepository implements ISchemaRepository {
  async findById(id: string, bucket?: string, dbName?: string): Promise<SchemaDTO | null> {
    await ensureSchemaTable()
    let sql = 'SELECT * FROM tms_schema WHERE id::text = $1'
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
    return row as SchemaDTO | null
  }

  async findByIds(ids: any[], options?: { projection?: any }): Promise<SchemaDTO[]> {
    await ensureSchemaTable()
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',')
    const idStrings = ids.map((id) => id.toString())
    const sql = `SELECT * FROM tms_schema WHERE id::text IN (${placeholders})`
    const result = await PgPool.query(sql, idStrings)
    return result.rows as SchemaDTO[]
  }

  async findByName(
    name: string,
    options?: { onlyProperties?: boolean; dbName?: string | null; scope?: string; bucket?: string }
  ): Promise<any> {
    await ensureSchemaTable()
    const { dbName = null, scope = 'document', bucket } = options || {}
    let sql = 'SELECT * FROM tms_schema WHERE name = $1 AND scope = $2'
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
    return row as SchemaDTO | null
  }

  async listSimple(dbName: string, scope = 'document', bucket?: string): Promise<SchemaDTO[]> {
    await ensureSchemaTable()
    let sql = 'SELECT id, title, description, scope, db_name, db_sysname FROM tms_schema'
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
    return result.rows as SchemaDTO[]
  }

  async deleteById(id: string, bucket?: string): Promise<boolean> {
    await ensureSchemaTable()
    let sql = 'DELETE FROM tms_schema WHERE id::text = $1'
    const params: any[] = [id]
    if (bucket) {
      sql += ' AND bucket = $2'
      params.push(bucket)
    }
    const result = await PgPool.query(sql, params)
    return result.rowCount !== null && result.rowCount > 0
  }
}
