import { Bookmark, Dices, Menu, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { getRandomEvent } from '../lib/events'
import { Logo } from './Logo'
import { SearchDialog } from './SearchDialog'
import { ThemeToggle } from './ThemeToggle'

const navItems = [
  ['史馆', '/'],
  ['本纪', '/timeline'],
  ['五卷', '/volumes'],
  ['表', '/statistics'],
  ['书', '/insights'],
  ['索引', '/archive'],
  ['关于', '/about'],
] as const

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => setMenuOpen(false), [location.pathname])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      const editing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable
      if (event.key === '/' && !editing) { event.preventDefault(); setSearchOpen(true) }
      if (event.key === 'Escape') { setSearchOpen(false); setMenuOpen(false) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <>
      <header className="site-header">
        <div className="site-header__inner">
          <Logo />
          <nav className="desktop-nav" aria-label="主导航">
            {navItems.map(([label, href]) => (
              <NavLink key={href} to={href} className={({ isActive }) => isActive ? 'is-active' : ''}>{label}</NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <button type="button" onClick={() => navigate(`/event/${getRandomEvent().id}`)} aria-label="随机翻史"><Dices size={18} /></button>
            <NavLink to="/favorites" aria-label="我的私档"><Bookmark size={18} /></NavLink>
            <ThemeToggle />
            <button className="header-search" type="button" onClick={() => setSearchOpen(true)}><Search size={18} /><span>检索</span><kbd>/</kbd></button>
            <button className="menu-toggle" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? '关闭菜单' : '打开菜单'}>{menuOpen ? <X /> : <Menu />}</button>
          </div>
        </div>
      </header>
      {menuOpen && (
        <nav className="mobile-nav" aria-label="移动端导航">
          {navItems.map(([label, href]) => <NavLink key={href} to={href}>{label}<span>↗</span></NavLink>)}
          <NavLink to="/favorites">我的私档<span>↗</span></NavLink>
        </nav>
      )}
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      <nav className="mobile-quick-nav" aria-label="移动端快捷导航">
        <NavLink to="/"><span>史</span>史馆</NavLink>
        <NavLink to="/timeline"><span>纪</span>本纪</NavLink>
        <button type="button" onClick={() => setSearchOpen(true)}><span>索</span>索引</button>
        <NavLink to="/favorites"><span>存</span>私档</NavLink>
      </nav>
    </>
  )
}
