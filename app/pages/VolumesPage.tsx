import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { categories } from '../../data/categories'
import { getEventsByCategory } from '../../lib/events'
import { PageHero } from '../../components/PageHero'

export function VolumesPage() {
  return <><PageHero eyebrow="BOOK OF FIVE / 卷目" title="五卷" description="借纪传之名，保存企业责任、治理失灵、主动操纵、公共角色与导学权力五种不同机制。分类是编辑索引，不是法律定性。" meta={<span>5 VOLUMES · 142 RECORDS</span>} /><section className="section page-shell volume-list">{categories.map((category) => { const categoryEvents = getEventsByCategory(category.name); const years = new Set(categoryEvents.map((event) => event.year)); return <Link key={category.name} className="volume-list__item" to={`/volume/${category.name}`} style={{ '--category-color': category.color } as React.CSSProperties}><div className="volume-list__number">{category.number}</div><div className="volume-list__seal">{category.seal}</div><div><span>{category.code}</span><h2>{category.name}</h2><p>{category.scope}</p></div><dl><div><dt>档案</dt><dd>{categoryEvents.length}</dd></div><div><dt>年份</dt><dd>{years.size}</dd></div><div><dt>S 级</dt><dd>{categoryEvents.filter((event) => event.severity === 'S').length}</dd></div></dl><ArrowRight className="volume-list__arrow" /></Link>})}</section></>
}
