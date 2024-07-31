/**
 * mongodb数据库的ObjectId
 */
export type TMongoDbObjectId = {}
/**
 * 数据库访问控制权限
 */
export type TTmwDbAclRight = string[]
/**
 * 集合访问控制权限
 */
export type TTmwClAclRight = string[]
/**
 * tmw管理的数据库对象
 */
export type TTmwDb = {
  _id: TMongoDbObjectId
  creator: string
  sysname: string
  name: string
  aclCheck?: boolean
  asClAcl?: boolean
  right?: TTmwDbAclRight
}
/**
 * tmw管理的集合对象
 */
export type TTmwCl = {
  _id: TMongoDbObjectId
  creator: string
  name: string
  sysname: string
  db: {
    name: string
    sysname: string
  }
  schema_id: string
  schema_name?: string
  schema_parentName?: string
  schema_order?: number
  aclCheck?: boolean
  right?: TTmwClAclRight
}
