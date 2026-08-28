import { Moon, Sun } from 'lucide-react'
import { useState } from 'react'

const THEME_KEY = 'cyber-shiji-theme'
type Theme = 'dark' | 'light'

function getCurrentTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getCurrentTheme)

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    document.documentElement.style.colorScheme = next
    window.localStorage.setItem(THEME_KEY, next)
    setTheme(next)
  }

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? '切换至浅色背景' : '切换至深色背景'}
      title={theme === 'dark' ? '切换至浅色背景' : '切换至深色背景'}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
