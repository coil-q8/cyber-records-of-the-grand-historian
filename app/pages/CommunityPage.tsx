import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, PenLine, Search } from 'lucide-react'
import { PageHero } from '../../components/PageHero'
import { CommunityArticleBody } from '../../components/CommunityArticleBody'
import { api, ApiError, errorMessage } from '../../lib/account'
import { useUrlFilters } from '../../lib/useUrlFilters'
import { formatDateTime } from '../../lib/community-helpers'
import { categories } from '../../data/categories'
import type { CommunityArticle, PageResult } from '../../types/community'

export function CommunityPage() {
  const { params, write } = useUrlFilters(), query = params.get('q') ?? '', category = params.get('category') ?? '全部', page = Math.max(1, Number(params.get('page')) || 1)
  const [result, setResult] = useState<PageResult<CommunityArticle> | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true), [reload, setReload] = useState(0)
  const key = params.toString()
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('')
    const timer = window.setTimeout(() => api<PageResult<CommunityArticle>>(`/api/community/posts?${key}`, 'GET', undefined, undefined, controller.signal).then(setResult).catch((error) => { if (!controller.signal.aborted) setError(errorMessage(error)) }).finally(() => { if (!controller.signal.aborted) setLoading(false) }), 180)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [key, reload])
  function filter(name: string, value: string) { write((next) => { if (value && value !== '全部') next.set(name, value); else next.delete(name); if (name !== 'page') next.delete('page'); return next }) }
  return <><PageHero eyebrow="THE COMMON RECORDS / 众人共撰" title="共撰" description="让亲历、追索与不同的观察留下出处。此处收录用户投稿，并展示管理员审核通过的版本。" meta={<Link className="text-link" to="/write"><PenLine size={16} />我也来写</Link>} /><section className="section page-shell community-page">
    <div className="community-intro"><span>投稿 → 管理员审核 → 公开阅读</span><p>用户文章保留作者署名与来源；通过刊载审核不代表所有事实均已获得独立证实。请结合原始材料阅读。</p></div>
    <div className="continuation-filters"><label className="search-field"><Search size={18} /><input aria-label="检索共撰文章" value={query} onChange={(event) => filter('q', event.target.value)} placeholder="搜标题、正文、摘要或标签……" /></label><label>卷目<select aria-label="共撰卷目" value={category} onChange={(event) => filter('category', event.target.value)}><option>全部</option>{categories.map((item) => <option key={item.name}>{item.name}</option>)}</select></label><span role="status">{loading ? '正在检索……' : `共 ${result?.total ?? 0} 篇`}</span></div>
    {error && <div className="community-error" role="alert">{error}<button onClick={() => setReload((value) => value + 1)}>重试</button></div>}
    {!loading && !error && !result?.items.length && <div className="community-empty"><h2>{query || category !== '全部' ? '未检得相应文章' : '案几已备，待众人落笔'}</h2><p>{query || category !== '全部' ? '可以调整关键词或卷目再试。' : '投稿审核通过后，会在这里公开展示。'}</p><Link className="button" to="/write">写下第一篇 <ArrowRight size={16} /></Link></div>}
    {!error && <div className="community-grid" aria-busy={loading}>{!loading && result?.items.map((item) => <article key={item.id} className="community-card"><span className="eyebrow">{item.category}卷 · 用户共撰</span><h2><Link to={`/community/${item.id}`}>{item.title}</Link></h2><p>{item.summary}</p><div className="community-card__tags">{item.tags.map((tag) => <button key={tag} onClick={() => filter('q', tag)}>#{tag}</button>)}</div><footer><span>{item.authorName} 撰<small>{formatDateTime(item.publishedAt)}</small></span><Link className="text-link" to={`/community/${item.id}`}>阅读全文 <ArrowRight size={16} /></Link></footer></article>)}</div>}
    {!loading && !error && result && result.total > result.pageSize && <nav className="community-pagination" aria-label="共撰文章分页"><button className="button button--ghost" disabled={page <= 1} onClick={() => filter('page', String(page - 1))}>上一页</button><span>第 {page} / {Math.ceil(result.total / result.pageSize)} 页</span><button className="button button--ghost" disabled={page * result.pageSize >= result.total} onClick={() => filter('page', String(page + 1))}>下一页</button></nav>}
  </section></>
}
export function CommunityArticlePage() {
  const { id } = useParams(), [article, setArticle] = useState<CommunityArticle | null>(null), [error, setError] = useState(''), [notFound, setNotFound] = useState(false), [loading, setLoading] = useState(true), [reload, setReload] = useState(0)
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setNotFound(false); setArticle(null)
    api<CommunityArticle>(`/api/community/posts/${id}`, 'GET', undefined, undefined, controller.signal).then(setArticle).catch((error) => { if (!controller.signal.aborted) { setNotFound(error instanceof ApiError && error.status === 404); setError(errorMessage(error)) } }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [id, reload])
  return <section className="section page-shell community-article-page"><Link className="text-link" to="/community"><ArrowLeft size={16} />返回共撰</Link>{loading ? <p role="status">正在取阅文章……</p> : error ? <div className="community-empty"><h1>{notFound ? '此篇尚未公开' : '暂时无法取阅'}</h1><p role="alert">{error}</p>{!notFound && <button className="button" onClick={() => setReload((value) => value + 1)}>重试</button>}</div> : article && <article><header className="community-article-header"><span className="eyebrow">{article.category}卷 · 用户共撰 · 刊载版本 v{article.version}</span><h1>{article.title}</h1><p>{article.authorName} 撰{article.eventDate && <span>事件日期 {article.eventDate}</span>}</p><small>刊载 {formatDateTime(article.publishedAt)} · 更新 {formatDateTime(article.updatedAt)}</small><div className="community-card__tags">{article.tags.map((tag) => <Link key={tag} to={`/community?q=${encodeURIComponent(tag)}`}>#{tag}</Link>)}</div></header><CommunityArticleBody article={article} /><div className="community-intro"><p>本文为用户投稿，经管理员审核后刊载。文中观点由作者表达，事实判断请追溯所列史料。</p></div></article>}</section>
}
