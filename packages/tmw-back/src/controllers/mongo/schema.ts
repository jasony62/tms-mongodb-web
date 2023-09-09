import SchemaBase from '../schemaBase.js'

class Schema extends SchemaBase {
  constructor(ctx, client, dbContext, mongoClient, pushContext, fsContext?) {
    super(ctx, client, dbContext, mongoClient, pushContext, fsContext)
  }
}

export default Schema
