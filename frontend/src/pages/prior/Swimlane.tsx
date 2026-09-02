import { useId } from 'react'
import type { Flow, FlowNode, EdgeTone } from '../../lib/priorAuthFlows'

// Data-driven swimlane diagram (SVG) for the /prior demo. Lanes are horizontal
// bands, nodes sit on a (lane, col) grid, edges are orthogonal arrows.

const GUTTER = 112 // left gutter for lane labels
const COL_W = 176
const LANE_H = 112
const NODE_W = 160
const NODE_H = 84
const PAD_R = 14

const TONE_COLOR: Record<EdgeTone, string> = {
  neutral: '#475569',
  approve: '#059669',
  reject: '#dc2626',
}

interface Rect { x: number; y: number; w: number; h: number; cx: number; cy: number }

function nodeRect(n: FlowNode): Rect {
  const x = GUTTER + n.col * COL_W + (COL_W - NODE_W) / 2
  const y = n.lane * LANE_H + (LANE_H - NODE_H) / 2
  return { x, y, w: NODE_W, h: NODE_H, cx: x + NODE_W / 2, cy: y + NODE_H / 2 }
}

function edgeGeometry(a: Rect, b: Rect, route: 'auto' | 'side' | 'over', offset: number) {
  // 'over': up and across the top of the diagram, then down into the target.
  if (route === 'over') {
    const topY = 12
    return {
      d: `M ${a.cx} ${a.y} L ${a.cx} ${topY} L ${b.cx} ${topY} L ${b.cx} ${b.y}`,
      label: { x: (a.cx + b.cx) / 2, y: topY - 4, anchor: 'middle' as const },
    }
  }
  // 'side': exit the side of the source, run horizontally, then turn into the target.
  if (route === 'side') {
    const sx = b.cx > a.cx ? a.x + a.w : a.x
    const ey = b.cy > a.cy ? b.y : b.y + b.h
    return {
      d: `M ${sx} ${a.cy} L ${b.cx} ${a.cy} L ${b.cx} ${ey}`,
      label: { x: (sx + b.cx) / 2, y: a.cy - 10, anchor: 'middle' as const },
    }
  }
  const sameLane = Math.abs(a.cy - b.cy) < 1
  const sameCol = Math.abs(a.cx - b.cx) < 1
  if (sameLane) {
    const sx = b.cx > a.cx ? a.x + a.w : a.x
    const ex = b.cx > a.cx ? b.x : b.x + b.w
    return { d: `M ${sx} ${a.cy} L ${ex} ${a.cy}`, label: { x: (sx + ex) / 2, y: a.cy - 10, anchor: 'middle' as const } }
  }
  const down = b.cy > a.cy
  const sy = down ? a.y + a.h : a.y
  const sx = a.cx + offset
  if (sameCol && offset === 0) {
    const ey = down ? b.y : b.y + b.h
    return { d: `M ${sx} ${sy} L ${sx} ${ey}`, label: { x: sx + 10, y: (sy + ey) / 2, anchor: 'start' as const } }
  }
  // L-shape: vertical out of the source, horizontal into the near side of the target.
  const ex = b.cx > sx ? b.x : b.x + b.w
  return {
    d: `M ${sx} ${sy} L ${sx} ${b.cy} L ${ex} ${b.cy}`,
    label: { x: sx + (b.cx > sx ? 10 : -10), y: (sy + b.cy) / 2, anchor: (b.cx > sx ? 'start' : 'end') as 'start' | 'end' },
  }
}

export function Swimlane({ flow, title, active, visited }: { flow: Flow; title?: string; active?: string; visited?: string[] }) {
  const markerPrefix = useId().replace(/:/g, '')
  const visitedSet = new Set(visited ?? [])
  const width = GUTTER + flow.cols * COL_W + PAD_R
  const height = flow.lanes.length * LANE_H
  const rects = new Map(flow.nodes.map((n) => [n.id, nodeRect(n)]))

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title ?? 'Prior authorization swimlane diagram'} className="min-w-max">
        <defs>
          {(Object.keys(TONE_COLOR) as EdgeTone[]).map((tone) => (
            <marker key={tone} id={`${markerPrefix}-${tone}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={TONE_COLOR[tone]} />
            </marker>
          ))}
        </defs>

        {/* Lane bands + labels */}
        {flow.lanes.map((lane, i) => {
          const Icon = lane.icon
          return (
            <g key={lane.name}>
              <rect x={8} y={i * LANE_H + 6} width={width - 16} height={LANE_H - 12} rx={18} fill="#ffffff" stroke="#e2e8f0" />
              <foreignObject x={16} y={i * LANE_H + 6} width={GUTTER - 28} height={LANE_H - 12}>
                <div className="flex h-full flex-col items-center justify-center gap-1 text-slate-700">
                  <Icon size={22} strokeWidth={1.75} className="text-slate-500" />
                  <span className="text-xs font-semibold">{lane.name}</span>
                </div>
              </foreignObject>
            </g>
          )
        })}

        {/* Edges */}
        {flow.edges.map((e) => {
          const a = rects.get(e.from)
          const b = rects.get(e.to)
          if (!a || !b) return null
          const tone = e.tone ?? 'neutral'
          const { d, label } = edgeGeometry(a, b, e.route ?? 'auto', e.offset ?? 0)
          return (
            <g key={`${e.from}-${e.to}`}>
              <path d={d} fill="none" stroke={TONE_COLOR[tone]} strokeWidth={1.6} markerEnd={`url(#${markerPrefix}-${tone})`} />
              {e.label && (
                <text x={label.x} y={label.y} textAnchor={label.anchor} fontSize={11} fontWeight={700} fill={TONE_COLOR[tone]} paintOrder="stroke" stroke="#f8fafc" strokeWidth={3}>
                  {e.label}
                </text>
              )}
            </g>
          )
        })}

        {/* Nodes */}
        {flow.nodes.map((n) => {
          const r = rects.get(n.id)!
          const isAi = n.kind === 'ai'
          const isActive = n.id === active
          const isVisited = visitedSet.has(n.id)
          return (
            <g key={n.id}>
              <rect
                x={r.x} y={r.y} width={r.w} height={r.h} rx={10}
                fill={isActive ? '#f0fdfa' : isVisited ? (isAi ? '#eff6ff' : '#ecfdf5') : '#ffffff'}
                stroke={isActive ? '#0f766e' : isAi ? '#2563eb' : '#10b981'}
                strokeWidth={isActive ? 2.4 : 1.4}
                strokeDasharray={isAi && !isActive ? '5 3' : undefined}
              />
              <foreignObject x={r.x} y={r.y} width={r.w} height={r.h}>
                <div className="flex h-full items-center justify-center p-1.5 text-center text-[11px] leading-tight font-medium text-slate-800">
                  {n.text}
                </div>
              </foreignObject>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
