import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Undo2 } from 'lucide-react'
import { PageHero } from '../../components/PageHero'
import { AccountGate } from '../../components/AccountGate'
import { CommunityArticleBody } from '../../components/CommunityArticleBody'
import { ReviewHistory } from './WritePage'
import { api, errorMessage, useAccount } from '../../lib/account'
import { formatDateTime } from '../../lib/community-helpers'
import { useUrlFilters } from '../../lib/useUrlFilters'
import { submissionLabels, type PageResult, type ReviewEntry, type Submission } from '../../types/community'

export function AdminPage() {
  const account = useAccount(), { params, filter, write } = useUrlFilters(), state = params.get('status') ?? 'pending', page = Math.max(1, Number(params.get('page')) || 1)
  const [result, setResult] = useState<PageResult<Submission> | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [reload, setReload] = useState(0)
  useEffect(() => {
    if (account.session.user?.role !== 'admin') return
    const controller = new AbortController(); setLoading(true); setError('')
    api<PageResult<Submission>>(`/api/admin/submissions?status=${encodeURIComponent(state)}&page=${page}`, 'GET', undefined, undefined, controller.signal).then(setResult).catch((error) => { if (!controller.signal.aborted) setError(errorMessage(error)) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [account.session.user?.id, state, page, reload])
  return <><PageHero eyebrow="THE EDITORIAL DESK / 管理员专用" title="审稿台" description="核对事实边界与原始出处，再决定是否刊载。退回与下架需要留下明确理由。" meta={<Link className="text-link" to="/account">我的账号 <ArrowRight size={15} /></Link>} />{account.loading || account.error || account.session.user?.role !== 'admin' ? <AccountGate account={account} admin /> : <section className="section page-shell admin-page">
    <div className="continuation-filters"><label>稿件状态<select aria-label="审核状态" value={state} onChange={(event) => write((next) => { next.set('status', event.target.value); next.delete('page'); return next })}><option value="pending">待审核</option><option value="published">公开刊载中</option><option value="approved">最近审核通过</option><option value="rejected">退回修改</option><option value="draft">作者草稿</option></select></label><span role="status">{loading ? '正在取回……' : `${result?.total ?? 0} 篇`}</span><button className="text-link" onClick={() => setReload((value) => value + 1)}>刷新 ↻</button></div>
    {error && <p role="alert" className="form-error">{error}</p>}
    {!loading && !error && !result?.items.length && <div className="community-empty"><h2>此处暂时没有稿件</h2><p>可以调整审核状态，或稍后刷新查看。</p></div>}
    {!loading && !error && <div className="submission-list">{result?.items.map((item) => <article key={item.id}><div><span className={`submission-status submission-status--${item.status}`}>{submissionLabels[item.status]}</span>{item.publishedVersion && <span className="community-public-note">公开 v{item.publishedVersion}</span>}<h2><Link to={`/admin/review/${item.id}`}>{item.title || '未题名草稿'}</Link></h2><p>{item.summary}</p><small>{item.authorName} 撰 · {item.category}卷 · v{item.version} · 更新 {formatDateTime(item.updatedAt)}</small></div><Link className="text-link" to={`/admin/review/${item.id}`}>打开卷稿 <ArrowRight size={16} /></Link></article>)}</div>}
    {result && result.total > result.pageSize && <nav className="community-pagination" aria-label="审核列表分页"><button className="button button--ghost" disabled={page <= 1} onClick={() => filter('page', String(page - 1))}>上一页</button><span>第 {page} / {Math.ceil(result.total / result.pageSize)} 页</span><button className="button button--ghost" disabled={page * result.pageSize >= result.total} onClick={() => filter('page', String(page + 1))}>下一页</button></nav>}
  </section>}</>
}
export function AdminReviewPage() {
  const { id } = useParams(), account = useAccount()
  const [result, setResult] = useState<{ submission: Submission; reviews: ReviewEntry[] } | null>(null), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [note, setNote] = useState(''), [reload, setReload] = useState(0)
  useEffect(() => {
    if (account.session.user?.role !== 'admin') return
    const controller = new AbortController(); setLoading(true); setError(''); setResult(null)
    api<{ submission: Submission; reviews: ReviewEntry[] }>(`/api/admin/submissions/${id}`, 'GET', undefined, undefined, controller.signal).then(setResult).catch((error) => { if (!controller.signal.aborted) setError(errorMessage(error)) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [id, account.session.user?.id, reload])
  async function decide(decision: 'approve' | 'reject' | 'unpublish') {
    if (!result) return
    if ((decision === 'reject' || decision === 'unpublish') && note.trim().length < 3) { setError('请先填写至少3字的具体理由。'); return }
    if (decision === 'unpublish' && !window.confirm('将此公开版本下架？作者可修改后重新投稿，审核记录会保留。')) return
    setBusy(true); setError(''); setNotice('')
    try {
      const data = await api<{ submission: Submission; reviews: ReviewEntry[] }>(`/api/admin/submissions/${id}/${decision === 'unpublish' ? 'unpublish' : 'review'}`, 'POST', { decision, note, version: decision === 'unpublish' ? result.submission.publishedVersion : result.submission.version }, account.session.csrfToken)
      setResult(data); setNote(''); setNotice(decision === 'approve' ? '已通过审核，文章已在共撰页面公开。' : decision === 'reject' ? '已退回，作者可以看到修改意见。' : '公开版本已下架。')
    } catch (error) { setError(errorMessage(error)) } finally { setBusy(false) }
  }
  const record = result?.submission
  return <><PageHero eyebrow="REVIEW A SUBMISSION / 核稿" title="阅稿" description="阅读原稿，打开来源核对，再留下决定。" meta={<Link className="text-link" to="/admin"><ArrowLeft size={15} />返回审稿台</Link>} />{account.loading || account.error || account.session.user?.role !== 'admin' ? <AccountGate account={account} admin /> : <section className="section page-shell review-page">
    {loading ? <p role="status">正在取回卷稿……</p> : !record ? <div className="community-error" role="alert">{error}<button onClick={() => setReload((value) => value + 1)}>重试</button></div> : <>
      <article className="review-manuscript"><header className="community-article-header"><span className={`submission-status submission-status--${record.status}`}>{submissionLabels[record.status]}</span><h1>{record.title || '未题名草稿'}</h1><p>{record.authorName} 撰 <span>{record.category}卷 · v{record.version}</span></p><small>事件日期 {record.eventDate || '未注明'} · 提交 {formatDateTime(record.submittedAt)}</small>{record.publishedVersion && <p><Link className="text-link" to={`/community/${record.id}`}>查看当前公开版本 v{record.publishedVersion} ↗</Link></p>}</header><CommunityArticleBody article={record} /></article>
      <section className="review-decision"><h2>审核意见</h2><p>通过将刊载当前 v{record.version}。退回请指出需要补充的史料、事实或表述。</p><label className="community-form">意见<textarea aria-label="审核意见" value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} rows={5} disabled={busy} /></label><div className="account-actions">{record.status === 'pending' && <><button className="button" onClick={() => void decide('approve')} disabled={busy}><Check size={16} />通过并公开</button><button className="button button--ghost" onClick={() => void decide('reject')} disabled={busy}><Undo2 size={16} />退回修改</button></>}{record.publishedVersion && <button className="button button--ghost community-danger" onClick={() => void decide('unpublish')} disabled={busy}>下架公开版本</button>}{record.status !== 'pending' && !record.publishedVersion && <p>当前稿件不在待审状态。</p>}</div>{error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="form-success" role="status">{notice}</p>}</section>
      {!!result?.reviews.length && <ReviewHistory entries={result.reviews} />}
    </>}
  </section>}</>
}
