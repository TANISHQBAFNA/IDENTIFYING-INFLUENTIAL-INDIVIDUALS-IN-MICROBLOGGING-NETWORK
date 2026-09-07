import { useEffect, useMemo, useRef } from 'react'
import cytoscape from 'cytoscape'
import type { Core, EventObject } from 'cytoscape'
import { communityColor } from '../lib/colors'
import { formatMetric, METRIC_LABELS } from '../lib/format'
import type { NetworkAnalysis, SizeMetric } from '../lib/types'

type Props = {
  analysis: NetworkAnalysis
  sizeMetric: SizeMetric
  selectedId: string | null
  onSelect: (id: string | null) => void
}

function scale(values: number[], minS: number, maxS: number, value: number): number {
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  if (!Number.isFinite(lo) || lo === hi) return (minS + maxS) / 2
  return minS + ((value - lo) / (hi - lo)) * (maxS - minS)
}

export function NetworkGraph({ analysis, sizeMetric, selectedId, onSelect }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)
  const onSelectRef = useRef(onSelect)

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  const sizes = useMemo(
    () => analysis.nodes.map((n) => n[sizeMetric]),
    [analysis, sizeMetric],
  )
  const edgeWeights = useMemo(
    () => analysis.edges.map((e) => e.betweenness),
    [analysis],
  )

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const cy = cytoscape({
      container: host,
      elements: [
        ...analysis.nodes.map((node) => ({
          data: {
            id: node.id,
            community: node.community,
            label: node.id.replace(/^user/, 'u'),
          },
        })),
        ...analysis.edges.map((edge, i) => ({
          data: {
            id: `e${i}`,
            source: edge.source,
            target: edge.target,
            betweenness: edge.betweenness,
          },
        })),
      ],
      layout: {
        name: 'cose',
        animate: false,
        randomize: false,
        nodeOverlap: 24,
        idealEdgeLength: () => 72,
        nodeRepulsion: () => 4500,
        gravity: 0.25,
        numIter: 800,
        padding: 24,
      },
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'font-family': 'IBM Plex Sans, sans-serif',
            'font-size': 9,
            color: '#1c1917',
            'text-outline-color': '#fffcf7',
            'text-outline-width': 2,
            'border-width': 1,
            'border-color': '#1c1917',
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 3,
            'border-color': '#0f172a',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1,
            'line-color': '#c4b8a5',
            'target-arrow-color': '#c4b8a5',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 0.7,
            'curve-style': 'bezier',
            opacity: 0.85,
          },
        },
      ],
      minZoom: 0.3,
      maxZoom: 3,
      wheelSensitivity: 0.3,
    })

    const tapNode = (evt: EventObject) => {
      onSelectRef.current(evt.target.id())
    }
    const tapBg = (evt: EventObject) => {
      if (evt.target === cy) onSelectRef.current(null)
    }
    cy.on('tap', 'node', tapNode)
    cy.on('tap', tapBg)

    const onResize = () => {
      cy.resize()
    }
    window.addEventListener('resize', onResize)
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) cy.resize()
      },
      { threshold: 0.05 },
    )
    io.observe(host)

    cyRef.current = cy
    return () => {
      window.removeEventListener('resize', onResize)
      io.disconnect()
      cy.destroy()
      cyRef.current = null
    }
  }, [analysis])

  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    analysis.nodes.forEach((node) => {
      const ele = cy.getElementById(node.id)
      const s = scale(sizes, 14, 46, node[sizeMetric])
      ele.style({
        width: s,
        height: s,
        'background-color': communityColor(node.community),
      })
    })
    analysis.edges.forEach((edge, i) => {
      const ele = cy.getElementById(`e${i}`)
      ele.style({
        width: scale(edgeWeights, 0.6, 5, edge.betweenness),
        opacity: 0.35 + 0.55 * ((edge.betweenness - Math.min(...edgeWeights)) /
          (Math.max(...edgeWeights) - Math.min(...edgeWeights) || 1)),
      })
    })
  }, [analysis, sizeMetric, sizes, edgeWeights])

  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    cy.nodes().unselect()
    if (!selectedId) return
    const ele = cy.getElementById(selectedId)
    if (ele.empty()) return
    ele.select()
    cy.animate({ center: { eles: ele } }, { duration: 220 })
  }, [selectedId])

  const communities = [...new Set(analysis.nodes.map((n) => n.community))].sort((a, b) => a - b)

  return (
    <figure className="flex h-full min-h-[28rem] flex-col">
      <div ref={hostRef} className="h-[28rem] w-full rounded-sm bg-[#fffcf7]" />
      <figcaption className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
        <span>Size = {METRIC_LABELS[sizeMetric].toLowerCase()}. Edge width = edge betweenness. Color = community.</span>
        <span className="flex flex-wrap gap-2">
          {communities.map((c) => (
            <span key={c} className="inline-flex items-center gap-1">
              <span
                className="inline-block size-2.5 rounded-full border border-ink/40"
                style={{ background: communityColor(c) }}
              />
              C{c}
            </span>
          ))}
        </span>
        {selectedId ? (
          <span className="font-medium text-ink">
            Selected {selectedId} · {METRIC_LABELS[sizeMetric]} {formatMetric(
              analysis.nodes.find((n) => n.id === selectedId)?.[sizeMetric] ?? 0,
            )}
          </span>
        ) : null}
      </figcaption>
    </figure>
  )
}
