/**
 * Compile components
 */
const fs = require('fs-extra')
const path = require('path')
const shell = require('shelljs')
const signale = require('signale')
const { Signale } = signale

const libDir = path.join(__dirname, '../dist/lib')
const srcDir = path.join(__dirname, '../src/online-libs')

const VUE_APP_BASE_URL = process.env.VUE_APP_BASE_URL ? process.env.VUE_APP_BASE_URL : '/order/sale'

const isDir = dir => fs.lstatSync(dir).isDirectory()
const isCode = path => /\.vue$/.test(path)

function compile(dir) {
  const files = fs.readdirSync(dir)

  files.forEach(file => {
    const filePath = path.join(dir, file)

    // remove unnecessary files
    if (!isCode(file)) {
      return fs.removeSync(filePath)
    }

    // scan dir
    if (isDir(filePath)) {
      return compile(filePath)
    }
    let relativePath = filePath.replace(process.cwd(), '.')
    let compName = relativePath.match(/([^/]+?).vue$/)[1]
    const task = `vue-cli-service build --target lib --formats umd,umd-min --dest ./dist${VUE_APP_BASE_URL}/lib/${compName} --name index ${relativePath}`

    signale.start(`build: ${compName}`)

    const interactive = new Signale({ interactive: true })
    interactive.pending(`build: ${compName}`)
    const result = shell.exec(`${task}`)
    if (result.code !== 0) {
      interactive.error(task)
    } else {
      interactive.success(`build: ${compName}`)
    }
  })
}

// clear dir
fs.emptyDirSync(libDir)

// compile lib
compile(srcDir)