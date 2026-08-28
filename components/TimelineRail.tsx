import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { categories } from '../data/categories'
import { events, getEventsByYear, years } from '../lib/events'

export function TimelineRail({ standalone = false }: { standalone?: boolean }) {
  const railRef = useRef<HTMLDivElement>(null)
  function scroll(direction: number) {
    railRef.current?.scrollBy({ left: direction * Math.min(window.innerWidth * 0.76, 680), behavior: 'smooth' })
  }

  const maximum = Math.max(...years.map((year) => getEventsByYear(year).length))

  return (
    <div className={`timeline-module ${standalone ? 'timeline-module--standalone' : ''}`}>
      <div className="timeline-controls">
        <span>← 横向拖动 / 点击年份进入年卷</span>
        <div><button type="button" onClick={() => scroll(-1)} aria-label="向前滚动"><ChevronLeft /></button><button type="button" onClick={() => scroll(1)} aria-label="向后滚动"><ChevronRight /></button></div>
      </div>
      <div className="timeline-rail" ref={railRef}>
        {years.map((year, index) => {
          const yearEvents = events.filter((event) => event.year === year)
          const samples = yearEvents.filter((event) => event.severity === 'S').slice(0, 2)
          const distribution = categories.map((category) => ({ category, count: yearEvents.filter((event) => event.category === category.name).length })).filter((item) => item.count)
          return (
            <Link key={year} className="timeline-year" to={`/year/${year}`}>
              <div className="timeline-year__density" style={{ height: `${26 + yearEvents.length / maximum * 74}px` }} aria-label={`热度 ${yearEvents.length} 条`} />
              <div className="timeline-year__dot" />
              <div className="timeline-year__head"><span>{String(index + 1).padStart(2, '0')}</span><strong>{year}</strong></div>
              <p>{yearEvents.length} 卷宗</p>
              <div className="timeline-year__mix">{distribution.map(({ category, count }) => <i key={category.name} style={{ flex: count, background: category.color }} title={`${category.name} ${count}条`} />)}</div>
              <div className="timeline-year__cases">{samples.length ? samples.map((event) => <span key={event.id}>{event.title}</span>) : <span>{yearEvents[0]?.title}</span>}</div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
