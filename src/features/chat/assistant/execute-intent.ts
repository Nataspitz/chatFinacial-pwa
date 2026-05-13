import { financeService } from '../../../services/finance.service'
import type { Transaction, TransactionType } from '../../../types/transaction.types'
import { localDateToDateOnly } from './date-utils'
import { normalizeText } from './normalize-text'
import type {
  AssistantEntities,
  AssistantIntent,
  AssistantPeriod,
  AssistantResponse,
  AssistantTransactionType,
  SummaryCategoryTotal,
  TransactionDraft
} from './types'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

interface AssistantSummaryData {
  incomeTotal: number
  expenseTotal: number
  balance: number
  transactionCount: number
  byCategory: SummaryCategoryTotal[]
}

const toDomainType = (type: AssistantTransactionType): TransactionType => (type === 'income' ? 'entrada' : 'saida')
const toAssistantType = (type: TransactionType): AssistantTransactionType => (type === 'entrada' ? 'income' : 'expense')

const displayDate = (value: string): string => {
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

const displayPeriod = (period?: AssistantPeriod): string => {
  if (!period) return ''
  if (period.label?.trim()) return period.label
  return `${displayDate(period.start)} até ${displayDate(period.end)}`
}

const filterByPeriod = (transactions: Transaction[], period: AssistantPeriod): Transaction[] =>
  transactions.filter((transaction) => transaction.date >= period.start && transaction.date <= period.end)

const filterByType = (transactions: Transaction[], type?: AssistantTransactionType): Transaction[] => {
  if (!type) return transactions
  const domainType = toDomainType(type)
  return transactions.filter((transaction) => transaction.type === domainType)
}

const filterByCategoryHint = (transactions: Transaction[], categoryHint?: string | null): Transaction[] => {
  if (!categoryHint) return transactions
  const hint = normalizeText(categoryHint)
  return transactions.filter((transaction) => {
    const category = normalizeText(transaction.category)
    const description = normalizeText(transaction.description)
    return category.includes(hint) || description.includes(hint)
  })
}

const sortTransactions = (transactions: Transaction[]): Transaction[] =>
  [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.description.localeCompare(a.description))

const getTransactionsForEntities = async (entities: AssistantEntities): Promise<Transaction[]> => {
  if (!entities.period) return []
  const transactions = await financeService.getTransactions()
  return sortTransactions(filterByCategoryHint(filterByType(filterByPeriod(transactions, entities.period), entities.type), entities.categoryHint))
}

const buildSummary = (transactions: Transaction[]): AssistantSummaryData => {
  const incomeTotal = transactions.filter((item) => item.type === 'entrada').reduce((acc, item) => acc + item.amount, 0)
  const expenseTotal = transactions.filter((item) => item.type === 'saida').reduce((acc, item) => acc + item.amount, 0)
  const byCategoryMap = new Map<string, { incomeTotal: number; expenseTotal: number; transactionCount: number }>()

  transactions.forEach((transaction) => {
    const current = byCategoryMap.get(transaction.category) ?? { incomeTotal: 0, expenseTotal: 0, transactionCount: 0 }
    if (transaction.type === 'entrada') current.incomeTotal += transaction.amount
    else current.expenseTotal += transaction.amount
    current.transactionCount += 1
    byCategoryMap.set(transaction.category, current)
  })

  const byCategory = [...byCategoryMap.entries()].map(([category, totals]) => ({
    category,
    incomeTotal: totals.incomeTotal,
    expenseTotal: totals.expenseTotal,
    balance: totals.incomeTotal - totals.expenseTotal,
    transactionCount: totals.transactionCount
  }))

  return {
    incomeTotal,
    expenseTotal,
    balance: incomeTotal - expenseTotal,
    transactionCount: transactions.length,
    byCategory
  }
}

const validateDraft = (draft: TransactionDraft): string | null => {
  if (draft.amount <= 0 || !Number.isFinite(draft.amount)) return 'O valor precisa ser maior que zero.'
  if (draft.type !== 'income' && draft.type !== 'expense') return 'O tipo da transacao e invalido.'
  if (!draft.description.trim()) return 'A descricao nao pode ficar vazia.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) return 'A data precisa estar no formato YYYY-MM-DD.'
  return null
}

export const createTransactionFromDraft = async (userId: string, draft: TransactionDraft): Promise<AssistantResponse> => {
  if (!userId) return { type: 'text', message: 'Voce precisa estar autenticado para criar uma transacao.' }
  const validationError = validateDraft(draft)
  if (validationError) return { type: 'text', message: validationError }

  const domainType = toDomainType(draft.type)
  const category = draft.categoryHint?.trim() || (draft.type === 'income' ? 'Entrada' : 'Despesa')
  const today = localDateToDateOnly(new Date())
  const isConfirmed = draft.date <= today

  const transaction: Transaction = {
    id: crypto.randomUUID(),
    type: domainType,
    category,
    amount: draft.amount,
    description: draft.description.trim(),
    date: draft.date,
    isConfirmed,
    confirmedAt: isConfirmed ? new Date().toISOString() : null,
    isMonthlyCost: false,
    paymentMethod: 'pix',
    installmentGroupId: null,
    installmentNumber: 1,
    installmentCount: 1,
    totalAmount: draft.amount,
    isInstallment: false,
    monthlyEndDate: null
  }

  await financeService.saveCategory(category, domainType)
  await financeService.saveTransactions([transaction])

  return {
    type: 'text',
    message: `Transacao criada: ${draft.description.trim()} no valor de ${currency.format(draft.amount)}.`
  }
}

export const executeIntent = async (
  userId: string,
  intent: AssistantIntent,
  entities: AssistantEntities
): Promise<AssistantResponse> => {
  if (!userId) return { type: 'text', message: 'Voce precisa estar autenticado para usar o assistente financeiro.' }

  if (intent === 'list_transactions') {
    const transactions = await getTransactionsForEntities(entities)
    const typeLabel = entities.type === 'income' ? 'entradas' : entities.type === 'expense' ? 'despesas' : 'transacoes'
    const periodLabel = displayPeriod(entities.period)
    const baseMessage = transactions.length === 0
      ? `Nao encontrei ${typeLabel}`
      : `Encontrei ${transactions.length} ${typeLabel}`
    const message = periodLabel ? `${baseMessage} em ${periodLabel}.` : `${baseMessage}.`

    return {
      type: 'transactions_list',
      message,
      data: transactions.map((transaction) => ({ ...transaction, assistantType: toAssistantType(transaction.type) })),
      period: entities.period
    }
  }

  if (intent === 'show_summary') {
    const transactions = await getTransactionsForEntities(entities)
    const data = buildSummary(transactions)
    const periodLabel = displayPeriod(entities.period)

    return {
      type: 'summary',
      message: periodLabel
        ? `Resumo de ${periodLabel}: entradas ${currency.format(data.incomeTotal)}, despesas ${currency.format(data.expenseTotal)}, saldo ${currency.format(data.balance)}.`
        : `Resumo: entradas ${currency.format(data.incomeTotal)}, despesas ${currency.format(data.expenseTotal)}, saldo ${currency.format(data.balance)}.`,
      data,
      period: entities.period
    }
  }

  if (intent === 'show_balance') {
    const transactions = await getTransactionsForEntities(entities)
    const summary = buildSummary(transactions)
    const periodLabel = displayPeriod(entities.period)

    return {
      type: 'balance',
      message: periodLabel
        ? `Seu saldo em ${periodLabel} foi de ${currency.format(summary.balance)}.`
        : `Seu saldo foi de ${currency.format(summary.balance)}.`,
      data: {
        incomeTotal: summary.incomeTotal,
        expenseTotal: summary.expenseTotal,
        balance: summary.balance
      },
      period: entities.period
    }
  }

  if (intent === 'create_transaction') {
    const draft: TransactionDraft = {
      type: entities.type as AssistantTransactionType,
      amount: Number(entities.amount),
      description: entities.description?.trim() ?? '',
      date: entities.date ?? '',
      categoryId: entities.categoryId,
      categoryHint: entities.categoryHint
    }

    const validationError = validateDraft(draft)
    if (validationError) return { type: 'text', message: validationError }

    return {
      type: 'transaction_draft',
      message: 'Confirma essa transacao?',
      draft
    }
  }

  return {
    type: 'text',
    message:
      "Nao consegui entender o pedido. Tente algo como: 'ver transacoes de maio de 2026', 'gastei 50 no mercado ontem' ou 'resumo desse mes'."
  }
}
