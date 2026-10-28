import { ArrowLeftRight, Check, Copy, ExternalLink, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useUrlFilters } from '../../lib/useUrlFilters'
import { PageHero } from '../../components/PageHero'
import { EvidenceBadge } from '../../components/EvidenceBadge'
import { events, evidenceProfile, getEventById, searchEvents } from '../../lib/events'
import type { EventRecord } from '../../types/event'

const views = [{ key: 'facts', label: '事实与分歧' }, { key: 'timeline', label: '时间脉络' }, { key: 'sources', label: '来源案卷' }] as const
type View = typeof views[number]['key']

export function ComparePage() {
  const { params, filter: update, write: setParams } = useUrlFilters(false)
  const [copyState, setCopyState] = useState('')
  const left = getEventById(params.get('left') ?? undefined)
  const requestedRight = getEventById(params.get('right') ?? undefined)
  const duplicateSelection = Boolean(left && requestedRight?.id === left.id)
  const right = duplicateSelection ? undefined : requestedRight
  const view: View = views.some((item) => item.key === params.get('view')) ? params.get('view') as View : 'facts'
  const sharedTags = left && right ? left.tags.filter((tag) => right.tags.includes(tag)) : []

  async function share() {
    try { await navigator.clipboard.writeText(window.location.href); setCopyState('链接已复制') }
    catch { setCopyState('请复制浏览器地址栏分享') }
  }

  return <>
    <PageHero eyebrow="READING IN PARALLEL / 对读案几" title="对读" description="两篇并置，辨认相似机制，也保留彼此不同。比较事实、时间与来源，不把主题相近当作存在关联的证据。" meta={<span>{events.length} 篇可选 · 所选篇目随网址保存</span>} />
    <section className="section page-shell compare-page">
      <div className="compare-picker-grid"><EventPicker side="左篇" value={left?.id ?? ''} excluded={right?.id} onChange={(value) => update('left', value)} /><EventPicker side="右篇" value={right?.id ?? ''} excluded={left?.id} onChange={(value) => update('right', value)} /></div>
      <div className="compare-tools"><div className="compare-tabs" aria-label="对读视图">{views.map((item) => <button key={item.key} type="button" aria-pressed={view === item.key} onClick={() => update('view', item.key)}>{item.label}</button>)}</div><div><button type="button" className="button button--small button--ghost" onClick={() => { const next = new URLSearchParams(params); next.delete('left'); next.delete('right'); if (right) next.set('left', right.id); if (left) next.set('right', left.id); setParams(next) }} disabled={!left && !right}><ArrowLeftRight size={15} />交换</button><button type="button" className="button button--small button--ghost" onClick={share}>{copyState === '链接已复制' ? <Check size={15} /> : <Copy size={15} />}分享对读</button></div></div>
      {copyState && <p className="compare-status" role="status">{copyState}</p>}
      {duplicateSelection && <p className="compare-status" role="status">左右为同一篇，请为右侧选择另一篇。</p>}
      {!left || !right ? <div className="compare-invitation"><span className="eyebrow">从一组问题开始</span><h2>选两篇，看机制如何重演</h2><p>可在两侧检索框中查找全文，再从结果选择篇目。单篇档案也可从“放入对读”进入此处。</p><button type="button" className="button button--ghost" onClick={() => setParams({ left: 'cyber-2026-eq-047', right: 'cyber-2026-yc-033' })}>试读：店铺核验与后厨监督</button></div> : <>
        <div className="compare-common"><span>共同索引</span>{sharedTags.length ? sharedTags.map((tag) => <Link key={tag} to={`/archive?tag=${encodeURIComponent(tag)}`}>#{tag}</Link>) : <p>当前没有完全相同的主题标签；不自动推定两篇存在联系。</p>}</div>
        <div className="compare-columns">{[left, right].map((event) => <CompareRecord key={event.id} event={event} view={view} />)}</div>
      </>}
    </section>
  </>
}

function EventPicker({ side, value, excluded, onChange }: { side: string; value: string; excluded?: string; onChange: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const selected = getEventById(value)
  const options = searchEvents(query).filter((event) => event.id !== excluded)
  return <div className="compare-picker"><span className="eyebrow">{side}</span><label className="search-field"><Search size={17} /><input aria-label={`检索${side}`} placeholder="先检索，再选篇……" value={query} onChange={(event) => setQuery(event.target.value)} /></label><label className="compare-picker__select"><span className="sr-only">选择{side}</span><select aria-label={`选择${side}`} value={value} onChange={(event) => onChange(event.target.value)}><option value="">选择一篇 · 检得 {options.length} 篇</option>{selected && !options.some((event) => event.id === selected.id) && <option value={selected.id}>{selected.year} · {selected.title}</option>}{options.map((event) => <option key={event.id} value={event.id}>{event.year} · {event.title}</option>)}</select></label></div>
}

function CompareRecord({ event, view }: { event: EventRecord; view: View }) {
  const profile = evidenceProfile(event)
  return <article className="compare-record"><header><span className="eyebrow">{event.date} · {event.category}卷</span><h2><Link to={`/event/${event.id}`}>{event.title}</Link></h2><EvidenceBadge level={event.evidenceLevel} /><p>{event.status}</p><Link className="text-link" to={`/event/${event.id}`}>完整篇目 <ExternalLink size={14} /></Link></header>
    {view === 'facts' && <><CompareText title="本事" text={event.summary} /><CompareList title="已证实" items={event.verifiedFacts} /><CompareList title="存争议" items={event.disputedClaims} /><CompareList title="已证伪" items={event.debunkedClaims} /><CompareList title="仍未知" items={event.unresolvedQuestions} /><CompareText title="考证结论" text={event.finalConclusion} /></>}
    {view === 'timeline' && <section><h3>时间脉络</h3>{event.timeline?.length ? <ol className="compare-timeline">{event.timeline.map((item, index) => <li key={`${item.date}-${index}`}><time>{item.date}</time><h4>{item.title}</h4><p>{item.description}</p>{item.sourceIds?.map((sourceId) => <Link key={sourceId} className="text-link" to={`/event/${event.id}#source-${sourceId}`}>查史料 ↗</Link>)}</li>)}</ol> : <p>此篇未收录时间线。</p>}</section>}
    {view === 'sources' && <section><h3>来源分布</h3><p className="compare-source-note">可回溯第一等 {profile.primary} 则 · 第二等 {profile.folk} 则 · 待补核验 {profile.pending} 则。等级描述材料性质，不是自动可信分。</p><ol className="compare-sources">{event.sources.map((source) => <li key={source.id}><span>第{source.sourceRank}等 · {source.sourceType} · {source.archiveStatus}</span><h4>{source.url ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a> : source.title}</h4><p>{source.institution} · {source.date}</p>{source.note && <p>{source.note}</p>}</li>)}</ol></section>}
  </article>
}

function CompareText({ title, text }: { title: string; text?: string }) {
  return <section><h3>{title}</h3>{text ? text.split(/\n\s*\n/u).map((paragraph, index) => <p key={index}>{paragraph}</p>) : <p>此项尚未收录。</p>}</section>
}

function CompareList({ title, items }: { title: string; items?: string[] }) {
  return <section><h3>{title}</h3>{items?.length ? <ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p>当前未收录；不等于已证明不存在。</p>}</section>
}
