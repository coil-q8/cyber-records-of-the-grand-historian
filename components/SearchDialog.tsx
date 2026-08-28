import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { categories } from '../data/categories'
import { events, searchEvents, years } from '../lib/events'
import type { Category } from '../types/event'
import { EvidenceBadge } from './EvidenceBadge'

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | '全部'>('全部')
  const [year, setYear] = useState<number | '全部'>('全部')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 80)
  }, [open])

  const results = useMemo(() => {
    const base = query.trim() ? searchEvents(query) : events
    return base.filter((event) => (category === '全部' || event.category === category) && (year === '全部' || event.year === year)).slice(0, 12)
  }, [query, category, year])

  function openEvent(id: string) {
    onClose()
    navigate(`/event/${id}`)
  }

  function submit() {
    onClose()
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (category !== '全部') params.set('category', category)
    if (year !== '全部') params.set('year', String(year))
    navigate(`/archive?${params.toString()}`)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.section
            className="search-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="全站检索"
            initial={{ opacity: 0, y: -16, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="search-dialog__head">
              <span>全站检索 / SEARCH ARCHIVE</span>
              <button type="button" onClick={onClose} aria-label="关闭搜索"><X size={20} /></button>
            </div>
            <label className="search-field search-field--large">
              <Search size={22} />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') submit() }}
                placeholder="检索人物、企业、学校、事件、标签……"
                aria-label="搜索档案"
              />
              <kbd>/</kbd>
            </label>
            {query.includes('以史为鉴') && (
              <motion.blockquote initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                后人哀之而不鉴之，亦使后人而复哀后人也。
              </motion.blockquote>
            )}
            <div className="search-filters">
              <select value={category} onChange={(event) => setCategory(event.target.value as Category | '全部')} aria-label="按分类筛选">
                <option>全部</option>
                {categories.map((item) => <option key={item.name}>{item.name}</option>)}
              </select>
              <select value={year} onChange={(event) => setYear(event.target.value === '全部' ? '全部' : Number(event.target.value))} aria-label="按年份筛选">
                <option>全部</option>
                {years.map((item) => <option key={item}>{item}</option>)}
              </select>
              <span>{results.length}{results.length === 12 ? '+' : ''} 条匹配</span>
            </div>
            <div className="search-results">
              {results.map((event) => (
                <button key={event.id} type="button" onClick={() => openEvent(event.id)}>
                  <span className="search-results__year">{event.year}</span>
                  <span className="search-results__body"><strong>{event.title}</strong><small>{event.category} · {event.tags.slice(0, 2).join(' / ')}</small></span>
                  <EvidenceBadge level={event.evidenceLevel} />
                  <ArrowUpRight size={16} />
                </button>
              ))}
            </div>
            <button className="search-dialog__all" type="button" onClick={submit}>在档案库中查看全部结果 <ArrowUpRight size={16} /></button>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
