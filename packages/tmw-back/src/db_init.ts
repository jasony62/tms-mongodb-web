import { MongoClient, MongoError } from 'mongodb'
import * as dayjs from 'dayjs'
import * as fs from 'fs'
import * as path from 'path'
import { nanoid } from 'nanoid'
import { program } from 'commander'

const debug = require('debug')('tmw:db_init')

const TMW_DEFAULT_CREATE_TIME = dayjs().format('YYYY-MM-DD HH:mm:ss')

class Mongo {
  host
  port
  username
  password

  constructor({ host, port, username, password }) {
    this.host = host
    this.port = port
    this.username = username
    this.password = password
  }

  connect(url) {
    return MongoClient.connect(url, {
      keepAliveInitialDelay: 1,
    })
      .then((client) => client)
      .catch((err) => {
        const msg = `数据库初始化-连接[${url}]失败：${err.message}`
        debug(msg)
        return Promise.reject(new MongoError(msg))
      })
  }
  async client() {
    let url
    if (
      this.username &&
      typeof this.username === 'string' &&
      this.password &&
      typeof this.password === 'string'
    ) {
      url = `mongodb://${this.username}:${this.password}@${this.host}:${this.port}`
    } else {
      url = `mongodb://${this.host}:${this.port}`
    }

    return await this.connect(url)
  }
}
/**
 * 数据库对象模板
 */
const DatabaseTemplate: any = {
  type: 'database',
  TMW_DEFAULT_CREATE_TIME,
}
/**
 * 文档定义模板
 */
const SchemaTemplate = {
  scope: 'document',
  tags: [],
  body: {
    required: false,
    groupable: false,
    dependencies: {},
    eventDependencies: {},
    readonly: false,
    default: '',
    type: 'object',
    properties: {},
  },
  type: 'schema',
  TMW_DEFAULT_CREATE_TIME,
}
/**
 * 集合对象模板
 */
const CollectionTemplate: any = {
  schema_tags: [],
  schema_default_tags: [],
  tags: [],
  usage: 0,
  custom: {
    docOperations: {
      create: true,
      edit: true,
      remove: true,
      editMany: true,
      removeMany: true,
      transferMany: true,
      import: true,
      export: true,
      copyMany: true,
    },
  },
  operateRules: {
    scope: {
      unrepeat: false,
    },
    unrepeat: {
      database: {},
      collection: {},
      primaryKeys: [],
      insert: false,
    },
  },
  type: 'collection',
  sysname: nanoid(10),
  TMW_DEFAULT_CREATE_TIME,
}
/**
 *
 */
class Handler {
  client
  cl
  options

  constructor(client: any, cl: any, options: any) {
    this.client = client
    this.cl = cl
    this.options = options
  }

  /**
   * 创建数据库
   */
  private async createDatabase(info) {
    if (!info.name) {
      debug('缺少要创建的数据库名称参数')
      process.exit(0)
    }

    let tpl = JSON.parse(JSON.stringify(DatabaseTemplate))
    tpl.name = info.name
    tpl.sysname = nanoid(10)

    if (info.title) tpl.title = info.title
    if (info.description) tpl.description = info.description
    if (info.bucket) tpl.bucket = info.bucket

    const query: any = { name: tpl.name, type: 'database' }
    if (info.bucket) query.bucket = info.bucket

    let db = await this.cl.findOne(query)
    if (!db) {
      await this.cl.insertOne(tpl)
      db = tpl
      debug(`创建数据库对象[name=${tpl.name}][sysname=${tpl.sysname}]`)
    } else {
      debug(
        `数据库[name=${tpl.name}][sysname=${tpl.sysname}]已经存在，不用新建`
      )
    }

    return db
  }

  /**
   * 创建文档列定义
   */
  private async createSchema(info) {
    if (!info && info !== 'object') {
      debug('缺少要创建的schema列定义')
      process.exit(0)
    }

    const query: any = { title: info.title, scope: 'document' }
    if (info.bucket) query.bucket = info.bucket

    let existSchema = await this.cl.findOne(query)
    if (existSchema) {
      if (this.options.allowReuseSchema === true) {
        debug(`标题为[${info.title}]的文档列定义已经存在，允许复用`)
        return existSchema._id
      } else {
        debug(
          `标题为[${info.title}]的文档列定义已经存在，不能重复创建，停止后续操作`
        )
        process.exit(0)
      }
    }

    let tpl = JSON.parse(JSON.stringify(SchemaTemplate))

    tpl.scope = 'document'
    if (info.title) tpl.title = info.title
    if (info.description) tpl.description = info.description
    tpl.body.properties = info.properties

    const { insertedId } = await this.cl.insertOne(tpl)

    if (!insertedId) {
      debug('缺少要创建的schema列定义')
      process.exit(0)
    }

    debug(`创建了文档列定义[id=${insertedId}]`)

    return insertedId
  }
  /**
   *
   * @param newDb
   * @param schemaId
   * @param info
   */
  private async createCollection(newDb: any, schemaId: string, info: any) {
    let tpl = JSON.parse(JSON.stringify(CollectionTemplate))

    // 检查集合名
    if (!info.name) {
      debug('缺少要创建的集合名称参数')
      return
    }
    if (new RegExp('^[a-zA-Z]+[0-9a-zA-Z_]{0,63}$').test(info.name) !== true) {
      debug('集合名必须以英文字母开头，仅限英文字母或_或数字组合，且最长64位')
      return
    }

    tpl.database = newDb.name
    tpl.db = {
      sysname: newDb.sysname,
      name: newDb.name,
    }
    tpl.schema_id = schemaId
    tpl.name = info.name
    tpl.sysname = nanoid(10)
    if (info.title) tpl.title = info.title
    if (info.description) tpl.description = info.description
    if (info.bucket) tpl.bucket = info.bucket

    // 查询是否存在同名集合
    // let query = { name: cl_info.name, type: 'collection' }
    let query: any = {
      $and: [{ name: tpl.name }, { type: 'collection' }],
    }

    if (info.bucket) query['$and'].push({ bucket: info.bucket })

    if (typeof tpl.db === 'object') {
      query['$and'].push({
        $or: [{ database: tpl.database }, { 'db.sysname': tpl.db.sysname }],
      })
    } else if (typeof tpl.db === 'string') {
      query['$and'].push({
        $or: [{ database: tpl.database }, { 'db.name': tpl.db }],
      })
    }

    const existCl = await this.cl.findOne(query)
    if (existCl) {
      debug(
        `数据库[name=${newDb.name}]中，已存在同名集合[name=${tpl.name}]，不用新建`
      )
      return existCl
    }

    // 在数据库中创建集合
    const mgdb = this.client.db(newDb.sysname)
    return mgdb.createCollection(tpl.sysname).then(() => {
      return this.cl.insertOne(tpl).then(() => {
        debug(
          `创建集合对象[db.name=${newDb.name}][db.sysname=${newDb.sysname}][name=${tpl.name}][sysname=${tpl.sysname}]`
        )
        return tpl
      })
    })
  }
  /**
   * 创建文档
   */
  private async createDocument(db, cl, docs) {
    if (!Array.isArray(docs) || docs.length === 0) {
      debug('没有提供有效的文档数据，结束创建文档操作')
      return 0
    }
    // 文档所在集合
    const docCl = this.client.db(db.sysname).collection(cl.sysname)

    /**检查集合中是否已经存在数据*/
    const total = await docCl.countDocuments()
    if (total > 0) {
      const msg = `[db=${db.sysname}][cl=${cl.sysname}]中已有[${total}]条文档`
      switch (this.options.docCreateMode) {
        case 'stop':
          debug(`${msg}，停止新建文档`)
          return 0
        case 'override':
          await docCl.deleteMany({})
          debug(`${msg}， 清除已有文档`)
          break
        case 'merge':
          debug(`${msg}， 添加新文档`)
          break
      }
    }

    let counter = 0
    for (const doc of docs) {
      const { insertedId } = await docCl.insertOne({
        ...doc,
        TMW_DEFAULT_CREATE_TIME,
      })
      debug(
        `在[db=${db.sysname}][cl=${cl.sysname}][id=${insertedId}]创建1条文档数据`
      )
      counter++
    }

    return counter
  }
  /**
   * 一条初始化数据包含1个数据库，1个文档定义，1个集合，和1组文档
   */
  private async parseOne(info) {
    /**
     * 创建数据库
     */
    const newDb = await this.createDatabase(info.db)
    /**
     * 创建schema
     */
    const schemaId = await this.createSchema(info.docSchema)
    /**
     * 创建结合
     */
    const newCl = await this.createCollection(newDb, schemaId, info.cl)
    /**
     * 插入文档
     */
    await this.createDocument(newDb, newCl, info.docs)
  }
  /**
   * 执行初始化操作
   */
  static async execute(filePath: string, mongoOptions: any, options: any) {
    const initData = require(filePath)

    const mongoObj = new Mongo(mongoOptions)
    const client = await mongoObj.client()
    const cl = client.db('tms_admin').collection('mongodb_object')

    const init = new Handler(client, cl, options)
    for (const data of initData) {
      await init.parseOne(data)
    }
    await client.close()
  }
}

async function start() {
  program.option('-u,--username <uname>', 'mongodb用户名')
  program.option('-p,--password <pwd>', 'mongodb口令')
  program.option('--host <url>', 'mongodb连接地址')
  program.option('--port <url>', 'mongodb连接端口')
  program.option('--file <path>', '初始化文件路径')
  program.option(
    '--allowReuseSchema',
    '当存在title相同的schema时允许继续操作。'
  )
  program.option(
    '--doc-create-mode <string>',
    '新建文档数据模式，stop：有数据就不执行；override：清除现有数据后新建；merge：直接新建'
  )
  program.parse()
  const options = program.opts()

  const {
    TMW_MONGODB_HOST,
    TMW_MONGODB_PORT,
    TMW_MONGODB_USER,
    TMW_MONGODB_PASSWORD,
    TMW_DB_INIT_ALLOW_REUSE_SCHEMA,
    TMW_DB_INIT_DOC_CREATE_MODE,
    TMW_DB_INIT_DATA_FILE,
  } = process.env

  /**mongodb连接参数*/
  const host = options.host
    ? options.host
    : TMW_MONGODB_HOST
    ? TMW_MONGODB_HOST
    : 'localhost'
  const port = options.port
    ? parseInt(options.port)
    : TMW_MONGODB_PORT
    ? parseInt(TMW_MONGODB_PORT)
    : 27017

  /**用户名和密码*/
  const username = options.username
    ? options.username
    : TMW_MONGODB_USER
    ? TMW_MONGODB_USER
    : false
  const password = options.password
    ? options.password
    : TMW_MONGODB_PASSWORD
    ? TMW_MONGODB_PASSWORD
    : false

  /**处理同名schema问题*/
  const allowReuseSchema =
    /yes|true/i.test(TMW_DB_INIT_ALLOW_REUSE_SCHEMA) ||
    options.allowReuseSchema === true

  /**新建文档模式*/
  let docCreateMode = options.docCreateMode
    ? options.docCreateMode
    : TMW_DB_INIT_DOC_CREATE_MODE
    ? TMW_DB_INIT_DOC_CREATE_MODE
    : 'stop'
  if (!/stop|override|merge/i.test(docCreateMode)) docCreateMode = 'stop'

  const dataFile = options.file ? options.file : TMW_DB_INIT_DATA_FILE
  if (typeof dataFile === 'string') {
    const filePath = path.resolve(dataFile)
    if (fs.existsSync(filePath)) {
      debug(`指定初始化数据文件：${filePath}`)
      await Handler.execute(
        filePath,
        { host, port, username, password },
        { allowReuseSchema, docCreateMode }
      )
      debug('完成初始化操作')
    } else {
      debug(`指定的初始数据文件【${filePath}】不存在`)
      process.exit(0)
    }
  } else {
    debug(`没有指定初始数据文件`)
    process.exit(0)
  }
}

start()
