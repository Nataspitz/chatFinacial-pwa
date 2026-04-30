import { supabase } from '../lib/supabase'
import { assertFinancialPeriodUnlocked } from './financial-audit-lock'
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
  deleted_at?: string | null
}

interface TransactionCategoryRow {
  id: string
  type: TransactionType
  name: string
}

interface TransactionDeleteScopeRow {
  installment_group_id: string | null
  installment_count: number
  date: string
}

export interface CategoryItem {
  id: string
  type: TransactionType
  name: string
}

const TRANSACTION_FIELDS =
  'id, type, category, amount, description, date, created_at, is_confirmed, is_monthly_cost, payment_method, installment_group_id, installment_number, installment_count, total_amount, is_installment, deleted_at'

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

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number.isFinite(value) ? value : 0)

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const buildPdfRows = (transactions: ExportReportPdfPayload['entries']): string[][] => {
  if (transactions.length === 0) {
    return [['-', 'Nenhuma transacao neste periodo.', '-', '-', '-', '-']]
  }

  return transactions.map((transaction) => [
    transaction.dateLabel,
    transaction.description,
    transaction.category,
    transaction.paymentDetailsLabel || '-',
    transaction.amountLabel,
    transaction.totalAmountLabel
  ])
}

const sanitizeFileName = (value: string): string => {
  const cleaned = value.trim().replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
  return cleaned || 'relatorio-financeiro'
}

const exportReportPdfOnWeb = async (payload: ExportReportPdfPayload): Promise<ExportReportPdfResult> => {
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 32
  const marginY = 28
  const contentWidth = pageWidth - marginX * 2
  const baseFont = 'helvetica'

  const primary = [24, 32, 51] as const
  const muted = [100, 112, 139] as const
  const border = [219, 227, 243] as const
  const accent = [79, 124, 255] as const
  const surface = [233, 240, 255] as const

  const drawText = (text: string, x: number, y: number, options?: { size?: number; color?: readonly number[]; style?: 'normal' | 'bold'; align?: 'left' | 'right' }) => {
    doc.setFont(baseFont, options?.style ?? 'normal')
    doc.setFontSize(options?.size ?? 11)
    doc.setTextColor(...(options?.color ?? primary))
    doc.text(text, x, y, { align: options?.align ?? 'left' })
  }

  const drawWrappedText = (text: string, x: number, y: number, width: number, options?: { size?: number; color?: readonly number[]; style?: 'normal' | 'bold' }) => {
    doc.setFont(baseFont, options?.style ?? 'normal')
    doc.setFontSize(options?.size ?? 11)
    doc.setTextColor(...(options?.color ?? primary))
    const lines = doc.splitTextToSize(text, width)
    doc.text(lines, x, y)
    return lines.length
  }

  const drawMetricCards = (startY: number): number => {
    const metrics = payload.dashboardMetrics.length > 0
      ? payload.dashboardMetrics
      : [
          { label: 'Entradas', value: formatCurrency(payload.totalEntries) },
          { label: 'Saidas', value: formatCurrency(payload.totalOutcomes) },
          { label: 'Resultado', value: formatCurrency(payload.resultBalance) }
        ]

    const columns = 3
    const gap = 12
    const cardWidth = (contentWidth - gap * (columns - 1)) / columns
    const cardHeight = 58
    const rowGap = 10
    const visibleMetrics = metrics.slice(0, 6)

    visibleMetrics.forEach((metric, index) => {
      const column = index % columns
      const row = Math.floor(index / columns)
      const x = marginX + column * (cardWidth + gap)
      const y = startY + row * (cardHeight + rowGap)
      doc.setFillColor(...surface)
      doc.setDrawColor(...border)
      doc.roundedRect(x, y, cardWidth, cardHeight, 10, 10, 'FD')
      drawText(metric.label.toUpperCase(), x + 12, y + 18, { size: 8, color: muted })
      drawText(metric.value, x + 12, y + 42, { size: 15, style: 'bold' })
    })

    const rowCount = Math.max(1, Math.ceil(visibleMetrics.length / columns))
    return startY + rowCount * cardHeight + (rowCount - 1) * rowGap + 24
  }

  const ensureSpace = (cursorY: number, neededHeight: number): number => {
    if (cursorY + neededHeight <= pageHeight - marginY) {
      return cursorY
    }

    doc.addPage()
    return marginY
  }

  const drawTable = (title: string, rows: string[][], startY: number): number => {
    let cursorY = ensureSpace(startY, 80)

    drawText(title, marginX, cursorY, { size: 16, style: 'bold' })
    cursorY += 16

    const columnWidths = [70, 180, 110, 170, 95, 95]
    const rowHeight = 24
    const headerHeight = 28
    const headers = ['Data', 'Descricao', 'Categoria', 'Pagamento', 'Valor', 'Total']

    const drawHeader = (y: number) => {
      let currentX = marginX
      headers.forEach((header, index) => {
        const width = columnWidths[index]
        doc.setFillColor(...surface)
        doc.setDrawColor(...border)
        doc.rect(currentX, y, width, headerHeight, 'FD')
        drawText(header, currentX + 8, y + 18, { size: 9, color: muted, style: 'bold' })
        currentX += width
      })
    }

    const drawRow = (row: string[], y: number) => {
      let currentX = marginX
      row.forEach((cell, index) => {
        const width = columnWidths[index]
        doc.setDrawColor(...border)
        doc.rect(currentX, y, width, rowHeight)
        const isNumeric = index >= 4
        const textX = isNumeric ? currentX + width - 8 : currentX + 8
        drawText(cell, textX, y + 16, {
          size: 9,
          align: isNumeric ? 'right' : 'left'
        })
        currentX += width
      })
    }

    drawHeader(cursorY)
    cursorY += headerHeight

    rows.forEach((row) => {
      cursorY = ensureSpace(cursorY, rowHeight + 8)
      if (cursorY === marginY) {
        drawHeader(cursorY)
        cursorY += headerHeight
      }
      drawRow(row, cursorY)
      cursorY += rowHeight
    })

    return cursorY + 24
  }

  drawText(payload.companyName || 'Relatorio financeiro', marginX, marginY + 8, { size: 22, style: 'bold' })
  drawText(`Periodo: ${payload.periodLabel}`, marginX, marginY + 30, { size: 11, color: muted })
  drawText(`Gerado em: ${payload.createdAt}`, marginX, marginY + 48, { size: 11, color: muted })

  let cursorY = marginY + 68
  cursorY = drawMetricCards(cursorY)
  cursorY = drawTable('Entradas', buildPdfRows(payload.entries), cursorY)
  cursorY = drawTable('Saidas', buildPdfRows(payload.outcomes), cursorY)

  cursorY = ensureSpace(cursorY, 40)
  drawWrappedText(
    'Este arquivo foi gerado pela versao web do ChatFinacial. As linhas do relatorio incluem descricao, categoria, forma de pagamento e informacoes de parcelas.',
    marginX,
    cursorY,
    contentWidth,
    { size: 10, color: muted }
  )

  doc.save(`${sanitizeFileName(payload.fileName)}.pdf`)

  return { canceled: false }
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

const isMissingDeletedAtColumnError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false
  }

  const message = 'message' in error && typeof error.message === 'string' ? error.message : ''
  const details = 'details' in error && typeof error.details === 'string' ? error.details : ''
  const hint = 'hint' in error && typeof error.hint === 'string' ? error.hint : ''
  const combined = `${message} ${details} ${hint}`.toLowerCase()

  return combined.includes('deleted_at') && (combined.includes('column') || combined.includes('schema'))
}

const extractMissingColumnName = (error: unknown): string | null => {
  if (!error || typeof error !== 'object') {
    return null
  }

  const message = 'message' in error && typeof error.message === 'string' ? error.message : ''
  const details = 'details' in error && typeof error.details === 'string' ? error.details : ''
  const hint = 'hint' in error && typeof error.hint === 'string' ? error.hint : ''
  const combined = `${message} ${details} ${hint}`
  const normalized = combined.toLowerCase()

  if (!(normalized.includes('column') && normalized.includes('does not exist'))) {
    return null
  }

  const columnMatch = combined.match(/column\s+"?([a-zA-Z0-9_]+)"?\s+does not exist/i)
  if (columnMatch?.[1]) {
    return columnMatch[1].toLowerCase()
  }

  return null
}

const removeColumnFromPayload = (payload: Record<string, unknown>, column: string): Record<string, unknown> => {
  if (!(column in payload)) {
    return payload
  }

  const { [column]: _removed, ...nextPayload } = payload
  return nextPayload
}

const insertTransactionsWithFallback = async (payload: Array<Record<string, unknown>>): Promise<void> => {
  if (payload.length === 0) {
    return
  }

  let workingPayload = payload
  const MAX_ATTEMPTS = 8

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const { error } = await supabase.from('transactions').insert(workingPayload)

    if (!error) {
      return
    }

    const missingColumn = extractMissingColumnName(error)
    if (!missingColumn) {
      throw error
    }

    if (!workingPayload.some((row) => missingColumn in row)) {
      throw error
    }

    workingPayload = workingPayload.map((row) => removeColumnFromPayload(row, missingColumn))
  }

  throw new Error('Nao foi possivel salvar as transacoes por incompatibilidade de schema.')
}

const updateTransactionWithFallback = async (
  payload: Record<string, unknown>,
  transactionId: string,
  userId: string
): Promise<void> => {
  let workingPayload = payload
  const MAX_ATTEMPTS = 8

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const { error } = await supabase
      .from('transactions')
      .update(workingPayload)
      .eq('id', transactionId)
      .eq('user_id', userId)

    if (!error) {
      return
    }

    const missingColumn = extractMissingColumnName(error)
    if (!missingColumn) {
      throw error
    }

    if (!(missingColumn in workingPayload)) {
      throw error
    }

    workingPayload = removeColumnFromPayload(workingPayload, missingColumn)
  }

  throw new Error('Nao foi possivel editar a transacao por incompatibilidade de schema.')
}

export const financeService = {
  getTransactions: async (): Promise<Transaction[]> => {
    const userId = await getUserId()

    const response = await supabase
      .from('transactions')
      .select(TRANSACTION_FIELDS)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (response.error) {
      if (isMissingDeletedAtColumnError(response.error)) {
        const noDeletedAt = await supabase
          .from('transactions')
          .select(TRANSACTION_FIELDS.replace(', deleted_at', ''))
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })

        if (!noDeletedAt.error) {
          return ((noDeletedAt.data ?? []) as TransactionRow[]).map(mapRow)
        }

        if (!isMissingConfirmedColumnError(noDeletedAt.error)) {
          throw noDeletedAt.error
        }

        const legacyWithoutDeletedAt = await supabase
          .from('transactions')
          .select('id, type, category, amount, description, date, created_at, is_monthly_cost, payment_method, installment_group_id, installment_number, installment_count, total_amount, is_installment')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })

        if (legacyWithoutDeletedAt.error) {
          throw legacyWithoutDeletedAt.error
        }

        const legacyRows = (legacyWithoutDeletedAt.data ?? []) as Array<Omit<TransactionRow, 'is_confirmed'>>
        return legacyRows.map((row) =>
          mapRow({
            ...row,
            is_confirmed: getDefaultConfirmedByDate(row.date)
          })
        )
      }

      if (!isMissingConfirmedColumnError(response.error)) {
        throw response.error
      }

      const fallback = await supabase
        .from('transactions')
        .select('id, type, category, amount, description, date, created_at, is_monthly_cost, payment_method, installment_group_id, installment_number, installment_count, total_amount, is_installment')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (fallback.error) {
        if (isMissingDeletedAtColumnError(fallback.error)) {
          return []
        }
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

  getDeletedTransactions: async (): Promise<Transaction[]> => {
    const userId = await getUserId()

    const response = await supabase
      .from('transactions')
      .select(TRANSACTION_FIELDS)
      .eq('user_id', userId)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (response.error) {
      if (isMissingDeletedAtColumnError(response.error)) {
        return []
      }

      if (!isMissingConfirmedColumnError(response.error)) {
        throw response.error
      }

      const fallback = await supabase
        .from('transactions')
        .select('id, type, category, amount, description, date, created_at, is_monthly_cost, payment_method, installment_group_id, installment_number, installment_count, total_amount, is_installment')
        .eq('user_id', userId)
        .not('deleted_at', 'is', null)
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

    assertFinancialPeriodUnlocked(transactions.map((item) => item.date))

    const userId = await getUserId()
    const payload = transactions.map((item) => toInsertPayload(item, userId))
    await insertTransactionsWithFallback(payload)
  },

  updateTransaction: async (transaction: Transaction): Promise<void> => {
    assertFinancialPeriodUnlocked([transaction.date])

    const userId = await getUserId()

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

    await updateTransactionWithFallback(payload, transaction.id, userId)
  },

  deleteTransaction: async (id: string): Promise<void> => {
    const userId = await getUserId()
    const scopeLookup = await supabase
      .from('transactions')
      .select('installment_group_id, installment_count, date')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle()

    if (scopeLookup.error) {
      throw scopeLookup.error
    }

    const scopeRow = scopeLookup.data as TransactionDeleteScopeRow | null
    const hasInstallmentGroup = Boolean(scopeRow?.installment_group_id && Number(scopeRow.installment_count) > 1)
    const installmentGroupId = hasInstallmentGroup ? scopeRow?.installment_group_id ?? null : null
    const affectedDates = installmentGroupId
      ? await supabase
          .from('transactions')
          .select('date')
          .eq('user_id', userId)
          .eq('installment_group_id', installmentGroupId)
          .is('deleted_at', null)
      : null
    const affectedDatesFallback =
      affectedDates?.error && isMissingDeletedAtColumnError(affectedDates.error)
        ? await supabase
            .from('transactions')
            .select('date')
            .eq('user_id', userId)
            .eq('installment_group_id', installmentGroupId)
        : affectedDates

    if (affectedDatesFallback?.error) {
      throw affectedDatesFallback.error
    }

    assertFinancialPeriodUnlocked(
      installmentGroupId
        ? ((affectedDatesFallback?.data ?? []) as Array<Pick<TransactionDeleteScopeRow, 'date'>>).map((item) => item.date)
        : scopeRow?.date
          ? [scopeRow.date]
          : []
    )

    const deleteQuery = supabase
      .from('transactions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('deleted_at', null)

    const { error } = installmentGroupId
      ? await deleteQuery.eq('installment_group_id', installmentGroupId)
      : await deleteQuery.eq('id', id)

    if (error) {
      if (isMissingDeletedAtColumnError(error)) {
        const fallbackDeleteQuery = supabase
          .from('transactions')
          .delete()
          .eq('user_id', userId)

        const fallbackDelete = installmentGroupId
          ? await fallbackDeleteQuery.eq('installment_group_id', installmentGroupId)
          : await fallbackDeleteQuery.eq('id', id)

        if (fallbackDelete.error) {
          throw fallbackDelete.error
        }
        return
      }

      throw error
    }
  },

  restoreDeletedTransactions: async (): Promise<number> => {
    const userId = await getUserId()
    const lockedLookup = await supabase
      .from('transactions')
      .select('date')
      .eq('user_id', userId)
      .not('deleted_at', 'is', null)

    if (lockedLookup.error) {
      if (isMissingDeletedAtColumnError(lockedLookup.error)) {
        return 0
      }
      throw lockedLookup.error
    }

    assertFinancialPeriodUnlocked(
      ((lockedLookup.data ?? []) as Array<Pick<TransactionDeleteScopeRow, 'date'>>).map((item) => item.date)
    )

    const response = await supabase
      .from('transactions')
      .update({ deleted_at: null })
      .eq('user_id', userId)
      .not('deleted_at', 'is', null)
      .select('id')

    if (response.error) {
      if (isMissingDeletedAtColumnError(response.error)) {
        return 0
      }
      throw response.error
    }

    return response.data?.length ?? 0
  },

  restoreDeletedTransactionsByIds: async (ids: string[]): Promise<number> => {
    if (ids.length === 0) {
      return 0
    }

    const userId = await getUserId()
    const lockedLookup = await supabase
      .from('transactions')
      .select('date')
      .eq('user_id', userId)
      .in('id', ids)
      .not('deleted_at', 'is', null)

    if (lockedLookup.error) {
      if (isMissingDeletedAtColumnError(lockedLookup.error)) {
        return 0
      }
      throw lockedLookup.error
    }

    assertFinancialPeriodUnlocked(
      ((lockedLookup.data ?? []) as Array<Pick<TransactionDeleteScopeRow, 'date'>>).map((item) => item.date)
    )

    const response = await supabase
      .from('transactions')
      .update({ deleted_at: null })
      .eq('user_id', userId)
      .in('id', ids)
      .not('deleted_at', 'is', null)
      .select('id')

    if (response.error) {
      if (isMissingDeletedAtColumnError(response.error)) {
        return 0
      }
      throw response.error
    }

    return response.data?.length ?? 0
  },

  purgeDeletedTransactions: async (): Promise<number> => {
    const userId = await getUserId()
    const lockedLookup = await supabase
      .from('transactions')
      .select('date')
      .eq('user_id', userId)
      .not('deleted_at', 'is', null)

    if (lockedLookup.error) {
      if (isMissingDeletedAtColumnError(lockedLookup.error)) {
        return 0
      }
      throw lockedLookup.error
    }

    assertFinancialPeriodUnlocked(
      ((lockedLookup.data ?? []) as Array<Pick<TransactionDeleteScopeRow, 'date'>>).map((item) => item.date)
    )

    const response = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', userId)
      .not('deleted_at', 'is', null)
      .select('id')

    if (response.error) {
      if (isMissingDeletedAtColumnError(response.error)) {
        return 0
      }
      throw response.error
    }

    return response.data?.length ?? 0
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
    if (window.api?.exportReportPdf) {
      return window.api.exportReportPdf(payload)
    }

    return exportReportPdfOnWeb(payload)
  }
}

