import TagBase from '../tagBase.js'

class Tag extends TagBase {
  constructor(ctx, client, dbContext, mongoClient, pushContext, fsContext?) {
    super(ctx, client, dbContext, mongoClient, pushContext, fsContext)
  }
}

export default Tag
