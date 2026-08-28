import { ArchiveX } from 'lucide-react'
import { Link } from 'react-router-dom'

export function EmptyState({ title = '此处尚无记录', description, action }: { title?: string; description?: string; action?: boolean }) {
  return (
    <div className="empty-state">
      <ArchiveX size={32} strokeWidth={1.4} />
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <Link className="text-link" to="/archive">返回档案库</Link>}
    </div>
  )
}
