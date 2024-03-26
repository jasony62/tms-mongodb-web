import { LocalFS } from 'tms-koa/dist/model/fs/local.js'
import { Upload } from 'tms-koa/dist/model/fs/upload.js'
import PATH from 'path'
import fs from 'fs'
import archiver from 'archiver'

function zipByArchive(space) {
  const archive = archiver.create('zip', { zlib: { level: 9 } })

  const output = fs.createWriteStream(space + '.zip')

  // output.on('close', function () {
  //   console.log((archive.pointer() / 1024 / 1024).toFixed(2) + ' total MB')
  // })
  // output.on('end', function () {
  //   console.log('Data has been drained')
  // })

  archive.on('error', function (err) {
    throw err
  })
  archive.pipe(output)

  archive.directory(space, false)
  archive.finalize()

  return true
}
/**
 *
 * @param Context
 * @param domain
 * @param data
 * @param fileName
 * @param options
 * @returns
 */
export function exportJSON(Context, domain, data, fileName, options) {
  const tmsFs = new LocalFS(Context, domain)
  const uploadObj = new Upload(tmsFs)

  let { forceReplace = 'Y', dir = '', outAmount = 'one' } = options
  dir = dir ? tmsFs.pathWithRoot(dir) : ''

  // 导出目录
  fileName = fileName ? fileName : uploadObj.autoname() + '.zip'
  let filePath = dir
    ? PATH.join(dir, fileName)
    : tmsFs.pathWithRoot(PATH.join(uploadObj.autodir(), fileName))

  if (forceReplace === 'N') {
    // 如果文件已经存在
    if (fs.existsSync(filePath)) throw Error(`文件【${filePath}】已经存在`)
  }

  // 删除已经存在的打包文件
  if (fs.existsSync(filePath)) fs.rmSync(filePath)
  // 删除用于存放多个文件的目录
  const space = filePath.replace('.zip', '')
  if (fs.existsSync(space)) fs.rmSync(space, { recursive: true })

  // 创建保存要压缩的文件的目录
  fs.mkdirSync(space, { recursive: true })
  // 数据写入文件
  if (outAmount === 'one') {
    fs.writeFileSync(
      PATH.join(space, `${fileName.replace('zip', 'json')}`),
      JSON.stringify(data)
    )
  } else if (outAmount === 'more') {
    data.forEach((d) => {
      fs.writeFileSync(PATH.join(space, `${d._id}.json`), JSON.stringify(d))
    })
  }

  // 打包成zip
  zipByArchive(space)

  return tmsFs.pathWithPrefix(filePath)
}
