import { Navigate, useParams } from 'react-router-dom'
import { categories } from '../../data/categories'
import { getEventsByCategory } from '../../lib/events'
import type { Category } from '../../types/event'
import { EventCard } from '../../components/EventCard'
import { PageHero } from '../../components/PageHero'

export function VolumePage() {
  const { category: categoryParam } = useParams()
  const meta = categories.find((item) => item.name === categoryParam)
  if (!meta) return <Navigate to="/404" replace />
  const categoryEvents = getEventsByCategory(meta.name as Category)
  return <><PageHero eyebrow={`${meta.number} / ${meta.code}`} title={meta.name} description={meta.scope} back={{ label: '返回五卷', to: '/volumes' }} meta={<><strong>{categoryEvents.length}</strong><span>条档案</span></>} /><section className="section page-shell"><div className="volume-preface" style={{ '--category-color': meta.color } as React.CSSProperties}><span className="volume-preface__seal">{meta.seal}</span><div><span>网史氏曰</span><p>{meta.definition}。本卷只记录文档中已有公开事实与争议边界，不由分类名称推导法律结论。</p></div></div><div className="archive-count"><span>本卷卷宗</span><strong>{categoryEvents.length}</strong><i /></div><div className="event-grid">{categoryEvents.map((event, index) => <EventCard key={event.id} event={event} index={index} />)}</div></section></>
}
