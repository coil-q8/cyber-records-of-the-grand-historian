import { Minus, Plus, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHero } from '../../components/PageHero'
import { categories } from '../../data/categories'
import { allTags, events, years } from '../../lib/events'
import type { Category, EventRecord } from '../../types/event'

type NodeType = 'topic' | 'category' | 'year' | 'event'
interface GraphNode { id: string; label: string; type: NodeType; x: number; y: number; color: string; event?: EventRecord; value: string | number }
interface GraphEdge { from: string; to: string }

export function GraphPage() {
  const [topic, setTopic] = useState('平台责任')
  const [category, setCategory] = useState<Category | '全部'>('全部')
  const [year, setYear] = useState<number | '全部'>('全部')
  const [selected, setSelected] = useState('topic-root')
  const [hovered, setHovered] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)

  const pool = useMemo(() => events.filter((event) => (topic === '全部主题' || event.tags.includes(topic)) && (category === '全部' || event.category === category) && (year === '全部' || event.year === year)).sort((a, b) => 'SABCD'.indexOf(a.severity) - 'SABCD'.indexOf(b.severity) || b.year - a.year), [topic, category, year])
  const visibleEvents = pool.slice(0, 36)
  const graph = useMemo(() => buildGraph(visibleEvents, topic), [visibleEvents, topic])
  const connected = useMemo(() => connectedEvents(selected, graph.nodes, visibleEvents), [selected, graph.nodes, visibleEvents])
  const activeIds = new Set(connected.map((event) => event.id))

  return <><PageHero eyebrow="索隐 · 关系索引" title="档案关系索引" description="此图只展示主题、年份、卷目与事件之间的编辑关联，不是人物实体图，也不据此推断现实中的组织或人际关系。" meta={<span>可筛选 · 可缩放 · 可跳转</span>} /><section className="graph-shell page-shell"><div className="graph-toolbar"><label>主题<select value={topic} onChange={(event) => { setTopic(event.target.value); setSelected('topic-root') }}><option>全部主题</option>{allTags.map((item) => <option key={item}>{item}</option>)}</select></label><label>卷目<select value={category} onChange={(event) => { setCategory(event.target.value as Category | '全部'); setSelected('topic-root') }}><option>全部</option>{categories.map((item) => <option key={item.name}>{item.name}</option>)}</select></label><label>年份<select value={year} onChange={(event) => { setYear(event.target.value === '全部' ? '全部' : Number(event.target.value)); setSelected('topic-root') }}><option>全部</option>{years.map((item) => <option key={item}>{item}</option>)}</select></label><div className="graph-toolbar__count"><strong>{pool.length}</strong><span>条匹配{pool.length > 36 && ' · 图中显示前 36 条'}</span></div></div><div className="graph-layout"><div className="network-canvas"><div className="network-canvas__controls"><button type="button" onClick={() => setZoom((value) => Math.min(1.5, value + 0.12))} aria-label="放大"><Plus /></button><button type="button" onClick={() => setZoom((value) => Math.max(0.7, value - 0.12))} aria-label="缩小"><Minus /></button><button type="button" onClick={() => { setZoom(1); setSelected('topic-root') }} aria-label="重置"><RotateCcw /></button></div>{visibleEvents.length ? <svg viewBox="0 0 900 620" role="img" aria-label={`${topic}档案关系索引`}><g style={{ transform: `scale(${zoom})`, transformOrigin: '450px 310px' }}>{graph.edges.map((edge, index) => { const from = graph.nodes.find((node) => node.id === edge.from)!; const to = graph.nodes.find((node) => node.id === edge.to)!; const active = selected === edge.from || selected === edge.to || (to.event && activeIds.has(to.event.id)); return <line key={`${edge.from}-${edge.to}-${index}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} className={active ? 'is-active' : ''} /> })}{graph.nodes.map((node) => { const active = node.id === selected || node.id === hovered || node.type !== 'event' || (node.event && activeIds.has(node.event.id)); return <g key={node.id} className={`graph-node graph-node--${node.type} ${active ? 'is-active' : 'is-muted'}`} transform={`translate(${node.x} ${node.y})`} onClick={() => setSelected(node.id)} onMouseEnter={() => setHovered(node.id)} onMouseLeave={() => setHovered(null)} role="button" tabIndex={0}><circle r={node.type === 'topic' ? 34 : node.type === 'event' ? 6 + ('SABCD'.length - 'SABCD'.indexOf(String(node.value))) * .45 : 18} fill={node.color} /><text y={node.type === 'event' ? 20 : 4} textAnchor="middle">{node.type === 'event' ? node.label.slice(0, 8) : node.label}</text><title>{node.label}</title></g> })}</g></svg> : <div className="graph-empty">当前组合没有匹配档案，请调整筛选条件。</div>}<div className="graph-key"><span><i className="topic" />主题</span><span><i className="category" />卷目</span><span><i className="year" />年份</span><span><i className="event" />事件</span></div></div><aside className="graph-inspector"><span>关联卷宗</span><h2>{graph.nodes.find((node) => node.id === selected)?.label ?? topic}</h2><p>关联 {connected.length} 条档案。点击图中节点切换当前关系。</p><div>{connected.slice(0, 12).map((event) => <Link key={event.id} to={`/event/${event.id}`}><span>{event.year} · {event.category}</span><strong>{event.title}</strong><small>{event.evidenceLevel} ↗</small></Link>)}</div>{connected.length > 12 && <Link className="graph-inspector__all" to={`/archive?${selected.startsWith('category-') ? `category=${encodeURIComponent(selected.replace('category-', ''))}` : selected.startsWith('year-') ? `year=${selected.replace('year-', '')}` : topic !== '全部主题' ? `tag=${encodeURIComponent(topic)}` : ''}`}>在档案库查看全部 {connected.length} 条</Link>}</aside></div></section></>
}

function buildGraph(sourceEvents: EventRecord[], topic: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [{ id: 'topic-root', label: topic, type: 'topic', x: 450, y: 310, color: '#65b9b5', value: topic }]
  const edges: GraphEdge[] = []
  const usedCategories = categories.filter((item) => sourceEvents.some((event) => event.category === item.name))
  const usedYears = years.filter((item) => sourceEvents.some((event) => event.year === item))
  usedCategories.forEach((item, index) => { const angle = index / Math.max(usedCategories.length, 1) * Math.PI * 2 - Math.PI / 2; nodes.push({ id: `category-${item.name}`, label: item.name, type: 'category', x: 450 + Math.cos(angle) * 135, y: 310 + Math.sin(angle) * 135, color: item.color, value: item.name }); edges.push({ from: 'topic-root', to: `category-${item.name}` }) })
  usedYears.forEach((item, index) => { const angle = index / Math.max(usedYears.length, 1) * Math.PI * 2 + .2; nodes.push({ id: `year-${item}`, label: String(item), type: 'year', x: 450 + Math.cos(angle) * 252, y: 310 + Math.sin(angle) * 252, color: '#777970', value: item }) })
  sourceEvents.forEach((event, index) => { const angle = index * 2.399963; const radius = 188 + (index % 4) * 22; const meta = categories.find((item) => item.name === event.category)!; nodes.push({ id: `event-${event.id}`, label: event.title, type: 'event', x: 450 + Math.cos(angle) * radius, y: 310 + Math.sin(angle) * radius * .78, color: meta.color, value: event.severity, event }); edges.push({ from: `category-${event.category}`, to: `event-${event.id}` }); edges.push({ from: `year-${event.year}`, to: `event-${event.id}` }); edges.push({ from: 'topic-root', to: `event-${event.id}` }) })
  return { nodes, edges }
}

function connectedEvents(nodeId: string, nodes: GraphNode[], sourceEvents: EventRecord[]) {
  if (nodeId === 'topic-root') return sourceEvents
  if (nodeId.startsWith('category-')) return sourceEvents.filter((event) => event.category === nodeId.replace('category-', ''))
  if (nodeId.startsWith('year-')) return sourceEvents.filter((event) => event.year === Number(nodeId.replace('year-', '')))
  const node = nodes.find((item) => item.id === nodeId)
  return node?.event ? [node.event] : sourceEvents
}
