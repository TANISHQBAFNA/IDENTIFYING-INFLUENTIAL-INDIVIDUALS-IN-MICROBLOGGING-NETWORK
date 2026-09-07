import { describe, expect, it } from 'vitest'
import { communityAwareTopK, withCompositeRanks } from './rank'
import type { NodeMetrics } from './types'

function node(partial: Partial<NodeMetrics> & Pick<NodeMetrics, 'id'>): NodeMetrics {
  return {
    degree: 0,
    inDegree: 0,
    outDegree: 0,
    closeness: 0,
    betweenness: 0,
    prestige: 0,
    pageRank: 0,
    hub: 0,
    authority: 0,
    clustering: 0,
    community: 1,
    compositeRank: 0,
    ...partial,
  }
}

describe('withCompositeRanks', () => {
  it('ranks by average of PageRank, betweenness, prestige, and closeness ranks', () => {
    const ranked = withCompositeRanks([
      node({ id: 'a', pageRank: 0.3, betweenness: 10, prestige: 0.1, closeness: 0.1 }),
      node({ id: 'b', pageRank: 0.4, betweenness: 40, prestige: 0.2, closeness: 0.2 }),
      node({ id: 'c', pageRank: 0.1, betweenness: 1, prestige: 0.05, closeness: 0.05 }),
    ])
    expect(ranked.map((n) => n.id)).toEqual(['b', 'a', 'c'])
    expect(ranked[0].compositeRank).toBe(1)
    expect(ranked[2].compositeRank).toBe(3)
  })
})

describe('communityAwareTopK', () => {
  it('picks the best node from each community before repeating a community', () => {
    const nodes = withCompositeRanks([
      node({ id: 'c1', pageRank: 0.4, betweenness: 4, prestige: 0.4, closeness: 0.4, community: 1 }),
      node({ id: 'c2', pageRank: 0.35, betweenness: 3.5, prestige: 0.35, closeness: 0.35, community: 1 }),
      node({ id: 'c3', pageRank: 0.3, betweenness: 3, prestige: 0.3, closeness: 0.3, community: 1 }),
      node({ id: 'd1', pageRank: 0.2, betweenness: 2, prestige: 0.2, closeness: 0.2, community: 2 }),
    ])
    const globalTop = nodes.slice(0, 2).map((n) => n.id)
    expect(globalTop).toEqual(['c1', 'c2'])
    expect(communityAwareTopK(nodes, 2).map((n) => n.id)).toEqual(['c1', 'd1'])
  })
})
