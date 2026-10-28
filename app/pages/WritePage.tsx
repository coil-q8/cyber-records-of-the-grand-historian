import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Plus, Save, Send, Trash2 } from 'lucide-react'
import { PageHero } from '../../components/PageHero'
import { AccountGate } from '../../components/AccountGate'
import { CommunityArticleBody } from '../../components/CommunityArticleBody'
import { api, useAccount, errorMessage } from '../../lib/account'
import { formatDateTime } from '../../lib/community-helpers'
import { categories } from '../../data/categories'
import { submissionLabels, type ArticleInput, type ReviewEntry, type Submission } from '../../types/community'

const blank = (): ArticleInput => ({ title: '', category: '丑角', eventDate: '', summary: '', body: '', sources: [], tags: [] })
export function WritePage() {
  const { id } = useParams(), navigate = useNavigate(), account = useAccount()
  const [input, setInput] = useState<ArticleInput>(blank), [record, setRecord] = useState<Submission | null>(null), [reviews, setReviews] = useState<ReviewEntry[]>([])
  const [baseline, setBaseline] = useState(JSON.stringify(blank())), [loading, setLoading] = useState(!!id), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [preview, setPreview] = useState(false), [reload, setReload] = useState(0)
  const dirty = JSON.stringify(input) !== baseline, pending = record?.status === 'pending'
  function adopt(next: Submission) { const content: ArticleInput = { title: next.title, category: next.category, eventDate: next.eventDate, summary: next.summary, body: next.body, sources: next.sources, tags: next.tags }; setRecord(next); setInput(content); setBaseline(JSON.stringify(content)) }
  useEffect(() => {
    if (!account.session.user) return
    if (!id) { setInput(blank()); setRecord(null); setReviews([]); setBaseline(JSON.stringify(blank())); setLoading(false); return }
    if (record?.id === id && record.authorId === account.session.user.id) { setLoading(false); return }
    const controller = new AbortController(); setLoading(true); setError('')
    api<{ submission: Submission; reviews: ReviewEntry[] }>(`/api/my/submissions/${id}`, 'GET', undefined, undefined, controller.signal).then((result) => { adopt(result.submission); setReviews(result.reviews) }).catch((error) => { if (!controller.signal.aborted) setError(errorMessage(error)) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [id, account.session.user?.id, reload])
  useEffect(() => {
    const prevent = (event: BeforeUnloadEvent) => { if (dirty && !pending) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', prevent); return () => window.removeEventListener('beforeunload', prevent)
  }, [dirty, pending])
  function field<K extends keyof ArticleInput>(name: K, value: ArticleInput[K]) { setInput((previous) => ({ ...previous, [name]: value })); setNotice('') }
  async function save(submit: boolean) {
    setBusy(true); setError(''); setNotice('')
    try {
      const content = { ...input, tags: input.tags.filter((tag) => tag.trim()), sources: input.sources.filter((source) => source.title.trim() || source.url.trim()) }
      let saved = record
      if (!saved || dirty) saved = await api<Submission>(saved ? `/api/my/submissions/${saved.id}` : '/api/my/submissions', saved ? 'PUT' : 'POST', { ...content, version: saved?.version }, account.session.csrfToken)
      adopt(saved)
      if (!id) navigate(`/write/${saved.id}`, { replace: true })
      if (submit) saved = await api<Submission>(`/api/my/submissions/${saved.id}/submit`, 'POST', { version: saved.version }, account.session.csrfToken)
      adopt(saved); setNotice(submit ? '投稿已提交，管理员审核后会公开。' : '草稿已保存到账号。')
    } catch (error) { setError(errorMessage(error)) } finally { setBusy(false) }
  }
  async function withdraw() {
    if (!record) return
    setBusy(true); setError('')
    try { adopt(await api<Submission>(`/api/my/submissions/${record.id}/withdraw`, 'POST', { version: record.version }, account.session.csrfToken)); setNotice('已撤回，可继续修改后重新提交。') } catch (error) { setError(errorMessage(error)) } finally { setBusy(false) }
  }
  async function remove() {
    if (!record || !window.confirm('删除这篇草稿？此操作无法撤销。')) return
    setBusy(true); setError('')
    try { await api(`/api/my/submissions/${record.id}`, 'DELETE', { version: record.version }, account.session.csrfToken); navigate('/account', { replace: true }) } catch (error) { setError(errorMessage(error)); setBusy(false) }
  }
  return <><PageHero eyebrow="WRITE A RECORD / 落笔为记" title={id ? '我的稿件' : '撰稿'} description="先叙其事，再列所据。可以保存草稿，确认事实边界与史料后提交审核。" meta={<Link className="text-link" to="/account"><ArrowLeft size={16} />我的账号</Link>} />
    {account.loading || account.error || !account.session.user ? <AccountGate account={account} /> : <section className="section page-shell writing-page">
      {loading ? <p role="status">正在取回稿件……</p> : error && id && !record ? <div className="community-error" role="alert">{error}<button onClick={() => setReload((value) => value + 1)}>重试</button></div> : <>
        <div className="writing-status"><div><span className={`submission-status submission-status--${record?.status ?? 'draft'}`}>{submissionLabels[record?.status ?? 'draft']}</span><span role="status">{busy ? '正在保存……' : dirty ? '有尚未保存的修改' : record ? `已保存 · ${formatDateTime(record.updatedAt)}` : '新建稿件'}</span></div>{record?.publishedVersion && <Link className="text-link" to={`/community/${record.id}`}>查看公开版本 v{record.publishedVersion} <ExternalLink size={15} /></Link>}</div>
        {record?.publishedVersion && <p className="community-intro">公开页面保留上一次审核通过的版本；此处的修改仍需重新提交审核。</p>}
        {record?.reviewNote && <div className="review-feedback"><span>管理员审核意见</span><p>{record.reviewNote}</p></div>}
        {pending && <div className="review-feedback"><p>稿件正在等待审核。如需修改，请先撤回投稿。</p><button className="button button--ghost" onClick={withdraw} disabled={busy}>撤回并继续修改</button></div>}
        <div className="account-tabs"><button type="button" aria-pressed={!preview} onClick={() => setPreview(false)}>撰写</button><button type="button" aria-pressed={preview} onClick={() => setPreview(true)}>预览</button></div>
        {preview ? <article className="writing-preview"><span className="eyebrow">{input.category}卷 · 投稿预览</span><h1>{input.title || '未题名草稿'}</h1><p>{account.session.user.displayName} 撰</p><CommunityArticleBody article={input} /></article> : <form className="community-form writing-form" onSubmit={(event) => { event.preventDefault(); void save(false) }}>
          <fieldset disabled={busy || pending}><label>篇名<input aria-label="篇名" value={input.title} onChange={(event) => field('title', event.target.value)} maxLength={120} placeholder="以事实为题，避免将质疑写成定论" /></label>
          <div className="writing-fields"><label>卷目<select aria-label="稿件卷目" value={input.category} onChange={(event) => field('category', event.target.value)}>{categories.map((category) => <option key={category.name}>{category.name}</option>)}</select></label><label>事件日期<input aria-label="事件日期" value={input.eventDate} onChange={(event) => field('eventDate', event.target.value)} maxLength={10} placeholder="YYYY、YYYY-MM 或 YYYY-MM-DD" /><small>仅填已知精度，不必补出未知月日。</small></label></div>
          <label>摘要<textarea aria-label="摘要" rows={4} value={input.summary} onChange={(event) => field('summary', event.target.value)} maxLength={600} placeholder="交代事件、现有证据及未解决的问题" /><small>{input.summary.length} / 600 字 · 提交审核至少30字</small></label>
          <label>正文<textarea className="writing-body-input" aria-label="正文" rows={22} value={input.body} onChange={(event) => field('body', event.target.value)} maxLength={50000} placeholder="用空行分段。可依次叙述事件经过、不同说法、调查结论和仍待核验的问题，并在相关段落注明史料编号。" /><small>{input.body.length} / 50000 字 · 提交审核至少300字</small></label>
          <label>索引标签<input aria-label="索引标签" value={input.tags.join('，')} onChange={(event) => field('tags', event.target.value.split(/[,，]/u).map((tag) => tag.trim()).slice(0, 8))} placeholder="用中文或英文逗号分隔，最多8个" /></label>
          <section className="writing-sources"><div className="community-section-head"><h2>史料与出处</h2><button className="text-link" type="button" disabled={input.sources.length >= 12} onClick={() => field('sources', [...input.sources, { title: '', url: '' }])}><Plus size={16} />添加来源</button></div><p>至少提供一则可核查来源。原帖、正式文书或原始回应应优先列出，并说明它实际能证明什么。</p>{input.sources.map((source, index) => <div className="writing-source-row" key={index}><span>〔{index + 1}〕</span><label>来源标题<input aria-label={`来源${index + 1}标题`} value={source.title} onChange={(event) => field('sources', input.sources.map((item, position) => position === index ? { ...item, title: event.target.value } : item))} maxLength={160} /></label><label>来源网址<input type="url" aria-label={`来源${index + 1}网址`} value={source.url} onChange={(event) => field('sources', input.sources.map((item, position) => position === index ? { ...item, url: event.target.value } : item))} maxLength={2000} placeholder="https://…" /></label><button type="button" aria-label={`移除来源${index + 1}`} onClick={() => field('sources', input.sources.filter((_, position) => position !== index))}><Trash2 size={17} /></button></div>)}</section></fieldset>
          <button type="submit" className="sr-only" disabled={busy || pending}>保存草稿</button>
        </form>}
        <div className="writing-toolbar">{!pending && <><button className="button button--ghost" onClick={() => void save(false)} disabled={busy || (!!record && !dirty)}><Save size={16} />保存草稿</button><button className="button" onClick={() => void save(true)} disabled={busy || (record?.status === 'approved' && !dirty)}><Send size={16} />提交审核</button></>}<Link className="text-link" to="/account" onClick={(event) => { if (dirty && !window.confirm('还有未保存的修改，确定离开？')) event.preventDefault() }}>返回我的稿件</Link>{record?.status === 'draft' && !record.publishedVersion && !reviews.length && <button className="text-link community-danger" onClick={() => void remove()} disabled={busy}>删除草稿</button>}</div>
        {error && <p role="alert" className="form-error">{error}</p>}{notice && <p role="status" className="form-success">{notice}</p>}
        {!!reviews.length && <ReviewHistory entries={reviews} />}
      </>}
    </section>}
  </>
}
export function ReviewHistory({ entries }: { entries: ReviewEntry[] }) {
  return <section className="review-history"><h2>审核记录</h2>{entries.map((item) => <article key={item.id}><span>{item.action === 'approve' ? '通过刊载' : item.action === 'reject' ? '退回修改' : '下架公开版本'} · v{item.version}</span><p>{item.note || '已通过本次刊载审核。'}</p><small>{item.reviewerName} · {formatDateTime(item.createdAt)}</small></article>)}</section>
}
