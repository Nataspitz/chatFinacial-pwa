import type { AssistantIntent } from '../types'

export interface IntentRule {
  keywords: string[]
  domainWords?: string[]
  weight: number
}

export const intentRules: Record<
  Exclude<AssistantIntent, 'show_summary' | 'show_balance'>,
  IntentRule
> = {
  greeting: {
    keywords: ['oi', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'e ai', 'opa'],
    weight: 3
  },
  create_transaction: {
    keywords: ['criar', 'adicionar', 'lancar', 'registrar', 'gastei', 'recebi', 'paguei', 'comprei', 'ganhei', 'entrou'],
    domainWords: ['gasto', 'despesa', 'entrada', 'receita', 'transacao', 'pagamento', 'valor'],
    weight: 5
  },
  list_transactions: {
    keywords: ['listar', 'mostrar', 'ver', 'exibir', 'consultar', 'buscar', 'quais'],
    domainWords: ['transacoes', 'gastos', 'despesas', 'entradas', 'receitas', 'movimentacoes', 'lancamentos'],
    weight: 5
  },
  analyze_transactions: {
    keywords: ['analisar', 'resumo', 'total', 'quanto', 'balanco', 'relatorio', 'saldo', 'quanto gastei', 'quanto recebi'],
    domainWords: ['mes', 'semana', 'categoria', 'gastos', 'receitas', 'saldo'],
    weight: 5
  },
  help: {
    keywords: ['ajuda', 'o que voce faz', 'como funciona', 'menu', 'opcoes'],
    weight: 2
  },
  confirmation: {
    keywords: ['sim', 'confirmo', 'confirmar', 'confirma', 'pode criar', 'isso', 'ok'],
    weight: 2
  },
  cancellation: {
    keywords: ['nao', 'cancelar', 'cancela', 'deixa', 'esquece', 'deixa pra la', 'parar'],
    weight: 2
  },
  unknown: {
    keywords: [],
    weight: 0
  }
}

export const summaryKeywords = ['resumo', 'relatorio', 'total', 'quanto gastei', 'quanto entrou', 'quanto recebi', 'analisar', 'analisar']
export const balanceKeywords = ['saldo', 'quanto sobrou', 'quanto tenho']

