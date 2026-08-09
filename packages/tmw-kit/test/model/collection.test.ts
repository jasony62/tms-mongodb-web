import { jest } from '@jest/globals'

jest.unstable_mockModule('../../src/pg/pool.js', () => ({
  isFerretdb: () => true,
  isMongodb: () => false,
  PgPool: {
    query: jest.fn(),
    queryOne(text: string, params?: any[]) {
      return Promise.resolve(this.query(text, params)).then(
        (r: any) => r.rows?.[0] || null
      )
    },
  },
}))

const { PgPool } = await import('../../src/pg/pool.js')
const { default: ModelCl } = await import('../../src/model/collection.js')

const dbRow = {
  id: 1,
  name: 'db001',
  sysname: 'db001',
  title: '测试库',
}
const clRow = {
  id: 1,
  name: 'cl0001',
  sysname: 'cl0001',
  title: '测试集合',
  type: 'collection',
  db_sysname: 'db001',
  db_name: 'db001',
  schema_id: '4',
}
const schemaRow = {
  id: 4,
  name: 'test_schema',
  parent_name: '',
  order: 1,
}

function mockQueryResults() {
  const queryMock = PgPool.query as jest.Mock
  queryMock.mockReset()
  queryMock.mockImplementation(async (sql: string) => {
    if (/FROM tmw_database/.test(sql) && /WHERE/.test(sql)) {
      return { rows: [dbRow] }
    }
    if (/COUNT\(\*\)/.test(sql)) {
      return { rows: [{ count: '1' }] }
    }
    if (/FROM tmw_collection/.test(sql)) {
      return { rows: [clRow] }
    }
    if (/FROM tmw_schema/.test(sql)) {
      return { rows: [schemaRow] }
    }
    return { rows: [] }
  })
}

function makeModel() {
  const model = new ModelCl(null as any, null as any, {
    id: 'u1',
    isAdmin: true,
  })
  return model
}

describe('ModelCl.list（FerretDB 存储）', () => {
  test('集合 schema_id 为整数时，不应抛出 ObjectId 异常', async () => {
    mockQueryResults()

    const model = makeModel()
    const result = await model.list('db001', undefined as any, undefined as any, 1, 25)

    expect(result.total).toBe(1)
    expect(result.collections).toHaveLength(1)
    expect(result.collections[0].schema_id).toBe('4')
    expect(result.collections[0].schema_name).toBe('test_schema')
    expect(result.collections[0].schema_parentName).toBe('')
    expect(result.collections[0].schema_order).toBe(1)
  })

  test('查询 schema 时不应引用 tmw_schema 中不存在的 mongo_id 列', async () => {
    mockQueryResults()

    const model = makeModel()
    await model.list('db001', undefined as any, undefined as any, 1, 25)

    const queryMock = PgPool.query as jest.Mock
    const schemaQuery = queryMock.mock.calls.find((c: any[]) =>
      /FROM tmw_schema/.test(c[0])
    )
    expect(schemaQuery[0]).not.toMatch(/mongo_id/)
    expect(schemaQuery[0]).toMatch(/FROM tmw_schema WHERE id::text IN/)
    expect(schemaQuery[1]).toEqual(['4'])
  })
})
