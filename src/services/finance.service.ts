import { supabase } from '../lib/supabase'
import type { ExportReportPdfPayload, ExportReportPdfResult } from '../types/report-export.types'
import type { PaymentMethod, Transaction, TransactionType } from '../types/transaction.types'

interface TransactionRow {
  id: string
  type: TransactionType
  category: string
  amount: number
  description: string
  date: string
  created_at: string | null
  is_confirmed: boolean
  is_monthly_cost: boolean
  payment_method: PaymentMethod
  installment_group_id: string | null
  installment_number: number
  installment_count: number
  total_amount: number
  is_installment: boolean
}

interface TransactionCategoryRow {
  id: string
  type: TransactionType
  name: string
}

export interface CategoryItem {
  id: string
  type: TransactionType
  name: string
}

const TRANSACTION_FIELDS =
  'id, type, category, amount, description, date, created_at, is_confirmed, is_monthly_cost, payment_method, installment_group_id, installment_number, installment_count, total_amount, is_installment'

const normalizeDate = (value: string): string => value.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? value

const normalizePaymentMethod = (value: string | null | undefined): PaymentMethod => {
  if (value === 'credito' || value === 'debito' || value === 'pix' || value === 'dinheiro') {
    return value
  }

  return 'pix'
}

const getTodayDate = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getDefaultConfirmedByDate = (dateValue: string): boolean => {
  const normalizedDate = normalizeDate(dateValue)
  return normalizedDate <= getTodayDate()
}

const mapRow = (row: TransactionRow): Transaction => ({
  id: row.id,
  type: row.type,
  category: row.category,
  amount: Number(row.amount),
  description: row.description,
  date: normalizeDate(row.date),
  createdAt: row.created_at ?? undefined,
  isConfirmed: Boolean(row.is_confirmed),
  isMonthlyCost: Boolean(row.is_monthly_cost),
  paymentMethod: normalizePaymentMethod(row.payment_method),
  installmentGroupId: row.installment_group_id,
  installmentNumber: Number.isFinite(Number(row.installment_number)) ? Number(row.installment_number) : 1,
  installmentCount: Number.isFinite(Number(row.installment_count)) ? Number(row.installment_count) : 1,
  totalAmount: Number.isFinite(Number(row.total_amount)) ? Number(row.total_amount) : Number(row.amount),
  isInstallment: Boolean(row.is_installment)
})

const toInsertPayload = (transaction: Transaction, userId: string): Record<string, unknown> => ({
  id: transaction.id,
  user_id: userId,
  type: transaction.type,
  category: transaction.category,
  amount: transaction.amount,
  description: transaction.description,
  date: normalizeDate(transaction.date),
  is_confirmed: transaction.isConfirmed,
  is_monthly_cost: transaction.type === 'saida' ? transaction.isMonthlyCost : false,
  payment_method: transaction.paymentMethod,
  installment_group_id: transaction.installmentGroupId,
  installment_number: transaction.installmentNumber,
  installment_count: transaction.installmentCount,
  total_amount: transaction.totalAmount,
  is_installment: transaction.isInstallment
})

const getUserId = async (): Promise<string> => {
  const { data, error } = await supabase.auth.getUser()
  if (error) {
    throw error
  }

  if (!data.user?.id) {
    throw new Error('Usuario nao autenticado')
  }

  return data.user.id
}

const isMissingConfirmedColumnError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false
  }

  const message = 'message' in error && typeof error.message === 'string' ? error.message : ''
  const details = 'details' in error && typeof error.details === 'string' ? error.details : ''
  const hint = 'hint' in error && typeof error.hint === 'string' ? error.hint : ''
  const combined = `${message} ${details} ${hint}`.toLowerCase()

  return combined.includes('is_confirmed') && (combined.includes('column') || combined.includes('schema'))
}

export const financeService = {
  getTransactions: async (): Promise<Transaction[]> => {
    const userId = await getUserId()

    const response = await supabase
      .from('transactions')
      .select(TRANSACTION_FIELDS)
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (response.error) {
      if (!isMissingConfirmedColumnError(response.error)) {
        throw response.error
      }

      const fallback = await supabase
        .from('transactions')
        .select('id, type, category, amount, description, date, created_at, is_monthly_cost, payment_method, installment_group_id, installment_number, installment_count, total_amount, is_installment')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (fallback.error) {
        throw fallback.error
      }

      const raw = (fallback.data ?? []) as Array<Omit<TransactionRow, 'is_confirmed'>>
      return raw.map((row) =>
        mapRow({
          ...row,
          is_confirmed: getDefaultConfirmedByDate(row.date)
        })
      )
    }

    return ((response.data ?? []) as TransactionRow[]).map(mapRow)
  },

  saveTransactions: async (transactions: Transaction[]): Promise<void> => {
    if (transactions.length === 0) {
      return
    }

    const userId = await getUserId()
    const payload = transactions.map((item) => toInsertPayload(item, userId))
    const { error } = await supabase.from('transactions').insert(payload)

    if (error) {
      throw error
    }
  },

  updateTransaction: async (transaction: Transaction): Promise<void> => {
    await getUserId()

    const payload = {
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount,
      description: transaction.description,
      date: normalizeDate(transaction.date),
      is_confirmed: transaction.isConfirmed,
      is_monthly_cost: transaction.type === 'saida' ? transaction.isMonthlyCost : false,
      payment_method: transaction.paymentMethod,
      installment_group_id: transaction.installmentGroupId,
      installment_number: transaction.installmentNumber,
      installment_count: transaction.installmentCount,
      total_amount: transaction.totalAmount,
      is_installment: transaction.isInstallment
    }

    const { error } = await supabase.from('transactions').update(payload).eq('id', transaction.id)

    if (error) {
      throw error
    }
  },

  deleteTransaction: async (id: string): Promise<void> => {
    await getUserId()

    const { error } = await supabase.from('transactions').delete().eq('id', id)

    if (error) {
      throw error
    }
  },

  getCategoryItems: async (type: TransactionType): Promise<CategoryItem[]> => {
    const userId = await getUserId()

    const { data, error } = await supabase
      .from('transaction_categories')
      .select('id, type, name')
      .eq('user_id', userId)
      .eq('type', type)
      .order('name', { ascending: true })

    if (error) {
      throw error
    }

    return ((data ?? []) as TransactionCategoryRow[]).map((item) => ({
      id: item.id,
      type: item.type,
      name: item.name
    }))
  },

  saveCategory: async (name: string, type: TransactionType): Promise<void> => {
    const userId = await getUserId()
    const cleaned = name.trim().replace(/\s+/g, ' ')
    if (!cleaned) {
      return
    }

    const { error } = await supabase
      .from('transaction_categories')
      .upsert({ user_id: userId, type, name: cleaned }, { onConflict: 'user_id,type,name_normalized', ignoreDuplicates: true })

    if (error) {
      throw error
    }
  },

  updateCategory: async (categoryId: string, name: string, type: TransactionType): Promise<void> => {
    const userId = await getUserId()
    const cleaned = name.trim().replace(/\s+/g, ' ')

    const { error } = await supabase
      .from('transaction_categories')
      .update({ name: cleaned, type })
      .eq('id', categoryId)
      .eq('user_id', userId)

    if (error) {
      throw error
    }
  },

  deleteCategory: async (categoryId: string): Promise<void> => {
    const userId = await getUserId()

    const { error } = await supabase.from('transaction_categories').delete().eq('id', categoryId).eq('user_id', userId)

    if (error) {
      throw error
    }
  },

  exportReportPdf: async (payload: ExportReportPdfPayload): Promise<ExportReportPdfResult> => {
    if (!window.api?.exportReportPdf) {
      throw new Error('Exportacao PDF indisponivel neste ambiente.')
    }

    return window.api.exportReportPdf(payload)
  }
}
