import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { categories } from '../data/categories'
import type { EventRecord } from '../types/event'
import { EvidenceBadge } from './EvidenceBadge'
import { FavoriteButton } from './FavoriteButton'

export function EventCard({ event, index = 0, compact = false }: { event: EventRecord; index?: number; compact?: boolean }) {
  const category = categories.find((item) => item.name === event.category)!
  return (
    <article className={`event-card ${compact ? 'event-card--compact' : ''}`} style={{ '--category-color': category.color } as React.CSSProperties}>
      <div className="event-card__index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</div>
      <div className="event-card__topline">
        <span>{event.archiveCode}</span>
        <FavoriteButton eventId={event.id} />
      </div>
      <Link className="event-card__link" to={`/event/${event.id}`}>
        <div className="event-card__meta">
          <span className="category-mark">{event.category}</span>
          <span>{event.year}</span>
          <span className={`severity severity--${event.severity}`}>{event.severity} 级</span>
        </div>
        <h3>{event.title}</h3>
        {!compact && <p>{event.summary}</p>}
        <div className="event-card__footer">
          <EvidenceBadge level={event.evidenceLevel} />
          <span className="event-card__open">开卷 <ArrowUpRight size={15} /></span>
        </div>
      </Link>
    </article>
  )
}
