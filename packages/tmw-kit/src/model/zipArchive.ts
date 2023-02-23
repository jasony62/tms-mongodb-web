import { LocalFS } from 'tms-koa/dist/model/fs/local'
import { Upload } from 'tms-koa/dist/model/fs/upload'
import * as PATH from 'path'
import * as fs from 'fs'
import * as archiver from 'archiver'

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

export function exportJSON(Context, domain, data, fileName, options) {
  const tmsFs = new LocalFS(Context, domain)
  const uploadObj = new Upload(tmsFs)

  let { forceReplace = 'Y', dir = '', outAmount } = options
  dir = dir ? tmsFs.fullpath(dir) : ''

  // 导出目录
  fileName = fileName ? fileName : uploadObj.autoname() + '.zip'
  let filePath = dir
    ? PATH.join(dir, fileName)
    : tmsFs.fullpath(PATH.join(uploadObj.autodir(), fileName))

  if (forceReplace === 'N') {
    // 如果文件已经存在
    if (fs.existsSync(filePath)) throw Error(`文件【${filePath}】已经存在`)
  }

  const space = filePath.replace('.zip', '')
  if (fs.existsSync(space)) {
    fs.rmSync(space, { recursive: true })
  }
  fs.mkdirSync(space, { recursive: true })

  // 数据写入文件
  if (outAmount === 'one') {
    fs.writeFileSync(PATH.join(space, `${fileName}.json`), JSON.stringify(data))
  } else if (outAmount === 'more') {
    data.forEach((d) => {
      fs.writeFileSync(PATH.join(space, `${d._id}.json`), JSON.stringify(d))
    })
  }

  // 打包成zip
  zipByArchive(space)

  return tmsFs.publicPath(filePath)
}
