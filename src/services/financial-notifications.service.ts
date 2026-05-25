import type { FinancialAudit } from '../types/financial-audit.types'
import type { FinancialNotification } from '../types/financial-notification.types'
import type { Transaction } from '../types/transaction.types'
import { financialAuditService } from './financial-audit.service'
import { financeService } from './finance.service'

const LOOKAHEAD_DAYS = 30

const normalizeDate = (value: string): string => value.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? value

const getTodayDate = (): string => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const addDays = (dateValue: string, days: number): string => {
  const [year, month, day] = normalizeDate(dateValue).split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const formatDate = (value: string): string => {
  const [year, month, day] = normalizeDate(value).split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR').format(new Date(year, month - 1, day))
}

const getRelativeDateLabel = (date: string): string => {
  const today = getTodayDate()
  if (date === today) return 'hoje'
  if (date === addDays(today, 1)) return 'amanhã'
  if (date < today) return `desde ${formatDate(date)}`
  return `em ${formatDate(date)}`
}

const isInNotificationWindow = (date: string): boolean => date <= addDays(getTodayDate(), LOOKAHEAD_DAYS)

const groupTransactionsByDate = (transactions: Transaction[]): Map<string, Transaction[]> => {
  const groups = new Map<string, Transaction[]>()
  transactions.forEach((transaction) => {
    const date = normalizeDate(transaction.date)
    groups.set(date, [...(groups.get(date) ?? []), { ...transaction, date }])
  })
  return groups
}

const createIncomeNotifications = (transactions: Transaction[]): FinancialNotification[] => {
  const entries = transactions.filter((transaction) => transaction.type === 'entrada' && !transaction.isConfirmed && isInNotificationWindow(normalizeDate(transaction.date)))
  return Array.from(groupTransactionsByDate(entries).entries()).map(([date, items]) => {
    const total = items.reduce((sum, item) => sum + item.amount, 0)
    const isOverdue = date < getTodayDate()
    const isToday = date === getTodayDate()
    return {
      id: `income-${date}`,
      type: isOverdue ? 'INCOME_OVERDUE' : isToday ? 'INCOME_TODAY' : 'INCOME_UPCOMING',
      tone: isOverdue ? 'overdue' : 'income',
      title: isOverdue ? 'Entrada prevista atrasada' : isToday ? 'Entradas previstas para hoje' : 'Entrada prevista',
      description: `${items.length === 1 ? 'Existe 1 entrada prevista' : `Existem ${items.length} entradas previstas`} ${getRelativeDateLabel(date)} no total de ${formatCurrency(total)}.`,
      date,
      amount: total,
      count: items.length,
      transactionIds: items.map((item) => item.id),
      transactions: items,
      action: items.length === 1 ? 'confirm-income' : 'open-report'
    } satisfies FinancialNotification
  })
}

const createPaymentNotifications = (transactions: Transaction[]): FinancialNotification[] =>
  transactions
    .filter((transaction) => transaction.type === 'saida' && !transaction.isConfirmed && !transaction.isMonthlyCost && isInNotificationWindow(normalizeDate(transaction.date)))
    .map((transaction) => {
      const date = normalizeDate(transaction.date)
      const isOverdue = date < getTodayDate()
      const isToday = date === getTodayDate()
      return {
        id: `payment-${transaction.id}`,
        type: isOverdue ? 'PAYMENT_OVERDUE' : isToday ? 'PAYMENT_DUE' : 'PAYMENT_UPCOMING',
        tone: isOverdue ? 'overdue' : 'payment',
        title: isOverdue ? 'Pagamento atrasado' : isToday ? 'Pagamento vence hoje' : 'Pagamento agendado',
        description: `${transaction.description || transaction.category || 'Pagamento'} ${getRelativeDateLabel(date)}. Confirme depois que pagar fora do sistema.`,
        date,
        amount: transaction.amount,
        count: 1,
        transactionIds: [transaction.id],
        transactions: [{ ...transaction, date }],
        action: 'confirm-payment'
      } satisfies FinancialNotification
    })

const createMonthlyCostNotifications = (transactions: Transaction[]): FinancialNotification[] => {
  const today = getTodayDate()
  const endDate = addDays(today, LOOKAHEAD_DAYS)

  return transactions.flatMap((transaction) => {
    if (transaction.type !== 'saida' || !transaction.isMonthlyCost) return []
    if (transaction.isConfirmed) return []

    const startDate = normalizeDate(transaction.monthlyCostStartDate ?? transaction.date)
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number)
    const notifications: FinancialNotification[] = []
    const startMonthDate = new Date(startYear, startMonth - 1, 1)

    for (let offset = 0; offset <= 13; offset += 1) {
      const monthDate = new Date(startMonthDate.getFullYear(), startMonthDate.getMonth() + offset, 1)
      const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()
      const occurrenceDate = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-${String(Math.min(startDay, lastDay)).padStart(2, '0')}`

      if (occurrenceDate < today || occurrenceDate > endDate) continue
      if (transaction.monthlyEndDate && occurrenceDate > transaction.monthlyEndDate) continue

      notifications.push({
        id: `monthly-${transaction.id}-${occurrenceDate}`,
        type: 'MONTHLY_COST_DUE',
        tone: 'payment',
        title: occurrenceDate === today ? 'Custo mensal vence hoje' : 'Custo mensal agendado',
        description: `${transaction.description || transaction.category || 'Custo mensal'} vence ${getRelativeDateLabel(occurrenceDate)}.`,
        date: occurrenceDate,
        amount: transaction.amount,
        count: 1,
        transactionIds: [transaction.id],
        transactions: [{ ...transaction, date: occurrenceDate }],
        action: 'open-report'
      })
    }

    return notifications
  })
}

const createUncategorizedNotifications = (transactions: Transaction[]): FinancialNotification[] =>
  transactions
    .filter((transaction) => !transaction.category.trim())
    .map((transaction) => {
      const date = normalizeDate(transaction.date)
      return {
        id: `uncategorized-${transaction.id}`,
        type: 'UNCATEGORIZED_TRANSACTION',
        tone: 'warning',
        title: 'Transação sem categoria',
        description: `${transaction.description || 'Uma transação'} precisa ser categorizada no relatório.`,
        date,
        amount: transaction.amount,
        count: 1,
        transactionIds: [transaction.id],
        transactions: [{ ...transaction, date }],
        action: 'open-report'
      } satisfies FinancialNotification
    })

const createAuditNotifications = (audits: FinancialAudit[]): FinancialNotification[] =>
  audits
    .filter((audit) => audit.status === 'pending' && isInNotificationWindow(normalizeDate(audit.periodEnd)))
    .map((audit) => {
      const date = normalizeDate(audit.periodEnd)
      const isOverdue = date < getTodayDate()
      return {
        id: `audit-${audit.id}`,
        type: 'AUDIT_REMINDER',
        tone: isOverdue ? 'overdue' : 'audit',
        title: isOverdue ? 'Auditoria pendente' : 'Lembrete de auditoria',
        description: `Não esqueça de fazer a auditoria da fatia ${audit.auditSlice} ${getRelativeDateLabel(date)}.`,
        date,
        amount: null,
        count: 1,
        transactionIds: [],
        transactions: [],
        action: 'open-audit'
      } satisfies FinancialNotification
    })

const sortNotifications = (notifications: FinancialNotification[]): FinancialNotification[] =>
  [...notifications].sort((left, right) => {
    const leftOverdue = left.date < getTodayDate()
    const rightOverdue = right.date < getTodayDate()
    if (leftOverdue && !rightOverdue) return -1
    if (!leftOverdue && rightOverdue) return 1
    return left.date.localeCompare(right.date)
  })

export const financialNotificationsService = {
  getFinancialNotifications: async (): Promise<FinancialNotification[]> => {
    const [transactionsResult, auditsResult] = await Promise.allSettled([
      financeService.getTransactions(),
      financialAuditService.getHistory()
    ])

    const transactions = transactionsResult.status === 'fulfilled' ? transactionsResult.value : []
    const audits = auditsResult.status === 'fulfilled' ? auditsResult.value : []

    return sortNotifications([
      ...createIncomeNotifications(transactions),
      ...createPaymentNotifications(transactions),
      ...createMonthlyCostNotifications(transactions),
      ...createUncategorizedNotifications(transactions),
      ...createAuditNotifications(audits)
    ])
  },

  confirmNotificationTransaction: async (notification: FinancialNotification): Promise<void> => {
    if (notification.transactionIds.length !== 1) {
      throw new Error('Abra o relatório para confirmar itens agrupados.')
    }

    const transaction = notification.transactions[0]
    if (!transaction || transaction.isMonthlyCost) {
      throw new Error('Abra o relatório para confirmar este item.')
    }

    await financeService.confirmTransaction(transaction.id)
  }
}
