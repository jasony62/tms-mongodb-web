import { PgPool } from '../../pg/pool.js'
import { IDbRepository } from '../interfaces.js'
import type { DbDTO } from '../interfaces.js'

let dbTableEnsured = false
async function ensureDbTable() {
  if (dbTableEnsured) return
  await PgPool.query(`CREATE TABLE IF NOT EXISTS tmw_database (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    sysname VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(255) DEFAULT '',
    description TEXT DEFAULT '',
    bucket VARCHAR(255) DEFAULT '',
    top INTEGER DEFAULT 0,
    acl_check BOOLEAN DEFAULT false,
    admin_only BOOLEAN DEFAULT false,
    creator VARCHAR(255) DEFAULT '',
    created_at VARCHAR(50) DEFAULT '',
    updated_at VARCHAR(50) DEFAULT ''
  )`)
  dbTableEnsured = true
}

export class PgDbRepository implements IDbRepository {
  async findByName(name: string, bucket?: string): Promise<DbDTO | null> {
    await ensureDbTable()
    let sql = 'SELECT * FROM tmw_database WHERE name = $1'
    const params: any[] = [name]
    if (bucket) {
      sql += ' AND bucket = $2'
      params.push(bucket)
    }
    const row = await PgPool.queryOne(sql, params)
    return row as DbDTO | null
  }

  async findBySysname(sysname: string, bucket?: string): Promise<DbDTO | null> {
    await ensureDbTable()
    let sql = 'SELECT * FROM tmw_database WHERE sysname = $1'
    const params: any[] = [sysname]
    if (bucket) {
      sql += ' AND bucket = $2'
      params.push(bucket)
    }
    const row = await PgPool.queryOne(sql, params)
    return row as DbDTO | null
  }

  async create(info: Partial<DbDTO>): Promise<DbDTO> {
    await ensureDbTable()
    const row = await PgPool.queryOne(
      `INSERT INTO tmw_database (name, sysname, title, description, bucket, top, acl_check, admin_only, creator, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        info.name || '',
        info.sysname || '',
        info.title || '',
        info.description || '',
        info.bucket || '',
        info.top || 0,
        info.aclCheck || false,
        info.adminOnly || false,
        info.creator || '',
        info.created_at || '',
      ]
    )
    return row as DbDTO
  }

  async update(id: string, info: Partial<DbDTO>): Promise<boolean> {
    await ensureDbTable()
    const params: any[] = []
    const sets: string[] = []
    for (const [key, value] of Object.entries(info)) {
      if (key === '_id' || key === 'type') continue
      sets.push(`${key} = $${params.length + 1}`)
      params.push(value)
    }
    if (sets.length === 0) return true
    params.push(id)
    const sql = `UPDATE tmw_database SET ${sets.join(', ')} WHERE id::text = $${params.length}`
    const result = await PgPool.query(sql, params)
    return result.rowCount !== null && result.rowCount > 0
  }

  async delete(sysname: string): Promise<boolean> {
    await ensureDbTable()
    const result = await PgPool.query('DELETE FROM tmw_database WHERE sysname = $1', [sysname])
    return result.rowCount !== null && result.rowCount > 0
  }

  async list(
    keyword?: string,
    skip?: number,
    limit?: number,
    bucket?: string
  ): Promise<{ databases: DbDTO[]; total: number } | DbDTO[]> {
    await ensureDbTable()
    let sql = 'SELECT * FROM tmw_database'
    const params: any[] = []
    const conditions: string[] = []

    if (bucket) {
      conditions.push('bucket = $' + (params.length + 1))
      params.push(bucket)
    }
    if (keyword) {
      const kw = keyword.replace(/[()]/g, '\\$&')
      conditions.push(
        '(name ILIKE $' + (params.length + 1) +
        ' OR title ILIKE $' + (params.length + 1) +
        ' OR description ILIKE $' + (params.length + 1) + ')'
      )
      params.push(`%${kw}%`)
    }

    if (conditions.length) {
      sql += ' WHERE ' + conditions.join(' AND ')
    }
    sql += ' ORDER BY top DESC, id DESC'

    if (typeof skip === 'number') {
      const countResult = await PgPool.query('SELECT COUNT(*) FROM (' + sql + ') AS sub', params)
      const total = parseInt(countResult.rows[0]?.count || '0')
      sql += ' OFFSET $' + (params.length + 1)
      params.push(skip)
      sql += ' LIMIT $' + (params.length + 1)
      params.push(limit)
      const result = await PgPool.query(sql, params)
      return { databases: result.rows as DbDTO[], total }
    }

    const result = await PgPool.query(sql, params)
    return result.rows as DbDTO[]
  }
}
