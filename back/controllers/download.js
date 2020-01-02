const { DownloadCtrl } = require('tms-koa/lib/controller/fs')

class download extends DownloadCtrl {
  constructor(...args) {
    super(...args)
  }
}

module.exports = download