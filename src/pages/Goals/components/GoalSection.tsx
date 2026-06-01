import type { RefObject } from 'react'
import type { Goal, GoalStatus } from '../../../types/goal.types'
import styles from '../Goals.module.css'
import type { CashPlanningCardData } from '../services/cashPlanningPageData'
import { PlanningCard } from './PlanningCard'

interface GoalSectionProps {
  title: string
  emptyTitle?: string
  emptyMessage: string
  emptyAction?: JSX.Element
  plannings: CashPlanningCardData[]
  openMenuGoalId: string | null
  menuRef: RefObject<HTMLDivElement>
  onToggleMenu: (goalId: string) => void
  onEdit: (goalId: string) => void
  onReserve: (goalId: string) => void
  onConfigureRule: (goalId: string) => void
  onUpdateStatus: (goal: Goal, status: GoalStatus) => void
}

export const GoalSection = ({
  title,
  emptyTitle = 'Nenhum planejamento ativo',
  emptyMessage,
  emptyAction,
  plannings,
  openMenuGoalId,
  menuRef,
  onToggleMenu,
  onEdit,
  onReserve,
  onConfigureRule,
  onUpdateStatus
}: GoalSectionProps): JSX.Element => {
  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>
        <h2>{title}</h2>
        <span>{plannings.length}</span>
      </header>

      {plannings.length === 0 ? (
        <div className={styles.emptyPlanningState}>
          <strong>{emptyTitle}</strong>
          <p>{emptyMessage}</p>
          {emptyAction}
        </div>
      ) : (
        <div className={styles.goalGrid}>
          {plannings.map((planning) => (
            <PlanningCard
              key={planning.id}
              planning={planning}
              isMenuOpen={openMenuGoalId === planning.id}
              menuRef={menuRef}
              onToggleMenu={() => onToggleMenu(planning.id)}
              onEdit={onEdit}
              onReserve={onReserve}
              onConfigureRule={onConfigureRule}
              onUpdateStatus={onUpdateStatus}
            />
          ))}
        </div>
      )}
    </section>
  )
}
