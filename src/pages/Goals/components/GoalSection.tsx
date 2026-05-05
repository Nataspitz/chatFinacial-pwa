import type { RefObject } from 'react'
import type { Goal, GoalStatus } from '../../../types/goal.types'
import type { FinancialSnapshot } from '../hooks/useGoalsData'
import styles from '../Goals.module.css'
import { GoalCard } from './GoalCard'

interface GoalSectionProps {
  title: string
  emptyMessage: string
  goals: Goal[]
  snapshot: FinancialSnapshot
  openMenuGoalId: string | null
  menuRef: RefObject<HTMLDivElement>
  onToggleMenu: (goalId: string) => void
  onEdit: (goalId: string) => void
  onUpdateStatus: (goal: Goal, status: GoalStatus) => void
}

export const GoalSection = ({
  title,
  emptyMessage,
  goals,
  snapshot,
  openMenuGoalId,
  menuRef,
  onToggleMenu,
  onEdit,
  onUpdateStatus
}: GoalSectionProps): JSX.Element => {
  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>
        <h2>{title}</h2>
        <span>{goals.length}</span>
      </header>

      {goals.length === 0 ? (
        <p className={styles.stateMessage}>{emptyMessage}</p>
      ) : (
        <div className={styles.goalGrid}>
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              snapshot={snapshot}
              isMenuOpen={openMenuGoalId === goal.id}
              menuRef={menuRef}
              onToggleMenu={() => onToggleMenu(goal.id)}
              onEdit={onEdit}
              onUpdateStatus={onUpdateStatus}
            />
          ))}
        </div>
      )}
    </section>
  )
}
