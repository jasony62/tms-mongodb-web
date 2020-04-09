const { Ctrl, ResultData, ResultFault, ResultObjectNotFound } = require('tms-koa')
const glob = require("glob")
const _ = require('lodash')
const fs = require('fs')
const { LocalFS } = require('tms-koa/lib/model/fs/local')

class Upload extends Ctrl {
  constructor(...args) {
    super(...args)
  }
  /**
   * 上传单个文件
   */
  async upload() {
    if (!this.request.files || !this.request.files.file) {
        return new ResultFault('没有上传文件')
    }
    
    const file = this.request.files.file
    let fs = new LocalFS('upload')
    let filepath = await fs.writeStream(file.name, file)

    return new ResultData(filepath)
  }
  /**
   * 获取文件
   */
  async list() {
    let { dir, basename = '' } = this.request.body

    let fileConfig = require(process.cwd() + '/config/fs')
    let rootDir = _.get(fileConfig, ['local', 'rootDir'], '')
    rootDir = rootDir + '/upload'

    let path = dir ? (rootDir + '/' + dir) : rootDir
    let globInstance = await new glob.Glob(path + "/**/*+(" + basename + ")*", { matchBase: true, sync: true })

    let files = []
    for (let file of globInstance.found) {
      let stats = fs.lstatSync(file)
      if (stats.isFile()) {
        files.push({ name: file.replace(rootDir + '/', ''), size: stats.size, createTime: Math.floor(stats.birthtimeMs), path: file.replace(rootDir + '/', '') })
      }
    }

    return new ResultData({ files })
  }
}

module.exports = Upload