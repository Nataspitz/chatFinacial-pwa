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
        aria-label="Abrir menu do planejamento"
        onClick={onToggle}
      >
        <FiMoreVertical />
      </button>

      {isOpen ? (
        <div className={styles.goalMenu}>
          <button type="button" onClick={() => onEdit(goal.id)} disabled={goal.isSystem}>
            Editar
          </button>
          {/* Status pausado ainda não existe no banco; opção mantida como contrato visual para a próxima etapa. */}
          <button type="button" disabled>
            Pausar
          </button>
          <button
            type="button"
            onClick={() => onUpdateStatus(goal, 'completed')}
            disabled={goal.status === 'completed'}
          >
            Concluir
          </button>
          <button
            type="button"
            className={styles.goalMenuDanger}
            onClick={() => onUpdateStatus(goal, 'deleted')}
          >
            Excluir
          </button>
        </div>
      ) : null}
    </div>
  )
}
