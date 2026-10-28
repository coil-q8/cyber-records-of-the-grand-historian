import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUrlFilters } from '../../lib/useUrlFilters'
import { categories } from '../../data/categories'
import { allTags, continuationIds, eventDateKey, events, matchesSearch, subjectTypes, years } from '../../lib/events'
import type { EvidenceLevel, Severity } from '../../types/event'
import { EmptyState } from '../../components/EmptyState'
import { EventCard } from '../../components/EventCard'
import { PageHero } from '../../components/PageHero'

const severityOptions: (Severity | '全部')[] = ['全部', 'S', 'A', 'B', 'C', 'D']
const evidenceOptions: (EvidenceLevel | '全部')[] = ['全部', '司法定案', '官方调查', '当事人承认', '多方证实', '强争议', '未核实']

export function ArchivePage() {
  const { params, filter, write } = useUrlFilters()
  const [pagination, setPagination] = useState({ key: '', count: 18 })
  const query = params.get('q') ?? ''
  const category = params.get('category') ?? '全部'
  const year = params.get('year') ?? '全部'
  const severity = params.get('severity') ?? '全部'
  const evidence = params.get('evidence') ?? '全部'
  const subjectType = params.get('subject') ?? '全部'
  const tag = params.get('tag') ?? '全部'
  const sort = params.get('sort') ?? 'newest'
  const scope = params.get('scope') ?? '全部'
  const currentKey = params.toString()
  const visible = pagination.key === currentKey ? pagination.count : 18

  const filtered = useMemo(() => {
    const result = events.filter((event) => matchesSearch(event, query)
      && (category === '全部' || event.category === category)
      && (year === '全部' || event.year === Number(year))
      && (severity === '全部' || event.severity === severity)
      && (evidence === '全部' || event.evidenceLevel === evidence)
      && (subjectType === '全部' || event.subjectType === subjectType)
      && (tag === '全部' || event.tags.includes(tag))
      && (scope === '全部' || continuationIds.has(event.id)))
    return result.sort((a, b) => {
      if (sort === 'oldest') return eventDateKey(a).localeCompare(eventDateKey(b)) || a.archiveCode.localeCompare(b.archiveCode)
      if (sort === 'severity') return 'SABCD'.indexOf(a.severity) - 'SABCD'.indexOf(b.severity) || eventDateKey(b).localeCompare(eventDateKey(a))
      if (sort === 'updated') return (b.firstRecordedAt ?? '').localeCompare(a.firstRecordedAt ?? '') || eventDateKey(b).localeCompare(eventDateKey(a))
      return eventDateKey(b).localeCompare(eventDateKey(a)) || b.archiveCode.localeCompare(a.archiveCode)
    })
  }, [query, category, year, severity, evidence, subjectType, tag, sort, scope])

  const activeCount = [query, category !== '全部', year !== '全部', severity !== '全部', evidence !== '全部', subjectType !== '全部', tag !== '全部', scope !== '全部'].filter(Boolean).length

  return <>
    <PageHero eyebrow="ARCHIVE DATABASE / 史库" title="档案库" description={`在 ${events.length} 篇记录中按人物、机构、年份、类别、证据与主题交叉检索。多个关键词以空格分隔，正文、时间线与来源名称均可检索；筛选条件随网址保存。`} meta={<span>{events.length} RECORDS · 2016—2026</span>} />
    <section className="section page-shell archive-page">
      <aside className="filter-panel">
        <div className="filter-panel__head"><span><SlidersHorizontal size={17} /> 高级筛选</span>{activeCount > 0 && <button type="button" onClick={() => write({})}><RotateCcw size={14} /> 清除 {activeCount}</button>}</div>
        <label className="search-field"><Search size={18} /><input aria-label="检索档案" value={query} onChange={(event) => filter('q', event.target.value)} placeholder="搜索人名、企业、学校、事件……" /></label>
        <FilterSelect label="年份" value={year} onChange={(value) => filter('year', value)} options={['全部', ...years]} />
        <FilterSelect label="五卷分类" value={category} onChange={(value) => filter('category', value)} options={['全部', ...categories.map((item) => item.name)]} />
        <div className="filter-group"><span>恶劣程度</span><div className="segmented">{severityOptions.map((option) => <button key={option} type="button" aria-pressed={severity === option} className={severity === option ? 'is-active' : ''} onClick={() => filter('severity', option)}>{option}</button>)}</div></div>
        <FilterSelect label="证据状态" value={evidence} onChange={(value) => filter('evidence', value)} options={evidenceOptions} />
        <FilterSelect label="主体类型" value={subjectType} onChange={(value) => filter('subject', value)} options={['全部', ...subjectTypes]} />
        <FilterSelect label="主题标签" value={tag} onChange={(value) => filter('tag', value)} options={['全部', ...allTags]} />
        <label className="filter-group"><span>收录范围</span><select aria-label="收录范围" value={scope} onChange={(event) => filter('scope', event.target.value)}><option value="全部">全部篇目</option><option value="continuation">仅看续编新增</option></select></label>
        <div className="filter-note"><strong>证据优先</strong><p>严重等级是编辑评价，不等同于司法定性；强争议条目不代表相关指控成立。</p><Link to="/updates" className="text-link">查本轮续编 ↗</Link></div>
      </aside>
      <div className="archive-results"><div className="results-toolbar"><div><span>检索结果</span><strong>{filtered.length}</strong><small>篇</small></div><label>排序<select aria-label="档案排序" value={sort} onChange={(event) => filter('sort', event.target.value)}><option value="newest">时间：新 → 旧</option><option value="oldest">时间：旧 → 新</option><option value="updated">最近入库</option><option value="severity">严重度优先</option></select></label></div>
        {filtered.length ? <><div className="event-grid event-grid--results">{filtered.slice(0, visible).map((event, index) => <EventCard key={event.id} event={event} index={index} compact />)}</div>{visible < filtered.length && <button className="load-more" type="button" onClick={() => setPagination({ key: currentKey, count: visible + 18 })}>续检下一批 <span>{Math.min(18, filtered.length - visible)} 篇</span></button>}</> : <EmptyState title="未检得对应卷宗" description="试着减少筛选条件，或换一个关键词。" />}
      </div>
    </section>
  </>
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string | number; options: (string | number)[]; onChange: (value: string) => void }) {
  return <label className="filter-group"><span>{label}</span><select value={value} aria-label={label} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
}
