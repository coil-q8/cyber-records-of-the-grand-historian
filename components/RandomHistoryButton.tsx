import { Dices } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getRandomEvent } from '../lib/events'

export function RandomHistoryButton({ currentId, variant = 'button' }: { currentId?: string; variant?: 'button' | 'text' }) {
  const navigate = useNavigate()
  return (
    <button
      className={variant === 'button' ? 'button button--primary' : 'text-button'}
      type="button"
      onClick={() => navigate(`/event/${getRandomEvent(currentId).id}`)}
    >
      <Dices size={17} /> 后人鉴之
    </button>
  )
}
