import SpreadsheetBase from '../spreadsheetBase.js'

class Spreadsheet extends SpreadsheetBase {
  constructor(ctx, client, dbContext, mongoClient, pushContext, fsContext?) {
    super(ctx, client, dbContext, mongoClient, pushContext, fsContext)
  }
  async byId() {
    return super.byId()
  }
  async list() {
    return super.list()
  }
  async create() {
    return super.create()
  }
  async save() {
    return super.save()
  }
}

export default Spreadsheet
