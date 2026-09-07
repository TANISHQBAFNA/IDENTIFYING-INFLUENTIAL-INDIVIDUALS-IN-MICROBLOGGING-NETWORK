import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { analyzeNetwork } from './analyze'
import { parseEdgeCsv } from './parseCsv'

const sampleCsv = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../../data/sample_network.csv'),
  'utf8',
)

describe('analyzeNetwork', () => {
  it('computes in/out degree and scaled prestige on a tiny directed graph', () => {
    const result = analyzeNetwork([
      { source: 'A', target: 'B' },
      { source: 'A', target: 'C' },
      { source: 'B', target: 'C' },
      { source: 'C', target: 'B' },
    ])
    expect(result.summary.vertices).toBe(3)
    expect(result.summary.edges).toBe(4)
    const byId = Object.fromEntries(result.nodes.map((n) => [n.id, n]))
    expect(byId.A).toMatchObject({ inDegree: 0, outDegree: 2, prestige: 0 })
    expect(byId.B).toMatchObject({ inDegree: 2, outDegree: 1, prestige: 1 })
    expect(byId.C.prestige).toBeCloseTo(1)
    expect(result.summary.reciprocity).toBeCloseTo(0.5)
  })

  it('matches sample-graph size, diameter, and top PageRank hub', () => {
    const result = analyzeNetwork(parseEdgeCsv(sampleCsv))
    expect(result.summary.vertices).toBe(52)
    expect(result.summary.edges).toBe(102)
    expect(result.summary.diameter).toBe(4)
    expect(result.summary.density).toBeCloseTo(102 / (52 * 51), 5)
    const top = [...result.nodes].sort((a, b) => b.pageRank - a.pageRank)
    expect(top[0].id).toBe('user02')
    expect(top[0].inDegree).toBe(25)
    const user01 = result.nodes.find((n) => n.id === 'user01')
    expect(user01?.outDegree).toBe(0)
    expect(result.edges.every((e) => typeof e.betweenness === 'number')).toBe(true)
  })

  it('assigns every node a community and a composite rank', () => {
    const result = analyzeNetwork(parseEdgeCsv(sampleCsv))
    expect(result.summary.communities).toBeGreaterThanOrEqual(2)
    const ranks = result.nodes.map((n) => n.compositeRank).sort((a, b) => a - b)
    expect(ranks[0]).toBe(1)
    expect(new Set(ranks).size).toBe(52)
  })
})
