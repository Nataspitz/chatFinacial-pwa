import type { CSSProperties, RefObject } from 'react'
import { FiSliders, FiTrendingUp } from 'react-icons/fi'
import { Button } from '../../../components/ui'
import type { Goal, GoalStatus } from '../../../types/goal.types'
import styles from '../Goals.module.css'
import type { CashPlanningCardData } from '../services/cashPlanningPageData'
import { GoalMenu } from './GoalMenu'

interface PlanningCardProps {
  planning: CashPlanningCardData
  isMenuOpen: boolean
  menuRef: RefObject<HTMLDivElement>
  onToggleMenu: () => void
  onEdit: (goalId: string) => void
  onUpdateStatus: (goal: Goal, status: GoalStatus) => void
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const getPlanningTypeLabel = (type: CashPlanningCardData['planningType']): string => {
  if (type === 'RESERVE') return 'Reserva'
  if (type === 'PROVISION') return 'Provisão'
  return 'Meta'
}

const getAllocationLabel = (planning: CashPlanningCardData): string => {
  if (planning.allocationType === 'NONE' || !planning.allocationValue) {
    return 'Sem regra configurada'
  }

  if (planning.allocationType === 'PERCENTAGE_REVENUE') {
    return `${planning.allocationValue}% do faturamento`
  }

  if (planning.allocationType === 'PERCENTAGE_RESULT') {
    return `${planning.allocationValue}% do resultado`
  }

  return `${formatCurrency(planning.allocationValue)} por mês`
}

export const PlanningCard = ({
  planning,
  isMenuOpen,
  menuRef,
  onToggleMenu,
  onEdit,
  onUpdateStatus
}: PlanningCardProps): JSX.Element => {
  const progressStyle = {
    '--planning-progress': `${planning.progressPercentage}%`
  } as CSSProperties

  return (
    <article className={styles.planningCard}>
      <div className={styles.planningCardTop}>
        <div className={styles.planningIdentity}>
          <div className={styles.goalBadgeRow}>
            <span className={styles.goalBadge}>{getPlanningTypeLabel(planning.planningType)}</span>
            <span className={styles.statusBadge}>{planning.statusLabel}</span>
            {planning.isSystem ? <span className={styles.goalBadge}>Sistema</span> : null}
          </div>
          <h3>{planning.name}</h3>
        </div>

        <GoalMenu
          goal={planning.sourceGoal}
          isOpen={isMenuOpen}
          menuRef={menuRef}
          onToggle={onToggleMenu}
          onEdit={onEdit}
          onUpdateStatus={onUpdateStatus}
        />
      </div>

      <div className={styles.planningMoney}>
        <strong>
          {formatCurrency(planning.reservedAmount)} <span>/ {formatCurrency(planning.targetAmount)}</span>
        </strong>
        <small>Falta: {formatCurrency(planning.missingAmount)}</small>
      </div>

      <div className={styles.progressBlock} style={progressStyle}>
        <div className={styles.progressTrack}>
          <span />
        </div>
        <strong>{Math.round(planning.progressPercentage)}%</strong>
      </div>

      <div className={styles.planningDetailsGrid}>
        <span>
          <b>Regra mensal</b>
          {getAllocationLabel(planning)}
        </span>
        <span>
          <b>Previsão</b>
          {planning.forecastLabel}
        </span>
        <span>
          <b>Impacto no caixa</b>
          {planning.countsAsReserved ? 'Impacta caixa livre: Sim' : 'Não impacta caixa livre'}
        </span>
        <span>
          <b>Reserva estimada</b>
          {formatCurrency(planning.monthlyRuleEstimatedAmount)}
        </span>
      </div>

      {planning.linkedCategories.length > 0 ? (
        <div className={styles.categoryChips} aria-label="Categorias vinculadas">
          {planning.linkedCategories.map((category) => (
            <span key={category}>{category}</span>
          ))}
        </div>
      ) : null}

      <div className={styles.planningActions}>
        {/* Fluxo financeiro preparado; a movimentação real entra quando o histórico de reservas estiver conectado. */}
        <Button type="button" variant="ghost" disabled title="Reservar valor será conectado ao histórico de reservas.">
          <FiTrendingUp aria-hidden />
          Reservar valor
        </Button>
        <Button type="button" variant="ghost" disabled title="Configuração rápida será conectada ao modal de regra.">
          <FiSliders aria-hidden />
          Configurar regra
        </Button>
      </div>
    </article>
  )
}
