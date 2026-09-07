import Graph, { UndirectedGraph } from 'graphology'
import betweennessCentrality from 'graphology-metrics/centrality/betweenness'
import closenessCentrality from 'graphology-metrics/centrality/closeness'
import edgeBetweennessCentrality from 'graphology-metrics/centrality/edge-betweenness'
import hits from 'graphology-metrics/centrality/hits'
import pagerank from 'graphology-metrics/centrality/pagerank'
import { directedDensity } from 'graphology-metrics/graph/density'
import diameter from 'graphology-metrics/graph/diameter'
import louvain from 'graphology-communities-louvain'
import { withCompositeRanks } from './rank'
import type { AnalyzedEdge, EdgeRow, NetworkAnalysis, NodeMetrics } from './types'

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function localClustering(undirected: UndirectedGraph, node: string): number {
  const neighbors = undirected.neighbors(node)
  const k = neighbors.length
  if (k < 2) return 0
  let links = 0
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      if (undirected.hasEdge(neighbors[i], neighbors[j])) links += 1
    }
  }
  return (2 * links) / (k * (k - 1))
}

function reciprocity(graph: Graph): number {
  if (graph.size === 0) return 0
  let reciprocated = 0
  graph.forEachDirectedEdge((_edge, _attrs, source, target) => {
    if (source !== target && graph.hasDirectedEdge(target, source)) reciprocated += 1
  })
  return reciprocated / graph.size
}

export function analyzeNetwork(rows: EdgeRow[]): NetworkAnalysis {
  const directed = new Graph({ type: 'directed', multi: false, allowSelfLoops: false })
  for (const row of rows) {
    if (row.source === row.target) continue
    directed.mergeNode(row.source)
    directed.mergeNode(row.target)
    if (!directed.hasDirectedEdge(row.source, row.target)) {
      directed.addDirectedEdge(row.source, row.target)
    }
  }

  const n = directed.order
  const m = directed.size
  if (n === 0) {
    return {
      summary: { vertices: 0, edges: 0, diameter: 0, density: 0, reciprocity: 0, communities: 0 },
      nodes: [],
      edges: [],
    }
  }

  const undirected = new UndirectedGraph({ multi: false, allowSelfLoops: false })
  directed.forEachNode((node) => undirected.mergeNode(node))
  directed.forEachDirectedEdge((_e, _a, source, target) => {
    if (!undirected.hasEdge(source, target)) undirected.addEdge(source, target)
  })

  const pageRank = pagerank(directed, { alpha: 0.85, getEdgeWeight: null })
  const betweenness = betweennessCentrality(directed, { normalized: false, getEdgeWeight: null })
  const closeness = closenessCentrality(undirected)
  const hitScores = hits(directed, { getEdgeWeight: null, normalize: true })
  const edgeBetweenness = edgeBetweennessCentrality(directed, { normalized: false, getEdgeWeight: null })
  const communities = louvain(undirected, { rng: mulberry32(123), getEdgeWeight: null })
  const diam = diameter(undirected)
  const dens = directedDensity(n, m)

  const rawNodes: NodeMetrics[] = directed.mapNodes((id) => {
    const inDegree = directed.inDegree(id)
    return {
      id,
      degree: directed.degree(id),
      inDegree,
      outDegree: directed.outDegree(id),
      closeness: closeness[id] ?? 0,
      betweenness: betweenness[id] ?? 0,
      prestige: n > 1 ? inDegree / (n - 1) : 0,
      pageRank: pageRank[id] ?? 0,
      hub: hitScores.hubs[id] ?? 0,
      authority: hitScores.authorities[id] ?? 0,
      clustering: localClustering(undirected, id),
      community: (communities[id] ?? 0) + 1,
      compositeRank: 0,
    }
  })

  const nodes = withCompositeRanks(rawNodes)
  const edges: AnalyzedEdge[] = []
  directed.forEachDirectedEdge((edgeKey, _attrs, source, target) => {
    edges.push({
      source,
      target,
      betweenness: edgeBetweenness[edgeKey] ?? 0,
    })
  })

  const communityCount = new Set(nodes.map((node) => node.community)).size
  return {
    summary: {
      vertices: n,
      edges: m,
      diameter: Number.isFinite(diam) ? diam : 0,
      density: dens,
      reciprocity: reciprocity(directed),
      communities: communityCount,
    },
    nodes,
    edges,
  }
}
