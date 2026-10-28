import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Footer } from './Footer'
import { Header } from './Header'

export function Layout() {
  const location = useLocation()
  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: 'instant' })
      return
    }
    let targetId: string
    try { targetId = decodeURIComponent(location.hash.slice(1)) } catch { return }
    let frame = 0
    const reveal = () => {
      const target = document.getElementById(targetId)
      if (!target) return false
      frame = window.requestAnimationFrame(() => target.scrollIntoView({ block: 'start', behavior: 'instant' }))
      return true
    }
    if (reveal()) return () => window.cancelAnimationFrame(frame)
    const observer = new MutationObserver(() => { if (reveal()) observer.disconnect() })
    observer.observe(document.getElementById('main-content') ?? document.body, { childList: true, subtree: true })
    return () => { observer.disconnect(); window.cancelAnimationFrame(frame) }
  }, [location.pathname, location.hash])
  return <><Header /><main id="main-content"><Outlet /></main><Footer /></>
}
