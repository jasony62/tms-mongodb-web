import { PgPool } from '../../pg/pool.js'
import { ICollectionRepository } from '../interfaces.js'

let collectionTableEnsured = false
async function ensureCollectionTable() {
  if (collectionTableEnsured) return
  await PgPool.query(`CREATE TABLE IF NOT EXISTS tmw_collection (
    id SERIAL PRIMARY KEY,
    mongo_id VARCHAR(64) DEFAULT '',
    name VARCHAR(255) NOT NULL,
    sysname VARCHAR(255) NOT NULL,
    title VARCHAR(255) DEFAULT '',
    description TEXT DEFAULT '',
    type VARCHAR(50) DEFAULT 'collection',
    db_sysname VARCHAR(255) DEFAULT '',
    db_name VARCHAR(255) DEFAULT '',
    bucket VARCHAR(255) DEFAULT '',
    dir_full_name VARCHAR(500) DEFAULT '',
    schema_id VARCHAR(255) DEFAULT '',
    ext_schemas JSONB DEFAULT '[]',
    spreadsheet VARCHAR(50) DEFAULT '',
    "orderBy" JSONB DEFAULT '{}',
    acl_check BOOLEAN DEFAULT false,
    doc_acl_check BOOLEAN DEFAULT false,
    admin_only BOOLEAN DEFAULT false,
    tags JSONB DEFAULT '[]',
    doc_field_convert_rules JSONB DEFAULT '{}',
    extensions JSONB DEFAULT '{}',
    creator VARCHAR(255) DEFAULT '',
    created_at BIGINT DEFAULT 0,
    data JSONB DEFAULT '{}'
  )`)
  collectionTableEnsured = true
}

function mapRow(row: any): any {
  if (!row) return null
  return {
    _id: row.id,
    name: row.name,
    sysname: row.sysname,
    title: row.title,
    description: row.description,
    type: row.type,
    db: { sysname: row.db_sysname, name: row.db_name },
    bucket: row.bucket || undefined,
    dir_full_name: row.dir_full_name,
    schema_id: row.schema_id,
    ext_schemas: row.ext_schemas,
    spreadsheet: row.spreadsheet,
    orderBy: row.orderBy,
    aclCheck: row.acl_check,
    docAclCheck: row.doc_acl_check,
    adminOnly: row.admin_only,
    tags: row.tags,
    docFieldConvertRules: row.doc_field_convert_rules,
    extensions: row.extensions,
    creator: row.creator,
    created_at: row.created_at,
    ...row.data,
  }
}

export class PgCollectionRepository implements ICollectionRepository {
  async findById(
    tmwDb: { sysname: string } | string,
    id: string,
    bucket?: string
  ): Promise<any> {
    await ensureCollectionTable()
    let sql = 'SELECT * FROM tmw_collection WHERE (id::text = $1 OR mongo_id = $1) AND type = $2'
    let params: any[] = [id, 'collection']
    if (typeof tmwDb === 'object') {
      sql += ' AND db_sysname = $' + (params.length + 1)
      params.push(tmwDb.sysname)
    } else if (typeof tmwDb === 'string') {
      sql += ' AND db_name = $' + (params.length + 1)
      params.push(tmwDb)
    }
    if (bucket) {
      sql += ' AND bucket = $' + (params.length + 1)
      params.push(bucket)
    }
    const row = await PgPool.queryOne(sql, params)
    return mapRow(row)
  }

  async findByName(
    tmwDb: { sysname: string } | string,
    name: string,
    bucket?: string
  ): Promise<any> {
    await ensureCollectionTable()
    let sql = 'SELECT * FROM tmw_collection WHERE name = $1 AND type = $2'
    let params: any[] = [name, 'collection']
    if (typeof tmwDb === 'object') {
      sql += ' AND db_sysname = $' + (params.length + 1)
      params.push(tmwDb.sysname)
    } else if (typeof tmwDb === 'string') {
      sql += ' AND db_name = $' + (params.length + 1)
      params.push(tmwDb)
    }
    if (bucket) {
      sql += ' AND bucket = $' + (params.length + 1)
      params.push(bucket)
    }
    const row = await PgPool.queryOne(sql, params)
    return mapRow(row)
  }

  async findBySysname(
    db: { sysname: string },
    sysname: string,
    bucket?: string
  ): Promise<any> {
    await ensureCollectionTable()
    let sql =
      'SELECT * FROM tmw_collection WHERE sysname = $1 AND db_sysname = $2 AND type = $3'
    const params: any[] = [sysname, db.sysname, 'collection']
    if (bucket) {
      sql += ' AND bucket = $' + (params.length + 1)
      params.push(bucket)
    }
    const row = await PgPool.queryOne(sql, params)
    return mapRow(row)
  }

  async findBySchemaId(schemaId: string): Promise<any> {
    await ensureCollectionTable()
    const row = await PgPool.queryOne(
      'SELECT * FROM tmw_collection WHERE schema_id = $1 AND type = $2 LIMIT 1',
      [schemaId, 'collection']
    )
    return mapRow(row)
  }

  async countByName(
    dbName: string,
    name: string,
    bucket?: string
  ): Promise<number> {
    await ensureCollectionTable()
    let sql = 'SELECT COUNT(*) FROM tmw_collection WHERE name = $1 AND db_name = $2 AND type = $3'
    const params: any[] = [name, dbName, 'collection']
    if (bucket) {
      sql += ' AND bucket = $' + (params.length + 1)
      params.push(bucket)
    }
    const result = await PgPool.query(sql, params)
    return parseInt(result.rows[0]?.count || '0')
  }

  async countByDatabase(dbName: string, bucket?: string): Promise<number> {
    await ensureCollectionTable()
    let sql = 'SELECT COUNT(*) FROM tmw_collection WHERE db_name = $1 AND type = $2'
    const params: any[] = [dbName, 'collection']
    if (bucket) {
      sql += ' AND bucket = $' + (params.length + 1)
      params.push(bucket)
    }
    const result = await PgPool.query(sql, params)
    return parseInt(result.rows[0]?.count || '0')
  }

  async rename(
    dbName: string,
    oldName: string,
    newName: string,
    bucket?: string
  ): Promise<boolean> {
    await ensureCollectionTable()
    let sql = 'UPDATE tmw_collection SET name = $1 WHERE name = $2 AND db_name = $3 AND type = $4'
    const params: any[] = [newName, oldName, dbName, 'collection']
    if (bucket) {
      sql += ' AND bucket = $' + (params.length + 1)
      params.push(bucket)
    }
    const result = await PgPool.query(sql, params)
    return (result.rowCount ?? 0) > 0
  }

  async updateDbName(
    dbSysname: string,
    newName: string,
    bucket?: string
  ): Promise<void> {
    await ensureCollectionTable()
    let sql = 'UPDATE tmw_collection SET db_name = $1 WHERE db_sysname = $2 AND type = $3'
    const params: any[] = [newName, dbSysname, 'collection']
    if (bucket) {
      sql += ' AND bucket = $' + (params.length + 1)
      params.push(bucket)
    }
    await PgPool.query(sql, params)
  }

  async create(collection: any): Promise<any> {
    await ensureCollectionTable()
    const db = collection.db || {}
    const result = await PgPool.queryOne(
      `INSERT INTO tmw_collection (name, sysname, title, description, type, db_sysname, db_name, bucket, dir_full_name, schema_id, ext_schemas, spreadsheet, "orderBy", acl_check, doc_acl_check, admin_only, tags, doc_field_convert_rules, extensions, creator, created_at, data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22) RETURNING id`,
      [
        collection.name || '',
        collection.sysname || '',
        collection.title || '',
        collection.description || '',
        collection.type || 'collection',
        db.sysname || '',
        db.name || '',
        collection.bucket || '',
        collection.dir_full_name || '',
        collection.schema_id || '',
        JSON.stringify(collection.ext_schemas || []),
        collection.spreadsheet || '',
        JSON.stringify(collection.orderBy || {}),
        !!collection.aclCheck,
        !!collection.docAclCheck,
        !!collection.adminOnly,
        JSON.stringify(collection.tags || []),
        JSON.stringify(collection.docFieldConvertRules || {}),
        JSON.stringify(collection.extensions || {}),
        collection.creator || '',
        collection.created_at || 0,
        JSON.stringify({}),
      ]
    )
    return { _id: result.id, ...collection }
  }

  async update(id: string, info: any): Promise<[boolean, any]> {
    await ensureCollectionTable()
    const { _id, sysname, database, db, type, bucket, ...updatedInfo } = info
    try {
      const sets: string[] = []
      const params: any[] = []
      let idx = 0
      for (const [key, value] of Object.entries(updatedInfo)) {
        idx++
        switch (key) {
          case 'title':
          case 'description':
          case 'dir_full_name':
          case 'schema_id':
          case 'spreadsheet':
          case 'name':
            sets.push(`${key} = $${idx}`)
            params.push(value || '')
            break
          case 'ext_schemas':
          case 'tags':
          case 'orderBy':
          case 'docFieldConvertRules':
          case 'extensions':
            sets.push(`"${key}" = $${idx}`)
            params.push(JSON.stringify(value))
            break
          case 'aclCheck':
            sets.push(`acl_check = $${idx}`)
            params.push(!!value)
            break
          case 'docAclCheck':
            sets.push(`doc_acl_check = $${idx}`)
            params.push(!!value)
            break
          case 'adminOnly':
            sets.push(`admin_only = $${idx}`)
            params.push(!!value)
            break
        }
      }
      if (sets.length === 0) return [true, null]
      idx++
      params.push(id)
      await PgPool.query(
        `UPDATE tmw_collection SET ${sets.join(', ')} WHERE (id::text = $${idx} OR mongo_id = $${idx})`,
        params
      )
      return [true, null]
    } catch (err: any) {
      return [false, err.message]
    }
  }

  async delete(id: string): Promise<boolean> {
    await ensureCollectionTable()
    try {
      await PgPool.query(
        'DELETE FROM tmw_collection WHERE (id::text = $1 OR mongo_id = $1)',
        [id]
      )
      return true
    } catch {
      return false
    }
  }

  async list(
    dbSysname: string,
    dirFullName?: string,
    keyword?: string,
    skip?: number,
    limit?: number,
    bucket?: string
  ): Promise<{ collections: any[]; total: number } | any[]> {
    await ensureCollectionTable()
    let sql = 'SELECT * FROM tmw_collection WHERE db_sysname = $1 AND type = $2'
    const params: any[] = [dbSysname, 'collection']
    if (bucket) {
      sql += ' AND bucket = $' + (params.length + 1)
      params.push(bucket)
    }
    if (dirFullName) {
      // regexp match for "dirFullName" at start
      sql += ' AND (dir_full_name = $' + (params.length + 1) + " OR dir_full_name LIKE $" + (params.length + 1) + " || '/%')"
      params.push(dirFullName)
    }
    if (keyword) {
      sql += ' AND (name ILIKE $' + (params.length + 1) + " OR title ILIKE $" + (params.length + 1) + " OR description ILIKE $" + (params.length + 1) + ')'
      params.push('%' + keyword + '%')
    }

    // count
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*)')
    const countResult = await PgPool.query(countSql, params)

    sql += ' ORDER BY id DESC'
    if (typeof skip === 'number' && typeof limit === 'number') {
      sql += ' OFFSET $' + (params.length + 1) + ' LIMIT $' + (params.length + 2)
      params.push(skip, limit)
    }
    const result = await PgPool.query(sql, params)
    const items = result.rows.map(mapRow)

    if (typeof skip === 'number') {
      return { collections: items, total: parseInt(countResult.rows[0]?.count || '0') }
    }
    return items
  }

  async processCl(collections: any[], mongoClient: any, bucket?: any): Promise<any[]> {
    const schemaIds = collections
      .filter((cl) => cl.schema_id && typeof cl.schema_id === 'string')
      .map((cl) => cl.schema_id)

    if (schemaIds.length === 0) return collections

    const placeholders = schemaIds.map((_, i) => '$' + (i + 1)).join(',')
    const result = await PgPool.query(
      `SELECT * FROM tmw_schema WHERE id::text IN (${placeholders})`,
      schemaIds
    )
    const idToSchema: any = {}
    for (const row of result.rows) {
      idToSchema[row.id.toString()] = row
    }
    return collections.map((cl) => {
      if (!cl.schema_id) return cl
      const schema = idToSchema[cl.schema_id]
      if (!schema) return cl
      cl.schema_name = schema.name
      cl.schema_parentName = schema.parent_name
      cl.schema_order = schema.order
      return cl
    })
  }
}
