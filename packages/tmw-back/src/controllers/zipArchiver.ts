import * as _ from 'lodash'
import * as fs from 'fs'
import * as PATH from 'path'
import { LocalFS } from 'tms-koa/dist/model/fs/local'
import { Upload } from 'tms-koa/dist/model/fs/upload'
import { Context } from 'tms-koa'
import * as archiver from 'archiver'

const { AppContext, FsContext } = Context

/**
 * JSON文档打包控制器
 */
export class ZipCtrl {
  /**
   * 导出zip
   * @param {*} columns
   * @param {*} datas
   * @param {*} fileName
   * @param {*} options={} forceReplace=重复文件是否覆盖 ‘N’, dir= 自定义存储路径
   */
  _export(datas, fileName, options) {
    if (!datas) return [false, '参数错误']
    let { forceReplace = 'Y', dir = '' } = options

    const tmsFs = new LocalFS(this['domain'])
    const uploadObj = new Upload(tmsFs)

    dir = dir ? tmsFs.fullpath(dir) : ''

    // 导出目录
    fileName = fileName ? fileName : uploadObj.autoname() + '.zip'
    let filePath = dir
      ? PATH.join(dir, fileName)
      : tmsFs.fullpath(PATH.join(uploadObj.autodir(), fileName))
    if (forceReplace === 'N') {
      // 如果文件已经存在
      if (fs.existsSync(filePath)) {
        return [false, '文件已经存在']
      }
    }

    const space = filePath.replace('.zip', '')
    if (!fs.existsSync(space)) {
      fs.mkdirSync(space, { recursive: true })
    }

    // 数据写入json文件
    datas.forEach((data) => {
      fs.writeFileSync(space + '/' + data._id + '.json', JSON.stringify(data))
    })

    // 打包成zip
    this.zipByArchive(space)

    return [true, tmsFs.publicPath(filePath)]
  }
  /**
   * 打包工具-archiver
   */
  zipByArchive(space) {
    const archive = archiver.create('zip', { zlib: { level: 9 } })

    const output = fs.createWriteStream(space + '.zip')

    output.on('close', function () {
      console.log((archive.pointer() / 1024 / 1024).toFixed(2) + ' total MB')
    })
    output.on('end', function () {
      console.log('Data has been drained')
    })

    archive.on('error', function (err) {
      throw err
    })
    archive.pipe(output)

    archive.directory(space, false)
    archive.finalize()

    return 'success'
  }
}

ZipCtrl['init'] = (function () {
  if (!FsContext || !FsContext.insSync) return [false, '文件服务不可用']

  let _instance = new ZipCtrl()
  _instance['fsContext'] = FsContext.insSync()

  let excelDomainName = AppContext.insSync().excelDomainName
  if (excelDomainName) {
    if (!_instance['fsContext'].isValidDomain(excelDomainName))
      return [false, `指定的domain=${excelDomainName}不可用`]
    _instance['domain'] = _instance['fsContext'].getDomain(excelDomainName)
  } else
    _instance['domain'] = _instance['fsContext'].getDomain(
      _instance['fsContext'].defaultDomain
    )

  return [true, _instance]
})()

ZipCtrl['export'] = (datas, fileName = '', options = {}) => {
  let _instance = ZipCtrl['init']
  if (_instance[0] === false) return _instance

  _instance = _instance[1]
  return _instance._export(datas, fileName, options)
}

export default ZipCtrl
