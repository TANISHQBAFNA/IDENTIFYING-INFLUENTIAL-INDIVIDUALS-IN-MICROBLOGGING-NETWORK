import type { SizeMetric } from './types'

export const METRIC_LABELS: Record<SizeMetric, string> = {
  degree: 'Degree',
  inDegree: 'In-degree (followers)',
  outDegree: 'Out-degree (follows)',
  closeness: 'Closeness',
  betweenness: 'Betweenness',
  prestige: 'Prestige',
  pageRank: 'PageRank',
  hub: 'Hub score',
  authority: 'Authority',
}

export const METRIC_HELP: Record<SizeMetric, string> = {
  degree: 'Total follows plus followers. Busy accounts, not always the best seeds.',
  inDegree: 'How many people follow this account. Raw popularity.',
  outDegree: 'How many accounts this person follows.',
  closeness: 'How few hops to everyone else. Useful for fast broadcast.',
  betweenness: 'How often this person sits on the shortest path between others. Brokers.',
  prestige: 'In-degree scaled by network size. Same ranking as followers.',
  pageRank: 'Importance flows from important followers. Default Google-style seed score.',
  hub: 'Points at many authorities. A curator of influential accounts.',
  authority: 'Pointed at by many hubs. A destination people keep citing.',
}

export function formatMetric(value: number, digits = 3): string {
  if (!Number.isFinite(value)) return '—'
  if (Number.isInteger(value) || Math.abs(value) >= 100) return value.toFixed(0)
  if (Math.abs(value) >= 1) return value.toFixed(Math.min(digits, 2))
  return value.toPrecision(digits)
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}
