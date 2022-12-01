import { EtlRunner } from '../../src/etl'
import * as RandExp from 'randexp'

describe('集合建ETL', () => {
  it('单属性映射——字符串到字符串', async () => {
    const randexp = new RandExp(/[a-z]{6}/)
    let val = randexp.gen()
    let rules = [{ dst: 'a', src: 'A' }]
    let source = { A: val }
    let runner = new EtlRunner({ rules })
    let target = await runner.run(source)
    expect(target).toMatchObject({ a: val })
  })
  it('单属性映射——数字到数字', async () => {
    let val = Math.floor(Math.random() * 1000)
    let rules = [{ dst: 'b', src: 'B' }]
    let source = { B: val }
    let runner = new EtlRunner({ rules })
    let target = await runner.run(source)
    expect(target).toMatchObject({ b: val })
  })
  it('单属性映射——布尔到布尔', async () => {
    let val = Math.random() > 0.5
    let rules = [{ dst: 'c', src: 'C' }]
    let source = { C: val }
    let runner = new EtlRunner({ rules })
    let target = await runner.run(source)
    expect(target).toMatchObject({ c: val })
  })
  it('简单多单属性映射', async () => {
    let rules = [
      { dst: 'a', src: 'A' },
      { dst: 'b', src: 'B' },
      { dst: 'c', src: 'C' },
    ]
    let source: any = {}

    const randexp = new RandExp(/[a-z]{6}/)
    let val1: any = randexp.gen()
    source.A = val1
    let val2 = Math.floor(Math.random() * 1000)
    source.B = val2
    let val3 = Math.random() > 0.5
    source.C = val3

    let runner = new EtlRunner({ rules })
    let target = await runner.run(source)

    expect(target).toMatchObject({ a: val1, b: val2, c: val3 })
  })
  it('源数据路径多级', async () => {
    const randexp = new RandExp(/[a-z]{6}/)
    let val = randexp.gen()
    let rules = [{ dst: 'abc', src: 'A.B.C' }]
    let source = { A: { B: { C: val } } }
    let runner = new EtlRunner({ rules })
    let target = await runner.run(source)
    expect(target).toMatchObject({ abc: val })
  })
  it('目标数据路径多级', async () => {
    const randexp = new RandExp(/[a-z]{6}/)
    let val = randexp.gen()
    let rules = [{ dst: 'a.b.c', src: 'ABC' }]
    let source = { ABC: val }
    let runner = new EtlRunner({ rules })
    let target = await runner.run(source)
    expect(target).toMatchObject({ a: { b: { c: val } } })
  })
  it('使用默认值', async () => {
    const randexp = new RandExp(/[a-z]{6}/)
    let val = randexp.gen()
    let rules = [
      { dst: 'a', src: 'A', default: val },
      { dst: 'b', src: 'B', default: 0 },
      { dst: 'c', src: 'C', default: false },
    ]
    let source = {}
    let runner = new EtlRunner({ rules })
    let target = await runner.run(source)
    expect(target).toMatchObject({ a: val, b: 0, c: false })
  })
})
