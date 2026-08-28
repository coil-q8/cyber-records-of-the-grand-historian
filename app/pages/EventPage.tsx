import { AlertTriangle, ArrowLeft, ArrowRight, Check, Copy, ExternalLink, Link2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { categories, severityDescriptions } from '../../data/categories'
import { chronologicalEvents, getEventById, getRelatedEvents, getSameCaseEvents } from '../../lib/events'
import { EvidenceBadge } from '../../components/EvidenceBadge'
import { EventCard } from '../../components/EventCard'
import { FavoriteButton } from '../../components/FavoriteButton'
import { RandomHistoryButton } from '../../components/RandomHistoryButton'
import type { EventRecord, PublicCommentRecord } from '../../types/event'

export function EventPage() {
  const { id } = useParams()
  const event = getEventById(id)
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const index = event ? chronologicalEvents.findIndex((item) => item.id === event.id) : -1
  const previous = index > 0 ? chronologicalEvents[index - 1] : undefined
  const next = index >= 0 && index < chronologicalEvents.length - 1 ? chronologicalEvents[index + 1] : undefined
  const related = useMemo(() => event ? getRelatedEvents(event, 3) : [], [event])
  const sameCase = useMemo(() => event ? getSameCaseEvents(event) : [], [event])

  useEffect(() => {
    const onKeyDown = (keyboardEvent: KeyboardEvent) => {
      const target = keyboardEvent.target as HTMLElement
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
      if (keyboardEvent.key === 'ArrowLeft' && previous) navigate(`/event/${previous.id}`)
      if (keyboardEvent.key === 'ArrowRight' && next) navigate(`/event/${next.id}`)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [previous, next, navigate])

  if (!event) return <Navigate to="/404" replace />
  const category = categories.find((item) => item.name === event.category)!
  const archivalState = archivalStateLabels[event.researchStatus]
  const hasFactBoundary = Boolean(
    event.verifiedFacts?.length || event.disputedClaims?.length || event.debunkedClaims?.length || event.unresolvedQuestions?.length,
  )

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return <article className="record-page">
    <header className="record-header archive-grid" style={{ '--category-color': category.color } as React.CSSProperties}>
      <div className="page-shell">
        <Link className="back-link" to="/archive">← 返回档案索引</Link>
        {(event.evidenceLevel === '强争议' || event.evidenceLevel === '未核实') && <div className="controversy-alert"><strong><AlertTriangle size={15} /> 尚无最终定论</strong><span>本页保存争议及现有证据，不表示相关指控已经成立。</span></div>}
        <div className="record-header__number"><span>史馆藏案</span><strong>{event.archiveCode}</strong></div>
        <h1>{event.title}</h1>
        <div className="record-header__meta"><span>{event.year}</span><span style={{ color: category.color }}>{event.category}卷</span><span className={`severity severity--${event.severity}`}>{event.severity} 等</span><EvidenceBadge level={event.evidenceLevel} /></div>
        <div className={`archive-state archive-state--${event.researchStatus}`}><span>编纂状态</span><strong>{archivalState.label}</strong><small>{archivalState.description}</small></div>
        <div className="record-header__actions"><FavoriteButton eventId={event.id} label /><button className="button button--small button--ghost" type="button" onClick={copyLink}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? '已复制' : '复制链接'}</button></div>
      </div>
    </header>

    <div className="record-layout page-shell">
      <aside className="record-index"><span>卷内索引</span><a href="#benji">本事</a><a href="#shimo">始末</a><a href="#kaozheng">考证</a><a href="#shijia">史家曰</a>{sameCase.length ? <a href="#mutual-reference">互见</a> : null}</aside>
      <div className="record-body">
        <div className="record-disclaimer"><span>恶劣度 {event.severity}</span><p>{severityDescriptions[event.severity]}。此为编辑评价，不等同于司法定性；证据边界以“考证”所列材料为准。</p></div>

        <section className="record-chapter" id="benji">
          <ChapterHeading number="一" title="本事" />
          <Paragraphs content={event.summary} />
          <SourceRefs ids={event.sectionSources?.summary} event={event} />
        </section>

        <section className="record-chapter" id="shimo">
          <ChapterHeading number="二" title="始末" />
          <Paragraphs content={event.initialNarrative ?? event.historicalMeaning} />
          {event.publicQuestion && <aside className="record-question"><span>当时之问</span><Paragraphs content={event.publicQuestion} /><SourceRefs ids={event.sectionSources?.publicQuestion} event={event} /></aside>}
          {event.timeline?.length ? <Timeline event={event} /> : null}
          {event.propagationChain?.length ? <details className="archive-fold"><summary>展开传播脉络</summary><div className="propagation-chain">{event.propagationChain.map((item, itemIndex) => <div key={`${item.stage}-${itemIndex}`}><span>{item.stage}</span><h3>{item.title}</h3><p>{item.description}</p><SourceRefs ids={item.sourceIds} event={event} /></div>)}</div></details> : null}
          {event.publicComments?.length ? <FolkArchive comments={event.publicComments} /> : null}
        </section>

        <section className="record-chapter" id="kaozheng">
          <ChapterHeading number="三" title="考证" />
          <Sources event={event} />
          <div className="verification-prose"><Paragraphs content={event.investigation ?? `原稿证据记载：${event.evidenceBasis}。`} /><SourceRefs ids={event.sectionSources?.investigation} event={event} /></div>
          {event.mediaRole && <details className="archive-fold archive-fold--plain"><summary>报道与传播说明</summary><Paragraphs content={event.mediaRole} /><SourceRefs ids={event.sectionSources?.mediaRole} event={event} /></details>}
          {event.contentBlocks?.length ? <div className="content-blocks"><span>详考</span>{event.contentBlocks.map((block, blockIndex) => <div className={`content-block content-block--${block.type}`} key={`${block.type}-${blockIndex}`}>{block.type === 'heading' ? <h3>{block.text}</h3> : block.type === 'quote' ? <blockquote>{block.text}</blockquote> : <p>{block.text}</p>}<SourceRefs ids={block.sourceIds} event={event} /></div>)}</div> : null}
          {hasFactBoundary && <FactBoundary event={event} />}
          <div className="record-verdict"><span>考证结论</span><Paragraphs content={event.finalConclusion ?? `截至资料截止日，本条证据状态为“${event.evidenceLevel}”，处置状态为“${event.status}”。`} /><SourceRefs ids={event.sectionSources?.finalConclusion} event={event} /></div>
        </section>

        <section className="historian-note" id="shijia"><span>史家曰</span><blockquote>{event.historianNote ?? event.historicalMeaning}</blockquote></section>
        {sameCase.length ? <section className="mutual-reference" id="mutual-reference"><span>互见 · 同案异卷</span><p>同一现实事件在不同卷目中各取一端，互为补证，不作重复计案。</p>{sameCase.map((item) => <Link key={item.id} to={`/event/${item.id}`}><small>{item.category}卷</small><strong>{item.title}</strong><ArrowRight size={15} /></Link>)}</section> : null}
        <section className="record-tags"><span>索引标签</span><div>{event.tags.map((tag) => <Link key={tag} to={`/archive?tag=${encodeURIComponent(tag)}`}>#{tag}</Link>)}</div></section>
      </div>
      <aside className="record-facts"><div><span>归档日期</span><strong>{event.date}</strong></div><div><span>主体类型</span><strong>{event.subjectType}</strong></div><div><span>证据依据</span><strong>{event.evidenceBasis}</strong></div><div><span>处置状态</span><strong>{event.status}</strong></div>{event.caseId && <div><span>同案号</span><strong>{event.caseId}</strong></div>}</aside>
    </div>

    <nav className="record-pagination page-shell">{previous ? <Link to={`/event/${previous.id}`}><ArrowLeft /><span><small>上一案</small><strong>{previous.title}</strong></span></Link> : <span /> }<RandomHistoryButton currentId={event.id} variant="text" />{next ? <Link to={`/event/${next.id}`}><span><small>下一案</small><strong>{next.title}</strong></span><ArrowRight /></Link> : <span />}</nav>
    {related.length > 0 && <section className="section page-shell related-records"><span className="eyebrow">同类卷宗</span><h2>循迹再读</h2><div className="event-grid">{related.map((item, relatedIndex) => <EventCard key={item.id} event={item} index={relatedIndex} compact />)}</div></section>}
  </article>
}

function ChapterHeading({ number, title }: { number: string; title: string }) {
  return <header className="record-chapter__head"><span>{number}</span><h2>{title}</h2></header>
}

function Paragraphs({ content }: { content: string }) {
  return <>{content.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</>
}

function SourceRefs({ ids, event }: { ids?: string[]; event: EventRecord }) {
  if (!ids?.length) return null
  return <span className="source-refs">据 {ids.map((id) => {
    const index = event.sources.findIndex((source) => source.id === id)
    return index >= 0 ? <a key={id} href={`#source-${id}`} aria-label={`跳转到史料 ${index + 1}`}>〔{index + 1}〕</a> : null
  })}</span>
}

function Timeline({ event }: { event: EventRecord }) {
  return <div className="record-subsection"><h3>年表</h3><div className="case-timeline">{event.timeline!.map((item, itemIndex) => <div key={`${item.date}-${itemIndex}`}><time>{item.date}</time><div><h4>{item.title}</h4><p>{item.description}</p><SourceRefs ids={item.sourceIds} event={event} /></div></div>)}</div></div>
}

function FactBoundary({ event }: { event: EventRecord }) {
  const groups = [
    { title: '已证实', mark: '实', key: 'verifiedFacts' as const, tone: 'verified' },
    { title: '存争议', mark: '疑', key: 'disputedClaims' as const, tone: 'disputed' },
    { title: '已证伪', mark: '伪', key: 'debunkedClaims' as const, tone: 'debunked' },
    { title: '仍未知', mark: '阙', key: 'unresolvedQuestions' as const, tone: 'unresolved' },
  ]
  return <div className="record-subsection" id="fact-boundary"><h3>事实边界</h3><div className="fact-boundary">{groups.map((group) => <div className={`fact-boundary__group fact-boundary__group--${group.tone}`} key={group.key}><div><span>{group.mark}</span><h4>{group.title}</h4></div>{event[group.key]?.length ? <ul>{event[group.key]!.map((fact, index) => <li key={index}>{fact}</li>)}</ul> : <p>当前未收录</p>}</div>)}</div></div>
}

function FolkArchive({ comments }: { comments: PublicCommentRecord[] }) {
  const originals = comments.filter((comment) => comment.quoteType === '原话')
  const summaries = comments.filter((comment) => comment.quoteType !== '原话')
  return <div className="record-subsection folk-archive" id="folk-archive">
    <h3>{originals.length ? '民议原声' : '民议线索'}</h3>
    <p className="archive-caveat">逐字引语与编者概述分开呈现。点赞、转发只说明传播，不作为事实真伪的证明。</p>
    <div className="public-comments">
      {originals.map((comment, index) => <CommentEntry comment={comment} key={`original-${index}`} original />)}
      {summaries.map((comment, index) => <CommentEntry comment={comment} key={`summary-${index}`} />)}
    </div>
  </div>
}

function CommentEntry({ comment, original = false }: { comment: PublicCommentRecord; original?: boolean }) {
  return <article className={original ? 'public-comment--original' : 'public-comment--summary'}>
    <div><span>{original ? '逐字原话' : '编者概述 · 非逐字引语'}</span><small>{comment.platform}{comment.date ? ` · ${comment.date}` : ''}</small></div>
    {original ? <blockquote>{comment.text}</blockquote> : <p className="comment-summary">{comment.text}</p>}
    <p><strong>语境：</strong>{comment.context}</p>
    {(comment.evidenceGrade || comment.verificationStatus || comment.originType) && <p className="folk-evidence-meta">{comment.evidenceGrade && <span>{comment.evidenceGrade} 等</span>}{comment.verificationStatus && <span>{comment.verificationStatus}</span>}{comment.originType && <span>{comment.originType}</span>}</p>}
    {comment.independentVerification && <p><strong>旁证：</strong>{comment.independentVerification}</p>}
    {comment.laterStatus && <p><strong>后续：</strong>{comment.laterStatus}</p>}
    {comment.url && <a href={comment.url} target="_blank" rel="noreferrer">查看留档 <ExternalLink size={13} /></a>}
  </article>
}

function Sources({ event }: { event: EventRecord }) {
  const orderedSources = event.sources
    .map((source, originalIndex) => ({ source, originalIndex }))
    .sort((left, right) => left.source.sourceRank - right.source.sourceRank || left.originalIndex - right.originalIndex)
  return <div className="sources" id="sources"><div className="sources__head"><div><span>史料原件在先</span><h3>史料与出处</h3></div><p>第一等为正式调查、行政或司法材料；第二等为当事人或网民原始内容。来源等级表示材料位置，不表示其中每句话都已证实。</p></div><div className="source-list">{orderedSources.map(({ source, originalIndex }) => {
    const content = <><span className="source-number">〔{originalIndex + 1}〕</span><div><strong>{source.title}</strong><small>{source.institution} · {source.date}</small><div className="source-meta"><span>{sourceRankLabels[source.sourceRank]}</span><span>{source.sourceType}</span><span>所据：{source.sourceRole}</span><span>{source.archiveStatus}</span></div>{source.note && <p>{source.note}</p>}</div>{source.url ? <ExternalLink size={16} /> : <Link2 size={16} />}</>
    return source.url ? <a id={`source-${source.id}`} key={source.id} href={source.url} target="_blank" rel="noreferrer">{content}</a> : <div id={`source-${source.id}`} className="source-pending" key={source.id}>{content}</div>
  })}</div></div>
}

const sourceRankLabels = { 1: '第一等史料', 2: '第二等史料', 3: '第三等史料', 4: '第四等史料', 5: '线索' } as const
const archivalStateLabels: Record<EventRecord['researchStatus'], { label: string; description: string }> = {
  untouched: { label: '待考', description: '尚未进入逐条深挖，不视为通过内容审校。' },
  researching: { label: '续考', description: '史料正在补录，当前文字仍可能修订。' },
  researched: { label: '成案', description: '已完成本轮核查，后续新材料仍可增补。' },
  'needs-review': { label: '续考', description: '已发现需要复核的来源、表述或证据边界。' },
  disputed: { label: '疑传', description: '关键主张仍有冲突，保留异说，不作强断。' },
}
