import { Bookmark } from 'lucide-react'
import { useEffect, useState } from 'react'
import { FAVORITES_KEY, readFavorites, writeFavorites } from '../lib/favorites'

export function FavoriteButton({ eventId, label = false }: { eventId: string; label?: boolean }) {
  const [saved, setSaved] = useState(() => readFavorites().includes(eventId))

  useEffect(() => {
    const sync = () => setSaved(readFavorites().includes(eventId))
    window.addEventListener('storage', sync)
    window.addEventListener('cyber-favorites-change', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('cyber-favorites-change', sync)
    }
  }, [eventId])

  function toggle() {
    const current = readFavorites()
    const next = saved ? current.filter((id) => id !== eventId) : [...new Set([...current, eventId])]
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
    writeFavorites(next)
    setSaved(!saved)
  }

  return (
    <button
      className={`favorite-button ${saved ? 'is-saved' : ''}`}
      type="button"
      onClick={(event) => { event.preventDefault(); event.stopPropagation(); toggle() }}
      aria-pressed={saved}
      aria-label={saved ? '移出私档' : '存入私档'}
    >
      <Bookmark size={17} fill={saved ? 'currentColor' : 'none'} />
      {label && <span>{saved ? '已存私档' : '存入私档'}</span>}
    </button>
  )
}
