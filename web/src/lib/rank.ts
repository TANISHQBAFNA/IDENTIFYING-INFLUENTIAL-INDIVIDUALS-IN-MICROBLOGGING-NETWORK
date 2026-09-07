import type { NodeMetrics } from './types'

const COMPOSITE_KEYS = ['pageRank', 'betweenness', 'prestige', 'closeness'] as const

function ranksDescending(nodes: NodeMetrics[], key: (typeof COMPOSITE_KEYS)[number]): Map<string, number> {
  const ordered = [...nodes].sort((a, b) => b[key] - a[key])
  const ranks = new Map<string, number>()
  ordered.forEach((n, i) => ranks.set(n.id, i + 1))
  return ranks
}

export function withCompositeRanks(nodes: NodeMetrics[]): NodeMetrics[] {
  const rankMaps = COMPOSITE_KEYS.map((key) => ranksDescending(nodes, key))
  const scored = nodes.map((n) => {
    const avg =
      rankMaps.reduce((sum, ranks) => sum + (ranks.get(n.id) ?? nodes.length), 0) / rankMaps.length
    return { node: n, avg }
  })
  scored.sort((a, b) => a.avg - b.avg || a.node.id.localeCompare(b.node.id))
  return scored.map((item, i) => ({ ...item.node, compositeRank: i + 1 }))
}

export function communityAwareTopK(nodes: NodeMetrics[], k: number): NodeMetrics[] {
  const ordered = [...nodes].sort((a, b) => a.compositeRank - b.compositeRank)
  const picked: NodeMetrics[] = []
  const used = new Set<number>()
  const remaining = [...ordered]
  while (picked.length < k && remaining.length > 0) {
    const idx = remaining.findIndex((n) => !used.has(n.community))
    const take = idx >= 0 ? remaining.splice(idx, 1)[0] : remaining.shift()
    if (!take) break
    picked.push(take)
    used.add(take.community)
    if (used.size === new Set(ordered.map((n) => n.community)).size) {
      used.clear()
    }
  }
  return picked
}
