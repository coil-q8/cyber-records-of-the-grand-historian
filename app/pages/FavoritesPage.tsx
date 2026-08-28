import { useEffect, useState } from 'react'
import { EmptyState } from '../../components/EmptyState'
import { EventCard } from '../../components/EventCard'
import { PageHero } from '../../components/PageHero'
import { readFavorites } from '../../lib/favorites'
import { events } from '../../lib/events'

export function FavoritesPage() {
  const [ids, setIds] = useState(readFavorites)
  useEffect(() => { const sync = () => setIds(readFavorites()); window.addEventListener('storage', sync); window.addEventListener('cyber-favorites-change', sync); return () => { window.removeEventListener('storage', sync); window.removeEventListener('cyber-favorites-change', sync) } }, [])
  const saved = ids.map((id) => events.find((event) => event.id === id)).filter(Boolean) as typeof events
  return <><PageHero eyebrow="PRIVATE FILE / 本地私档" title="我的私档" description="收藏仅保存在此浏览器的 localStorage 中，不上传、不登录。再次点击书签即可移出。" meta={<span>{saved.length} SAVED RECORDS</span>} /><section className="section page-shell">{saved.length ? <div className="event-grid">{saved.map((event, index) => <EventCard key={event.id} event={event} index={index} />)}</div> : <EmptyState title="私档尚空" description="在档案卡片或详情页点击“存入私档”，记录会保存在这台设备上。" action />}</section></>
}
