import { Link } from 'react-router-dom'

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link className={`logo ${compact ? 'logo--compact' : ''}`} to="/" aria-label="赛博史记首页">
      <span className="logo__seal" aria-hidden="true">史</span>
      <span className="logo__type">
        <strong>赛博史记</strong>
        {!compact && <small>CYBER SHIJI ARCHIVE</small>}
      </span>
    </Link>
  )
}
