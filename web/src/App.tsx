import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { NetworkGraph } from './components/NetworkGraph'
import { Charts } from './components/Charts'
import { analyzeNetwork } from './lib/analyze'
import { communityColor } from './lib/colors'
import { formatMetric, formatPercent, METRIC_HELP, METRIC_LABELS } from './lib/format'
import { parseEdgeCsv } from './lib/parseCsv'
import { communityAwareTopK } from './lib/rank'
import { SIZE_METRICS } from './lib/types'
import type { NetworkAnalysis, NodeMetrics, SizeMetric } from './lib/types'

const SAMPLE_URL = './sample_network.csv'
const TABLE_KEYS = ['compositeRank', 'id', 'community', ...SIZE_METRICS, 'clustering'] as const
type TableKey = (typeof TABLE_KEYS)[number]

const TABLE_LABELS: Record<TableKey, string> = {
  compositeRank: 'Composite',
  id: 'Account',
  community: 'Comm.',
  clustering: 'Clustering',
  ...METRIC_LABELS,
}

function loadAnalysis(text: string): NetworkAnalysis {
  return analyzeNetwork(parseEdgeCsv(text))
}

export default function App() {
  const [analysis, setAnalysis] = useState<NetworkAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('Loading sample network…')
  const [sizeMetric, setSizeMetric] = useState<SizeMetric>('pageRank')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<TableKey>('compositeRank')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [sourceLabel, setSourceLabel] = useState('sample_network.csv')

  useEffect(() => {
    void fetch(SAMPLE_URL)
      .then((res) => {
        if (!res.ok) throw new Error('Could not load sample_network.csv')
        return res.text()
      })
      .then((text) => {
        const next = loadAnalysis(text)
        setAnalysis(next)
        setError(null)
        setStatus(`Loaded ${next.summary.vertices} accounts, ${next.summary.edges} follows.`)
        setSourceLabel('sample_network.csv')
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load sample data')
        setStatus('No network loaded.')
      })
  }, [])

  const selected = analysis?.nodes.find((n) => n.id === selectedId) ?? null
  const communityTop = analysis ? communityAwareTopK(analysis.nodes, 10) : []
  const globalTop = analysis ? [...analysis.nodes].sort((a, b) => a.compositeRank - b.compositeRank).slice(0, 10) : []

  const sortedRows = useMemo(() => {
    if (!analysis) return []
    const rows = [...analysis.nodes]
    rows.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      const cmp = typeof av === 'string' && typeof bv === 'string' ? av.localeCompare(bv) : Number(av) - Number(bv)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return rows
  }, [analysis, sortKey, sortDir])

  function onSort(key: TableKey) {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir(key === 'id' ? 'asc' : key === 'compositeRank' || key === 'community' ? 'asc' : 'desc')
    }
  }

  function onUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const next = loadAnalysis(String(reader.result ?? ''))
        if (next.summary.vertices === 0) throw new Error('No edges found in that file.')
        setAnalysis(next)
        setSelectedId(null)
        setError(null)
        setSourceLabel(file.name)
        setStatus(`Loaded ${next.summary.vertices} accounts, ${next.summary.edges} follows from ${file.name}.`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not parse CSV')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  function reloadSample() {
    void fetch(SAMPLE_URL)
      .then((res) => res.text())
      .then((text) => {
        const next = loadAnalysis(text)
        setAnalysis(next)
        setSelectedId(null)
        setError(null)
        setSourceLabel('sample_network.csv')
        setStatus(`Loaded ${next.summary.vertices} accounts, ${next.summary.edges} follows.`)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load sample data')
      })
  }

  return (
    <div className="min-h-svh bg-paper text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
              Social and information networks
            </p>
            <h1 className="mt-2 font-serif text-4xl leading-tight text-ink md:text-5xl">
              Who should seed the message?
            </h1>
            <p className="mt-3 max-w-xl text-base text-muted">
              Treat follows as a directed graph. Size nodes by an influence metric, then compare a global ranking
              with a community-aware shortlist so seeds are not all from one cluster.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 text-sm">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-ink bg-ink px-3 py-2 font-medium text-paper">
              Upload CSV
              <input type="file" accept=".csv,text/csv" className="sr-only" onChange={onUpload} />
            </label>
            <button type="button" className="text-accent underline-offset-2 hover:underline" onClick={reloadSample}>
              Load sample network
            </button>
            <p className="text-xs text-muted">
              Columns: <code className="rounded-sm bg-line px-1">first</code>,{' '}
              <code className="rounded-sm bg-line px-1">second</code> (follower → followee). Now: {sourceLabel}
            </p>
          </div>
        </div>
      </header>

      {error ? (
        <div className="mx-auto max-w-6xl px-4 pt-4" role="alert">
          <p className="rounded-sm border border-rose-700 bg-rose-50 px-3 py-2 text-sm text-rose-900">{error}</p>
        </div>
      ) : null}

      {!analysis ? (
        <main className="mx-auto max-w-6xl px-4 py-16 text-muted">{status}</main>
      ) : (
        <main className="mx-auto max-w-6xl space-y-10 px-4 py-8">
          <section aria-label="Network summary" className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-line bg-line md:grid-cols-6">
            <Kpi label="Accounts" value={String(analysis.summary.vertices)} />
            <Kpi label="Follows" value={String(analysis.summary.edges)} />
            <Kpi label="Density" value={formatPercent(analysis.summary.density)} />
            <Kpi label="Diameter" value={String(analysis.summary.diameter)} />
            <Kpi label="Reciprocity" value={formatPercent(analysis.summary.reciprocity)} />
            <Kpi label="Communities" value={String(analysis.summary.communities)} />
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
            <div className="rounded-sm border border-line bg-panel p-3 md:p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-serif text-2xl">Follow graph</h2>
                <label className="flex items-center gap-2 text-sm">
                  Size by
                  <select
                    className="rounded-sm border border-line bg-paper px-2 py-1"
                    value={sizeMetric}
                    onChange={(e) => setSizeMetric(e.target.value as SizeMetric)}
                  >
                    {SIZE_METRICS.map((key) => (
                      <option key={key} value={key}>
                        {METRIC_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="mb-3 text-sm text-muted">{METRIC_HELP[sizeMetric]}</p>
              <NetworkGraph
                analysis={analysis}
                sizeMetric={sizeMetric}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </div>
            <Inspector node={selected} onClear={() => setSelectedId(null)} />
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <RankList
              title="Global top 10"
              caption="Lowest composite rank from PageRank, betweenness, prestige, and closeness."
              nodes={globalTop}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            <RankList
              title="Community-aware top 10"
              caption="Take the best unused community first so seeds cover the graph."
              nodes={communityTop}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </section>

          <section>
            <h2 className="mb-3 font-serif text-2xl">All accounts</h2>
            <div className="overflow-x-auto rounded-sm border border-line bg-panel">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-paper text-xs tracking-wide text-muted uppercase">
                  <tr>
                    {TABLE_KEYS.map((key) => (
                      <th key={key} className="px-2 py-2 font-medium">
                        <button type="button" className="hover:text-ink" onClick={() => onSort(key)}>
                          {TABLE_LABELS[key]}
                          {sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row) => (
                    <tr
                      key={row.id}
                      className={`cursor-pointer border-t border-line ${row.id === selectedId ? 'bg-accent/10' : 'hover:bg-paper'}`}
                      onClick={() => setSelectedId(row.id)}
                    >
                      <td className="px-2 py-1.5 font-medium">{row.compositeRank}</td>
                      <td className="px-2 py-1.5">{row.id}</td>
                      <td className="px-2 py-1.5">
                        <span className="inline-flex items-center gap-1">
                          <span
                            className="inline-block size-2 rounded-full"
                            style={{ background: communityColor(row.community) }}
                          />
                          {row.community}
                        </span>
                      </td>
                      {SIZE_METRICS.map((key) => (
                        <td key={key} className="px-2 py-1.5 tabular-nums">
                          {formatMetric(row[key])}
                        </td>
                      ))}
                      <td className="px-2 py-1.5 tabular-nums">{formatMetric(row.clustering)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <Charts nodes={analysis.nodes} selectedId={selectedId} onSelect={setSelectedId} />

          <section>
            <h2 className="mb-3 font-serif text-2xl">How to read the scores</h2>
            <p className="mb-4 max-w-2xl text-sm text-muted">
              An outward edge means <em>first</em> follows <em>second</em>. Influence usually lives on in-links:
              people worth seeding are followed by others, or sit between communities.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SIZE_METRICS.map((key) => (
                <article key={key} className="rounded-sm border border-line bg-panel p-4">
                  <h3 className="font-medium text-ink">{METRIC_LABELS[key]}</h3>
                  <p className="mt-1 text-sm text-muted">{METRIC_HELP[key]}</p>
                </article>
              ))}
            </div>
          </section>
        </main>
      )}
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panel px-3 py-4">
      <p className="text-xs tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-1 font-serif text-2xl tabular-nums">{value}</p>
    </div>
  )
}

function Inspector({ node, onClear }: { node: NodeMetrics | null; onClear: () => void }) {
  return (
    <aside className="rounded-sm border border-line bg-panel p-4">
      <h2 className="font-serif text-2xl">Inspector</h2>
      {!node ? (
        <p className="mt-3 text-sm text-muted">Click a node, table row, or scatter point.</p>
      ) : (
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Account</dt>
            <dd className="font-medium">{node.id}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Community</dt>
            <dd className="inline-flex items-center gap-1">
              <span className="inline-block size-2 rounded-full" style={{ background: communityColor(node.community) }} />
              {node.community}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Composite rank</dt>
            <dd className="tabular-nums">{node.compositeRank}</dd>
          </div>
          {SIZE_METRICS.map((key) => (
            <div key={key} className="flex justify-between gap-2">
              <dt className="text-muted">{METRIC_LABELS[key]}</dt>
              <dd className="tabular-nums">{formatMetric(node[key])}</dd>
            </div>
          ))}
          <div>
            <button type="button" className="mt-2 text-accent hover:underline" onClick={onClear}>
              Clear selection
            </button>
          </div>
        </dl>
      )}
    </aside>
  )
}

function RankList({
  title,
  caption,
  nodes,
  selectedId,
  onSelect,
}: {
  title: string
  caption: string
  nodes: NodeMetrics[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div className="rounded-sm border border-line bg-panel p-4">
      <h2 className="font-serif text-2xl">{title}</h2>
      <p className="mt-1 mb-3 text-sm text-muted">{caption}</p>
      <ol className="space-y-1 text-sm">
        {nodes.map((n, i) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => onSelect(n.id)}
              className={`flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left ${
                n.id === selectedId ? 'bg-accent/10' : 'hover:bg-paper'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="w-5 tabular-nums text-muted">{i + 1}</span>
                <span
                  className="inline-block size-2 rounded-full"
                  style={{ background: communityColor(n.community) }}
                />
                {n.id}
              </span>
              <span className="tabular-nums text-muted">rank {n.compositeRank}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}
