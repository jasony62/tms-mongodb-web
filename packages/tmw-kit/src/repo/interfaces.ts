interface AclTarget {
  id: string
  type: string
}
interface AclUser {
  id: string
  remark?: string
}
type AclRight = string[]

export interface IAclRepository {
  add(
    target: AclTarget,
    user: AclUser,
    right?: AclRight
  ): Promise<[boolean, any?]>
  remove(target: AclTarget, user: AclUser): Promise<[boolean, string?]>
  update(
    target: AclTarget,
    user: AclUser,
    data: any
  ): Promise<[boolean, string?]>
  check(target: AclTarget, user: AclUser): Promise<string[] | null>
  clean(target: AclTarget): Promise<[boolean, string?]>
  targetByUser(
    target: Partial<AclTarget>,
    user: AclUser
  ): Promise<{ [key: string]: string[] }>
  list(
    target: Partial<AclTarget>,
    options?: { nonexistentAsFault: boolean }
  ): Promise<[boolean, string | any[]]>
}

export interface ITagRepository {
  create(info: { name: string; bucket?: string }): Promise<any>
  update(id: string, bucketName: string | undefined, info: any): Promise<any>
  remove(name: string, bucketName?: string): Promise<any>
  findByName(name: string, bucketName?: string): Promise<any>
  list(bucketName?: string): Promise<any[]>
  checkInUse(name: string): Promise<boolean>
}

/* ── Schema ── */

export interface SchemaDTO {
  _id: any
  type: string
  name: string
  title?: string
  description?: string
  body?: { properties: any }
  scope?: string
  db?: { name: string; sysname?: string }
  bucket?: string
  order?: number
  creator?: string
  [key: string]: any
}

export interface ISchemaRepository {
  findById(id: string, bucket?: string, dbName?: string): Promise<SchemaDTO | null>
  findByIds(
    ids: any[],
    options?: { projection?: any }
  ): Promise<SchemaDTO[]>
  findByName(
    name: string,
    options?: {
      onlyProperties?: boolean
      dbName?: string | null
      scope?: string
      bucket?: string
    }
  ): Promise<any>
  listSimple(
    dbName: string,
    scope?: string,
    bucket?: string
  ): Promise<SchemaDTO[]>
  deleteById(id: string, bucket?: string): Promise<boolean>
}

/* ── Database ── */

export interface DbDTO {
  _id: any
  type: string
  name: string
  sysname: string
  title?: string
  description?: string
  bucket?: string
  top?: number
  aclCheck?: boolean
  adminOnly?: boolean
  creator?: string
  created_at?: string
  updated_at?: string
  [key: string]: any
}

export interface IDbRepository {
  findByName(name: string, bucket?: string): Promise<DbDTO | null>
  findBySysname(sysname: string, bucket?: string): Promise<DbDTO | null>
  create(info: Partial<DbDTO>): Promise<DbDTO>
  update(id: string, info: Partial<DbDTO>): Promise<boolean>
  delete(sysname: string): Promise<boolean>
  list(
    keyword?: string,
    skip?: number,
    limit?: number,
    bucket?: string
  ): Promise<{ databases: DbDTO[]; total: number } | DbDTO[]>
}

/* ── Directory ── */

export interface IDirRepository {
  create(
    db: { sysname: string; name: string },
    info: { name: string; title?: string; description?: string; order?: number },
    parentFullName?: string,
    scope?: string,
    bucket?: string
  ): Promise<[boolean, any]>
  update(
    id: string,
    info: { title?: string; description?: string; order?: number }
  ): Promise<[boolean, any]>
  delete(id: string): Promise<[boolean, string | null]>
  findById(id: string, db?: { sysname: string }): Promise<any>
  findByFullName(
    db: { sysname: string } | string,
    fullName: string,
    scope?: string,
    bucket?: string
  ): Promise<any>
  listChildren(
    db: { sysname: string } | string,
    fullName: string,
    scope?: string,
    bucket?: string
  ): Promise<any[]>
  list(db: { name: string }, scope?: string): Promise<[boolean, any[]]>
}

/* ── Collection ── */

export interface ICollectionRepository {
  findById(
    tmwDb: { sysname: string } | string,
    id: string,
    bucket?: string
  ): Promise<any>
  findByName(
    tmwDb: { sysname: string } | string,
    name: string,
    bucket?: string
  ): Promise<any>
  findBySysname(
    db: { sysname: string },
    sysname: string,
    bucket?: string
  ): Promise<any>
  create(collection: any): Promise<any>
  update(id: string, info: any): Promise<[boolean, any]>
  delete(id: string): Promise<boolean>
  list(
    dbSysname: string,
    dirFullName?: string,
    keyword?: string,
    skip?: number,
    limit?: number,
    bucket?: string
  ): Promise<{ collections: any[]; total: number } | any[]>
  processCl(collections: any[], mongoClient: any, bucket?: any): Promise<any[]>
}

/* ── Bucket ── */

export interface BucketDTO {
  _id: any
  name: string
  title?: string
  description?: string
  creator?: string
  coworkers?: { id: string; nickname: string; accept_time?: string; change_time?: string }[]
  [key: string]: any
}

export interface IBucketRepository {
  findByName(name: string): Promise<BucketDTO | null>
  findById(id: string): Promise<BucketDTO | null>
  findByCreatorOrCoworker(userId: string): Promise<BucketDTO[]>
  create(info: Partial<BucketDTO>): Promise<BucketDTO>
  update(name: string, info: Partial<BucketDTO>): Promise<boolean>
  delete(name: string, creatorId: string): Promise<boolean>
  addCoworker(
    name: string,
    coworker: { id: string; nickname: string; accept_time?: string }
  ): Promise<boolean>
  updateCoworker(
    name: string,
    userId: string,
    data: { nickname?: string; change_time?: string }
  ): Promise<boolean>
  removeCoworker(name: string, userId: string): Promise<boolean>
}

/* ── Bucket Invite ── */

export interface InviteDTO {
  _id: any
  bucket: string
  code: string
  nickname: string
  inviter?: string
  invitee?: string
  createAt?: Date
  expireAt?: Date
  acceptAt?: string
  [key: string]: any
}

export interface IBucketInviteRepository {
  findPending(bucket: string, nickname: string): Promise<InviteDTO | null>
  findValid(
    bucket: string,
    code: string,
    nickname: string,
    now: Date
  ): Promise<InviteDTO | null>
  findByBucketAndCode(bucket: string, code: string): Promise<InviteDTO | null>
  create(invite: Partial<InviteDTO>): Promise<InviteDTO>
  accept(inviteId: string, invitee: string, acceptAt: string): Promise<boolean>
  updateExpiry(id: string, expireAt: Date): Promise<boolean>
}

export type { AclTarget, AclUser, AclRight }
