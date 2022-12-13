import { MongoClient, MongoError } from 'mongodb'
import * as path from 'path'
import { program } from 'commander'
import { loadDataFrom } from 'tmw-kit/dist/util/database'
const debug = require('debug')('tmw:db_init')

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
    '--replaceExistingSchema',
    '当存在title相同的schema时用指定数据替换已有数据。'
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
    TMW_DB_INIT_REPLACE_EXISTING_SCHEMA,
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

  const replaceExistingSchema =
    /yes|true/i.test(TMW_DB_INIT_REPLACE_EXISTING_SCHEMA) ||
    options.replaceExistingSchema === true

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
    const mongoObj = new Mongo({ host, port, username, password })
    const client = await mongoObj.client()
    await loadDataFrom(filePath, client, {
      replaceExistingSchema,
      allowReuseSchema,
      docCreateMode,
    })
    await client.close()
  } else {
    debug(`没有指定初始数据文件`)
    process.exit(0)
  }
}

start()
