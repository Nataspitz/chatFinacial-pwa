import type { CSSProperties, RefObject } from 'react'
import type { Goal, GoalAllocationType, GoalPlanningType, GoalStatus } from '../../../types/goal.types'
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

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max)

const getPlanningTypeLabel = (type: GoalPlanningType | undefined): string => {
  if (type === 'reserve') return 'Reserva'
  if (type === 'bill_provision') return 'Contas'
  return 'Meta'
}

const getMonthlyAllocation = (
  allocationType: GoalAllocationType | undefined,
  allocationValue: number | undefined,
  monthlyRevenue: number
): number => {
  const safeValue = Math.max(0, allocationValue ?? 0)
  return allocationType === 'percentage' ? (Math.max(0, monthlyRevenue) * safeValue) / 100 : safeValue
}

const formatAllocationRule = (
  allocationType: GoalAllocationType | undefined,
  allocationValue: number | undefined,
  estimatedMonthlyAllocation: number
): string => {
  const safeValue = Math.max(0, allocationValue ?? 0)
  if (safeValue === 0) {
    return 'Sem regra mensal'
  }

  if (allocationType === 'percentage') {
    return `${safeValue}% do faturamento (${formatCurrency(estimatedMonthlyAllocation)}/mes)`
  }

  return `${formatCurrency(safeValue)}/mes`
}

const formatForecastRange = (estimatedMonths: number): string => {
  const safeMinimum = Math.max(1, Math.floor(estimatedMonths * 0.85))
  const safeMaximum = Math.max(safeMinimum, Math.ceil(estimatedMonths * 1.25))

  if (safeMinimum === safeMaximum) {
    return `${safeMinimum} ${safeMinimum === 1 ? 'mes' : 'meses'}`
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
  const reservedAmount = Math.max(0, goal.reservedAmount ?? 0)
  const targetAmount = Math.max(0, goal.targetAmount)
  const rangeMax = targetAmount > 0 ? targetAmount : 1
  const rangeValue = clamp(reservedAmount, 0, rangeMax)
  const progressPercent = targetAmount > 0 ? clamp((reservedAmount / targetAmount) * 100, 0, 100) : 100
  const isReached = targetAmount <= 0 || reservedAmount >= targetAmount
  const remainingAmount = Math.max(0, targetAmount - reservedAmount)
  const estimatedMonthlyAllocation = getMonthlyAllocation(
    goal.allocationType,
    goal.allocationValue,
    snapshot.averageMonthlyEntries
  )
  const forecastLabel = isReached
    ? 'Completo'
    : estimatedMonthlyAllocation <= 0
      ? 'Sem previsao'
      : formatForecastRange(Math.ceil(remainingAmount / estimatedMonthlyAllocation))
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
          <div className={styles.goalBadgeRow}>
            <span className={styles.goalBadge}>{getPlanningTypeLabel(goal.planningType)}</span>
            {goal.isSystem ? <span className={styles.goalBadge}>Sistema</span> : null}
          </div>
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
          {formatCurrency(reservedAmount)} <span>/ {formatCurrency(targetAmount)}</span>
        </div>
        <p className={styles.goalValueCaption}>Reservado atual / alvo</p>
      </div>

      <div className={styles.goalRangeWrapper} style={rangeStyle}>
        <span className={styles.goalRangePercent}>{Math.round(progressPercent)}%</span>
        <input className={styles.goalRange} type="range" min={0} max={rangeMax} value={rangeValue} readOnly />
      </div>

      <div className={styles.goalSecondaryInfo}>
        <span>Falta: {formatCurrency(remainingAmount)}</span>
        <span>{formatAllocationRule(goal.allocationType, goal.allocationValue, estimatedMonthlyAllocation)}</span>
        <span>Previsao: {forecastLabel}</span>
        <span>{goal.countsAsReserved ?? true ? 'Conta como reserva' : 'Nao conta como reserva'}</span>
      </div>

      {goal.linkedCategories?.length ? (
        <div className={styles.categoryChips} aria-label="Categorias vinculadas">
          {goal.linkedCategories.map((category) => (
            <span key={category}>{category}</span>
          ))}
        </div>
      ) : null}
    </article>
  )
}
