import { useEffect, useMemo, useState } from 'react'
import { FiPlus } from 'react-icons/fi'
import { PageIntro } from '../../components/molecules/PageIntro/PageIntro'
import { PageTemplate } from '../../components/templates/PageTemplate/PageTemplate'
import { Button } from '../../components/ui'
import type { Goal, GoalStatus } from '../../types/goal.types'
import { GoalFormModal, initialGoalFormState, type GoalFormState } from './components/GoalFormModal'
import { GoalSection } from './components/GoalSection'
import styles from './Goals.module.css'
import { useGoalMenu } from './hooks/useGoalMenu'
import { useGoalsData } from './hooks/useGoalsData'

export const Goals = (): JSX.Element => {
  const { goals, isLoading, error, snapshot, saveGoal, updateGoalStatus } = useGoalsData()
  const { menuContainerRef, openMenuGoalId, setOpenMenuGoalId } = useGoalMenu()
  const [isSavingGoal, setIsSavingGoal] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false)
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
  const [goalForm, setGoalForm] = useState<GoalFormState>(initialGoalFormState)

  const activeGoals = useMemo(() => goals.filter((item) => item.status === 'active'), [goals])
  const completedGoals = useMemo(() => goals.filter((item) => item.status === 'completed'), [goals])

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
      targetAmount: String(goal.targetAmount)
    })
    setOpenMenuGoalId(null)
    setIsGoalModalOpen(true)
  }

  const handleSaveGoal = async (): Promise<void> => {
    const normalizedTitle = goalForm.title.trim()
    const parsedTarget = Number(goalForm.targetAmount)

    if (!normalizedTitle || !Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      setFeedback('Informe nome e valor válido para a meta.')
      return
    }

    setIsSavingGoal(true)

    try {
      await saveGoal({ title: normalizedTitle, targetAmount: parsedTarget }, editingGoalId)
      setFeedback(editingGoalId ? 'Meta atualizada com sucesso.' : 'Meta criada com sucesso.')
      setIsGoalModalOpen(false)
      setGoalForm(initialGoalFormState)
      setEditingGoalId(null)
    } catch {
      setFeedback('Não foi possível salvar a meta.')
    } finally {
      setIsSavingGoal(false)
    }
  }

  const handleUpdateGoalStatus = async (goal: Goal, status: GoalStatus): Promise<void> => {
    try {
      await updateGoalStatus(goal, status)
      setOpenMenuGoalId(null)
      setFeedback(status === 'completed' ? 'Meta concluída.' : 'Meta apagada.')
    } catch {
      setFeedback('Não foi possível atualizar o status da meta.')
    }
  }

  const handleToggleMenu = (goalId: string): void => {
    setOpenMenuGoalId((currentGoalId) => (currentGoalId === goalId ? null : goalId))
  }

  return (
    <PageTemplate className={styles.page}>
      <PageIntro
        title="Metas financeiras"
        description="Acompanhe objetivos de valor e veja quando o saldo em conta cobre cada meta."
        action={(
          <Button type="button" onClick={handleOpenCreateGoal}>
            <FiPlus aria-hidden />
            Nova meta
          </Button>
        )}
      />

      {isLoading ? <p className={styles.stateMessage}>Carregando metas...</p> : null}
      {!isLoading && error ? <p className={styles.error}>{error}</p> : null}
      {feedback ? <p className={styles.feedback}>{feedback}</p> : null}

      {!isLoading && !error ? (
        <>
          <GoalSection
            title="Em andamento"
            emptyMessage="Nenhuma meta ativa."
            goals={activeGoals}
            snapshot={snapshot}
            openMenuGoalId={openMenuGoalId}
            menuRef={menuContainerRef}
            onToggleMenu={handleToggleMenu}
            onEdit={handleOpenEditGoal}
            onUpdateStatus={(goal, status) => {
              void handleUpdateGoalStatus(goal, status)
            }}
          />

          <GoalSection
            title="Concluídas"
            emptyMessage="Nenhuma meta concluída."
            goals={completedGoals}
            snapshot={snapshot}
            openMenuGoalId={openMenuGoalId}
            menuRef={menuContainerRef}
            onToggleMenu={handleToggleMenu}
            onEdit={handleOpenEditGoal}
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
        onChange={setGoalForm}
        onClose={closeGoalModal}
        onSubmit={() => {
          void handleSaveGoal()
        }}
      />
    </PageTemplate>
  )
}
