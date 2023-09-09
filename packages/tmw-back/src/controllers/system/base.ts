import { Ctrl } from 'tms-koa'
import { Helper } from 'tmw-kit/dist/ctrl/index.js'

class Base extends Ctrl {
  helper

  constructor(ctx, client, dbContext, mongoClient, pushContext, fsContext?) {
    super(ctx, client, dbContext, mongoClient, pushContext, fsContext)
    this.helper = new Helper(this)
  }

  get clPerset() {
    return this.helper.clPerset
  }
}

export default Base
