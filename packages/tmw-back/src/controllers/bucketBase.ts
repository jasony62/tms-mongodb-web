import { Ctrl } from 'tms-koa'

class BucketBase extends Ctrl {
  constructor(...args) {
    super(...args)
  }
  async tmsBeforeEach() {
    const client = this["mongoClient"]
    const cl = client.db('tms_admin').collection('bucket')
    this["clBucket"] = cl
  }
}

export default BucketBase
