import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { categories } from '../../data/categories'
import { allTags, eventSearchText, events, normalizeSearch, subjectTypes, years } from '../../lib/events'
import type { Category, EvidenceLevel, Severity } from '../../types/event'
import { EmptyState } from '../../components/EmptyState'
import { EventCard } from '../../components/EventCard'
import { PageHero } from '../../components/PageHero'

const severityOptions: (Severity | '全部')[] = ['全部', 'S', 'A', 'B', 'C', 'D']
const evidenceOptions: (EvidenceLevel | '全部')[] = ['全部', '司法定案', '官方调查', '当事人承认', '多方证实', '强争议', '未核实']

export function ArchivePage() {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [category, setCategory] = useState<Category | '全部'>((params.get('category') as Category) || '全部')
  const [year, setYear] = useState<number | '全部'>(params.get('year') ? Number(params.get('year')) : '全部')
  const [severity, setSeverity] = useState<Severity | '全部'>((params.get('severity') as Severity) || '全部')
  const [evidence, setEvidence] = useState<EvidenceLevel | '全部'>((params.get('evidence') as EvidenceLevel) || '全部')
  const [subjectType, setSubjectType] = useState(params.get('subject') ?? '全部')
  const [tag, setTag] = useState(params.get('tag') ?? '全部')
  const [sort, setSort] = useState(params.get('sort') ?? 'newest')
  const [visible, setVisible] = useState(18)

  const filtered = useMemo(() => {
    const normalizedQuery = normalizeSearch(query)
    const result = events.filter((event) => (
      (!normalizedQuery || eventSearchText(event).includes(normalizedQuery)) &&
      (category === '全部' || event.category === category) &&
      (year === '全部' || event.year === year) &&
      (severity === '全部' || event.severity === severity) &&
      (evidence === '全部' || event.evidenceLevel === evidence) &&
      (subjectType === '全部' || event.subjectType === subjectType) &&
      (tag === '全部' || event.tags.includes(tag))
    ))
    return [...result].sort((a, b) => {
      if (sort === 'oldest') return a.year - b.year || a.archiveCode.localeCompare(b.archiveCode)
      if (sort === 'severity') return 'SABCD'.indexOf(a.severity) - 'SABCD'.indexOf(b.severity) || b.year - a.year
      return b.year - a.year || b.archiveCode.localeCompare(a.archiveCode)
    })
  }, [query, category, year, severity, evidence, subjectType, tag, sort])

  useEffect(() => {
    const next = new URLSearchParams()
    if (query) next.set('q', query)
    if (category !== '全部') next.set('category', category)
    if (year !== '全部') next.set('year', String(year))
    if (severity !== '全部') next.set('severity', severity)
    if (evidence !== '全部') next.set('evidence', evidence)
    if (subjectType !== '全部') next.set('subject', subjectType)
    if (tag !== '全部') next.set('tag', tag)
    if (sort !== 'newest') next.set('sort', sort)
    setParams(next, { replace: true })
    setVisible(18)
  }, [query, category, year, severity, evidence, subjectType, tag, sort, setParams])

  function clearFilters() {
    setQuery(''); setCategory('全部'); setYear('全部'); setSeverity('全部'); setEvidence('全部'); setSubjectType('全部'); setTag('全部'); setSort('newest')
  }

  const activeCount = [query, category !== '全部', year !== '全部', severity !== '全部', evidence !== '全部', subjectType !== '全部', tag !== '全部'].filter(Boolean).length

  return <><PageHero eyebrow="ARCHIVE DATABASE / 史库" title="档案库" description="在 142 条结构化记录中按人物、机构、年份、类别、严重度、证据状态与主题交叉检索。筛选条件会同步到网址，可直接分享。" meta={<span>142 RECORDS · 2016—2026</span>} /><section className="section page-shell archive-page"><aside className="filter-panel"><div className="filter-panel__head"><span><SlidersHorizontal size={17} /> 高级筛选</span>{activeCount > 0 && <button type="button" onClick={clearFilters}><RotateCcw size={14} /> 清除 {activeCount}</button>}</div><label className="search-field"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索人名、企业、学校、事件……" /></label><FilterSelect label="年份" value={year} onChange={(value) => setYear(value === '全部' ? '全部' : Number(value))} options={['全部', ...years]} /><FilterSelect label="五卷分类" value={category} onChange={(value) => setCategory(value as Category | '全部')} options={['全部', ...categories.map((item) => item.name)]} /><div className="filter-group"><span>恶劣程度</span><div className="segmented">{severityOptions.map((option) => <button key={option} type="button" className={severity === option ? 'is-active' : ''} onClick={() => setSeverity(option)}>{option}</button>)}</div></div><FilterSelect label="证据状态" value={evidence} onChange={(value) => setEvidence(value as EvidenceLevel | '全部')} options={evidenceOptions} /><FilterSelect label="主体类型" value={subjectType} onChange={setSubjectType} options={['全部', ...subjectTypes]} /><FilterSelect label="主题标签" value={tag} onChange={setTag} options={['全部', ...allTags]} /><div className="filter-note"><strong>证据优先</strong><p>严重等级是编辑评价，不等同于司法定性；强争议条目不代表相关指控成立。</p></div></aside><div className="archive-results"><div className="results-toolbar"><div><span>检索结果</span><strong>{filtered.length}</strong><small>条</small></div><label>排序<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">时间：新 → 旧</option><option value="oldest">时间：旧 → 新</option><option value="severity">严重度优先</option></select></label></div>{filtered.length ? <><div className="event-grid event-grid--results">{filtered.slice(0, visible).map((event, index) => <EventCard key={event.id} event={event} index={index} compact />)}</div>{visible < filtered.length && <button className="load-more" type="button" onClick={() => setVisible((count) => count + 18)}>续检下一批 <span>{Math.min(18, filtered.length - visible)} 条</span></button>}</> : <EmptyState title="未检得对应卷宗" description="试着减少筛选条件，或换一个关键词。" />}</div></section></>
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string | number; options: (string | number)[]; onChange: (value: string) => void }) {
  return <label className="filter-group"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
}
