import type { AssistantIntent } from './types'
import { hasAny, normalizeText } from './normalize-text'

const createKeywords = [
  'gastei',
  'paguei',
  'recebi',
  'ganhei',
  'entrou',
  'comprei',
  'registrar',
  'adicionar',
  'lancar',
  'lançar',
  'criar transacao',
  'nova transacao',
  'registrar despesa',
  'adicionar gasto'
]

const summaryKeywords = [
  'resumo',
  'relatorio',
  'relatório',
  'total',
  'quanto gastei',
  'quanto entrou',
  'total de despesas',
  'total de entradas'
]

const balanceKeywords = [
  'qual meu saldo',
  'saldo',
  'quanto sobrou',
  'quanto tenho'
]

const listKeywords = [
  'listar transacoes',
  'listar transações',
  'mostrar transacoes',
  'mostrar transações',
  'ver transacoes',
  'ver transações',
  'quais transacoes',
  'quais transações',
  'mostrar gastos',
  'listar gastos',
  'ver despesas',
  'ver entradas',
  'lancamentos',
  'lançamentos',
  'me mostra os gastos'
]

export const detectIntent = (message: string): AssistantIntent => {
  const text = normalizeText(message)

  if (hasAny(text, createKeywords)) return 'create_transaction'
  if (hasAny(text, summaryKeywords)) return 'show_summary'
  if (hasAny(text, balanceKeywords)) return 'show_balance'
  if (hasAny(text, listKeywords)) return 'list_transactions'

  return 'unknown'
}
