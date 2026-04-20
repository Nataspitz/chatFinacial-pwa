import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { FiMoreVertical, FiPlus } from 'react-icons/fi'
import { PageIntro } from '../../components/molecules/PageIntro/PageIntro'
import { PageTemplate } from '../../components/templates/PageTemplate/PageTemplate'
import { Button, ButtonLoading, ModalBase } from '../../components/ui'
import { businessService } from '../../services/business.service'
import { financeService } from '../../services/finance.service'
import { goalsService } from '../../services/goals.service'
import type { Goal, GoalStatus } from '../../types/goal.types'
import type { Transaction } from '../../types/transaction.types'
import styles from './Goals.module.css'

interface GoalFormState {
  title: string
  targetAmount: string
}

const SYSTEM_GOAL_CREDIT_KEY = 'credit-card-open-invoice'

const initialGoalFormState: GoalFormState = {
  title: '',
  targetAmount: ''
}

const getTodayDate = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const normalizeDate = (value: string): string | null => value.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? null

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

const calcAccountBalance = (transactions: Transaction[], baseAmount: number, baseDate: string): number => {
  const today = getTodayDate()

  return transactions.reduce((acc, item) => {
    if (!item.isConfirmed) {
      return acc
    }

    const date = normalizeDate(item.date)
    if (!date) {
      return acc
    }

    if (date < baseDate || date > today) {
      return acc
    }

    return item.type === 'entrada' ? acc + item.amount : acc - item.amount
  }, baseAmount)
}

const calcOpenCreditInvoiceGoal = (transactions: Transaction[]): number => {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0')
  const currentMonthStart = `${currentYear}-${currentMonth}-01`

  return transactions
    .filter((item) => {
      if (item.type !== 'saida') return false
      if (item.paymentMethod !== 'credito') return false
      if (item.isMonthlyCost) return false
      if (item.isConfirmed) return false

      const normalizedDate = normalizeDate(item.date)
      if (!normalizedDate) return false

      return normalizedDate >= currentMonthStart
    })
    .reduce((acc, item) => acc + item.amount, 0)
}

const getMonthKey = (date: string): string | null => {
  const normalized = normalizeDate(date)
  return normalized ? normalized.slice(0, 7) : null
}

const getMonthRangeCountInclusive = (fromDate: string, toDate: string): number => {
  const from = normalizeDate(fromDate)
  const to = normalizeDate(toDate)

  if (!from || !to) {
    return 1
  }

  const fromYear = Number(from.slice(0, 4))
  const fromMonth = Number(from.slice(5, 7))
  const toYear = Number(to.slice(0, 4))
  const toMonth = Number(to.slice(5, 7))

  if (!Number.isFinite(fromYear) || !Number.isFinite(fromMonth) || !Number.isFinite(toYear) || !Number.isFinite(toMonth)) {
    return 1
  }

  const diff = (toYear - fromYear) * 12 + (toMonth - fromMonth) + 1
  return Math.max(1, diff)
}

const calcAverageMonthlyResult = (
  transactions: Transaction[],
  baseAmountDate: string
): number => {
  const today = getTodayDate()
  const monthTotals = new Map<string, number>()

  transactions.forEach((item) => {
    if (!item.isConfirmed) {
      return
    }

    const date = normalizeDate(item.date)
    if (!date || date < baseAmountDate || date > today) {
      return
    }

    const monthKey = getMonthKey(date)
    if (!monthKey) {
      return
    }

    const signal = item.type === 'entrada' ? 1 : -1
    monthTotals.set(monthKey, (monthTotals.get(monthKey) ?? 0) + signal * item.amount)
  })

  const summedResult = Array.from(monthTotals.values()).reduce((acc, value) => acc + value, 0)
  const monthsCount = getMonthRangeCountInclusive(baseAmountDate, today)
  return summedResult / monthsCount
}

export const Goals = (): JSX.Element => {
  const menuContainerRef = useRef<HTMLDivElement | null>(null)
  const isRefreshingRef = useRef(false)
  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingGoal, setIsSavingGoal] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [accountBalance, setAccountBalance] = useState(0)
  const [averageMonthlyResult, setAverageMonthlyResult] = useState(0)
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false)
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
  const [goalForm, setGoalForm] = useState<GoalFormState>(initialGoalFormState)
  const [openMenuGoalId, setOpenMenuGoalId] = useState<string | null>(null)

  const loadGoals = async (): Promise<void> => {
    const loadedGoals = await goalsService.getGoals()
    setGoals(loadedGoals)
  }

  const loadFinancialSnapshot = async (): Promise<Transaction[]> => {
    const [transactionsResult, businessResult] = await Promise.allSettled([
      financeService.getTransactions(),
      businessService.getBusinessSettings()
    ])

    if (transactionsResult.status !== 'fulfilled') {
      throw new Error('Nao foi possivel carregar as metas.')
    }

    const loadedTransactions = transactionsResult.value

    if (businessResult.status === 'fulfilled') {
      const settings = businessResult.value
      const balanceBaseDate = settings.account_balance_base_date
      setAccountBalance(
        calcAccountBalance(loadedTransactions, settings.account_balance_base_amount, balanceBaseDate)
      )
      setAverageMonthlyResult(calcAverageMonthlyResult(loadedTransactions, balanceBaseDate))
    } else {
      const fallbackBaseDate = normalizeDate(
        [...loadedTransactions]
          .map((item) => normalizeDate(item.date))
          .filter((item): item is string => Boolean(item))
          .sort()[0] ?? getTodayDate()
      ) ?? getTodayDate()

      setAccountBalance(calcAccountBalance(loadedTransactions, 0, fallbackBaseDate))
      setAverageMonthlyResult(calcAverageMonthlyResult(loadedTransactions, fallbackBaseDate))
    }

    return loadedTransactions
  }

  const syncSystemGoalFromTransactions = async (transactions: Transaction[]): Promise<void> => {
    await goalsService.syncSystemGoal({
      systemKey: SYSTEM_GOAL_CREDIT_KEY,
      title: 'Cartao de credito (fatura em aberto)',
      targetAmount: calcOpenCreditInvoiceGoal(transactions)
    })
  }

  const loadData = async (): Promise<void> => {
    setIsLoading(true)
    setError('')

    try {
      const loadedTransactions = await loadFinancialSnapshot()
      await syncSystemGoalFromTransactions(loadedTransactions)
      await loadGoals()
    } catch {
      setError('Nao foi possivel sincronizar as metas com o banco.')
    } finally {
      setIsLoading(false)
    }
  }

  const refreshDataSilently = async (): Promise<void> => {
    if (isRefreshingRef.current) {
      return
    }

    isRefreshingRef.current = true
    try {
      const loadedTransactions = await loadFinancialSnapshot()
      await syncSystemGoalFromTransactions(loadedTransactions)
      await loadGoals()
    } catch {
      // Evita exibir erro de refresh automatico em background.
    } finally {
      isRefreshingRef.current = false
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refreshDataSilently()
    }, 30000)

    const handleFocusRefresh = (): void => {
      void refreshDataSilently()
    }

    window.addEventListener('focus', handleFocusRefresh)
    document.addEventListener('visibilitychange', handleFocusRefresh)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleFocusRefresh)
      document.removeEventListener('visibilitychange', handleFocusRefresh)
    }
  }, [])

  useEffect(() => {
    if (!feedback) {
      return
    }

    const timeout = window.setTimeout(() => setFeedback(''), 2600)
    return () => window.clearTimeout(timeout)
  }, [feedback])

  useEffect(() => {
    if (!openMenuGoalId) {
      return
    }

    const handleClickOutside = (event: MouseEvent): void => {
      if (!menuContainerRef.current) {
        return
      }

      if (!menuContainerRef.current.contains(event.target as Node)) {
        setOpenMenuGoalId(null)
      }
    }

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpenMenuGoalId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [openMenuGoalId])

  const activeGoals = useMemo(() => goals.filter((item) => item.status === 'active'), [goals])
  const completedGoals = useMemo(() => goals.filter((item) => item.status === 'completed'), [goals])

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
      setFeedback('Informe nome e valor valido para a meta.')
      return
    }

    setIsSavingGoal(true)

    try {
      if (editingGoalId) {
        await goalsService.updateGoal(editingGoalId, {
          title: normalizedTitle,
          targetAmount: parsedTarget
        })
        setFeedback('Meta atualizada com sucesso.')
      } else {
        await goalsService.createGoal({
          title: normalizedTitle,
          targetAmount: parsedTarget
        })
        setFeedback('Meta criada com sucesso.')
      }

      await loadGoals()
      setIsGoalModalOpen(false)
      setGoalForm(initialGoalFormState)
      setEditingGoalId(null)
    } catch {
      setFeedback('Nao foi possivel salvar a meta.')
    } finally {
      setIsSavingGoal(false)
    }
  }

  const handleUpdateGoalStatus = async (goal: Goal, status: GoalStatus): Promise<void> => {
    try {
      await goalsService.updateGoalStatus(goal.id, status)
      await loadGoals()
      setOpenMenuGoalId(null)
      setFeedback(status === 'completed' ? 'Meta concluida.' : 'Meta apagada.')
    } catch {
      setFeedback('Nao foi possivel atualizar o status da meta.')
    }
  }

  const renderGoalCard = (goal: Goal): JSX.Element => {
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
        ? 'Sem previsao'
        : `${estimatedMonthsToGoal} ${estimatedMonthsToGoal === 1 ? 'mes' : 'meses'}`
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
      <article
        key={goal.id}
        className={`${styles.goalCard} ${isReached ? styles.goalCardReached : ''}`.trim()}
      >
        <div className={styles.goalTop}>
          <div className={styles.goalHeaderMain}>
            <strong>{goal.title}</strong>
            {goal.isSystem ? <span className={styles.goalBadge}>Meta do sistema</span> : null}
          </div>

          <div ref={openMenuGoalId === goal.id ? menuContainerRef : null} className={styles.goalMenuArea}>
            <button
              type="button"
              className={styles.goalMenuTrigger}
              aria-label="Abrir menu da meta"
              onClick={() => setOpenMenuGoalId((prev) => (prev === goal.id ? null : goal.id))}
            >
              <FiMoreVertical />
            </button>

            {openMenuGoalId === goal.id ? (
              <div className={styles.goalMenu}>
                <button
                  type="button"
                  onClick={() => {
                    void handleUpdateGoalStatus(goal, 'completed')
                  }}
                  disabled={goal.status === 'completed'}
                >
                  Concluir
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEditGoal(goal.id)}
                  disabled={goal.isSystem}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className={styles.goalMenuDanger}
                  onClick={() => {
                    void handleUpdateGoalStatus(goal, 'deleted')
                  }}
                >
                  Apagar
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.goalValueSection}>
          <div className={styles.goalValueMain}>
            {formatCurrency(accountBalance)} <span>/ {formatCurrency(goal.targetAmount)}</span>
          </div>
          <p className={styles.goalValueCaption}>Em conta / Meta</p>
        </div>

        <div className={styles.goalRangeWrapper} style={rangeStyle}>
          <span className={styles.goalRangePercent}>{Math.round(progressPercent)}%</span>
          <input
            className={styles.goalRange}
            type="range"
            min={0}
            max={rangeMax}
            value={rangeValue}
            readOnly
          />
        </div>

        <div className={styles.goalSecondaryInfo}>
          <span>{formatSignedCurrency(averageMonthlyResult)} / mes</span>
          <span>{forecastLabel}</span>
        </div>
      </article>
    )
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
          <section className={styles.section}>
            <header className={styles.sectionHeader}>
              <h2>Em andamento</h2>
              <span>{activeGoals.length}</span>
            </header>
            {activeGoals.length === 0 ? (
              <p className={styles.stateMessage}>Nenhuma meta ativa.</p>
            ) : (
              <div className={styles.goalGrid}>
                {activeGoals.map((goal) => renderGoalCard(goal))}
              </div>
            )}
          </section>

          <section className={styles.section}>
            <header className={styles.sectionHeader}>
              <h2>Concluidas</h2>
              <span>{completedGoals.length}</span>
            </header>
            {completedGoals.length === 0 ? (
              <p className={styles.stateMessage}>Nenhuma meta concluida.</p>
            ) : (
              <div className={styles.goalGrid}>
                {completedGoals.map((goal) => renderGoalCard(goal))}
              </div>
            )}
          </section>
        </>
      ) : null}

      <ModalBase
        open={isGoalModalOpen}
        title={editingGoalId ? 'Editar meta' : 'Nova meta'}
        onClose={() => {
          if (isSavingGoal) return
          setIsGoalModalOpen(false)
          setGoalForm(initialGoalFormState)
          setEditingGoalId(null)
        }}
      >
        <form
          className={styles.goalForm}
          onSubmit={(event) => {
            event.preventDefault()
            void handleSaveGoal()
          }}
        >
          <label className={styles.field}>
            <span>Nome da meta</span>
            <input
              type="text"
              value={goalForm.title}
              onChange={(event) => setGoalForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Ex: Reserva de emergencia"
              disabled={isSavingGoal}
            />
          </label>

          <label className={styles.field}>
            <span>Valor da meta</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={goalForm.targetAmount}
              onChange={(event) => setGoalForm((prev) => ({ ...prev, targetAmount: event.target.value }))}
              placeholder="0.00"
              disabled={isSavingGoal}
            />
          </label>

          <div className={styles.formActions}>
            <Button
              type="button"
              variant="ghost"
              disabled={isSavingGoal}
              onClick={() => {
                setIsGoalModalOpen(false)
                setGoalForm(initialGoalFormState)
                setEditingGoalId(null)
              }}
            >
              Cancelar
            </Button>
            <ButtonLoading type="submit" loading={isSavingGoal}>
              Salvar meta
            </ButtonLoading>
          </div>
        </form>
      </ModalBase>
    </PageTemplate>
  )
}
