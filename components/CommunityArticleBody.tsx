import type { ArticleInput } from '../types/community'

export function CommunityArticleBody({ article }: { article: ArticleInput }) {
  return <div className="contribution-prose">
    {article.summary && <p className="contribution-summary">{article.summary}</p>}
    <div className="contribution-body">{article.body.split(/\n\s*\n/u).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
    {article.sources.length > 0 && <section className="contribution-sources"><h2>史料与出处</h2><ol>{article.sources.map((source, index) => <li key={index}><a href={/^https?:\/\//iu.test(source.url) ? source.url : undefined} target="_blank" rel="noopener noreferrer">{source.title || source.url}<span>↗</span></a><small>{source.url}</small></li>)}</ol></section>}
  </div>
}
