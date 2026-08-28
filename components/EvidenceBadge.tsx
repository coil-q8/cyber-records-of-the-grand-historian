import { CircleAlert, FileCheck2, Gavel, MessagesSquare, ShieldCheck, UserCheck } from 'lucide-react'
import { evidenceDescriptions } from '../data/categories'
import type { EvidenceLevel } from '../types/event'

const icons: Record<EvidenceLevel, typeof Gavel> = {
  司法定案: Gavel,
  官方调查: ShieldCheck,
  当事人承认: UserCheck,
  多方证实: FileCheck2,
  强争议: MessagesSquare,
  未核实: CircleAlert,
}

export function EvidenceBadge({ level, full = false }: { level: EvidenceLevel; full?: boolean }) {
  const Icon = icons[level]
  return (
    <span className={`evidence-badge evidence-badge--${level}`} tabIndex={0} aria-label={`${level}：${evidenceDescriptions[level]}`}>
      <Icon size={14} aria-hidden="true" />
      <span>{level}</span>
      {full && <span className="evidence-badge__description">{evidenceDescriptions[level]}</span>}
      {!full && <span className="tooltip" role="tooltip">{evidenceDescriptions[level]}</span>}
    </span>
  )
}
