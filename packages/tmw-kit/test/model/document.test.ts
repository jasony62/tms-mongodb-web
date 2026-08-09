import mongodb from 'mongodb'
import Document from '../../src/model/document.js'

const ObjectId = mongodb.ObjectId

const tmwCl = { db: { sysname: 'db1' }, sysname: 'cl1' }

function makeFakeCollection() {
  const stored: any[] = []
  const coll: any = {
    stored,
    async insertOne(doc: any) {
      if (!doc._id) doc._id = new ObjectId()
      stored.push(doc)
      return { acknowledged: true, insertedId: doc._id }
    },
    async insertMany(docs: any[]) {
      const insertedIds: Record<string, any> = {}
      docs.forEach((doc, index) => {
        if (!doc._id) doc._id = new ObjectId()
        stored.push(doc)
        insertedIds[`${index}`] = doc._id
      })
      return { acknowledged: true, insertedIds }
    },
  }
  return coll
}

function makeDocModel() {
  const collections = new Map()
  const mongoClient: any = {
    db(dbName: string) {
      return {
        collection(clName: string) {
          const key = `${dbName}.${clName}`
          if (!collections.has(key)) collections.set(key, makeFakeCollection())
          return collections.get(key)
        },
      }
    },
  }
  const model = new Document(mongoClient, null, { id: 'u1', isAdmin: true })
  return { model, mongoClient }
}

describe('Document.create', () => {
  test('空 _id 被移除，由数据库生成 ObjectId', async () => {
    const { model } = makeDocModel()
    const doc = await model.create(tmwCl, { _id: '', field01: 'abc' })

    expect(doc._id).toBeInstanceOf(ObjectId)
    expect(String(doc._id)).not.toBe('')
    expect(doc.field01).toBe('abc')
  })

  test('无 _id 时可正常创建', async () => {
    const { model } = makeDocModel()
    const doc = await model.create(tmwCl, { field01: 'abc' })

    expect(doc._id).toBeInstanceOf(ObjectId)
  })

  test('非空 _id 被保留', async () => {
    const { model } = makeDocModel()
    const doc = await model.create(tmwCl, { _id: 'custom-id', field01: 'abc' })

    expect(doc._id).toBe('custom-id')
  })
})

describe('Document.createMany', () => {
  test('行中空 _id 被移除，由数据库生成 ObjectId', async () => {
    const { model } = makeDocModel()
    const result = await model.createMany(tmwCl, [
      { _id: '', field01: 'a' },
      { _id: '', field01: 'b' },
    ])

    result.forEach((row: any) => {
      expect(row._id).toBeInstanceOf(ObjectId)
      expect(String(row._id)).not.toBe('')
    })
  })

  test('非空 _id 被保留', async () => {
    const { model } = makeDocModel()
    const result = await model.createMany(tmwCl, [
      { _id: 'keep-1', field01: 'a' },
      { field01: 'b' },
    ])

    expect(result[0]._id).toBe('keep-1')
    expect(result[1]._id).toBeInstanceOf(ObjectId)
  })
})
