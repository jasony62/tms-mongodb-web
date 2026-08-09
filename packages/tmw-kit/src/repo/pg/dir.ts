import { PgPool } from '../../pg/pool.js'
import { IDirRepository } from '../interfaces.js'

let dirTableEnsured = false
async function ensureDirTable() {
  if (dirTableEnsured) return
  await PgPool.query(`CREATE TABLE IF NOT EXISTS tmw_dir (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    full_name VARCHAR(500) NOT NULL,
    level INTEGER DEFAULT 1,
    title VARCHAR(255) DEFAULT '',
    description TEXT DEFAULT '',
    "order" INTEGER DEFAULT 99,
    scope VARCHAR(50) DEFAULT 'collection',
    db_sysname VARCHAR(255) DEFAULT '',
    db_name VARCHAR(255) DEFAULT '',
    bucket VARCHAR(255) DEFAULT ''
  )`)
  dirTableEnsured = true
}

export class PgDirRepository implements IDirRepository {
  async create(
    db: { sysname: string; name: string },
    info: { name: string; title?: string; description?: string; order?: number },
    parentFullName?: string,
    scope = 'collection',
    bucket?: string
  ): Promise<[boolean, any]> {
    await ensureDirTable()
    const fullName = parentFullName ? `${parentFullName}/${info.name}` : info.name
    const level = fullName.split('/').length
    try {
      const row = await PgPool.queryOne(
        `INSERT INTO tmw_dir (name, full_name, level, title, description, "order", scope, db_sysname, db_name, bucket)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [
          info.name,
          fullName,
          level,
          info.title || '',
          info.description || '',
          info.order ?? 99,
          scope,
          db.sysname,
          db.name,
          bucket || '',
        ]
      )
      return [true, row]
    } catch (err: any) {
      return [false, err.message]
    }
  }

  async update(
    id: string,
    info: { title?: string; description?: string; order?: number }
  ): Promise<[boolean, any]> {
    await ensureDirTable()
    try {
      const result = await PgPool.query(
        `UPDATE tmw_dir SET title = $1, description = $2, "order" = $3 WHERE id::text = $4`,
        [info.title || '', info.description || '', info.order ?? 99, id]
      )
      return [true, result]
    } catch (err: any) {
      return [false, err.message]
    }
  }

  async delete(id: string): Promise<[boolean, string | null]> {
    await ensureDirTable()
    try {
      await PgPool.query('DELETE FROM tmw_dir WHERE id::text = $1', [id])
      return [true, null]
    } catch (err: any) {
      return [false, err.message]
    }
  }

  async findById(id: string, db?: { sysname: string }): Promise<any> {
    await ensureDirTable()
    let sql = 'SELECT * FROM tmw_dir WHERE id::text = $1'
    const params: any[] = [id]
    if (db) {
      sql += ' AND db_sysname = $2'
      params.push(db.sysname)
    }
    return PgPool.queryOne(sql, params)
  }

  async findByFullName(
    db: { sysname: string } | string,
    fullName: string,
    scope = 'collection',
    bucket?: string
  ): Promise<any> {
    await ensureDirTable()
    let sql = 'SELECT * FROM tmw_dir WHERE full_name = $1 AND scope = $2'
    const params: any[] = [fullName, scope]
    if (typeof db === 'object') {
      sql += ' AND db_sysname = $' + (params.length + 1)
      params.push(db.sysname)
    } else if (typeof db === 'string') {
      sql += ' AND db_name = $' + (params.length + 1)
      params.push(db)
    }
    if (bucket) {
      sql += ' AND bucket = $' + (params.length + 1)
      params.push(bucket)
    }
    return PgPool.queryOne(sql, params)
  }

  async listChildren(
    db: { sysname: string } | string,
    fullName: string,
    scope = 'collection',
    bucket?: string
  ): Promise<any[]> {
    await ensureDirTable()
    let sql = "SELECT * FROM tmw_dir WHERE full_name LIKE $1 || '/%' AND scope = $2"
    const params: any[] = [fullName, scope]
    if (typeof db === 'object') {
      sql += ' AND db_sysname = $' + (params.length + 1)
      params.push(db.sysname)
    } else if (typeof db === 'string') {
      sql += ' AND db_name = $' + (params.length + 1)
      params.push(db)
    }
    if (bucket) {
      sql += ' AND bucket = $' + (params.length + 1)
      params.push(bucket)
    }
    const result = await PgPool.query(sql, params)
    return result.rows
  }

  async list(db: { name: string }, scope = 'collection'): Promise<[boolean, any[]]> {
    await ensureDirTable()
    const result = await PgPool.query(
      'SELECT * FROM tmw_dir WHERE db_name = $1 AND scope = $2 ORDER BY level ASC, "order" ASC',
      [db.name, scope]
    )
    return [true, result.rows]
  }
}
