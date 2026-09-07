export type EdgeRow = {
  source: string
  target: string
}

export type NodeMetrics = {
  id: string
  degree: number
  inDegree: number
  outDegree: number
  closeness: number
  betweenness: number
  prestige: number
  pageRank: number
  hub: number
  authority: number
  clustering: number
  community: number
  compositeRank: number
}

export type AnalyzedEdge = EdgeRow & {
  betweenness: number
}

export type NetworkSummary = {
  vertices: number
  edges: number
  diameter: number
  density: number
  reciprocity: number
  communities: number
}

export type NetworkAnalysis = {
  summary: NetworkSummary
  nodes: NodeMetrics[]
  edges: AnalyzedEdge[]
}

export const SIZE_METRICS = [
  'degree',
  'inDegree',
  'outDegree',
  'closeness',
  'betweenness',
  'prestige',
  'pageRank',
  'hub',
  'authority',
] as const

export type SizeMetric = (typeof SIZE_METRICS)[number]
