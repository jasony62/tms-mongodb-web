import { EtlRunner } from '../../src/etl/index.js'

function makeRunner(rules: any[]) {
  return new EtlRunner({
    destination: { db: 'db1', coll: 'cl1' },
    source: { db: 'db0', coll: 'cl0' },
    rules,
  })
}

describe('EtlRunner', () => {
  test('单文档转换', async () => {
    const runner = makeRunner([
      { src: '$.name', dst: 'title' },
      { src: '$.age', dst: 'info.age' },
    ])

    const result = await runner.run({ name: 'foo', age: 18 })

    expect(result).toEqual({ title: 'foo', info: { age: 18 } })
  })

  test('文档数组转换', async () => {
    const runner = makeRunner([{ src: '$.name', dst: 'title' }])

    const result = await runner.run([{ name: 'a' }, { name: 'b' }])

    expect(result).toEqual([{ title: 'a' }, { title: 'b' }])
  })

  test('规则未匹配时使用默认值', async () => {
    const runner = makeRunner([{ src: '$.missing', dst: 'm', default: 'd' }])

    const result = await runner.run({})

    expect(result).toEqual({ m: 'd' })
  })
})
