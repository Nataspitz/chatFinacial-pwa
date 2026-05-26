import { financeService } from './finance.service'
import { cfoAssistantService } from './cfo-assistant.service'
import {
  FINANCIAL_AUDIT_LOCK_MESSAGE,
  hasLockedFinancialPeriod,
  isFinancialPeriodLocked
} from './financial-audit-lock'
import { transactionSettingsService } from './transaction-settings.service'
import type { ChatQuickAction, ChatReply, ChatSessionState, GuidedOptionItem } from '../types/chat.types'
import type { CfoAnalysisType } from '../types/cfo.types'
import {
  DEFAULT_TRANSACTION_SETTINGS,
  getDefaultConfirmedByType,
  getDefaultPaymentMethodByType,
  normalizeTransactionBySettings,
  validateTransactionBySettings,
  type TransactionSettings
} from '../types/transaction-settings.types'
import type { PaymentMethod, Transaction, TransactionType } from '../types/transaction.types'
import { shouldAffectFinancialReports } from '../utils/transaction-reports'

const MAX_OPTIONS = 10
const CFO_ANALYSIS_PAGE_SIZE = 4

const CMD = {
  menu: '/menu',
  cancel: '/cancel',
  viewTransactions: '/view/transactions',
  viewExpenses: '/view/expenses',
  createTransaction: '/create/transaction',
  editTransaction: '/edit/transaction',
  deleteTransaction: '/delete/transaction',
  manageCategories: '/manage/categories',
  scopeAll: '/scope/all',
  scopeYear: '/scope/year',
  scopeMonth: '/scope/month',
  scopeDay: '/scope/day',
  typeEntrada: '/type/entrada',
  typeSaida: '/type/saida',
  paymentPix: '/pay/pix',
  paymentDebito: '/pay/debito',
  paymentDinheiro: '/pay/dinheiro',
  paymentCredito: '/pay/credito',
  boolYes: '/bool/yes',
  boolNo: '/bool/no',
  dateToday: '/date/today',
  dateYesterday: '/date/yesterday',
  dateCustom: '/date/custom',
  confirmYes: '/confirm/yes',
  confirmNo: '/confirm/no',
  editAmount: '/edit-field/amount',
  editCategory: '/edit-field/category',
  editDescription: '/edit-field/description',
  editDate: '/edit-field/date',
  editPayment: '/edit-field/payment',
  editMonthly: '/edit-field/monthly',
  editConfirmed: '/edit-field/confirmed',
  categoryCreate: '/category/create',
  categoryEdit: '/category/edit',
  categoryDelete: '/category/delete',
  categoryList: '/category/list',
  cfoMenu: '/cfo/menu',
  cfoExecutiveSummary: '/cfo/executive-summary',
  cfoForecast: '/cfo/forecast',
  cfoAlerts: '/cfo/alerts',
  cfoCosts: '/cfo/costs',
  cfoAnalysisMenu: '/cfo/analysis/menu'
} as const

const MONTHS: Record<string, string> = {
  '01': 'Janeiro',
  '02': 'Fevereiro',
  '03': 'Março',
  '04': 'Abril',
  '05': 'Maio',
  '06': 'Junho',
  '07': 'Julho',
  '08': 'Agosto',
  '09': 'Setembro',
  '10': 'Outubro',
  '11': 'Novembro',
  '12': 'Dezembro'
}

const CFO_ANALYSIS_ITEMS: Array<{ type: CfoAnalysisType; label: string }> = [
  { type: 'horizontal', label: 'Análise horizontal' },
  { type: 'vertical', label: 'Análise vertical' },
  { type: 'liquidity', label: 'Liquidez' },
  { type: 'profitability', label: 'Rentabilidade' },
  { type: 'debt', label: 'Endividamento' },
  { type: 'break_even', label: 'Ponto de equilíbrio' },
  { type: 'cash_flow', label: 'Fluxo de caixa' },
  { type: 'benchmarking', label: 'Benchmarking' },
  { type: 'credit_5c', label: '5C de crédito' },
  { type: 'fpa', label: 'FP&A semanal' }
]

const toCfoAnalysisCommand = (analysisType: CfoAnalysisType): string => `/cfo/analysis/${analysisType}`
const toCfoAnalysisPageCommand = (page: number): string => `/cfo/analysis/page/${page}`

const parseCfoAnalysisCommand = (value: string): CfoAnalysisType | null => {
  const match = value.match(/^\/cfo\/analysis\/([a-z0-9_]+)$/)
  if (!match) return null
  const analysisType = match[1] as CfoAnalysisType
  return CFO_ANALYSIS_ITEMS.some((item) => item.type === analysisType) ? analysisType : null
}

const parseCfoAnalysisPageCommand = (value: string): number | null => {
  const match = value.match(/^\/cfo\/analysis\/page\/(\d+)$/)
  if (!match) return null
  const page = Number(match[1])
  return Number.isInteger(page) && page > 0 ? page : null
}

const normalize = (v: string): string =>
  v
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const clean = (v: string): string => v.trim().replace(/\s+/g, ' ')

const today = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const yesterday = (): string => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const getCurrentDay = (): string => String(new Date().getDate()).padStart(2, '0')

const parseDate = (raw: string, normalized: string): string | null => {
  if (raw === CMD.dateToday || normalized === 'hoje') return today()
  if (raw === CMD.dateYesterday || normalized === 'ontem') return yesterday()
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (br) return `${br[3]}-${br[2]}-${br[1]}`
  return null
}

const parseLocalDate = (dateValue: string): Date => {
  const [year, month, day] = dateValue.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const parseAmount = (v: string): number | null => {
  const raw = v.replace(/[^\d,.-]/g, '').trim()
  if (!raw) return null
  const n = Number(raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

const parseIntSafe = (v: string): number | null => {
  const n = Number(v.replace(/[^\d]/g, ''))
  return Number.isInteger(n) ? n : null
}

const money = (v: number): string => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const asOption = (label: string, value: string): ChatQuickAction => ({
  id: crypto.randomUUID(),
  label,
  value
})

const formatLine = (t: Transaction): string => {
  const sign = t.type === 'entrada' ? '+' : '-'
  const installment = t.isInstallment ? ` | ${t.installmentNumber}/${t.installmentCount}` : ''
  return `${sign} ${money(t.amount)} | ${t.category} | ${t.date}${installment}`
}

const summarize = (items: Transaction[]): string => {
  const inValue = items.filter((x) => x.type === 'entrada').reduce((a, b) => a + b.amount, 0)
  const outValue = items.filter((x) => x.type === 'saida').reduce((a, b) => a + b.amount, 0)
  return `Entradas: ${money(inValue)}\nSaídas: ${money(outValue)}\nSaldo: ${money(inValue - outValue)}\nItens: ${items.length}`
}

const sortByDateDesc = (items: Transaction[]): Transaction[] =>
  [...items].sort((a, b) => `${b.date}`.localeCompare(`${a.date}`))

const splitInstallments = (total: number, count: number): number[] => {
  const totalCents = Math.round(total * 100)
  const base = Math.floor(totalCents / count)
  const rem = totalCents - base * count
  const values = Array.from({ length: count }, () => base)
  for (let i = 0; i < rem; i += 1) values[i] += 1
  return values.map((v) => v / 100)
}

const addMonthsKeepingDay = (base: Date, offset: number): Date => {
  const first = new Date(base.getFullYear(), base.getMonth() + offset, 1)
  const maxDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  return new Date(first.getFullYear(), first.getMonth(), Math.min(base.getDate(), maxDay))
}

const getTransactionSettingsFromSession = (session: ChatSessionState) =>
  session.draft?.transactionSettings ?? null

const resolveTransactionSettings = async (session: ChatSessionState): Promise<TransactionSettings> => {
  const fromSession = getTransactionSettingsFromSession(session)
  if (fromSession) {
    return fromSession
  }

  return transactionSettingsService.getSettings().catch(() => DEFAULT_TRANSACTION_SETTINGS)
}

const saveTransactionWithSettings = async (
  transaction: Transaction,
  settings: TransactionSettings | undefined
): Promise<string | null> => {
  const normalized = normalizeTransactionBySettings(transaction, settings ?? DEFAULT_TRANSACTION_SETTINGS)
  const validationMessage = validateTransactionBySettings(normalized, settings ?? DEFAULT_TRANSACTION_SETTINGS)
  if (validationMessage) {
    return validationMessage
  }

  if (isFinancialPeriodLocked(normalized.date)) {
    return FINANCIAL_AUDIT_LOCK_MESSAGE
  }

  try {
    await financeService.updateTransaction(normalized)
  } catch (error) {
    return error instanceof Error ? error.message : 'Não foi possível atualizar a transação.'
  }

  return null
}

const mainMenu = (content = 'O que você quer fazer?'): ChatReply => ({
  content,
  actions: [
    asOption('Ver transações', CMD.viewTransactions),
    asOption('Ver despesas', CMD.viewExpenses),
    asOption('Criar transação', CMD.createTransaction),
    asOption('Editar transação', CMD.editTransaction),
    asOption('Remover transação', CMD.deleteTransaction),
    asOption('Categorias', CMD.manageCategories),
    asOption('CFO IA', CMD.cfoMenu)
  ],
  nextSession: { step: 'main_menu' }
})

const cfoMenu = (content = 'CFO IA: escolha uma leitura curta.'): ChatReply => ({
  content,
  actions: [
    asOption('Resumo', CMD.cfoExecutiveSummary),
    asOption('Fluxo de caixa', CMD.cfoForecast),
    asOption('Alertas', CMD.cfoAlerts),
    asOption('Custos', CMD.cfoCosts),
    asOption('Análises', CMD.cfoAnalysisMenu),
    asOption('Menu geral', CMD.menu)
  ],
  nextSession: { step: 'main_menu' }
})

const cfoAnalysisMenu = (requestedPage = 1, content?: string): ChatReply => {
  const totalPages = Math.max(1, Math.ceil(CFO_ANALYSIS_ITEMS.length / CFO_ANALYSIS_PAGE_SIZE))
  const page = Math.min(Math.max(1, requestedPage), totalPages)
  const start = (page - 1) * CFO_ANALYSIS_PAGE_SIZE
  const pageItems = CFO_ANALYSIS_ITEMS.slice(start, start + CFO_ANALYSIS_PAGE_SIZE)
  const actions: ChatQuickAction[] = pageItems.map((item) => asOption(item.label, toCfoAnalysisCommand(item.type)))

  if (page > 1) actions.push(asOption('Página anterior', toCfoAnalysisPageCommand(page - 1)))
  if (page < totalPages) actions.push(asOption('Mais análises', toCfoAnalysisPageCommand(page + 1)))
  actions.push(asOption('Voltar CFO', CMD.cfoMenu))
  actions.push(asOption('Menu geral', CMD.menu))

  return {
    content: content ?? `Análises CFO (${page}/${totalPages})`,
    actions,
    nextSession: { step: 'main_menu' }
  }
}

const getCfoAnalysisPage = (analysisType: CfoAnalysisType): number => {
  const index = CFO_ANALYSIS_ITEMS.findIndex((item) => item.type === analysisType)
  if (index < 0) return 1
  return Math.floor(index / CFO_ANALYSIS_PAGE_SIZE) + 1
}

const filterScopeMenu = (listType: 'all' | 'entrada' | 'saida'): ChatReply => ({
  content: 'Período:',
  actions: [
    asOption('Tudo', CMD.scopeAll),
    asOption('Ano', CMD.scopeYear),
    asOption('Mês', CMD.scopeMonth),
    asOption('Dia', CMD.scopeDay),
    asOption('Cancelar', CMD.cancel)
  ],
  nextSession: { step: 'pick_filter_scope', draft: { listType } }
})

const boolActions = (): ChatQuickAction[] => [asOption('Sim', CMD.boolYes), asOption('Não', CMD.boolNo), asOption('Cancelar', CMD.cancel)]
const dateActions = (): ChatQuickAction[] => [
  asOption('Hoje', CMD.dateToday),
  asOption('Ontem', CMD.dateYesterday),
  asOption('Outra data', CMD.dateCustom),
  asOption('Cancelar', CMD.cancel)
]
const paymentActions = (): ChatQuickAction[] => [
  asOption('Pix', CMD.paymentPix),
  asOption('Débito', CMD.paymentDebito),
  asOption('Dinheiro', CMD.paymentDinheiro),
  asOption('Crédito', CMD.paymentCredito),
  asOption('Cancelar', CMD.cancel)
]

const executeList = async (session: ChatSessionState): Promise<ChatReply> => {
  const listType = session.draft?.listType ?? 'all'
  const scope = session.draft?.periodScope ?? 'all'
  const year = session.draft?.periodYear
  const month = session.draft?.periodMonth
  const day = session.draft?.periodDay

  let items = (await financeService.getTransactions()).filter(shouldAffectFinancialReports)
  if (listType !== 'all') items = items.filter((x) => x.type === listType)
  if (scope === 'year' && year) items = items.filter((x) => x.date.slice(0, 4) === year)
  if (scope === 'month' && year && month) items = items.filter((x) => x.date.slice(0, 7) === `${year}-${month}`)
  if (scope === 'day' && year && month && day) items = items.filter((x) => x.date.slice(0, 10) === `${year}-${month}-${day}`)

  const sorted = sortByDateDesc(items)
  if (sorted.length === 0) return mainMenu('Sem transações para esse filtro.')
  const lines = sorted.slice(0, 8).map(formatLine).join('\n')
  return mainMenu(`${summarize(sorted)}\n\n${lines}`)
}

const selectOption = (raw: string, normalized: string, options: GuidedOptionItem[]): GuidedOptionItem | null => {
  if (raw.startsWith('/target/')) {
    const id = raw.replace('/target/', '')
    return options.find((o) => o.id === id) ?? null
  }
  const idx = Number(raw)
  if (Number.isInteger(idx) && idx >= 1 && idx <= options.length) return options[idx - 1]
  return options.find((o) => normalize(o.label).includes(normalized) || normalized.includes(normalize(o.label))) ?? null
}

const optionsToActions = (options: GuidedOptionItem[]): ChatQuickAction[] => [
  ...options.slice(0, MAX_OPTIONS).map((o, i) => asOption(`${i + 1}. ${o.label}`, `/target/${o.id}`)),
  asOption('Cancelar', CMD.cancel)
]

const categoryOptionsForType = async (type: TransactionType): Promise<GuidedOptionItem[]> => {
  const categories = await financeService.getCategoryItems(type)
  return categories.slice(0, MAX_OPTIONS).map((category) => ({
    id: category.id,
    label: category.name,
    entity: 'category' as const,
    type
  }))
}

const continueFlow = async (raw: string, normalized: string, session: ChatSessionState): Promise<ChatReply> => {
  if (session.step === 'main_menu') {
    if (raw === CMD.viewTransactions) return filterScopeMenu('all')
    if (raw === CMD.viewExpenses) return filterScopeMenu('saida')
    if (raw === CMD.createTransaction) {
      return {
        content: 'Tipo da transação:',
        actions: [asOption('Entrada', CMD.typeEntrada), asOption('Saída', CMD.typeSaida), asOption('Cancelar', CMD.cancel)],
        nextSession: { step: 'pick_transaction_type', draft: {} }
      }
    }
    if (raw === CMD.editTransaction || raw === CMD.deleteTransaction) {
      const items = sortByDateDesc(await financeService.getTransactions()).slice(0, MAX_OPTIONS)
      const options = items.map((t) => ({ id: t.id, label: formatLine(t), entity: 'transaction' as const }))
      if (options.length === 0) return mainMenu('Sem transações.')
      return {
        content: raw === CMD.editTransaction ? 'Selecione a transação para editar:' : 'Selecione a transação para remover:',
        actions: optionsToActions(options),
        nextSession: { step: 'pick_transaction_target', action: raw === CMD.editTransaction ? 'editar' : 'remover', options }
      }
    }
    if (raw === CMD.manageCategories) {
      return {
        content: 'Categorias:',
        actions: [
          asOption('Criar categoria', CMD.categoryCreate),
          asOption('Editar categoria', CMD.categoryEdit),
          asOption('Remover categoria', CMD.categoryDelete),
          asOption('Listar categorias', CMD.categoryList),
          asOption('Cancelar', CMD.cancel)
        ],
        nextSession: { step: 'pick_action', entity: 'categoria' }
      }
    }

    if (raw === CMD.cfoMenu) {
      return cfoMenu()
    }

    if (raw === CMD.cfoExecutiveSummary) {
      const reply = await cfoAssistantService.getExecutiveSummary()
      return cfoMenu(reply.message)
    }

    if (raw === CMD.cfoForecast) {
      const reply = await cfoAssistantService.ask('projecao e fluxo de caixa')
      return cfoMenu(reply.message)
    }

    if (raw === CMD.cfoAlerts) {
      const reply = await cfoAssistantService.ask('alertas e riscos ativos')
      return cfoMenu(reply.message)
    }

    if (raw === CMD.cfoCosts) {
      const reply = await cfoAssistantService.ask('maiores despesas do período')
      return cfoMenu(reply.message)
    }

    if (raw === CMD.cfoAnalysisMenu) {
      return cfoAnalysisMenu(1)
    }

    const cfoAnalysisPage = parseCfoAnalysisPageCommand(raw)
    if (cfoAnalysisPage !== null) {
      return cfoAnalysisMenu(cfoAnalysisPage)
    }

    const cfoAnalysisType = parseCfoAnalysisCommand(raw)
    if (cfoAnalysisType) {
      const reply = await cfoAssistantService.getAnalysis(cfoAnalysisType)
      return cfoAnalysisMenu(getCfoAnalysisPage(cfoAnalysisType), reply.message)
    }

    if (
      normalized.includes('cfo')
      || normalized.includes('resumo financeiro')
      || normalized.includes('saude financeira')
      || normalized.includes('como esta meu negocio')
    ) {
      const reply = await cfoAssistantService.ask(raw)
      return cfoMenu(reply.message)
    }
    if (normalized.includes('despesa') && normalized.includes('mes')) {
      const now = new Date()
      return executeList({
        step: 'idle',
        draft: { listType: 'saida', periodScope: 'month', periodYear: String(now.getFullYear()), periodMonth: String(now.getMonth() + 1).padStart(2, '0') }
      })
    }
    return mainMenu()
  }

  if (session.step === 'pick_filter_scope') {
    if (raw === CMD.scopeAll) return executeList({ ...session, draft: { ...session.draft, periodScope: 'all' } })
    const all = await financeService.getTransactions()
    const years = Array.from(new Set([String(new Date().getFullYear()), ...all.map((x) => x.date.slice(0, 4))])).sort((a, b) => Number(b) - Number(a))
    const opts = years.map((y) => ({ id: `y-${y}`, label: y, entity: 'transaction' as const }))
    if (raw === CMD.scopeYear || raw === CMD.scopeMonth || raw === CMD.scopeDay) {
      const scope = raw === CMD.scopeYear ? 'year' : raw === CMD.scopeMonth ? 'month' : 'day'
      return { content: 'Ano:', actions: optionsToActions(opts), nextSession: { ...session, step: 'pick_filter_year', options: opts, draft: { ...session.draft, periodScope: scope } } }
    }
    return filterScopeMenu(session.draft?.listType ?? 'all')
  }

  if (session.step === 'pick_filter_year') {
    const pick = selectOption(raw, normalized, session.options ?? [])
    if (!pick) return { content: 'Selecione um ano.', actions: optionsToActions(session.options ?? []), nextSession: session }
    const year = pick.id.replace('y-', '')
    const scope = session.draft?.periodScope
    if (scope === 'year') return executeList({ ...session, draft: { ...session.draft, periodYear: year } })
    const monthOpts = Object.entries(MONTHS).map(([m, label]) => ({ id: `m-${m}`, label: `${m} - ${label}`, entity: 'transaction' as const }))
      return { content: 'Mês:', actions: optionsToActions(monthOpts), nextSession: { ...session, step: 'pick_filter_month', options: monthOpts, draft: { ...session.draft, periodYear: year } } }
  }

  if (session.step === 'pick_filter_month') {
    const pick = selectOption(raw, normalized, session.options ?? [])
    if (!pick) return { content: 'Selecione um mês.', actions: optionsToActions(session.options ?? []), nextSession: session }
    const month = pick.id.replace('m-', '')
    if (session.draft?.periodScope === 'month') return executeList({ ...session, draft: { ...session.draft, periodMonth: month } })
    const year = session.draft?.periodYear
    if (!year) return mainMenu('Ano inválido.')
    const all = await financeService.getTransactions()
    const days = Array.from(new Set([getCurrentDay(), ...all.filter((x) => x.date.startsWith(`${year}-${month}-`)).map((x) => x.date.slice(8, 10))])).sort((a, b) => Number(a) - Number(b))
    const dayOpts = days.map((d) => ({ id: `d-${d}`, label: d, entity: 'transaction' as const }))
    return { content: 'Dia:', actions: optionsToActions(dayOpts), nextSession: { ...session, step: 'pick_filter_day', options: dayOpts, draft: { ...session.draft, periodMonth: month } } }
  }

  if (session.step === 'pick_filter_day') {
    const pick = selectOption(raw, normalized, session.options ?? [])
    if (!pick) return { content: 'Selecione um dia.', actions: optionsToActions(session.options ?? []), nextSession: session }
    const day = pick.id.replace('d-', '')
    return executeList({ ...session, draft: { ...session.draft, periodDay: day } })
  }

  if (session.step === 'pick_transaction_type') {
    const type = raw === CMD.typeEntrada ? 'entrada' : raw === CMD.typeSaida ? 'saida' : null
    if (!type) return { content: 'Escolha Entrada ou Saída.', actions: [asOption('Entrada', CMD.typeEntrada), asOption('Saída', CMD.typeSaida), asOption('Cancelar', CMD.cancel)], nextSession: session }
    const transactionSettings = await transactionSettingsService.getSettings().catch(() => DEFAULT_TRANSACTION_SETTINGS)
    return {
      content: 'Valor total?',
      nextSession: {
        ...session,
        step: 'collect_transaction_amount',
        draft: {
          ...session.draft,
          transactionType: type,
          paymentMethod: getDefaultPaymentMethodByType(transactionSettings, type),
          isMonthlyCost: type === 'saida' ? transactionSettings.defaultMonthlyCostSaida : false,
          transactionSettings
        }
      }
    }
  }

  if (session.step === 'collect_transaction_amount') {
    const amount = parseAmount(raw)
    if (!amount) return { content: 'Valor inválido.', nextSession: session }
    const type = session.draft?.transactionType
    if (!type) return mainMenu('Tipo de transação inválido.')
    const options = await categoryOptionsForType(type)
    if (options.length === 0) {
      return mainMenu('Não há categorias para esse tipo. Cadastre uma categoria em "Categorias" e tente novamente.')
    }

    return {
      content: 'Categoria:',
      actions: optionsToActions(options),
      nextSession: { ...session, step: 'pick_transaction_category', options, draft: { ...session.draft, amount } }
    }
  }

  if (session.step === 'pick_transaction_category') {
    const picked = selectOption(raw, normalized, session.options ?? [])
    if (!picked) return { content: 'Selecione uma categoria.', actions: optionsToActions(session.options ?? []), nextSession: session }
    return {
      content: 'Descrição?',
      nextSession: {
        ...session,
        step: 'collect_transaction_description',
        draft: { ...session.draft, categoryName: clean(picked.label) }
      }
    }
  }

  if (session.step === 'collect_transaction_description') {
    const description = clean(raw)
    if (!description) return { content: 'Descrição inválida.', nextSession: session }
    return { content: 'Forma de pagamento?', actions: paymentActions(), nextSession: { ...session, step: 'pick_transaction_payment_method', draft: { ...session.draft, description } } }
  }

  if (session.step === 'pick_transaction_payment_method') {
    const transactionSettings = await resolveTransactionSettings(session)
    const method: PaymentMethod | null =
      raw === CMD.paymentPix ? 'pix' : raw === CMD.paymentDebito ? 'debito' : raw === CMD.paymentDinheiro ? 'dinheiro' : raw === CMD.paymentCredito ? 'credito' : null
    if (!method) return { content: 'Escolha o pagamento.', actions: paymentActions(), nextSession: session }
    if (method === 'credito') return { content: 'Parcelas (1 a 48)?', nextSession: { ...session, step: 'collect_transaction_installment_count', draft: { ...session.draft, paymentMethod: method } } }
    if (session.draft?.transactionType === 'saida') return { content: 'Custo mensal?', actions: boolActions(), nextSession: { ...session, step: 'pick_transaction_monthly_cost', draft: { ...session.draft, paymentMethod: method, installmentCount: 1, transactionSettings } } }
    return { content: 'Data?', actions: dateActions(), nextSession: { ...session, step: 'pick_transaction_date', draft: { ...session.draft, paymentMethod: method, installmentCount: 1, transactionSettings } } }
  }

  if (session.step === 'collect_transaction_installment_count') {
    const transactionSettings = await resolveTransactionSettings(session)
    const count = parseIntSafe(raw)
    if (!count || count < 1 || count > 48) return { content: 'Parcelas entre 1 e 48.', nextSession: session }
    if (!transactionSettings.allowCreditWithoutInstallments && count <= 1) {
      return { content: 'Crédito precisa de ao menos 2 parcelas nas regras atuais.', nextSession: session }
    }
    return { content: 'Data da primeira parcela?', actions: dateActions(), nextSession: { ...session, step: 'pick_transaction_date', draft: { ...session.draft, installmentCount: count, isMonthlyCost: false } } }
  }

  if (session.step === 'pick_transaction_monthly_cost') {
    if (raw !== CMD.boolYes && raw !== CMD.boolNo) return { content: 'Escolha Sim ou Não.', actions: boolActions(), nextSession: session }
    return { content: 'Data?', actions: dateActions(), nextSession: { ...session, step: 'pick_transaction_date', draft: { ...session.draft, isMonthlyCost: raw === CMD.boolYes } } }
  }

  if (session.step === 'pick_transaction_date' || session.step === 'collect_transaction_custom_date') {
    if (session.step === 'pick_transaction_date' && raw === CMD.dateCustom) return { content: 'Digite a data (DD/MM/AAAA ou AAAA-MM-DD).', nextSession: { ...session, step: 'collect_transaction_custom_date' } }
    const parsedDate = parseDate(raw, normalized)
    if (!parsedDate) return { content: 'Data inválida.', actions: dateActions(), nextSession: session.step === 'collect_transaction_custom_date' ? { ...session, step: 'collect_transaction_custom_date' } : session }

    const transactionSettings = await resolveTransactionSettings(session)
    const type = session.draft?.transactionType
    const amount = session.draft?.amount
    const category = session.draft?.categoryName
    const description = session.draft?.description
    const paymentMethod = session.draft?.paymentMethod ?? 'pix'
    const installmentCount = paymentMethod === 'credito' ? session.draft?.installmentCount ?? 1 : 1
    if (!type || !amount || !category || !description) return mainMenu('Dados incompletos para criar transação.')

    const firstDate = parseLocalDate(parsedDate)
    const isInstallment = paymentMethod === 'credito' && installmentCount > 1
    const values = isInstallment ? splitInstallments(amount, installmentCount) : [amount]
    const groupId = isInstallment ? crypto.randomUUID() : null
    const isMonthlyCost = type === 'saida' ? Boolean(session.draft?.isMonthlyCost) && !isInstallment : false
    const rows: Transaction[] = values.map((value, index) => {
      const dt = isInstallment ? addMonthsKeepingDay(firstDate, index) : firstDate
      const date = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
      return {
        id: crypto.randomUUID(),
        type,
        amount: value,
        date,
        category,
        description,
        isConfirmed: getDefaultConfirmedByType(transactionSettings, type, date),
        isMonthlyCost,
        paymentMethod,
        installmentGroupId: groupId,
        installmentNumber: isInstallment ? index + 1 : 1,
        installmentCount,
        totalAmount: amount,
        isInstallment
      }
    })
    const normalizedRows = rows.map((item) => normalizeTransactionBySettings(item, transactionSettings))
    const invalidMessage = normalizedRows
      .map((item) => validateTransactionBySettings(item, transactionSettings))
      .find((message) => Boolean(message))
    if (invalidMessage) {
      return { content: invalidMessage ?? 'Dados inválidos para criar transação.', nextSession: session }
    }
    if (hasLockedFinancialPeriod(normalizedRows.map((item) => item.date))) {
      return { content: FINANCIAL_AUDIT_LOCK_MESSAGE, nextSession: session }
    }
    try {
      await financeService.saveTransactions(normalizedRows)
    } catch (error) {
      return {
        content: error instanceof Error ? error.message : 'Não foi possível criar a transação.',
        nextSession: session
      }
    }
    await financeService.saveCategory(category, type)
    return mainMenu('Transação criada.')
  }

  if (session.step === 'pick_transaction_target') {
    const picked = selectOption(raw, normalized, session.options ?? [])
    if (!picked) return { content: 'Selecione um item.', actions: optionsToActions(session.options ?? []), nextSession: session }
    const all = await financeService.getTransactions()
    const target = all.find((x) => x.id === picked.id)
    if (!target) return mainMenu('Transação não encontrada.')
    if (isFinancialPeriodLocked(target.date)) {
      return mainMenu(FINANCIAL_AUDIT_LOCK_MESSAGE)
    }
    if (session.action === 'remover') return { content: `Confirmar remoção?\n${formatLine(target)}`, actions: [asOption('Confirmar', CMD.confirmYes), asOption('Cancelar', CMD.confirmNo)], nextSession: { ...session, step: 'confirm_transaction_delete', draft: { ...session.draft, targetId: target.id } } }
    return {
      content: `Campo para editar:\n${formatLine(target)}`,
      actions: [
        asOption('Valor', CMD.editAmount),
        asOption('Categoria', CMD.editCategory),
        asOption('Descrição', CMD.editDescription),
        asOption('Data', CMD.editDate),
        asOption('Pagamento', CMD.editPayment),
        ...(target.type === 'saida' ? [asOption('Custo mensal', CMD.editMonthly)] : []),
        asOption('Confirmada', CMD.editConfirmed),
        asOption('Cancelar', CMD.cancel)
      ],
      nextSession: { ...session, step: 'pick_transaction_edit_field', draft: { ...session.draft, targetId: target.id } }
    }
  }

  if (session.step === 'pick_transaction_edit_field') {
    const field =
      raw === CMD.editAmount ? 'amount'
      : raw === CMD.editCategory ? 'category'
      : raw === CMD.editDescription ? 'description'
      : raw === CMD.editDate ? 'date'
      : raw === CMD.editPayment ? 'paymentMethod'
      : raw === CMD.editMonthly ? 'isMonthlyCost'
      : raw === CMD.editConfirmed ? 'isConfirmed'
      : null
    if (!field) return { content: 'Escolha um campo.', nextSession: session }
    if (field === 'date') return { content: 'Nova data:', actions: dateActions(), nextSession: { ...session, step: 'collect_transaction_edit_value', draft: { ...session.draft, editField: field } } }
    if (field === 'paymentMethod') return { content: 'Novo pagamento:', actions: paymentActions(), nextSession: { ...session, step: 'pick_transaction_edit_payment_method', draft: { ...session.draft, editField: field } } }
    if (field === 'isMonthlyCost' || field === 'isConfirmed') return { content: 'Sim ou não?', actions: boolActions(), nextSession: { ...session, step: 'collect_transaction_edit_value', draft: { ...session.draft, editField: field } } }
    if (field === 'category') {
      const id = session.draft?.targetId
      const all = await financeService.getTransactions()
      const t = all.find((x) => x.id === id)
      if (!t) return mainMenu('Transação não encontrada.')

      const options = await categoryOptionsForType(t.type)
      if (options.length === 0) {
        return mainMenu('Não há categorias para esse tipo. Cadastre uma categoria em "Categorias" e tente novamente.')
      }

      return {
        content: 'Nova categoria:',
        actions: optionsToActions(options),
        nextSession: { ...session, step: 'pick_transaction_edit_category', options, draft: { ...session.draft, editField: field } }
      }
    }

    return { content: field === 'amount' ? 'Novo valor:' : 'Nova descrição:', nextSession: { ...session, step: 'collect_transaction_edit_value', draft: { ...session.draft, editField: field } } }
  }

  if (session.step === 'pick_transaction_edit_category') {
    const transactionSettings = await resolveTransactionSettings(session)
    const id = session.draft?.targetId
    const all = await financeService.getTransactions()
    const t = all.find((x) => x.id === id)
    if (!t) return mainMenu('Transação não encontrada.')

    const picked = selectOption(raw, normalized, session.options ?? [])
    if (!picked) return { content: 'Selecione uma categoria.', actions: optionsToActions(session.options ?? []), nextSession: session }

    const value = clean(picked.label)
    if (!value) return { content: 'Categoria inválida.', actions: optionsToActions(session.options ?? []), nextSession: session }

    await financeService.saveCategory(value, t.type)
    const error = await saveTransactionWithSettings({ ...t, category: value }, transactionSettings)
    if (error) return { content: error, nextSession: session }
    return mainMenu('Transação atualizada.')
  }

  if (session.step === 'pick_transaction_edit_payment_method') {
    const transactionSettings = await resolveTransactionSettings(session)
    const method: PaymentMethod | null =
      raw === CMD.paymentPix ? 'pix' : raw === CMD.paymentDebito ? 'debito' : raw === CMD.paymentDinheiro ? 'dinheiro' : raw === CMD.paymentCredito ? 'credito' : null
    if (!method) return { content: 'Escolha o pagamento.', actions: paymentActions(), nextSession: session }
    if (method === 'credito') return { content: 'Parcelas (1 a 48):', nextSession: { ...session, step: 'collect_transaction_edit_installment_count' } }
    const id = session.draft?.targetId
    const all = await financeService.getTransactions()
    const t = all.find((x) => x.id === id)
    if (!t) return mainMenu('Transação não encontrada.')
    const error = await saveTransactionWithSettings({ ...t, paymentMethod: method, installmentCount: 1, installmentNumber: 1, installmentGroupId: null, isInstallment: false, totalAmount: t.amount }, transactionSettings)
    if (error) return { content: error, nextSession: session }
    return mainMenu('Transação atualizada.')
  }

  if (session.step === 'collect_transaction_edit_installment_count') {
    const transactionSettings = await resolveTransactionSettings(session)
    const count = parseIntSafe(raw)
    if (!count || count < 1 || count > 48) return { content: 'Parcelas entre 1 e 48.', nextSession: session }
    if (!transactionSettings.allowCreditWithoutInstallments && count <= 1) {
      return { content: 'Crédito precisa de ao menos 2 parcelas nas regras atuais.', nextSession: session }
    }
    const id = session.draft?.targetId
    const all = await financeService.getTransactions()
    const t = all.find((x) => x.id === id)
    if (!t) return mainMenu('Transação não encontrada.')
    const error = await saveTransactionWithSettings({ ...t, paymentMethod: 'credito', installmentCount: count, installmentNumber: Math.min(t.installmentNumber, count), installmentGroupId: count > 1 ? t.installmentGroupId ?? crypto.randomUUID() : null, isInstallment: count > 1, totalAmount: count > 1 ? Math.max(t.totalAmount, t.amount) : t.amount }, transactionSettings)
    if (error) return { content: error, nextSession: session }
    return mainMenu('Transação atualizada.')
  }

  if (session.step === 'collect_transaction_edit_value') {
    const transactionSettings = await resolveTransactionSettings(session)
    const id = session.draft?.targetId
    const field = session.draft?.editField
    const all = await financeService.getTransactions()
    const t = all.find((x) => x.id === id)
    if (!t || !field) return mainMenu('Transação não encontrada.')
    if (field === 'amount') {
      const value = parseAmount(raw)
      if (!value) return { content: 'Valor inválido.', nextSession: session }
      const error = await saveTransactionWithSettings({ ...t, amount: value, totalAmount: t.isInstallment ? Math.max(t.totalAmount, value) : value }, transactionSettings)
      if (error) return { content: error, nextSession: session }
      return mainMenu('Transação atualizada.')
    }
    if (field === 'category') {
      const value = clean(raw)
      if (!value) return { content: 'Categoria inválida.', nextSession: session }
      await financeService.saveCategory(value, t.type)
      const error = await saveTransactionWithSettings({ ...t, category: value }, transactionSettings)
      if (error) return { content: error, nextSession: session }
      return mainMenu('Transação atualizada.')
    }
    if (field === 'description') {
      const value = clean(raw)
      if (!value) return { content: 'Descrição inválida.', nextSession: session }
      const error = await saveTransactionWithSettings({ ...t, description: value }, transactionSettings)
      if (error) return { content: error, nextSession: session }
      return mainMenu('Transação atualizada.')
    }
    if (field === 'date') {
      const value = parseDate(raw, normalized)
      if (!value) return { content: 'Data inválida.', actions: dateActions(), nextSession: session }
      const error = await saveTransactionWithSettings({ ...t, date: value, isConfirmed: getDefaultConfirmedByType(transactionSettings, t.type, value) }, transactionSettings)
      if (error) return { content: error, nextSession: session }
      return mainMenu('Transação atualizada.')
    }
    if (field === 'isMonthlyCost') {
      if (raw !== CMD.boolYes && raw !== CMD.boolNo) return { content: 'Escolha Sim ou Não.', actions: boolActions(), nextSession: session }
      const error = await saveTransactionWithSettings({ ...t, isMonthlyCost: t.type === 'saida' ? raw === CMD.boolYes : false }, transactionSettings)
      if (error) return { content: error, nextSession: session }
      return mainMenu('Transação atualizada.')
    }
    if (field === 'isConfirmed') {
      if (raw !== CMD.boolYes && raw !== CMD.boolNo) return { content: 'Escolha Sim ou Não.', actions: boolActions(), nextSession: session }
      const error = await saveTransactionWithSettings({ ...t, isConfirmed: raw === CMD.boolYes }, transactionSettings)
      if (error) return { content: error, nextSession: session }
      return mainMenu('Transação atualizada.')
    }
  }

  if (session.step === 'confirm_transaction_delete') {
    if (raw !== CMD.confirmYes && raw !== CMD.confirmNo) return { content: 'Confirmar ou cancelar?', actions: [asOption('Confirmar', CMD.confirmYes), asOption('Cancelar', CMD.confirmNo)], nextSession: session }
    if (raw === CMD.confirmNo) return mainMenu('Remoção cancelada.')
    const id = session.draft?.targetId
    if (!id) return mainMenu('Transação não encontrada.')
    try {
      await financeService.deleteTransaction(id)
    } catch (error) {
      return mainMenu(error instanceof Error ? error.message : 'Não foi possível remover a transação.')
    }
    return mainMenu('Transação removida.')
  }

  if (session.step === 'pick_action' && session.entity === 'categoria') {
    if (raw === CMD.categoryList) {
      const [entrada, saida] = await Promise.all([financeService.getCategoryItems('entrada'), financeService.getCategoryItems('saida')])
      const text = `Entrada:\n${entrada.map((x) => `- ${x.name}`).join('\n') || '- (nenhuma)'}\n\nSaída:\n${saida.map((x) => `- ${x.name}`).join('\n') || '- (nenhuma)'}`
      return mainMenu(text)
    }
    if (raw === CMD.categoryCreate) return { content: 'Categoria de entrada ou saída?', actions: [asOption('Entrada', CMD.typeEntrada), asOption('Saída', CMD.typeSaida), asOption('Cancelar', CMD.cancel)], nextSession: { step: 'pick_category_type', draft: {} } }
    if (raw === CMD.categoryEdit || raw === CMD.categoryDelete) {
      const [entrada, saida] = await Promise.all([financeService.getCategoryItems('entrada'), financeService.getCategoryItems('saida')])
      const options = [...entrada, ...saida].slice(0, MAX_OPTIONS).map((x) => ({ id: x.id, label: `${x.type} | ${x.name}`, entity: 'category' as const, type: x.type }))
      if (options.length === 0) return mainMenu('Sem categorias.')
      return { content: raw === CMD.categoryEdit ? 'Selecione a categoria para editar:' : 'Selecione a categoria para remover:', actions: optionsToActions(options), nextSession: { step: 'pick_category_target', action: raw === CMD.categoryEdit ? 'editar' : 'remover', options } }
    }
    return mainMenu()
  }

  if (session.step === 'pick_category_type') {
    const type = raw === CMD.typeEntrada ? 'entrada' : raw === CMD.typeSaida ? 'saida' : null
    if (!type) return { content: 'Escolha Entrada ou Saída.', actions: [asOption('Entrada', CMD.typeEntrada), asOption('Saída', CMD.typeSaida), asOption('Cancelar', CMD.cancel)], nextSession: session }
    return { content: 'Nome da categoria:', nextSession: { ...session, step: 'collect_category_name', draft: { ...session.draft, transactionType: type } } }
  }

  if (session.step === 'collect_category_name') {
    const name = clean(raw)
    const type = session.draft?.transactionType
    if (!name || !type) return { content: 'Nome inválido.', nextSession: session }
    await financeService.saveCategory(name, type)
    return mainMenu('Categoria criada.')
  }

  if (session.step === 'pick_category_target') {
    const picked = selectOption(raw, normalized, session.options ?? [])
    if (!picked) return { content: 'Selecione uma categoria.', actions: optionsToActions(session.options ?? []), nextSession: session }
    if (session.action === 'remover') {
      await financeService.deleteCategory(picked.id)
      return mainMenu('Categoria removida.')
    }
    return { content: 'Novo nome:', nextSession: { ...session, step: 'collect_category_new_name', options: [picked] } }
  }

  if (session.step === 'collect_category_new_name') {
    const target = session.options?.[0]
    const nextName = clean(raw)
    if (!target?.type || !nextName) return { content: 'Nome inválido.', nextSession: session }
    await financeService.updateCategory(target.id, nextName, target.type)
    return mainMenu('Categoria atualizada.')
  }

  return mainMenu()
}

const initialReply = (): ChatReply => mainMenu()

export const chatService = {
  getInitialReply: (): ChatReply => initialReply(),
  getInitialSession: (): ChatSessionState => ({ step: 'main_menu' }),
  processMessage: async (message: string, session: ChatSessionState = { step: 'main_menu' }): Promise<ChatReply> => {
    const raw = message.trim()
    const normalized = normalize(raw)
    if (!raw) return mainMenu()
    if (raw === CMD.cancel || normalized === 'cancelar') return mainMenu('Fluxo cancelado.')
    if (raw === CMD.menu) return mainMenu()
    return continueFlow(raw, normalized, session)
  }
}
