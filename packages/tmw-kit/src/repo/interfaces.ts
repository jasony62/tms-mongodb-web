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

export type { AclTarget, AclUser, AclRight }
