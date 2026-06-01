import { supabase } from '../lib/supabase'
import { isFinancialPeriodLocked } from './financial-audit-lock'
import type { ExportReportPdfPayload, ExportReportPdfResult } from '../types/report-export.types'
import type { PaymentMethod, RefundScope, Transaction, TransactionType } from '../types/transaction.types'
import {
  GENERAL_TRANSACTION_CATEGORY,
  ensureGeneralCategoryOption,
  isGeneralTransactionCategory,
  normalizeTransactionCategory,
  resolveTransactionCategory
} from '../utils/transaction-categories'
import { getRefundTransactionTargets } from '../utils/transaction-refunds'

interface TransactionRow {
  id: string
  type: TransactionType
  category: string
  amount: number
  description: string
  date: string
  created_at: string | null
  is_confirmed: boolean
  confirmed_at?: string | null
  is_monthly_cost: boolean
  payment_method: PaymentMethod
  installment_group_id: string | null
  installment_number: number
  installment_count: number
  total_amount: number
  is_installment: boolean
  monthly_end_date?: string | null
  deleted_at?: string | null
  status?: string | null
  ignored_in_reports?: boolean | null
  refunded_at?: string | null
  refund_reason?: string | null
  refund_scope?: RefundScope | null
  canceled_at?: string | null
  cancel_reason?: string | null
  reimbursed_at?: string | null
  reimbursement_responsible?: string | null
  reimbursement_notes?: string | null
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

export interface RefundTransactionOptions {
  mode: 'refunded' | 'canceled'
  reason?: string
  scope?: RefundScope
}

const TRANSACTION_FIELDS =
  'id, type, category, amount, description, date, created_at, is_confirmed, confirmed_at, is_monthly_cost, payment_method, installment_group_id, installment_number, installment_count, total_amount, is_installment, deleted_at'
const TRANSACTION_REFUND_FIELDS = TRANSACTION_FIELDS.replace(
  ', deleted_at',
  ', status, ignored_in_reports, refunded_at, refund_reason, refund_scope, canceled_at, cancel_reason, reimbursed_at, reimbursement_responsible, reimbursement_notes, deleted_at'
)
const TRANSACTION_REIMBURSEMENT_FIELDS = TRANSACTION_FIELDS.replace(
  ', deleted_at',
  ', status, ignored_in_reports, reimbursed_at, reimbursement_responsible, reimbursement_notes, deleted_at'
)
const TRANSACTION_FIELDS_WITH_MONTHLY_END_DATE = TRANSACTION_FIELDS.replace(', deleted_at', ', monthly_end_date, deleted_at')
const TRANSACTION_REFUND_FIELDS_WITH_MONTHLY_END_DATE = TRANSACTION_REFUND_FIELDS.replace(', deleted_at', ', monthly_end_date, deleted_at')
const TRANSACTION_REIMBURSEMENT_FIELDS_WITH_MONTHLY_END_DATE = TRANSACTION_REIMBURSEMENT_FIELDS.replace(', deleted_at', ', monthly_end_date, deleted_at')
const TRANSACTION_FIELDS_WITHOUT_DELETED_AT = TRANSACTION_FIELDS.replace(', deleted_at', '')
const TRANSACTION_FIELDS_WITH_MONTHLY_END_DATE_WITHOUT_DELETED_AT = TRANSACTION_FIELDS_WITH_MONTHLY_END_DATE.replace(', deleted_at', '')
const LEGACY_TRANSACTION_FIELDS =
  'id, type, category, amount, description, date, created_at, is_monthly_cost, payment_method, installment_group_id, installment_number, installment_count, total_amount, is_installment'

const normalizeDate = (value: string): string => value.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? value

const normalizePaymentMethod = (value: string | null | undefined): PaymentMethod => {
  if (value === 'credito' || value === 'debito' || value === 'pix' || value === 'dinheiro') {
    return value
  }

  return 'pix'
}

const normalizeTransactionStatus = (value: string | null | undefined, isConfirmed?: boolean, dateValue?: string): string => {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (normalized === 'reimbursed') return 'refunded'
  if (
    normalized === 'active'
    || normalized === 'confirmed'
    || normalized === 'scheduled'
    || normalized === 'refunded'
    || normalized === 'canceled'
  ) {
    return normalized
  }
  if (isConfirmed === true) return 'confirmed'
  if (dateValue && normalizeDate(dateValue) > getTodayDate()) return 'scheduled'
  return 'active'
}

const getTodayDate = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getPreviousDate = (dateValue: string): string => {
  const [year, month, day] = normalizeDate(dateValue).split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() - 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const getDefaultConfirmedByDate = (dateValue: string): boolean => {
  const normalizedDate = normalizeDate(dateValue)
  return normalizedDate <= getTodayDate()
}

const getConfirmationTimestamp = (transaction: Transaction): string | null => {
  if (!transaction.isConfirmed) return null
  return transaction.confirmedAt ?? new Date().toISOString()
}

const normalizeTransactionForCreate = (transaction: Transaction): Transaction => {
  const date = normalizeDate(transaction.date)
  const isConfirmed = date <= getTodayDate()

  return {
    ...transaction,
    date,
    isConfirmed,
    confirmedAt: isConfirmed ? transaction.confirmedAt ?? new Date().toISOString() : null
  }
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
    return [['-', 'Nenhuma transação neste período.', '-', '-', '-', '-']]
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
          { label: 'Saídas', value: formatCurrency(payload.totalOutcomes) },
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
    const headers = ['Data', 'Descrição', 'Categoria', 'Pagamento', 'Valor', 'Total']

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

  drawText(payload.companyName || 'Relatório financeiro', marginX, marginY + 8, { size: 22, style: 'bold' })
  drawText(`Período: ${payload.periodLabel}`, marginX, marginY + 30, { size: 11, color: muted })
  drawText(`Gerado em: ${payload.createdAt}`, marginX, marginY + 48, { size: 11, color: muted })

  let cursorY = marginY + 68
  cursorY = drawMetricCards(cursorY)
  cursorY = drawTable('Entradas', buildPdfRows(payload.entries), cursorY)
  cursorY = drawTable('Saídas', buildPdfRows(payload.outcomes), cursorY)

  cursorY = ensureSpace(cursorY, 40)
  drawWrappedText(
    'Este arquivo foi gerado pela versão web do ChatFinacial. As linhas do relatório incluem descrição, categoria, forma de pagamento e informações de parcelas.',
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
  category: resolveTransactionCategory(row.category),
  amount: Number(row.amount),
  description: row.description,
  date: normalizeDate(row.date),
  createdAt: row.created_at ?? undefined,
  isConfirmed: Boolean(row.is_confirmed),
  confirmedAt: row.confirmed_at ?? null,
  isMonthlyCost: Boolean(row.is_monthly_cost),
  paymentMethod: normalizePaymentMethod(row.payment_method),
  installmentGroupId: row.installment_group_id,
  installmentNumber: Number.isFinite(Number(row.installment_number)) ? Number(row.installment_number) : 1,
  installmentCount: Number.isFinite(Number(row.installment_count)) ? Number(row.installment_count) : 1,
  totalAmount: Number.isFinite(Number(row.total_amount)) ? Number(row.total_amount) : Number(row.amount),
  isInstallment: Boolean(row.is_installment),
  monthlyEndDate: row.monthly_end_date ? normalizeDate(row.monthly_end_date) : null,
  status: normalizeTransactionStatus(row.status, Boolean(row.is_confirmed), row.date),
  ignoredInReports: Boolean(row.ignored_in_reports),
  refundedAt: row.refunded_at ? normalizeDate(row.refunded_at) : row.reimbursed_at ? normalizeDate(row.reimbursed_at) : null,
  refundReason: row.refund_reason ?? row.reimbursement_notes ?? null,
  refundScope: row.refund_scope ?? null,
  canceledAt: row.canceled_at ? normalizeDate(row.canceled_at) : null,
  cancelReason: row.cancel_reason ?? null,
  reimbursedAt: row.reimbursed_at ? normalizeDate(row.reimbursed_at) : null,
  reimbursementResponsible: row.reimbursement_responsible ?? null,
  reimbursementNotes: row.reimbursement_notes ?? null,
  deletedAt: row.deleted_at ?? null
})

const toInsertPayload = (transaction: Transaction, userId: string): Record<string, unknown> => ({
  id: transaction.id,
  user_id: userId,
  type: transaction.type,
  category: resolveTransactionCategory(transaction.category),
  amount: transaction.amount,
  description: transaction.description,
  date: normalizeDate(transaction.date),
  is_confirmed: transaction.isConfirmed,
  confirmed_at: getConfirmationTimestamp(transaction),
  is_monthly_cost: transaction.type === 'saida' ? transaction.isMonthlyCost : false,
  payment_method: transaction.paymentMethod,
  installment_group_id: transaction.installmentGroupId,
  installment_number: transaction.installmentNumber,
  installment_count: transaction.installmentCount,
  total_amount: transaction.totalAmount,
  is_installment: transaction.isInstallment,
  monthly_end_date: transaction.monthlyEndDate ? normalizeDate(transaction.monthlyEndDate) : null,
  status: normalizeTransactionStatus(transaction.status, transaction.isConfirmed, transaction.date),
  ignored_in_reports: Boolean(transaction.ignoredInReports),
  refunded_at: transaction.refundedAt ? normalizeDate(transaction.refundedAt) : null,
  refund_reason: transaction.refundReason ?? null,
  refund_scope: transaction.refundScope ?? null,
  canceled_at: transaction.canceledAt ? normalizeDate(transaction.canceledAt) : null,
  cancel_reason: transaction.cancelReason ?? null,
  reimbursed_at: transaction.reimbursedAt ? normalizeDate(transaction.reimbursedAt) : null,
  reimbursement_responsible: transaction.reimbursementResponsible ?? null,
  reimbursement_notes: transaction.reimbursementNotes ?? null
})

const getUserId = async (): Promise<string> => {
  const { data, error } = await supabase.auth.getUser()
  if (error) {
    throw error
  }

  if (!data.user?.id) {
    throw new Error('Usuário não autenticado')
  }

  return data.user.id
}

const ensureCategoryRow = async (name: string, type: TransactionType, userId: string): Promise<void> => {
  const cleaned = normalizeTransactionCategory(name)
  if (!cleaned) {
    return
  }

  const { error } = await supabase
    .from('transaction_categories')
    .upsert({ user_id: userId, type, name: cleaned }, { onConflict: 'user_id,type,name_normalized', ignoreDuplicates: true })

  if (error) {
    throw error
  }
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

  const columnMatch = combined.match(/column\s+"?([a-zA-Z0-9_]+)"?\s+does not exist/i)
  if (columnMatch?.[1]) {
    return columnMatch[1].toLowerCase()
  }

  const schemaCacheMatch = combined.match(/could not find the ['"]?([a-zA-Z0-9_]+)['"]? column/i)
  if (schemaCacheMatch?.[1]) {
    return schemaCacheMatch[1].toLowerCase()
  }

  if (!(normalized.includes('column') && normalized.includes('does not exist'))) {
    return null
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

const isTransactionStatusConstraintError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false
  }

  const message = 'message' in error && typeof error.message === 'string' ? error.message : ''
  const details = 'details' in error && typeof error.details === 'string' ? error.details : ''
  const code = 'code' in error && typeof error.code === 'string' ? error.code : ''
  const combined = `${message} ${details}`.toLowerCase()

  return (code === '23514' || combined.includes('check constraint')) && combined.includes('transactions_status_check')
}

const toLegacyTransactionStatusValue = (status: unknown): string | null => {
  if (status === 'refunded') {
    return 'REIMBURSED'
  }

  if (status === 'canceled') {
    return 'CANCELED'
  }

  if (status === 'active') {
    return 'ACTIVE'
  }

  return null
}

const toLegacyTransactionStatusPayload = <T extends Record<string, unknown> | Array<Record<string, unknown>>>(
  payload: T
): T | null => {
  if (Array.isArray(payload)) {
    const legacyRows = payload.map((row) => {
      const legacyStatus = toLegacyTransactionStatusValue(row.status)
      return legacyStatus ? { ...row, status: legacyStatus } : null
    })

    return legacyRows.every(Boolean) ? legacyRows as T : null
  }

  const legacyStatus = toLegacyTransactionStatusValue(payload.status)
  return legacyStatus ? { ...payload, status: legacyStatus } as T : null
}

const withoutTransactionStatusPayload = <T extends Record<string, unknown> | Array<Record<string, unknown>>>(
  payload: T
): T => {
  if (Array.isArray(payload)) {
    return payload.map((row) => {
      const { status: _status, ...nextRow } = row
      return nextRow
    }) as T
  }

  const { status: _status, ...nextPayload } = payload
  return nextPayload as T
}

const updateTransactionBestEffort = async (
  payload: Record<string, unknown>,
  transactionId: string,
  userId: string
): Promise<void> => {
  try {
    await updateTransactionWithFallback(payload, transactionId, userId)
  } catch {
    // Best-effort metadata/status write. The primary financial-impact update must not fail because of optional columns.
  }
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

    if (isTransactionStatusConstraintError(error)) {
      const legacyPayload = toLegacyTransactionStatusPayload(workingPayload)
      if (legacyPayload) {
        workingPayload = legacyPayload
        continue
      }

      if ('status' in workingPayload) {
        workingPayload = withoutTransactionStatusPayload(workingPayload)
        continue
      }
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

  throw new Error('Não foi possível salvar as transações por incompatibilidade de schema.')
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

    if (isTransactionStatusConstraintError(error)) {
      const legacyPayload = toLegacyTransactionStatusPayload(workingPayload)
      if (legacyPayload) {
        workingPayload = legacyPayload
        continue
      }

      if ('status' in workingPayload) {
        workingPayload = withoutTransactionStatusPayload(workingPayload)
        continue
      }
    }

    const missingColumn = extractMissingColumnName(error)
    if (!missingColumn) {
      throw error
    }

    if (!(missingColumn in workingPayload)) {
      throw error
    }

    workingPayload = removeColumnFromPayload(workingPayload, missingColumn)
    if (Object.keys(workingPayload).length === 0) {
      throw new Error('Não foi possível editar a transação por incompatibilidade de schema.')
    }
  }

  throw new Error('Não foi possível editar a transação por incompatibilidade de schema.')
}

export const financeService = {
  getTransactions: async (): Promise<Transaction[]> => {
    const userId = await getUserId()

    const responseWithMonthlyEndDate = await supabase
      .from('transactions')
      .select(TRANSACTION_REFUND_FIELDS_WITH_MONTHLY_END_DATE)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    const response = responseWithMonthlyEndDate.error
      ? await supabase
          .from('transactions')
          .select(TRANSACTION_REIMBURSEMENT_FIELDS_WITH_MONTHLY_END_DATE)
          .eq('user_id', userId)
          .is('deleted_at', null)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
      : responseWithMonthlyEndDate

    if (response.error) {
      const baseWithMonthlyEndDate = await supabase
        .from('transactions')
        .select(TRANSACTION_FIELDS_WITH_MONTHLY_END_DATE)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (!baseWithMonthlyEndDate.error) {
        return ((baseWithMonthlyEndDate.data ?? []) as TransactionRow[]).map(mapRow)
      }

      if (extractMissingColumnName(response.error) === 'monthly_end_date') {
        const withoutMonthlyEndDate = await supabase
          .from('transactions')
          .select(TRANSACTION_REIMBURSEMENT_FIELDS)
          .eq('user_id', userId)
          .is('deleted_at', null)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })

        if (!withoutMonthlyEndDate.error) {
          return ((withoutMonthlyEndDate.data ?? []) as TransactionRow[]).map(mapRow)
        }

        const baseWithoutMonthlyEndDate = await supabase
          .from('transactions')
          .select(TRANSACTION_FIELDS)
          .eq('user_id', userId)
          .is('deleted_at', null)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })

        if (!baseWithoutMonthlyEndDate.error) {
          return ((baseWithoutMonthlyEndDate.data ?? []) as TransactionRow[]).map(mapRow)
        }
      }

      if (isMissingDeletedAtColumnError(response.error)) {
        const noDeletedAt = await supabase
          .from('transactions')
          .select(response === responseWithMonthlyEndDate ? TRANSACTION_FIELDS_WITH_MONTHLY_END_DATE_WITHOUT_DELETED_AT : TRANSACTION_FIELDS_WITHOUT_DELETED_AT)
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
          .select(LEGACY_TRANSACTION_FIELDS)
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
        .select(LEGACY_TRANSACTION_FIELDS)
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
      .select(TRANSACTION_REFUND_FIELDS)
      .eq('user_id', userId)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (response.error) {
      const reimbursementResponse = await supabase
        .from('transactions')
        .select(TRANSACTION_REIMBURSEMENT_FIELDS)
        .eq('user_id', userId)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (!reimbursementResponse.error) {
        return ((reimbursementResponse.data ?? []) as TransactionRow[]).map(mapRow)
      }

      const baseResponse = await supabase
        .from('transactions')
        .select(TRANSACTION_FIELDS)
        .eq('user_id', userId)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (!baseResponse.error) {
        return ((baseResponse.data ?? []) as TransactionRow[]).map(mapRow)
      }

      if (isMissingDeletedAtColumnError(response.error)) {
        return []
      }

      if (!isMissingConfirmedColumnError(response.error)) {
        throw response.error
      }

      const fallback = await supabase
        .from('transactions')
        .select(LEGACY_TRANSACTION_FIELDS)
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

    const userId = await getUserId()
    const payload = transactions.map((item) => toInsertPayload(normalizeTransactionForCreate(item), userId))
    await insertTransactionsWithFallback(payload)
  },

  updateTransaction: async (transaction: Transaction): Promise<void> => {
    const userId = await getUserId()

    const payload = {
      type: transaction.type,
      category: resolveTransactionCategory(transaction.category),
      amount: transaction.amount,
      description: transaction.description,
      date: normalizeDate(transaction.date),
      is_confirmed: transaction.isConfirmed,
      confirmed_at: getConfirmationTimestamp(transaction),
      is_monthly_cost: transaction.type === 'saida' ? transaction.isMonthlyCost : false,
      payment_method: transaction.paymentMethod,
      installment_group_id: transaction.installmentGroupId,
      installment_number: transaction.installmentNumber,
      installment_count: transaction.installmentCount,
      total_amount: transaction.totalAmount,
      is_installment: transaction.isInstallment,
      monthly_end_date: transaction.monthlyEndDate ? normalizeDate(transaction.monthlyEndDate) : null,
      status: normalizeTransactionStatus(transaction.status, transaction.isConfirmed, transaction.date),
      ignored_in_reports: Boolean(transaction.ignoredInReports),
      refunded_at: transaction.refundedAt ? normalizeDate(transaction.refundedAt) : null,
      refund_reason: transaction.refundReason ?? null,
      refund_scope: transaction.refundScope ?? null,
      canceled_at: transaction.canceledAt ? normalizeDate(transaction.canceledAt) : null,
      cancel_reason: transaction.cancelReason ?? null,
      reimbursed_at: transaction.reimbursedAt ? normalizeDate(transaction.reimbursedAt) : null,
      reimbursement_responsible: transaction.reimbursementResponsible ?? null,
      reimbursement_notes: transaction.reimbursementNotes ?? null
    }

    await updateTransactionWithFallback(payload, transaction.id, userId)
  },

  confirmTransaction: async (transactionId: string): Promise<void> => {
    const userId = await getUserId()
    let payload: Record<string, unknown> = {
      is_confirmed: true,
      confirmed_at: new Date().toISOString()
    }
    const MAX_ATTEMPTS = 4

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const { data, error } = await supabase
        .from('transactions')
        .update(payload)
        .eq('id', transactionId)
        .eq('user_id', userId)
        .select('id')

      if (!error) {
        if ((data ?? []).length === 0) {
          throw new Error('Transação não encontrada ou sem permissão para confirmar.')
        }
        return
      }

      const missingColumn = extractMissingColumnName(error)
      if (!missingColumn || !(missingColumn in payload)) {
        throw error
      }

      payload = removeColumnFromPayload(payload, missingColumn)
    }

    throw new Error('Não foi possível confirmar a transação por incompatibilidade de schema.')
  },

  refundTransaction: async (transactionId: string, options: RefundTransactionOptions): Promise<void> => {
    const userId = await getUserId()
    const scope = options.scope ?? 'single'
    const transactions = await financeService.getTransactions()
    const selected = transactions.find((item) => item.id === transactionId)

    if (!selected) {
      throw new Error('Transação não encontrada ou sem permissão para anular.')
    }

    const targets = getRefundTransactionTargets(transactions, selected, scope)

    if (targets.some((item) => isFinancialPeriodLocked(item.date))) {
      throw new Error('Esta transação pertence a um período financeiro já auditado e não pode ser alterada diretamente.')
    }

    const nowIso = new Date().toISOString()
    const reason = options.reason?.trim() || null
    const financialImpactPayload: Record<string, unknown> = {
      ignored_in_reports: true
    }
    const metadataPayload = options.mode === 'refunded'
      ? {
          refunded_at: nowIso,
          refund_reason: reason,
          refund_scope: scope,
          canceled_at: null,
          cancel_reason: null,
          reimbursed_at: nowIso,
          reimbursement_notes: reason
        }
      : {
          refunded_at: null,
          refund_reason: null,
          refund_scope: scope,
          canceled_at: nowIso,
          cancel_reason: reason,
          reimbursed_at: null,
          reimbursement_notes: reason
        }
    const statusPayload: Record<string, unknown> = {
      status: options.mode
    }

    await Promise.all(
      targets.map(async (target) => {
        await updateTransactionWithFallback(financialImpactPayload, target.id, userId)
        await updateTransactionBestEffort(metadataPayload, target.id, userId)
        await updateTransactionBestEffort(statusPayload, target.id, userId)
      })
    )
  },

  updateMonthlyCostFromDate: async (originalTransaction: Transaction, nextTransaction: Transaction): Promise<Transaction> => {
    const originalDate = normalizeDate(originalTransaction.date)
    const nextDate = normalizeDate(nextTransaction.date)

    if (
      originalTransaction.type !== 'saida'
      || !originalTransaction.isMonthlyCost
      || originalDate >= nextDate
    ) {
      await financeService.updateTransaction(nextTransaction)
      return nextTransaction
    }

    const userId = await getUserId()
    const previousDate = new Date(`${nextDate}T00:00:00`)
    previousDate.setDate(previousDate.getDate() - 1)
    const monthlyEndDate = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, '0')}-${String(previousDate.getDate()).padStart(2, '0')}`

    await updateTransactionWithFallback(
      {
        monthly_end_date: monthlyEndDate
      },
      originalTransaction.id,
      userId
    )

    const createdTransaction = {
      ...nextTransaction,
      id: crypto.randomUUID(),
      date: nextDate,
      isMonthlyCost: true,
      monthlyEndDate: null,
      monthlyCostStartDate: undefined
    }

    await insertTransactionsWithFallback([
      toInsertPayload(createdTransaction, userId)
    ])

    return createdTransaction
  },

  endMonthlyCostFromDate: async (originalTransaction: Transaction, occurrenceDate: string): Promise<void> => {
    const normalizedOccurrenceDate = normalizeDate(occurrenceDate)
    const originalDate = normalizeDate(originalTransaction.monthlyCostStartDate ?? originalTransaction.date)

    if (
      originalTransaction.type !== 'saida'
      || !originalTransaction.isMonthlyCost
      || originalDate >= normalizedOccurrenceDate
    ) {
      await financeService.deleteTransaction(originalTransaction.id)
      return
    }

    const userId = await getUserId()
    await updateTransactionWithFallback(
      {
        monthly_end_date: getPreviousDate(normalizedOccurrenceDate)
      },
      originalTransaction.id,
      userId
    )
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

    const shouldDeleteOnlySelectedTransaction = false

    const deleteQuery = supabase
      .from('transactions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('deleted_at', null)

    const { error } = installmentGroupId && !shouldDeleteOnlySelectedTransaction
      ? await deleteQuery.eq('installment_group_id', installmentGroupId)
      : await deleteQuery.eq('id', id)

    if (error) {
      if (isMissingDeletedAtColumnError(error)) {
        const fallbackDeleteQuery = supabase
          .from('transactions')
          .delete()
          .eq('user_id', userId)

        const fallbackDelete = installmentGroupId && !shouldDeleteOnlySelectedTransaction
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
    await ensureCategoryRow(GENERAL_TRANSACTION_CATEGORY, type, userId)

    const { data, error } = await supabase
      .from('transaction_categories')
      .select('id, type, name')
      .eq('user_id', userId)
      .eq('type', type)
      .order('name', { ascending: true })

    if (error) {
      throw error
    }

    return ensureGeneralCategoryOption(((data ?? []) as TransactionCategoryRow[]).map((item) => ({
      id: item.id,
      type: item.type,
      name: item.name
    })), type)
  },

  saveCategory: async (name: string, type: TransactionType): Promise<void> => {
    const userId = await getUserId()
    await ensureCategoryRow(name, type, userId)
  },

  updateCategory: async (categoryId: string, name: string, type: TransactionType): Promise<void> => {
    const userId = await getUserId()
    const cleaned = normalizeTransactionCategory(name)
    if (!cleaned) {
      return
    }

    const current = await supabase
      .from('transaction_categories')
      .select('name')
      .eq('id', categoryId)
      .eq('user_id', userId)
      .maybeSingle()

    if (current.error) {
      throw current.error
    }

    if (isGeneralTransactionCategory((current.data as { name?: string } | null)?.name)) {
      throw new Error('A categoria Geral não pode ser editada.')
    }

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
    const current = await supabase
      .from('transaction_categories')
      .select('name')
      .eq('id', categoryId)
      .eq('user_id', userId)
      .maybeSingle()

    if (current.error) {
      throw current.error
    }

    if (isGeneralTransactionCategory((current.data as { name?: string } | null)?.name)) {
      throw new Error('A categoria Geral não pode ser apagada.')
    }

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

