export const FAVORITES_KEY = 'cyber-shiji-favorites-v1'

export function readFavorites(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const value = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) ?? '[]')
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

export function writeFavorites(ids: string[]) {
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids))
  window.dispatchEvent(new CustomEvent('cyber-favorites-change', { detail: ids }))
}
