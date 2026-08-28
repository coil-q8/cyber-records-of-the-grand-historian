import { Navigate, useParams } from 'react-router-dom'
import { EventCard } from '../../components/EventCard'
import { PageHero } from '../../components/PageHero'
import { categories } from '../../data/categories'
import { getEventsByYear, years } from '../../lib/events'

export function YearPage() {
  const year = Number(useParams().year)
  if (!years.includes(year)) return <Navigate to="/404" replace />
  const yearEvents = getEventsByYear(year)
  return <><PageHero eyebrow={`YEAR FILE / ${year}`} title={`${year} 年卷`} description={`本卷共收录 ${yearEvents.length} 条记录。页面只表示《赛博史记》当前文档的收录情况，不声称穷尽当年全部互联网公共事件。`} back={{ label: '返回时间长河', to: '/timeline' }} meta={<><strong>{yearEvents.length}</strong><span>条档案</span></>} /><section className="section page-shell"><div className="year-summary"><div><span>卷宗密度</span><strong>{String(yearEvents.length).padStart(2, '0')}</strong></div><div className="year-summary__distribution">{categories.map((category) => { const count = yearEvents.filter((event) => event.category === category.name).length; return <div key={category.name}><span><i style={{ background: category.color }} />{category.name}</span><b>{count}</b><em style={{ width: `${count / yearEvents.length * 100}%`, background: category.color }} /></div> })}</div><div><span>高严重度</span><strong>{yearEvents.filter((event) => event.severity === 'S').length}</strong><small>S 级为编辑评价</small></div></div><div className="event-grid">{yearEvents.map((event, index) => <EventCard key={event.id} event={event} index={index} />)}</div></section></>
}
