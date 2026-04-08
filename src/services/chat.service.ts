import { financeService } from './finance.service'
import type { ChatQuickAction, ChatReply, ChatSessionState, GuidedOptionItem } from '../types/chat.types'
import type { PaymentMethod, Transaction, TransactionType } from '../types/transaction.types'

const MAX_OPTIONS = 10

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
  categoryList: '/category/list'
} as const

const MONTHS: Record<string, string> = {
  '01': 'Janeiro',
  '02': 'Fevereiro',
  '03': 'Marco',
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

const parseDate = (raw: string, normalized: string): string | null => {
  if (raw === CMD.dateToday || normalized === 'hoje') return today()
  if (raw === CMD.dateYesterday || normalized === 'ontem') return yesterday()
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (br) return `${br[3]}-${br[2]}-${br[1]}`
  return null
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
  return `Entradas: ${money(inValue)}\nSaidas: ${money(outValue)}\nSaldo: ${money(inValue - outValue)}\nItens: ${items.length}`
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

const mainMenu = (content = 'O que voce quer fazer?'): ChatReply => ({
  content,
  actions: [
    asOption('Ver transacoes', CMD.viewTransactions),
    asOption('Ver despesas', CMD.viewExpenses),
    asOption('Criar transacao', CMD.createTransaction),
    asOption('Editar transacao', CMD.editTransaction),
    asOption('Remover transacao', CMD.deleteTransaction),
    asOption('Categorias', CMD.manageCategories)
  ],
  nextSession: { step: 'main_menu' }
})

const filterScopeMenu = (listType: 'all' | 'entrada' | 'saida'): ChatReply => ({
  content: 'Periodo:',
  actions: [
    asOption('Tudo', CMD.scopeAll),
    asOption('Ano', CMD.scopeYear),
    asOption('Mes', CMD.scopeMonth),
    asOption('Dia', CMD.scopeDay),
    asOption('Cancelar', CMD.cancel)
  ],
  nextSession: { step: 'pick_filter_scope', draft: { listType } }
})

const boolActions = (): ChatQuickAction[] => [asOption('Sim', CMD.boolYes), asOption('Nao', CMD.boolNo), asOption('Cancelar', CMD.cancel)]
const dateActions = (): ChatQuickAction[] => [
  asOption('Hoje', CMD.dateToday),
  asOption('Ontem', CMD.dateYesterday),
  asOption('Outra data', CMD.dateCustom),
  asOption('Cancelar', CMD.cancel)
]
const paymentActions = (): ChatQuickAction[] => [
  asOption('Pix', CMD.paymentPix),
  asOption('Debito', CMD.paymentDebito),
  asOption('Dinheiro', CMD.paymentDinheiro),
  asOption('Credito', CMD.paymentCredito),
  asOption('Cancelar', CMD.cancel)
]

const executeList = async (session: ChatSessionState): Promise<ChatReply> => {
  const listType = session.draft?.listType ?? 'all'
  const scope = session.draft?.periodScope ?? 'all'
  const year = session.draft?.periodYear
  const month = session.draft?.periodMonth
  const day = session.draft?.periodDay

  let items = await financeService.getTransactions()
  if (listType !== 'all') items = items.filter((x) => x.type === listType)
  if (scope === 'year' && year) items = items.filter((x) => x.date.slice(0, 4) === year)
  if (scope === 'month' && year && month) items = items.filter((x) => x.date.slice(0, 7) === `${year}-${month}`)
  if (scope === 'day' && year && month && day) items = items.filter((x) => x.date.slice(0, 10) === `${year}-${month}-${day}`)

  const sorted = sortByDateDesc(items)
  if (sorted.length === 0) return mainMenu('Sem transacoes para esse filtro.')
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

const continueFlow = async (raw: string, normalized: string, session: ChatSessionState): Promise<ChatReply> => {
  if (session.step === 'main_menu') {
    if (raw === CMD.viewTransactions) return filterScopeMenu('all')
    if (raw === CMD.viewExpenses) return filterScopeMenu('saida')
    if (raw === CMD.createTransaction) {
      return {
        content: 'Tipo da transacao:',
        actions: [asOption('Entrada', CMD.typeEntrada), asOption('Saida', CMD.typeSaida), asOption('Cancelar', CMD.cancel)],
        nextSession: { step: 'pick_transaction_type', draft: {} }
      }
    }
    if (raw === CMD.editTransaction || raw === CMD.deleteTransaction) {
      const items = sortByDateDesc(await financeService.getTransactions()).slice(0, MAX_OPTIONS)
      const options = items.map((t) => ({ id: t.id, label: formatLine(t), entity: 'transaction' as const }))
      if (options.length === 0) return mainMenu('Sem transacoes.')
      return {
        content: raw === CMD.editTransaction ? 'Selecione a transacao para editar:' : 'Selecione a transacao para remover:',
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
    if (/(despesa|gasto).*(mes|m[eê]s)/.test(normalized)) {
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
    return { content: 'Mes:', actions: optionsToActions(monthOpts), nextSession: { ...session, step: 'pick_filter_month', options: monthOpts, draft: { ...session.draft, periodYear: year } } }
  }

  if (session.step === 'pick_filter_month') {
    const pick = selectOption(raw, normalized, session.options ?? [])
    if (!pick) return { content: 'Selecione um mes.', actions: optionsToActions(session.options ?? []), nextSession: session }
    const month = pick.id.replace('m-', '')
    if (session.draft?.periodScope === 'month') return executeList({ ...session, draft: { ...session.draft, periodMonth: month } })
    const year = session.draft?.periodYear
    if (!year) return mainMenu('Ano invalido.')
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
    if (!type) return { content: 'Escolha Entrada ou Saida.', actions: [asOption('Entrada', CMD.typeEntrada), asOption('Saida', CMD.typeSaida), asOption('Cancelar', CMD.cancel)], nextSession: session }
    return { content: 'Valor total?', nextSession: { ...session, step: 'collect_transaction_amount', draft: { ...session.draft, transactionType: type } } }
  }

  if (session.step === 'collect_transaction_amount') {
    const amount = parseAmount(raw)
    if (!amount) return { content: 'Valor invalido.', nextSession: session }
    return { content: 'Categoria?', nextSession: { ...session, step: 'collect_transaction_category', draft: { ...session.draft, amount } } }
  }

  if (session.step === 'collect_transaction_category') {
    const category = clean(raw)
    if (!category) return { content: 'Categoria invalida.', nextSession: session }
    return { content: 'Descricao?', nextSession: { ...session, step: 'collect_transaction_description', draft: { ...session.draft, categoryName: category } } }
  }

  if (session.step === 'collect_transaction_description') {
    const description = clean(raw)
    if (!description) return { content: 'Descricao invalida.', nextSession: session }
    return { content: 'Forma de pagamento?', actions: paymentActions(), nextSession: { ...session, step: 'pick_transaction_payment_method', draft: { ...session.draft, description } } }
  }

  if (session.step === 'pick_transaction_payment_method') {
    const method: PaymentMethod | null =
      raw === CMD.paymentPix ? 'pix' : raw === CMD.paymentDebito ? 'debito' : raw === CMD.paymentDinheiro ? 'dinheiro' : raw === CMD.paymentCredito ? 'credito' : null
    if (!method) return { content: 'Escolha o pagamento.', actions: paymentActions(), nextSession: session }
    if (method === 'credito') return { content: 'Parcelas (1 a 48)?', nextSession: { ...session, step: 'collect_transaction_installment_count', draft: { ...session.draft, paymentMethod: method } } }
    if (session.draft?.transactionType === 'saida') return { content: 'Custo mensal?', actions: boolActions(), nextSession: { ...session, step: 'pick_transaction_monthly_cost', draft: { ...session.draft, paymentMethod: method, installmentCount: 1 } } }
    return { content: 'Data?', actions: dateActions(), nextSession: { ...session, step: 'pick_transaction_date', draft: { ...session.draft, paymentMethod: method, installmentCount: 1 } } }
  }

  if (session.step === 'collect_transaction_installment_count') {
    const count = parseIntSafe(raw)
    if (!count || count < 1 || count > 48) return { content: 'Parcelas entre 1 e 48.', nextSession: session }
    return { content: 'Data da primeira parcela?', actions: dateActions(), nextSession: { ...session, step: 'pick_transaction_date', draft: { ...session.draft, installmentCount: count, isMonthlyCost: false } } }
  }

  if (session.step === 'pick_transaction_monthly_cost') {
    if (raw !== CMD.boolYes && raw !== CMD.boolNo) return { content: 'Escolha Sim ou Nao.', actions: boolActions(), nextSession: session }
    return { content: 'Data?', actions: dateActions(), nextSession: { ...session, step: 'pick_transaction_date', draft: { ...session.draft, isMonthlyCost: raw === CMD.boolYes } } }
  }

  if (session.step === 'pick_transaction_date' || session.step === 'collect_transaction_custom_date') {
    if (session.step === 'pick_transaction_date' && raw === CMD.dateCustom) return { content: 'Digite a data (DD/MM/AAAA ou AAAA-MM-DD).', nextSession: { ...session, step: 'collect_transaction_custom_date' } }
    const parsedDate = parseDate(raw, normalized)
    if (!parsedDate) return { content: 'Data invalida.', actions: dateActions(), nextSession: session.step === 'collect_transaction_custom_date' ? { ...session, step: 'collect_transaction_custom_date' } : session }

    const type = session.draft?.transactionType
    const amount = session.draft?.amount
    const category = session.draft?.categoryName
    const description = session.draft?.description
    const paymentMethod = session.draft?.paymentMethod ?? 'pix'
    const installmentCount = paymentMethod === 'credito' ? session.draft?.installmentCount ?? 1 : 1
    if (!type || !amount || !category || !description) return mainMenu('Dados incompletos para criar transacao.')

    const firstDate = new Date(parsedDate)
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
        isConfirmed: date <= today(),
        isMonthlyCost,
        paymentMethod,
        installmentGroupId: groupId,
        installmentNumber: isInstallment ? index + 1 : 1,
        installmentCount,
        totalAmount: amount,
        isInstallment
      }
    })
    await financeService.saveTransactions(rows)
    await financeService.saveCategory(category, type)
    return mainMenu('Transacao criada.')
  }

  if (session.step === 'pick_transaction_target') {
    const picked = selectOption(raw, normalized, session.options ?? [])
    if (!picked) return { content: 'Selecione um item.', actions: optionsToActions(session.options ?? []), nextSession: session }
    const all = await financeService.getTransactions()
    const target = all.find((x) => x.id === picked.id)
    if (!target) return mainMenu('Transacao nao encontrada.')
    if (session.action === 'remover') return { content: `Confirmar remocao?\n${formatLine(target)}`, actions: [asOption('Confirmar', CMD.confirmYes), asOption('Cancelar', CMD.confirmNo)], nextSession: { ...session, step: 'confirm_transaction_delete', draft: { ...session.draft, targetId: target.id } } }
    return {
      content: `Campo para editar:\n${formatLine(target)}`,
      actions: [
        asOption('Valor', CMD.editAmount),
        asOption('Categoria', CMD.editCategory),
        asOption('Descricao', CMD.editDescription),
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
    if (field === 'isMonthlyCost' || field === 'isConfirmed') return { content: 'Sim ou nao?', actions: boolActions(), nextSession: { ...session, step: 'collect_transaction_edit_value', draft: { ...session.draft, editField: field } } }
    return { content: field === 'amount' ? 'Novo valor:' : field === 'category' ? 'Nova categoria:' : 'Nova descricao:', nextSession: { ...session, step: 'collect_transaction_edit_value', draft: { ...session.draft, editField: field } } }
  }

  if (session.step === 'pick_transaction_edit_payment_method') {
    const method: PaymentMethod | null =
      raw === CMD.paymentPix ? 'pix' : raw === CMD.paymentDebito ? 'debito' : raw === CMD.paymentDinheiro ? 'dinheiro' : raw === CMD.paymentCredito ? 'credito' : null
    if (!method) return { content: 'Escolha o pagamento.', actions: paymentActions(), nextSession: session }
    if (method === 'credito') return { content: 'Parcelas (1 a 48):', nextSession: { ...session, step: 'collect_transaction_edit_installment_count' } }
    const id = session.draft?.targetId
    const all = await financeService.getTransactions()
    const t = all.find((x) => x.id === id)
    if (!t) return mainMenu('Transacao nao encontrada.')
    await financeService.updateTransaction({ ...t, paymentMethod: method, installmentCount: 1, installmentNumber: 1, installmentGroupId: null, isInstallment: false, totalAmount: t.amount })
    return mainMenu('Transacao atualizada.')
  }

  if (session.step === 'collect_transaction_edit_installment_count') {
    const count = parseIntSafe(raw)
    if (!count || count < 1 || count > 48) return { content: 'Parcelas entre 1 e 48.', nextSession: session }
    const id = session.draft?.targetId
    const all = await financeService.getTransactions()
    const t = all.find((x) => x.id === id)
    if (!t) return mainMenu('Transacao nao encontrada.')
    await financeService.updateTransaction({ ...t, paymentMethod: 'credito', installmentCount: count, installmentNumber: Math.min(t.installmentNumber, count), installmentGroupId: count > 1 ? t.installmentGroupId ?? crypto.randomUUID() : null, isInstallment: count > 1, totalAmount: count > 1 ? Math.max(t.totalAmount, t.amount) : t.amount })
    return mainMenu('Transacao atualizada.')
  }

  if (session.step === 'collect_transaction_edit_value') {
    const id = session.draft?.targetId
    const field = session.draft?.editField
    const all = await financeService.getTransactions()
    const t = all.find((x) => x.id === id)
    if (!t || !field) return mainMenu('Transacao nao encontrada.')
    if (field === 'amount') {
      const value = parseAmount(raw)
      if (!value) return { content: 'Valor invalido.', nextSession: session }
      await financeService.updateTransaction({ ...t, amount: value, totalAmount: t.isInstallment ? Math.max(t.totalAmount, value) : value })
      return mainMenu('Transacao atualizada.')
    }
    if (field === 'category') {
      const value = clean(raw)
      if (!value) return { content: 'Categoria invalida.', nextSession: session }
      await financeService.saveCategory(value, t.type)
      await financeService.updateTransaction({ ...t, category: value })
      return mainMenu('Transacao atualizada.')
    }
    if (field === 'description') {
      const value = clean(raw)
      if (!value) return { content: 'Descricao invalida.', nextSession: session }
      await financeService.updateTransaction({ ...t, description: value })
      return mainMenu('Transacao atualizada.')
    }
    if (field === 'date') {
      const value = parseDate(raw, normalized)
      if (!value) return { content: 'Data invalida.', actions: dateActions(), nextSession: session }
      await financeService.updateTransaction({ ...t, date: value, isConfirmed: value <= today() })
      return mainMenu('Transacao atualizada.')
    }
    if (field === 'isMonthlyCost') {
      if (raw !== CMD.boolYes && raw !== CMD.boolNo) return { content: 'Escolha Sim ou Nao.', actions: boolActions(), nextSession: session }
      await financeService.updateTransaction({ ...t, isMonthlyCost: t.type === 'saida' ? raw === CMD.boolYes : false })
      return mainMenu('Transacao atualizada.')
    }
    if (field === 'isConfirmed') {
      if (raw !== CMD.boolYes && raw !== CMD.boolNo) return { content: 'Escolha Sim ou Nao.', actions: boolActions(), nextSession: session }
      await financeService.updateTransaction({ ...t, isConfirmed: raw === CMD.boolYes })
      return mainMenu('Transacao atualizada.')
    }
  }

  if (session.step === 'confirm_transaction_delete') {
    if (raw !== CMD.confirmYes && raw !== CMD.confirmNo) return { content: 'Confirmar ou cancelar?', actions: [asOption('Confirmar', CMD.confirmYes), asOption('Cancelar', CMD.confirmNo)], nextSession: session }
    if (raw === CMD.confirmNo) return mainMenu('Remocao cancelada.')
    const id = session.draft?.targetId
    if (!id) return mainMenu('Transacao nao encontrada.')
    await financeService.deleteTransaction(id)
    return mainMenu('Transacao removida.')
  }

  if (session.step === 'pick_action' && session.entity === 'categoria') {
    if (raw === CMD.categoryList) {
      const [entrada, saida] = await Promise.all([financeService.getCategoryItems('entrada'), financeService.getCategoryItems('saida')])
      const text = `Entrada:\n${entrada.map((x) => `- ${x.name}`).join('\n') || '- (nenhuma)'}\n\nSaida:\n${saida.map((x) => `- ${x.name}`).join('\n') || '- (nenhuma)'}`
      return mainMenu(text)
    }
    if (raw === CMD.categoryCreate) return { content: 'Categoria de entrada ou saida?', actions: [asOption('Entrada', CMD.typeEntrada), asOption('Saida', CMD.typeSaida), asOption('Cancelar', CMD.cancel)], nextSession: { step: 'pick_category_type', draft: {} } }
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
    if (!type) return { content: 'Escolha Entrada ou Saida.', actions: [asOption('Entrada', CMD.typeEntrada), asOption('Saida', CMD.typeSaida), asOption('Cancelar', CMD.cancel)], nextSession: session }
    return { content: 'Nome da categoria:', nextSession: { ...session, step: 'collect_category_name', draft: { ...session.draft, transactionType: type } } }
  }

  if (session.step === 'collect_category_name') {
    const name = clean(raw)
    const type = session.draft?.transactionType
    if (!name || !type) return { content: 'Nome invalido.', nextSession: session }
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
    if (!target?.type || !nextName) return { content: 'Nome invalido.', nextSession: session }
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
