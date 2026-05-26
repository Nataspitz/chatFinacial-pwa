import { financeService } from '../../../../services/finance.service'
import type { Transaction, TransactionType } from '../../../../types/transaction.types'
import { shouldAffectFinancialReports } from '../../../../utils/transaction-reports'
import { localDateToDateOnly } from '../date-utils'
import { normalizeText } from '../core/normalizeText'
import type {
  AssistantEntities,
  AssistantIntent,
  AssistantPaymentMethod,
  AssistantPeriod,
  AssistantResponse,
  AssistantTransactionType,
  SummaryCategoryTotal,
  TransactionDraft
} from '../types'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

interface AssistantSummaryData {
  incomeTotal: number
  expenseTotal: number
  balance: number
  transactionCount: number
  byCategory: SummaryCategoryTotal[]
}

const toDomainType = (type: AssistantTransactionType): TransactionType =>
  type === 'income' ? 'entrada' : 'saida'

const toAssistantType = (type: TransactionType): AssistantTransactionType =>
  type === 'entrada' ? 'income' : 'expense'

const displayDate = (value: string): string => {
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

const displayPeriod = (period?: AssistantPeriod): string => {
  if (!period) return ''
  if (period.label?.trim()) return period.label
  return `${displayDate(period.start)} até ${displayDate(period.end)}`
}

const filterByPeriod = (transactions: Transaction[], period?: AssistantPeriod): Transaction[] => {
  if (!period) return transactions
  return transactions.filter((transaction) => transaction.date >= period.start && transaction.date <= period.end)
}

const filterByType = (transactions: Transaction[], type?: AssistantTransactionType): Transaction[] => {
  if (!type) return transactions
  const domainType = toDomainType(type)
  return transactions.filter((transaction) => transaction.type === domainType)
}

const filterByCategory = (transactions: Transaction[], categoryHint?: string | null): Transaction[] => {
  if (!categoryHint) return transactions
  const hint = normalizeText(categoryHint)
  return transactions.filter((transaction) => {
    const category = normalizeText(transaction.category)
    const description = normalizeText(transaction.description)
    return category.includes(hint) || description.includes(hint)
  })
}

const filterByPayment = (transactions: Transaction[], paymentMethod?: AssistantPaymentMethod): Transaction[] => {
  if (!paymentMethod) return transactions
  return transactions.filter((transaction) => transaction.paymentMethod === paymentMethod)
}

const filterByDescription = (transactions: Transaction[], description?: string): Transaction[] => {
  if (!description) return transactions
  const query = normalizeText(description)
  return transactions.filter((transaction) => normalizeText(transaction.description).includes(query))
}

const filterByAmountRange = (
  transactions: Transaction[],
  minAmount?: number,
  maxAmount?: number
): Transaction[] => {
  return transactions.filter((transaction) => {
    if (minAmount && transaction.amount < minAmount) return false
    if (maxAmount && transaction.amount > maxAmount) return false
    return true
  })
}

const sortTransactions = (transactions: Transaction[]): Transaction[] =>
  [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.description.localeCompare(a.description))

const getTransactionsForEntities = async (entities: AssistantEntities): Promise<Transaction[]> => {
  const transactions = (await financeService.getTransactions()).filter(shouldAffectFinancialReports)
  return sortTransactions(
    filterByAmountRange(
      filterByDescription(
        filterByPayment(
          filterByCategory(filterByType(filterByPeriod(transactions, entities.period), entities.type), entities.categoryHint),
          entities.paymentMethod
        ),
        entities.description
      ),
      entities.minAmount,
      entities.maxAmount
    )
  )
}

const buildSummary = (transactions: Transaction[]): AssistantSummaryData => {
  const incomeTotal = transactions
    .filter((item) => item.type === 'entrada')
    .reduce((acc, item) => acc + item.amount, 0)
  const expenseTotal = transactions
    .filter((item) => item.type === 'saida')
    .reduce((acc, item) => acc + item.amount, 0)
  const byCategoryMap = new Map<
    string,
    { incomeTotal: number; expenseTotal: number; transactionCount: number }
  >()

  transactions.forEach((transaction) => {
    const current = byCategoryMap.get(transaction.category) ?? {
      incomeTotal: 0,
      expenseTotal: 0,
      transactionCount: 0
    }
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
  if (draft.type !== 'income' && draft.type !== 'expense') return 'O tipo da transação é inválido.'
  if (!draft.description.trim()) return 'A descrição não pode ficar vazia.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date))
    return 'A data precisa estar no formato YYYY-MM-DD.'
  return null
}

export const createTransactionFromDraft = async (
  userId: string,
  draft: TransactionDraft
): Promise<AssistantResponse> => {
  if (!userId) {
    return {
      type: 'text',
      message: 'Você precisa estar autenticado para criar uma transação.'
    }
  }
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
    paymentMethod: draft.paymentMethod ?? 'pix',
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
      message: `Transação criada: ${draft.description.trim()} no valor de ${currency.format(draft.amount)}.`,
    quickActions: [
      { label: 'Listar este mês', value: 'listar transacoes deste mes' },
      { label: 'Ver resumo do mês', value: 'resumo desse mes' }
    ]
  }
}

export const executeIntent = async (
  userId: string,
  intent: AssistantIntent,
  entities: AssistantEntities
): Promise<AssistantResponse> => {
  if (!userId) {
    return {
      type: 'text',
      message: 'Você precisa estar autenticado para usar o assistente financeiro.'
    }
  }

  if (intent === 'list_transactions') {
    const transactions = await getTransactionsForEntities(entities)
    const typeLabel =
      entities.type === 'income'
        ? 'entradas'
        : entities.type === 'expense'
          ? 'despesas'
          : 'transações'
    const periodLabel = displayPeriod(entities.period)
    const baseMessage =
      transactions.length === 0
        ? `Não encontrei ${typeLabel}`
        : `Encontrei ${transactions.length} ${typeLabel}`
    const message = periodLabel ? `${baseMessage} em ${periodLabel}.` : `${baseMessage}.`

    return {
      type: 'transactions_list',
      message,
      data: transactions.map((transaction) => ({
        ...transaction,
        assistantType: toAssistantType(transaction.type)
      })),
      period: entities.period,
      quickActions: [
        { label: 'Resumo desse período', value: 'resumo desse periodo' },
        { label: 'Somente despesas', value: 'mostrar despesas desse periodo' }
      ]
    }
  }

  if (intent === 'show_summary' || intent === 'analyze_transactions') {
    const transactions = await getTransactionsForEntities(entities)
    const data = buildSummary(transactions)
    const periodLabel = displayPeriod(entities.period)

    return {
      type: 'summary',
      message: periodLabel
        ? `Resumo de ${periodLabel}: entradas ${currency.format(data.incomeTotal)}, despesas ${currency.format(data.expenseTotal)}, saldo ${currency.format(data.balance)}.`
        : `Resumo: entradas ${currency.format(data.incomeTotal)}, despesas ${currency.format(data.expenseTotal)}, saldo ${currency.format(data.balance)}.`,
      data,
      period: entities.period,
      quickActions: [
        { label: 'Ver saldo', value: 'qual meu saldo desse periodo' },
        { label: 'Listar transações', value: 'listar transacoes desse periodo' }
      ]
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
      paymentMethod: entities.paymentMethod,
      categoryId: entities.categoryId,
      categoryHint: entities.categoryHint
    }

    const validationError = validateDraft(draft)
    if (validationError) return { type: 'text', message: validationError }

    return {
      type: 'transaction_draft',
      message: 'Entendi. Confirma essa transação?',
      draft,
      quickActions: [
        { label: 'Confirmar', value: 'confirmar' },
        { label: 'Cancelar', value: 'cancelar' }
      ]
    }
  }

  return {
    type: 'text',
    message:
      "Não encontrei uma ação clara nessa mensagem. Você quer criar uma transação, listar transações ou ver um resumo financeiro?"
  }
}
