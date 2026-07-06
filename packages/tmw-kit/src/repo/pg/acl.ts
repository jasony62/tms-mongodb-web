import { PgPool } from '../../pg/pool.js'
import { IAclRepository } from '../interfaces.js'
import type { AclTarget, AclUser, AclRight } from '../interfaces.js'

let aclTableEnsured = false
async function ensureAclTable() {
  if (aclTableEnsured) return
  await PgPool.query(`CREATE TABLE IF NOT EXISTS mongodb_object_acl (
    id SERIAL PRIMARY KEY,
    target_id VARCHAR(255) NOT NULL,
    target_type VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    user_remark VARCHAR(255) DEFAULT '',
    rights JSONB DEFAULT '[]'::jsonb,
    UNIQUE(target_id, target_type, user_id)
  )`)
  aclTableEnsured = true
}

export class PgAclRepository implements IAclRepository {
  async add(
    target: AclTarget,
    user: AclUser,
    right: AclRight = []
  ): Promise<[boolean, any?]> {
    await ensureAclTable()
    const existing = await PgPool.queryOne(
      'SELECT 1 FROM mongodb_object_acl WHERE target_id = $1 AND target_type = $2',
      [target.id, target.type]
    )
    const row = await PgPool.queryOne(
      `INSERT INTO mongodb_object_acl (target_id, target_type, user_id, user_remark, rights)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT (target_id, target_type, user_id) DO NOTHING
       RETURNING id`,
      [target.id, target.type, user.id, user.remark || '', JSON.stringify(right)]
    )
    if (row) {
      if (!existing) return [true, { id: row.id.toString() }]
      return [true, { right: [] }]
    }
    return [false]
  }

  async remove(target: AclTarget, user: AclUser): Promise<[boolean, string?]> {
    await ensureAclTable()
    const result = await PgPool.query(
      'DELETE FROM mongodb_object_acl WHERE target_id = $1 AND target_type = $2 AND user_id = $3',
      [target.id, target.type, user.id]
    )
    if (result.rowCount && result.rowCount > 0) return [true]
    return [false, '没有匹配的授权列表']
  }

  async update(
    target: AclTarget,
    user: AclUser,
    data: any
  ): Promise<[boolean, string?]> {
    if (!data || typeof data !== 'object')
      return [false, '没有指定要更新的数据']
    await ensureAclTable()
    const { right } = data
    const result = await PgPool.query(
      `UPDATE mongodb_object_acl SET rights = $1::jsonb, user_remark = $2
       WHERE target_id = $3 AND target_type = $4 AND user_id = $5`,
      [JSON.stringify(right), user.remark || '', target.id, target.type, user.id]
    )
    if (result.rowCount && result.rowCount > 0) return [true]
    return [false, '没有匹配的授权列表']
  }

  async check(target: AclTarget, user: AclUser): Promise<string[] | null> {
    await ensureAclTable()
    const row = await PgPool.queryOne(
      'SELECT rights FROM mongodb_object_acl WHERE target_id = $1 AND target_type = $2 AND user_id = $3',
      [target.id, target.type, user.id]
    )
    return row ? row.rights : null
  }

  async clean(target: AclTarget): Promise<[boolean, string?]> {
    await ensureAclTable()
    const result = await PgPool.query(
      'DELETE FROM mongodb_object_acl WHERE target_id = $1 AND target_type = $2',
      [target.id, target.type]
    )
    if (result.rowCount && result.rowCount > 0) return [true]
    return [false, '未执行清除授权对象操作，请检查数据是否有效']
  }

  async targetByUser(
    target: Partial<AclTarget>,
    user: AclUser
  ): Promise<{ [key: string]: string[] }> {
    await ensureAclTable()
    const result = await PgPool.query(
      'SELECT target_id FROM mongodb_object_acl WHERE target_type = $1 AND user_id = $2',
      [target.type, user.id]
    )
    if (result.rows.length === 0) return { [target.type!]: [] }
    return { [target.type!]: result.rows.map((r) => r.target_id) }
  }

  async list(
    target: Partial<AclTarget>,
    options = { nonexistentAsFault: false }
  ): Promise<[boolean, string | any[]]> {
    await ensureAclTable()
    const result = await PgPool.query(
      'SELECT user_id, user_remark, rights FROM mongodb_object_acl WHERE target_id = $1 AND target_type = $2 ORDER BY id ASC',
      [target.id, target.type]
    )
    if (result.rows.length === 0) {
      if (options.nonexistentAsFault) return [false, '没有匹配的授权列表']
      return [true, []]
    }
    const acl = result.rows.map((r) => ({
      user: { id: r.user_id, remark: r.user_remark },
      right: r.rights,
    }))
    return [true, acl]
  }
}
