import type { CSSProperties, RefObject } from 'react'
import type { Goal, GoalStatus } from '../../../types/goal.types'
import type { FinancialSnapshot } from '../hooks/useGoalsData'
import styles from '../Goals.module.css'
import { GoalMenu } from './GoalMenu'

interface GoalCardProps {
  goal: Goal
  snapshot: FinancialSnapshot
  isMenuOpen: boolean
  menuRef: RefObject<HTMLDivElement>
  onToggleMenu: () => void
  onEdit: (goalId: string) => void
  onUpdateStatus: (goal: Goal, status: GoalStatus) => void
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const formatSignedCurrency = (value: number): string => {
  const formatted = formatCurrency(Math.abs(value))
  if (value === 0) {
    return formatted
  }

  return `${value > 0 ? '+' : '-'}${formatted}`
}

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max)

const formatForecastRange = (estimatedMonths: number): string => {
  const safeMinimum = Math.max(1, Math.floor(estimatedMonths * 0.85))
  const safeMaximum = Math.max(safeMinimum, Math.ceil(estimatedMonths * 1.25))

  if (safeMinimum === safeMaximum) {
    return `${safeMinimum} ${safeMinimum === 1 ? 'mês' : 'meses'}`
  }

  return `entre ${safeMinimum} e ${safeMaximum} meses`
}

export const GoalCard = ({
  goal,
  snapshot,
  isMenuOpen,
  menuRef,
  onToggleMenu,
  onEdit,
  onUpdateStatus
}: GoalCardProps): JSX.Element => {
  const { accountBalance, averageMonthlyResult } = snapshot
  const rangeMax = goal.targetAmount > 0 ? goal.targetAmount : 1
  const rangeValue = clamp(accountBalance, 0, rangeMax)
  const progressPercent = goal.targetAmount > 0 ? clamp((accountBalance / goal.targetAmount) * 100, 0, 100) : 100
  const isReached = goal.targetAmount <= 0 || accountBalance >= goal.targetAmount
  const remainingAmount = Math.max(0, goal.targetAmount - accountBalance)
  const estimatedMonthsToGoal =
    !isReached && averageMonthlyResult > 0 ? Math.ceil(remainingAmount / averageMonthlyResult) : 0
  const forecastLabel = isReached
    ? 'Atingida'
    : averageMonthlyResult <= 0
      ? 'Sem previsão'
      : formatForecastRange(estimatedMonthsToGoal)
  const reachedFillColor = 'color-mix(in srgb, #2f9d72 90%, #43b883)'
  const markerPosition = clamp(progressPercent, 2, 98)
  const rangeStyle = {
    '--goal-progress': `${progressPercent}%`,
    '--goal-marker-position': `${markerPosition}%`,
    '--goal-fill-low': isReached ? reachedFillColor : 'color-mix(in srgb, var(--danger-500) 82%, #d84a5f)',
    '--goal-fill-mid': isReached ? reachedFillColor : 'color-mix(in srgb, var(--brand-600) 86%, #2f72ff)',
    '--goal-fill-high': isReached ? reachedFillColor : 'color-mix(in srgb, #2f9d72 90%, #43b883)',
    '--goal-empty-track': 'color-mix(in srgb, var(--bg-secondary) 76%, var(--border-color))'
  } as CSSProperties

  return (
    <article className={`${styles.goalCard} ${isReached ? styles.goalCardReached : ''}`.trim()}>
      <div className={styles.goalTop}>
        <div className={styles.goalHeaderMain}>
          <strong>{goal.title}</strong>
          {goal.isSystem ? <span className={styles.goalBadge}>Meta do sistema</span> : null}
        </div>

        <GoalMenu
          goal={goal}
          isOpen={isMenuOpen}
          menuRef={menuRef}
          onToggle={onToggleMenu}
          onEdit={onEdit}
          onUpdateStatus={onUpdateStatus}
        />
      </div>

      <div className={styles.goalValueSection}>
        <div className={styles.goalValueMain}>
          {formatCurrency(accountBalance)} <span>/ {formatCurrency(goal.targetAmount)}</span>
        </div>
        <p className={styles.goalValueCaption}>Em conta / meta</p>
      </div>

      <div className={styles.goalRangeWrapper} style={rangeStyle}>
        <span className={styles.goalRangePercent}>{Math.round(progressPercent)}%</span>
        <input className={styles.goalRange} type="range" min={0} max={rangeMax} value={rangeValue} readOnly />
      </div>

      <div className={styles.goalSecondaryInfo}>
        <span>Sobra média: {formatSignedCurrency(averageMonthlyResult)}</span>
        <span>Previsão: {forecastLabel}</span>
      </div>
    </article>
  )
}
