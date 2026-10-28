import { useLayoutEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

// React Router's search-param callbacks are not queued like React state updates.
// Keep successive input events on one snapshot until navigation is committed.
export function useUrlFilters(replace = true) {
  const [params, setParams] = useSearchParams()
  const [draft, setDraft] = useState(params)
  const pending = useRef(params)
  const queued = useRef<string[]>([])
  useLayoutEffect(() => {
    const position = queued.current.lastIndexOf(params.toString())
    if (position >= 0) {
      queued.current.splice(0, position + 1)
      // An earlier navigation may finish after the next keystroke. Keep the draft.
      if (queued.current.length) return
    } else queued.current = [] // External navigation, including browser back/forward.
    pending.current = params
    setDraft(params)
  }, [params])

  function write(next: URLSearchParams | Record<string, string> | ((previous: URLSearchParams) => URLSearchParams)) {
    const value = typeof next === 'function' ? next(new URLSearchParams(pending.current)) : new URLSearchParams(next)
    pending.current = value
    queued.current.push(value.toString())
    setDraft(value)
    setParams(value, { replace })
  }

  function filter(key: string, value: string) {
    write((next) => {
      if (value && value !== '全部' && !(key === 'sort' && value === 'newest')) next.set(key, value)
      else next.delete(key)
      return next
    })
  }

  return { params: draft, filter, write }
}
