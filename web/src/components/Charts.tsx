import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatMetric } from '../lib/format'
import type { NodeMetrics } from '../lib/types'

type Props = {
  nodes: NodeMetrics[]
  selectedId: string | null
  onSelect: (id: string) => void
}

function degreeHistogram(nodes: NodeMetrics[], binCount = 8) {
  const values = nodes.map((n) => n.degree)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const width = Math.max(1, (max - min) / binCount)
  const bins = Array.from({ length: binCount }, (_, i) => {
    const start = min + i * width
    const end = i === binCount - 1 ? max : start + width
    return {
      label: `${Math.round(start)}–${Math.round(end)}`,
      count: 0,
    }
  })
  for (const v of values) {
    const idx = Math.min(binCount - 1, Math.floor((v - min) / width))
    bins[idx].count += 1
  }
  return bins
}

export function Charts({ nodes, selectedId, onSelect }: Props) {
  const hist = degreeHistogram(nodes)
  const scatter = nodes.map((n) => ({
    id: n.id,
    pageRank: n.pageRank,
    betweenness: n.betweenness,
    selected: n.id === selectedId,
  }))

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-sm border border-line bg-panel p-4">
        <h3 className="font-serif text-lg text-ink">Degree distribution</h3>
        <p className="mb-3 text-sm text-muted">Most accounts have few ties. A handful sit in the fat tail.</p>
        <div className="h-56">
          <ResponsiveContainer>
            <BarChart data={hist} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#e7e0d4" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#78716c' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#78716c' }} />
              <Tooltip />
              <Bar dataKey="count" fill="#1d4ed8" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-sm border border-line bg-panel p-4">
        <h3 className="font-serif text-lg text-ink">PageRank vs betweenness</h3>
        <p className="mb-3 text-sm text-muted">
          Metrics disagree. Click a point to inspect that account.
        </p>
        <div className="h-56">
          <ResponsiveContainer>
            <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#e7e0d4" />
              <XAxis
                type="number"
                dataKey="pageRank"
                name="PageRank"
                tick={{ fontSize: 11, fill: '#78716c' }}
                tickFormatter={(v: number) => formatMetric(v, 2)}
              />
              <YAxis
                type="number"
                dataKey="betweenness"
                name="Betweenness"
                tick={{ fontSize: 11, fill: '#78716c' }}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value) => formatMetric(Number(value))}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.id ?? ''}
              />
              <Scatter
                data={scatter}
                fill="#b45309"
                fillOpacity={0.75}
                onClick={(d) => {
                  const id = (d as { id?: string }).id
                  if (id) onSelect(id)
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
