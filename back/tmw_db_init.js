const { MongoClient, MongoError } = require('mongodb')
const dayjs = require('dayjs')
const fs = require('fs')
const { nanoid } = require('nanoid')
const path = require('path')
const log4js = require("log4js")
const logger = log4js.getLogger('tmw-back-db_init')

const host = process.env.TMS_MONGODB_HOST || 'localhost'
const port = parseInt(process.env.TMS_MONGODB_PORT) || 27017
const user = process.env.TMS_MONGODB_USER || false
const password = process.env.TMS_MONGODB_PASSWORD || false

class Mongo {
  connect (url) {
    return MongoClient.connect(url, {
      useUnifiedTopology: true,
      keepAliveInitialDelay: 1,
    })
      .then((client) => client)
      .catch((err) => {
        const msg = `数据库初始化-连接[${url}]失败：${err.message}`
        logger.error(msg)
        return Promise.reject(new MongoError(msg))
      })
  }
  async client() {
    let url = `mongodb://${host}:${port}`
    if (user && typeof user === 'string' && password && typeof password === 'string') {
      url = `mongodb://${user}:${password}@${host}:${port}`
    }
    return await this.connect(url)
  }
}

class Init {
  // 创建文档列定义
  async schemaBase(schema_info, info, cl) {
    if (!info.schema && info.schema !== "object") {
      return [false, '缺少要创建的schema列定义']
    }
    schema_info.body.properties = info.schema

    if (info.schTitle) schema_info.title = info.schTitle
    if (info.schDescription) schema_info.description = info.schDescription

    const { insertedId } = await cl.insertOne(schema_info)
    if (insertedId) return [true, insertedId]
    return [false, '文档列定义创建失败']
  }
  // 创建数据库
  async dbBase(db_info, info, cl) {
    if (!info.clName) {
      return [false, '缺少要创建的数据库名称参数']
    }
    db_info.name = info.dbName

    if (info.dbTitle) db_info.title = info.dbTitle
    if (info.dbDescription) db_info.description = info.dbDescription
    if (info.bucket) db_info.bucket = info.bucket

    const query = { name: db_info.name, type: 'database' }
    if (info.bucket) query.bucket = info.bucket

    const existDb = await cl.findOne(query)
    if (!existDb) {
      cl.insertOne(db_info)
    }
  
    return [true, 'success']
  }

  // 创建集合
  async clBase(info, client, cl) {
    const DEFAULT_CREATE_TIME = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const db_info = {
      type: "database",
      sysname: nanoid(10),
      TMS_DEFAULT_CREATE_TIME: DEFAULT_CREATE_TIME,
    }
    const cl_info = {
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
          copyMany: true
        }
      },
      operateRules: {
        scope: {
          unrepeat: false
        },
        unrepeat: {
            database: {},
            collection: {},
            primaryKeys: [],
            insert: false
        }
      },
      type: "collection",
      sysname: nanoid(10),
      TMS_DEFAULT_CREATE_TIME: DEFAULT_CREATE_TIME,
    }
    const schema_info = {
      scope: "document",
      tags: [],
      body: {
        required: false,
        groupable: false,
        dependencies: {},
        eventDependencies: {},
        readonly: false,
        default: "",
        type: "object",
        properties: {}
      },
      type: "schema",
      TMS_DEFAULT_CREATE_TIME: DEFAULT_CREATE_TIME
    }
    const [dbState, dbMsg] = await this.dbBase(db_info, info, cl)
    if (!dbState) {
      logger.warn(dbMsg)
      return
    }

    cl_info.database = db_info.name
    cl_info.db = {
      sysname: db_info.sysname,
      name: db_info.name
    }

    if (!info.clName) {
      console.log('缺少要创建的集合名称参数')
      return
    }
    cl_info.name = info.clName

    if (info.clTitle) cl_info.title = info.clTitle
    if (info.clDescription) cl_info.description = info.clDescription
    if (info.bucket) cl_info.bucket = info.bucket

    // 检查集合名
    if (new RegExp('^[a-zA-Z]+[0-9a-zA-Z_]{0,63}$').test(cl_info.name) !== true) {
      logger.warn('集合名必须以英文字母开头，仅限英文字母或_或数字组合，且最长64位')
      return
    }
    // 查询是否存在同名集合
    // let query = { name: cl_info.name, type: 'collection' }
    let query = {"$and": [{name: cl_info.name}, {type: 'collection'}]}
    
    if (info.bucket) query["$and"].push({bucket: info.bucket})
    
    if (typeof cl_info.db === 'object') {
      query["$and"].push({"$or": [{database: cl_info.database}, {'db.sysname': cl_info.db.sysname}]})
    }else if (typeof cl_info.db === 'string') {
      query["$and"].push({"$or": [{database: cl_info.database}, {'db.name': cl_info.db}]})
    }

    const existCl = await cl.findOne(query)
    if (existCl) {
      logger.warn(`数据库[name=${db_info.name}]中，已存在同名集合[name=${cl_info.name}]`)
      return
    }
    
    // 创建schema
    const [schState, schMsg] = await this.schemaBase(schema_info, info, cl)
    if (!schState) {
      logger.warn(schMsg)
      return
    }
    cl_info.schema_id = schMsg

    const mgdb = client.db(db_info.sysname)
    return mgdb.createCollection(cl_info.sysname).then(() => {
      return cl.insertOne(cl_info).then(() => {
        logger.info(`数据库[name=${db_info.name}]、集合[name=${cl_info.name}]初始化完成`)
      })
    })
  }
}

(async function() {
  let cnfpath = path.resolve(process.cwd() + '/tmw_db_init_config.json')
  let data_init
  if (fs.existsSync(cnfpath)) {
    data_init = require(process.cwd() + '/tmw_db_init_config.json')
  } else {
    logger.warn(`[初始化数据库、集合的配置文件[${cnfpath}]不存在`)
    return
  }
  
  const mongoObj = new Mongo()
  const client = await mongoObj.client()
  const cl = client.db('tms_admin').collection('mongodb_object')

  const init = new Init()
  for (const data of data_init) {
    await init.clBase(data, client, cl)
  }

})()
