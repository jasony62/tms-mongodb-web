import { PgPool } from '../../pg/pool.js'
import { IBucketInviteRepository, InviteDTO } from '../interfaces.js'

let inviteTableEnsured = false
async function ensureInviteTable() {
  if (inviteTableEnsured) return
  await PgPool.query(`CREATE TABLE IF NOT EXISTS tms_bucket_invite_log (
    id SERIAL PRIMARY KEY,
    bucket VARCHAR(255) DEFAULT '',
    code VARCHAR(64) DEFAULT '',
    nickname VARCHAR(255) DEFAULT '',
    inviter VARCHAR(255) DEFAULT '',
    invitee VARCHAR(255) DEFAULT '',
    create_at TIMESTAMP DEFAULT NOW(),
    expire_at TIMESTAMP DEFAULT NOW(),
    accept_at TIMESTAMP,
    data JSONB DEFAULT '{}'
  )`)
  inviteTableEnsured = true
}

function mapRow(row: any): InviteDTO | null {
  if (!row) return null
  return {
    _id: row.id,
    bucket: row.bucket,
    code: row.code,
    nickname: row.nickname,
    inviter: row.inviter,
    invitee: row.invitee,
    createAt: row.create_at,
    expireAt: row.expire_at,
    acceptAt: row.accept_at ? String(row.accept_at) : undefined,
    ...row.data,
  }
}

export class PgBucketInviteRepository implements IBucketInviteRepository {
  async findPending(
    bucket: string,
    nickname: string
  ): Promise<InviteDTO | null> {
    await ensureInviteTable()
    const row = await PgPool.queryOne(
      'SELECT * FROM tms_bucket_invite_log WHERE bucket = $1 AND nickname = $2 AND accept_at IS NULL',
      [bucket, nickname]
    )
    return mapRow(row)
  }

  async findValid(
    bucket: string,
    code: string,
    nickname: string,
    now: Date
  ): Promise<InviteDTO | null> {
    await ensureInviteTable()
    const row = await PgPool.queryOne(
      'SELECT * FROM tms_bucket_invite_log WHERE bucket = $1 AND code = $2 AND nickname = $3 AND expire_at > $4 AND accept_at IS NULL',
      [bucket, code, nickname, now]
    )
    return mapRow(row)
  }

  async findByBucketAndCode(
    bucket: string,
    code: string
  ): Promise<InviteDTO | null> {
    await ensureInviteTable()
    const row = await PgPool.queryOne(
      'SELECT * FROM tms_bucket_invite_log WHERE bucket = $1 AND code = $2',
      [bucket, code]
    )
    return mapRow(row)
  }

  async create(invite: Partial<InviteDTO>): Promise<InviteDTO> {
    await ensureInviteTable()
    const row = await PgPool.queryOne(
      `INSERT INTO tms_bucket_invite_log (bucket, code, nickname, inviter, create_at, expire_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        invite.bucket || '',
        invite.code || '',
        invite.nickname || '',
        invite.inviter || '',
        invite.createAt || new Date(),
        invite.expireAt || new Date(),
      ]
    )
    return mapRow(row)!
  }

  async accept(
    inviteId: string,
    invitee: string,
    acceptAt: string
  ): Promise<boolean> {
    await ensureInviteTable()
    try {
      await PgPool.query(
        'UPDATE tms_bucket_invite_log SET invitee = $1, accept_at = $2::timestamp WHERE id::text = $3',
        [invitee, acceptAt, inviteId]
      )
      return true
    } catch {
      return false
    }
  }

  async updateExpiry(id: string, expireAt: Date): Promise<boolean> {
    await ensureInviteTable()
    try {
      await PgPool.query(
        'UPDATE tms_bucket_invite_log SET expire_at = $1 WHERE id::text = $2',
        [expireAt, id]
      )
      return true
    } catch {
      return false
    }
  }
}
