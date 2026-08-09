import { PgPool } from '../../pg/pool.js'
import { ITagRepository } from '../interfaces.js'

let tagTableEnsured = false
async function ensureTagTable() {
  if (tagTableEnsured) return
  await PgPool.query(`CREATE TABLE IF NOT EXISTS tmw_tag (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    bucket VARCHAR(255) DEFAULT '',
    type VARCHAR(50) DEFAULT 'tag',
    UNIQUE(name, bucket)
  )`)
  tagTableEnsured = true
}

export class PgTagRepository implements ITagRepository {
  async create(info: { name: string; bucket?: string }): Promise<any> {
    await ensureTagTable()
    const row = await PgPool.queryOne(
      `INSERT INTO tmw_tag (name, bucket, type) VALUES ($1, $2, 'tag') RETURNING id`,
      [info.name, info.bucket || '']
    )
    return row
  }

  async update(
    id: string,
    bucketName: string | undefined,
    info: any
  ): Promise<any> {
    await ensureTagTable()
    const params: any[] = []
    const sets: string[] = []
    if (info.name) {
      sets.push('name = $' + (params.length + 1))
      params.push(info.name)
    }
    if (sets.length === 0) return
    params.push(id)
    params.push(bucketName || '')
    let sql = 'UPDATE tmw_tag SET ' + sets.join(', ')
    sql += ' WHERE id::text = $' + (params.length - 1)
    sql += ' AND bucket = $' + params.length
    await PgPool.query(sql, params)
  }

  async remove(name: string, bucketName?: string): Promise<any> {
    await ensureTagTable()
    const params: any[] = [name]
    let sql = 'DELETE FROM tmw_tag WHERE name = $1'
    if (bucketName) {
      sql += ' AND bucket = $2'
      params.push(bucketName)
    }
    return PgPool.query(sql, params)
  }

  async findByName(name: string, bucketName?: string): Promise<any> {
    await ensureTagTable()
    let sql = 'SELECT id, name, bucket, type FROM tmw_tag WHERE name = $1'
    const params: any[] = [name]
    if (bucketName) {
      sql += ' AND bucket = $2'
      params.push(bucketName)
    }
    return PgPool.queryOne(sql, params)
  }

  async list(bucketName?: string): Promise<any[]> {
    await ensureTagTable()
    let sql = 'SELECT id, name, bucket, type FROM tmw_tag'
    const params: any[] = []
    if (bucketName) {
      sql += ' WHERE bucket = $1'
      params.push(bucketName)
    }
    sql += ' ORDER BY id ASC'
    const result = await PgPool.query(sql, params)
    return result.rows
  }

  async checkInUse(name: string): Promise<boolean> {
    await ensureTagTable()
    const row = await PgPool.queryOne(
      'SELECT 1 FROM mongodb_object WHERE tags @> $1::jsonb AND type = $2 LIMIT 1',
      [JSON.stringify([name]), 'schema']
    )
    return !!row
  }
}
