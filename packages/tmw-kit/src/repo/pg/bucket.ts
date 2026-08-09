import { PgPool } from '../../pg/pool.js'
import { IBucketRepository, BucketDTO } from '../interfaces.js'

let bucketTableEnsured = false
async function ensureBucketTable() {
  if (bucketTableEnsured) return
  await PgPool.query(`CREATE TABLE IF NOT EXISTS tmw_bucket (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(255) DEFAULT '',
    description TEXT DEFAULT '',
    creator VARCHAR(255) DEFAULT '',
    coworkers JSONB DEFAULT '[]',
    data JSONB DEFAULT '{}'
  )`)
  bucketTableEnsured = true
}

function mapRow(row: any): BucketDTO | null {
  if (!row) return null
  return {
    _id: row.id,
    name: row.name,
    title: row.title,
    description: row.description,
    creator: row.creator,
    coworkers: row.coworkers || [],
    ...row.data,
  }
}

export class PgBucketRepository implements IBucketRepository {
  async findByName(name: string): Promise<BucketDTO | null> {
    await ensureBucketTable()
    const row = await PgPool.queryOne(
      'SELECT * FROM tmw_bucket WHERE name = $1',
      [name]
    )
    return mapRow(row)
  }

  async findById(id: string): Promise<BucketDTO | null> {
    await ensureBucketTable()
    const row = await PgPool.queryOne(
      'SELECT * FROM tmw_bucket WHERE id::text = $1',
      [id]
    )
    return mapRow(row)
  }

  async findByCreatorOrCoworker(userId: string): Promise<BucketDTO[]> {
    await ensureBucketTable()
    const result = await PgPool.query(
      "SELECT * FROM tmw_bucket WHERE creator = $1 OR coworkers @> '[{\"id\":\"' || $1 || '\"}]'::jsonb",
      [userId]
    )
    return result.rows.map(mapRow).filter((r): r is BucketDTO => r !== null)
  }

  async create(info: Partial<BucketDTO>): Promise<BucketDTO> {
    await ensureBucketTable()
    const row = await PgPool.queryOne(
      `INSERT INTO tmw_bucket (name, title, description, creator, coworkers)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        info.name || '',
        info.title || '',
        info.description || '',
        info.creator || '',
        JSON.stringify(info.coworkers || []),
      ]
    )
    return mapRow(row)!
  }

  async update(name: string, info: Partial<BucketDTO>): Promise<boolean> {
    await ensureBucketTable()
    try {
      const sets: string[] = []
      const params: any[] = []
      let idx = 0
      if (info.title !== undefined) {
        idx++
        sets.push(`title = $${idx}`)
        params.push(info.title)
      }
      if (info.description !== undefined) {
        idx++
        sets.push(`description = $${idx}`)
        params.push(info.description)
      }
      if (sets.length === 0) return true
      idx++
      params.push(name)
      await PgPool.query(
        `UPDATE tmw_bucket SET ${sets.join(', ')} WHERE name = $${idx}`,
        params
      )
      return true
    } catch {
      return false
    }
  }

  async delete(name: string, creatorId: string): Promise<boolean> {
    await ensureBucketTable()
    try {
      const result = await PgPool.query(
        'DELETE FROM tmw_bucket WHERE name = $1 AND creator = $2',
        [name, creatorId]
      )
      return (result.rowCount || 0) > 0
    } catch {
      return false
    }
  }

  async addCoworker(
    name: string,
    coworker: { id: string; nickname: string; accept_time?: string }
  ): Promise<boolean> {
    await ensureBucketTable()
    try {
      await PgPool.query(
        `UPDATE tmw_bucket SET coworkers = coworkers || $1::jsonb WHERE name = $2`,
        [JSON.stringify([coworker]), name]
      )
      return true
    } catch {
      return false
    }
  }

  async updateCoworker(
    name: string,
    userId: string,
    data: { nickname?: string; change_time?: string }
  ): Promise<boolean> {
    await ensureBucketTable()
    try {
      const row = await PgPool.queryOne(
        'SELECT * FROM tmw_bucket WHERE name = $1',
        [name]
      )
      if (!row) return false
      const coworkers: any[] = row.coworkers || []
      const cwIdx = coworkers.findIndex(
        (c) => c.id === userId || String(c.id) === userId
      )
      if (cwIdx === -1) return false
      if (data.nickname !== undefined) coworkers[cwIdx].nickname = data.nickname
      if (data.change_time !== undefined)
        coworkers[cwIdx].change_time = data.change_time
      await PgPool.query(
        'UPDATE tmw_bucket SET coworkers = $1 WHERE name = $2',
        [JSON.stringify(coworkers), name]
      )
      return true
    } catch {
      return false
    }
  }

  async removeCoworker(name: string, userId: string): Promise<boolean> {
    await ensureBucketTable()
    try {
      // Read current coworkers, filter out the target, write back
      const row = await PgPool.queryOne(
        'SELECT * FROM tmw_bucket WHERE name = $1',
        [name]
      )
      if (!row) return false
      const coworkers: any[] = (row.coworkers || []).filter(
        (c: any) => c.id !== userId && String(c.id) !== userId
      )
      await PgPool.query(
        'UPDATE tmw_bucket SET coworkers = $1 WHERE name = $2',
        [JSON.stringify(coworkers), name]
      )
      return true
    } catch {
      return false
    }
  }
}
