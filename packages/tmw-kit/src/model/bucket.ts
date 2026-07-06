import { nanoid } from 'nanoid'
import dayjs from 'dayjs'
import Base from './base.js'
import { isFerretdb } from '../pg/pool.js'
import {
  MongoBucketRepository,
  PgBucketRepository,
  MongoBucketInviteRepository,
  PgBucketInviteRepository,
} from '../repo/index.js'
import type { IBucketRepository, IBucketInviteRepository } from '../repo/interfaces.js'

const BUCKET_NAME_RE = '^[a-zA-Z]+[0-9a-zA-Z_-]{0,63}$'

class Bucket extends Base {
  private get _bucketRepo(): IBucketRepository {
    return isFerretdb()
      ? new PgBucketRepository()
      : new MongoBucketRepository(this.mongoClient)
  }

  private get _inviteRepo(): IBucketInviteRepository {
    return isFerretdb()
      ? new PgBucketInviteRepository()
      : new MongoBucketInviteRepository(this.mongoClient)
  }

  async create(info): Promise<[boolean, any]> {
    const { name, title, description } = info

    // 检查名称格式
    if (!new RegExp(BUCKET_NAME_RE).test(name)) {
      return [
        false,
        '空间名必须以英文字母开头，仅限英文字母或_或-或数字组合，且最长64位',
      ]
    }

    // 查询是否存在同名存储空间
    const existBucket = await this._bucketRepo.findByName(name)
    if (existBucket) {
      return [false, '已存在同名存储空间']
    }

    info.creator = this.client.id

    try {
      const result = await this._bucketRepo.create(info)
      return [true, result]
    } catch (err: any) {
      return [false, err.message]
    }
  }

  async update(name: string, info): Promise<[boolean, any]> {
    const bucketInfo = await this._bucketRepo.findByName(name)
    if (!bucketInfo) return [false, '指定的存储空间不存在']
    if (this.client.id !== bucketInfo.creator)
      return [false, '没有权限']

    const updated = await this._bucketRepo.update(name, info)
    return updated ? [true, info] : [false, '更新失败']
  }

  async remove(name: string): Promise<[boolean, any]> {
    const ok = await this._bucketRepo.delete(name, this.client.id)
    return ok ? [true, 'ok'] : [false, '删除失败']
  }

  async list(): Promise<any[]> {
    return this._bucketRepo.findByCreatorOrCoworker(this.client.id)
  }

  async invite(bucketName: string, nickname: string): Promise<[boolean, any]> {
    const bucket = await this._bucketRepo.findByName(bucketName)
    if (!bucket) return [false, '指定的存储空间不存在']
    if (this.client.id !== bucket.creator)
      return [false, '没有权限']

    // 检查该用户是否已经是协作者
    const coworkers = bucket.coworkers || []
    const existing = coworkers.find((c) => c.nickname === nickname)
    if (existing)
      return [false, `用户【${nickname}】已经是授权用户，不能重复邀请`]

    // 检查是否有未过期的邀请
    const pendingInvite = await this._inviteRepo.findPending(bucketName, nickname)
    if (pendingInvite) {
      const newExpireAt = new Date(Date.now() + (3600 * 8 + 1800) * 1000)
      await this._inviteRepo.updateExpiry(pendingInvite._id, newExpireAt)
      return [true, pendingInvite.code]
    }

    // 生成唯一邀请码
    let tries = 0,
      existInvite
    let code = nanoid(4)
    while (tries <= 2) {
      existInvite = await this._inviteRepo.findByBucketAndCode(bucketName, code)
      if (!existInvite) break
      code = nanoid(4)
      tries++
    }
    if (existInvite) return [false, '无法生成有效的邀请码']

    const now = new Date()
    const createAt = new Date(now.getTime() + 3600 * 8 * 1000)
    const expireAt = new Date(createAt.getTime() + 1800 * 1000)

    const invite = {
      inviter: this.client.id,
      bucket: bucketName,
      code,
      createAt,
      expireAt,
      nickname,
    }

    try {
      await this._inviteRepo.create(invite)
      return [true, code]
    } catch (err: any) {
      return [false, err.message]
    }
  }

  async acceptInvite(
    bucketName: string,
    code: string,
    nickname: string,
    userId: string
  ): Promise<[boolean, any]> {
    const invite = await this._inviteRepo.findValid(
      bucketName,
      code,
      nickname,
      new Date()
    )
    if (!invite)
      return [
        false,
        '没有匹配的邀请，请确认邀请码、昵称是否正确，要求是否已过期',
      ]

    if (invite.acceptAt) return [false, '邀请码已经使用，不允许重复使用']

    const current = dayjs(new Date(Date.now() + 3600 * 8 * 1000))
    const acceptTime = current.format('YYYY-MM-DD HH:mm:ss')

    // 检查该用户是否已经是协作者
    const bucket = await this._bucketRepo.findByName(bucketName)
    const coworkerExists = (bucket?.coworkers || []).find(
      (c) => c.id === userId
    )
    if (coworkerExists) {
      await this._bucketRepo.updateCoworker(bucketName, userId, {
        nickname,
        change_time: acceptTime,
      })
    } else {
      await this._bucketRepo.addCoworker(bucketName, {
        id: userId,
        nickname,
        accept_time: acceptTime,
      })
    }

    try {
      await this._inviteRepo.accept(invite._id, userId, acceptTime)
      return [true, 'ok']
    } catch (err: any) {
      return [false, err.message]
    }
  }

  async removeCoworker(
    bucketName: string,
    coworkerId: string
  ): Promise<[boolean, any]> {
    const bucket = await this._bucketRepo.findByName(bucketName)
    if (!bucket) return [false, '指定的存储空间不存在']

    const coworkers = bucket.coworkers || []
    const existing = coworkers.find(
      (c) => c.id === coworkerId || String(c.id) === coworkerId
    )
    if (!existing) return [false, '指定的用户不存在']

    try {
      await this._bucketRepo.removeCoworker(bucketName, coworkerId)
      return [true, 'ok']
    } catch (err: any) {
      return [false, err.message]
    }
  }
}

export default Bucket
