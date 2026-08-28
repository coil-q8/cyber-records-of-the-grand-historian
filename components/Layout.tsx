import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Footer } from './Footer'
import { Header } from './Header'

export function Layout() {
  const location = useLocation()
  useEffect(() => window.scrollTo({ top: 0, behavior: 'instant' }), [location.pathname])
  return <><Header /><main id="main-content"><Outlet /></main><Footer /></>
}
