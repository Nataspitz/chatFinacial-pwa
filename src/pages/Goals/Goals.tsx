import { useEffect, useMemo, useState } from 'react'
import { FiPlayCircle, FiPlus } from 'react-icons/fi'
import { PageIntro } from '../../components/molecules/PageIntro/PageIntro'
import { PageTemplate } from '../../components/templates/PageTemplate/PageTemplate'
import { Button } from '../../components/ui'
import type { Goal, GoalStatus } from '../../types/goal.types'
import { CashByPlanningChart } from './components/CashByPlanningChart'
import { CashCompositionChart } from './components/CashCompositionChart'
import { CashPlanningAlerts } from './components/CashPlanningAlerts'
import { CashPlanningSummaryCards } from './components/CashPlanningSummaryCards'
import { GoalFormModal, initialGoalFormState, type GoalFormState } from './components/GoalFormModal'
import { GoalSection } from './components/GoalSection'
import { ReservedByPlanningChart } from './components/ReservedByPlanningChart'
import { ReservedByTypeChart } from './components/ReservedByTypeChart'
import styles from './Goals.module.css'
import { useGoalMenu } from './hooks/useGoalMenu'
import { useGoalsData } from './hooks/useGoalsData'
import { getCashPlanningPageData } from './services/cashPlanningPageData'

const parseLinkedCategories = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim().replace(/\s+/g, ' '))
    .filter(Boolean)

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const Goals = (): JSX.Element => {
  const { goals, isLoading, error, snapshot, saveGoal, updateGoalStatus } = useGoalsData()
  const { menuContainerRef, openMenuGoalId, setOpenMenuGoalId } = useGoalMenu()
  const [isSavingGoal, setIsSavingGoal] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false)
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
  const [goalForm, setGoalForm] = useState<GoalFormState>(initialGoalFormState)

  const cashPlanningData = useMemo(() => getCashPlanningPageData(goals, snapshot), [goals, snapshot])
  const maxReservableAmount = useMemo(() => {
    const editingGoal = editingGoalId ? goals.find((item) => item.id === editingGoalId) : null
    const currentReserved = editingGoal?.countsAsReserved === false ? 0 : toFiniteNumber(editingGoal?.reservedAmount, 0)
    return Math.max(0, cashPlanningData.summary.realFreeCash + currentReserved)
  }, [cashPlanningData.summary.realFreeCash, editingGoalId, goals])

  useEffect(() => {
    if (!feedback) {
      return
    }

    const timeout = window.setTimeout(() => setFeedback(''), 2600)
    return () => window.clearTimeout(timeout)
  }, [feedback])

  const closeGoalModal = (): void => {
    if (isSavingGoal) {
      return
    }

    setIsGoalModalOpen(false)
    setGoalForm(initialGoalFormState)
    setEditingGoalId(null)
  }

  const handleOpenCreateGoal = (): void => {
    setEditingGoalId(null)
    setGoalForm(initialGoalFormState)
    setIsGoalModalOpen(true)
  }

  const handleOpenEditGoal = (goalId: string): void => {
    const goal = goals.find((item) => item.id === goalId && !item.isSystem)
    if (!goal) {
      return
    }

    setEditingGoalId(goal.id)
    setGoalForm({
      title: goal.title,
      targetAmount: String(goal.targetAmount),
      planningType: goal.planningType ?? 'goal',
      reservedAmount: String(goal.reservedAmount ?? 0),
      countsAsReserved: goal.countsAsReserved ?? true,
      allocationType: goal.allocationType ?? 'fixed',
      allocationValue: String(goal.allocationValue ?? 0),
      linkedCategories: (goal.linkedCategories ?? []).join(', ')
    })
    setOpenMenuGoalId(null)
    setIsGoalModalOpen(true)
  }

  const handleOpenReserveGoal = (goalId: string): void => {
    handleOpenEditGoal(goalId)
  }

  const handleOpenConfigureRule = (goalId: string): void => {
    handleOpenEditGoal(goalId)
  }

  const handleSaveGoal = async (): Promise<void> => {
    const normalizedTitle = goalForm.title.trim()
    const parsedTarget = Number(goalForm.targetAmount)
    const parsedReserved = Number(goalForm.reservedAmount)
    const parsedAllocation = Number(goalForm.allocationValue)

    if (
      !normalizedTitle ||
      !Number.isFinite(parsedTarget) ||
      parsedTarget < 0 ||
      !Number.isFinite(parsedReserved) ||
      parsedReserved < 0 ||
      parsedReserved > maxReservableAmount ||
      !Number.isFinite(parsedAllocation) ||
      parsedAllocation < 0 ||
      (goalForm.allocationType === 'percentage' && parsedAllocation > 100)
    ) {
      setFeedback('Informe nome, valores e regra mensal validos.')
      return
    }

    setIsSavingGoal(true)

    try {
      await saveGoal({
        title: normalizedTitle,
        targetAmount: parsedTarget,
        planningType: goalForm.planningType,
        reservedAmount: parsedReserved,
        countsAsReserved: goalForm.countsAsReserved,
        allocationType: goalForm.allocationType,
        allocationValue: parsedAllocation,
        linkedCategories: parseLinkedCategories(goalForm.linkedCategories)
      }, editingGoalId)
      setFeedback(editingGoalId ? 'Planejamento atualizado com sucesso.' : 'Planejamento criado com sucesso.')
      setIsGoalModalOpen(false)
      setGoalForm(initialGoalFormState)
      setEditingGoalId(null)
    } catch {
      setFeedback('Nao foi possivel salvar o planejamento.')
    } finally {
      setIsSavingGoal(false)
    }
  }

  const handleUpdateGoalStatus = async (goal: Goal, status: GoalStatus): Promise<void> => {
    try {
      await updateGoalStatus(goal, status)
      setOpenMenuGoalId(null)
      setFeedback(status === 'completed' ? 'Planejamento concluido.' : 'Planejamento apagado.')
    } catch {
      setFeedback('Nao foi possivel atualizar o status do planejamento.')
    }
  }

  const handleToggleMenu = (goalId: string): void => {
    setOpenMenuGoalId((currentGoalId) => (currentGoalId === goalId ? null : goalId))
  }

  return (
    <PageTemplate className={styles.page}>
      <PageIntro
        title="Planejamento de caixa"
        description="Organize o saldo em metas, reservas e provisões antes de tratar tudo como dinheiro livre."
        action={(
          <div className={styles.headerActions}>
            {/* Aplicação automática depende do histórico de movimentos; por enquanto é só o ponto de entrada visual. */}
            <Button type="button" variant="secondary" disabled title="Aplicação automática será conectada ao histórico mensal.">
              <FiPlayCircle aria-hidden />
              Aplicar regras do mês
            </Button>
            <Button type="button" onClick={handleOpenCreateGoal}>
              <FiPlus aria-hidden />
              Novo planejamento
            </Button>
          </div>
        )}
      />

      {isLoading ? <p className={styles.stateMessage}>Carregando planejamento...</p> : null}
      {!isLoading && error ? <p className={styles.error}>{error}</p> : null}
      {feedback ? <p className={styles.feedback}>{feedback}</p> : null}

      {!isLoading && !error ? (
        <>
          <CashPlanningSummaryCards summary={cashPlanningData.summary} />

          <section className={styles.repartitionSection} aria-label="Visão de repartição">
            <header className={styles.sectionTitleBlock}>
              <h2>Visão de repartição</h2>
              <p>Leitura visual de quanto está livre, reservado e distribuído por finalidade.</p>
            </header>

            <div className={styles.chartGrid}>
              <CashCompositionChart
                free={cashPlanningData.charts.cashComposition.free}
                reserved={cashPlanningData.charts.cashComposition.reserved}
                committed={cashPlanningData.charts.cashComposition.committed}
              />
              <ReservedByTypeChart
                goals={cashPlanningData.charts.reservedByType.goals}
                reserves={cashPlanningData.charts.reservedByType.reserves}
                provisions={cashPlanningData.charts.reservedByType.provisions}
              />
              <CashByPlanningChart data={cashPlanningData.charts.cashByPlanning} />
              <ReservedByPlanningChart data={cashPlanningData.charts.reservedByPlanning} />
            </div>
          </section>

          <CashPlanningAlerts alerts={cashPlanningData.alerts} />

          <GoalSection
            title="Em andamento"
            emptyTitle="Nenhum planejamento ativo"
            emptyMessage="Crie uma meta, reserva ou provisão para separar parte do saldo e calcular o caixa livre real."
            emptyAction={(
              <Button type="button" onClick={handleOpenCreateGoal}>
                <FiPlus aria-hidden />
                Criar primeiro planejamento
              </Button>
            )}
            plannings={cashPlanningData.plannings}
            openMenuGoalId={openMenuGoalId}
            menuRef={menuContainerRef}
            onToggleMenu={handleToggleMenu}
            onEdit={handleOpenEditGoal}
            onReserve={handleOpenReserveGoal}
            onConfigureRule={handleOpenConfigureRule}
            onUpdateStatus={(goal, status) => {
              void handleUpdateGoalStatus(goal, status)
            }}
          />

          <GoalSection
            title="Concluidos"
            emptyTitle="Nenhum planejamento concluído"
            emptyMessage="Planejamentos concluídos aparecerão aqui."
            plannings={cashPlanningData.completedPlannings}
            openMenuGoalId={openMenuGoalId}
            menuRef={menuContainerRef}
            onToggleMenu={handleToggleMenu}
            onEdit={handleOpenEditGoal}
            onReserve={handleOpenReserveGoal}
            onConfigureRule={handleOpenConfigureRule}
            onUpdateStatus={(goal, status) => {
              void handleUpdateGoalStatus(goal, status)
            }}
          />
        </>
      ) : null}

      <GoalFormModal
        open={isGoalModalOpen}
        isEditing={Boolean(editingGoalId)}
        isSaving={isSavingGoal}
        form={goalForm}
        maxReservableAmount={maxReservableAmount}
        onChange={setGoalForm}
        onClose={closeGoalModal}
        onSubmit={() => {
          void handleSaveGoal()
        }}
      />
    </PageTemplate>
  )
}
