import { Link } from 'react-router-dom'
import { PageHero } from '../../components/PageHero'
import { TimelineRail } from '../../components/TimelineRail'
import { categories } from '../../data/categories'
import { getEventsByYear, years } from '../../lib/events'

export function TimelinePage() {
  return <><PageHero eyebrow="TEN-YEAR RIVER / 时间长河" title="2016—2026" description="沿年份浏览文档的收录密度与代表性事件。数量显示的是本版编纂范围，不代表现实中当年事件总量。" meta={<span>11 YEARS · 142 RECORDS</span>} /><section className="section page-shell"><TimelineRail standalone /><div className="year-ledger">{years.map((year) => { const yearEvents = getEventsByYear(year); return <Link key={year} to={`/year/${year}`}><span>{year}</span><div><strong>{yearEvents.length} 条档案</strong><p>{yearEvents.slice(0, 3).map((event) => event.title).join('　/　')}</p><div className="year-ledger__bars">{categories.map((category) => { const count = yearEvents.filter((event) => event.category === category.name).length; return count ? <i key={category.name} style={{ width: `${count / yearEvents.length * 100}%`, background: category.color }} title={`${category.name} ${count}`} /> : null })}</div></div><b>开卷 ↗</b></Link>})}</div></section></>
}
