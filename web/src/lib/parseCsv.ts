import type { EdgeRow } from './types'

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      out.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur.trim())
  return out
}

export function parseEdgeCsv(text: string): EdgeRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length === 0) {
    throw new Error('CSV is empty. Need a header row with first,second.')
  }
  const header = splitCsvLine(lines[0]).map((h) => h.replace(/^"|"$/g, '').toLowerCase())
  const si = header.indexOf('first')
  const ti = header.indexOf('second')
  if (si < 0 || ti < 0) {
    throw new Error('CSV must have columns named first and second (follower, followee).')
  }
  const edges: EdgeRow[] = []
  for (let r = 1; r < lines.length; r++) {
    const cols = splitCsvLine(lines[r])
    const source = (cols[si] ?? '').replace(/^"|"$/g, '')
    const target = (cols[ti] ?? '').replace(/^"|"$/g, '')
    if (!source || !target) {
      throw new Error(`Row ${r + 1} has an empty endpoint.`)
    }
    edges.push({ source, target })
  }
  return edges
}
