import { describe, expect, it } from 'vitest'
import { parseEdgeCsv } from './parseCsv'

describe('parseEdgeCsv', () => {
  it('parses first/second header rows into directed edges', () => {
    const csv = `first,second
user02,user01
user03,user01
`
    expect(parseEdgeCsv(csv)).toEqual([
      { source: 'user02', target: 'user01' },
      { source: 'user03', target: 'user01' },
    ])
  })

  it('accepts quoted fields and skips blank lines', () => {
    const csv = `"first","second"

"user04","user03"
`
    expect(parseEdgeCsv(csv)).toEqual([{ source: 'user04', target: 'user03' }])
  })

  it('rejects a file without first and second columns', () => {
    expect(() => parseEdgeCsv('from,to\na,b\n')).toThrow(/first/i)
  })

  it('rejects rows missing an endpoint', () => {
    expect(() => parseEdgeCsv('first,second\nuser01,\n')).toThrow(/empty/i)
  })
})
