import type { RefObject } from 'react'
import { FiMoreVertical } from 'react-icons/fi'
import type { Goal, GoalStatus } from '../../../types/goal.types'
import styles from '../Goals.module.css'

interface GoalMenuProps {
  goal: Goal
  isOpen: boolean
  menuRef: RefObject<HTMLDivElement>
  onToggle: () => void
  onEdit: (goalId: string) => void
  onUpdateStatus: (goal: Goal, status: GoalStatus) => void
}

export const GoalMenu = ({
  goal,
  isOpen,
  menuRef,
  onToggle,
  onEdit,
  onUpdateStatus
}: GoalMenuProps): JSX.Element => {
  return (
    <div ref={isOpen ? menuRef : null} className={styles.goalMenuArea}>
      <button
        type="button"
        className={styles.goalMenuTrigger}
        aria-label="Abrir menu da meta"
        onClick={onToggle}
      >
        <FiMoreVertical />
      </button>

      {isOpen ? (
        <div className={styles.goalMenu}>
          <button
            type="button"
            onClick={() => onUpdateStatus(goal, 'completed')}
            disabled={goal.status === 'completed'}
          >
            Concluir
          </button>
          <button type="button" onClick={() => onEdit(goal.id)} disabled={goal.isSystem}>
            Editar
          </button>
          <button
            type="button"
            className={styles.goalMenuDanger}
            onClick={() => onUpdateStatus(goal, 'deleted')}
          >
            Apagar
          </button>
        </div>
      ) : null}
    </div>
  )
}
