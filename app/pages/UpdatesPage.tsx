import { ArrowRight, BookOpen, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useUrlFilters } from '../../lib/useUrlFilters'
import { PageHero } from '../../components/PageHero'
import { EmptyState } from '../../components/EmptyState'
import { EvidenceBadge } from '../../components/EvidenceBadge'
import { categories } from '../../data/categories'
import { archiveMeta, evidenceProfile, getEventById, latestAdditions, matchesSearch, originalRecordCount } from '../../lib/events'

export function UpdatesPage() {
  const { params, filter } = useUrlFilters()
  const query = params.get('q') ?? ''
  const category = params.get('category') ?? '全部'
  const status = params.get('status') ?? '全部'
  const filtered = latestAdditions.filter((event) => matchesSearch(event, query)
    && (category === '全部' || event.category === category)
    && (status === '全部' || event.researchStatus === status))

  return <>
    <PageHero eyebrow="THE CONTINUATIONS / 续编札记" title="续编" description="热搜之后，还有下文。将新入库的篇目、核验日期、来源缺口与尚未落定的后续一起保存。" meta={<span>本轮检索截至 {archiveMeta.researchCutoff}</span>} />
    <section className="section page-shell updates-page">
      <div className="continuation-note"><BookOpen size={22} /><div><h2>原稿 {originalRecordCount} 篇，续入 {latestAdditions.length} 篇</h2><p>{archiveMeta.scopeNote}</p><Link className="text-link" to="/compare">挑两篇，放在一起读 <ArrowRight size={15} /></Link></div></div>
      <div className="continuation-filters" aria-label="续编筛选">
        <label className="search-field"><Search size={18} /><input aria-label="检索续编" value={query} onChange={(event) => filter('q', event.target.value)} placeholder="搜篇名、机构、正文或来源……" /></label>
        <label>卷目<select aria-label="续编卷目" value={category} onChange={(event) => filter('category', event.target.value)}>{['全部', ...categories.map((item) => item.name)].map((name) => <option key={name}>{name}</option>)}</select></label>
        <label>编纂状态<select aria-label="续编状态" value={status} onChange={(event) => filter('status', event.target.value)}><option value="全部">全部</option><option value="researched">已整理</option><option value="needs-review">待复核</option><option value="disputed">存争议</option></select></label>
        <span role="status">检得 {filtered.length} 篇</span>
      </div>
      <div className="continuation-list">{filtered.map((event) => {
        const profile = evidenceProfile(event)
        return <article key={event.id} className="continuation-entry">
          <div className="continuation-entry__date"><time dateTime={event.firstRecordedAt}>{event.firstRecordedAt}</time><span>续入 · {event.category}卷</span><small>事件时间 {event.date}</small></div>
          <div className="continuation-entry__body"><span className="eyebrow">{event.archiveCode}</span><h2><Link to={`/event/${event.id}`}>{event.title}</Link></h2><p>{event.summary}</p><div className="continuation-entry__note"><span>本次记入</span><p>{event.updateNote}</p></div><div className="continuation-entry__meta"><EvidenceBadge level={event.evidenceLevel} /><span>{event.researchStatus === 'researched' ? '已整理' : event.researchStatus === 'disputed' ? '存争议' : '待复核'}</span><span>{profile.total} 则史料 · {profile.pending} 则待补核验</span></div><div className="continuation-entry__actions"><Link className="text-link" to={`/event/${event.id}`}>阅读全文 <ArrowRight size={15} /></Link><Link className="text-link" to={`/compare?left=${event.id}`}>选此篇对读 <ArrowRight size={15} /></Link></div></div>
        </article>
      })}</div>
      {!filtered.length && <EmptyState title="此轮续编未检得对应篇目" description="可以清空关键词或调整卷目、编纂状态。" />}
      <section className="continuation-revisions"><span className="eyebrow">旧篇补记 / REVISIONS</span><h2>新证据，也要回写旧篇</h2>{archiveMeta.revisions.map((revision) => <article key={revision.eventId}><h3><Link to={`/event/${revision.eventId}`}>{getEventById(revision.eventId)?.title}</Link></h3><p>{revision.note}</p><small>本轮核验 {archiveMeta.researchCutoff} · 事件日期不变</small></article>)}</section>
    </section>
  </>
}
