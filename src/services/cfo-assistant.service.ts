import { cfoContextService } from './cfo-context.service'
import type { CfoAnalysisType, CfoAssistantReply, CfoFinancialSnapshot } from '../types/cfo.types'

const REMOTE_TIMEOUT_MS = 12000

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const formatPercent = (value: number | null): string => {
  if (value === null) return 'N/D'
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

const normalize = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const compactMessage = (message: string): string => {
  const lines = message
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const compactLines = lines.length <= 4 ? lines : [lines[0], lines[1], lines[2], lines[lines.length - 1]]
  const compact = compactLines.join('\n')
  if (compact.length <= 420) return compact
  return `${compact.slice(0, 417).trimEnd()}...`
}

const summarizeAlertsInline = (snapshot: CfoFinancialSnapshot): string => {
  if (snapshot.alerts.length === 0) {
    return 'Sem alertas criticos.'
  }

  return snapshot.alerts.slice(0, 2).map((alert) => alert.title).join(' | ')
}

const findWorstForecastPoint = (snapshot: CfoFinancialSnapshot): { date: string; balance: number } | null => {
  if (snapshot.forecast.points.length === 0) return null

  let worst = snapshot.forecast.points[0]
  for (const point of snapshot.forecast.points) {
    if (point.balance < worst.balance) worst = point
  }

  return worst
}

const detectAnalysisType = (input: string): CfoAnalysisType | null => {
  if (input.includes('horizontal')) return 'horizontal'
  if (input.includes('vertical')) return 'vertical'
  if (input.includes('liquidez')) return 'liquidity'
  if (input.includes('rentabilidade') || input.includes('lucratividade')) return 'profitability'
  if (input.includes('endividamento') || input.includes('divida')) return 'debt'
  if (input.includes('equilibrio')) return 'break_even'
  if (input.includes('fluxo de caixa')) return 'cash_flow'
  if (input.includes('benchmark')) return 'benchmarking'
  if (input.includes('5c') || input.includes('credito')) return 'credit_5c'
  if (input.includes('fpa') || input.includes('planejamento financeiro')) return 'fpa'
  return null
}

const buildExecutiveSummary = (snapshot: CfoFinancialSnapshot): string => {
  return [
    `Resumo CFO (${snapshot.period.label})`,
    `Receita ${formatCurrency(snapshot.totals.revenue)} | Despesa ${formatCurrency(snapshot.totals.expense)}`,
    `Lucro ${formatCurrency(snapshot.totals.profit)} | Margem ${formatPercent(snapshot.totals.margin)} | Projecao ${formatCurrency(snapshot.forecast.estimatedEndingBalance)}`,
    `Alertas: ${summarizeAlertsInline(snapshot)}`
  ].join('\n')
}

const buildForecastReply = (snapshot: CfoFinancialSnapshot): string => {
  const worstPoint = findWorstForecastPoint(snapshot)

  return [
    `Projecao de caixa (${snapshot.forecast.days} dias)`,
    `Inicial ${formatCurrency(snapshot.forecast.startingBalance)} | Final ${formatCurrency(snapshot.forecast.estimatedEndingBalance)}`,
    `Pior ponto: ${worstPoint ? `${formatCurrency(worstPoint.balance)} em ${worstPoint.date}` : 'N/D'}`,
    `Ação: proteger caixa dos próximos 7 dias e reduzir saídas variáveis.`
  ].join('\n')
}

const buildCostReply = (snapshot: CfoFinancialSnapshot): string => {
  const top = snapshot.topExpenseCategories
  if (top.length === 0) {
    return 'Não encontrei despesas no período atual.'
  }

  const topText = top.slice(0, 3).map((item) => `${item.category} ${formatCurrency(item.amount)}`).join(' | ')
  return [
    `Top despesas (${snapshot.period.label})`,
    topText,
    'Ação: revisar as 2 maiores categorias primeiro.'
  ].join('\n')
}

const buildAlertReply = (snapshot: CfoFinancialSnapshot): string => {
  if (snapshot.alerts.length === 0) {
    return 'Sem alertas ativos no momento.'
  }

  return [
    'Alertas financeiros ativos',
    ...snapshot.alerts.slice(0, 3).map((alert, index) => `${index + 1}. ${alert.title}`),
    'Acao: tratar primeiro os alertas criticos.'
  ].join('\n')
}

const buildAnalysisReply = (analysisType: CfoAnalysisType, snapshot: CfoFinancialSnapshot): string => {
  const expenseShareOfRevenue = snapshot.totals.revenue > 0 ? (snapshot.totals.expense / snapshot.totals.revenue) * 100 : null
  const criticalCount = snapshot.alerts.filter((item) => item.severity === 'critical').length
  const warningCount = snapshot.alerts.filter((item) => item.severity === 'warning').length
  const riskLevel = criticalCount > 0 ? 'alto' : warningCount > 0 ? 'medio' : 'baixo'
  const worstPoint = findWorstForecastPoint(snapshot)
  const neededToBreakEven = Math.max(0, snapshot.totals.expense - snapshot.totals.revenue)
  const mainExpense = snapshot.topExpenseCategories[0]

  switch (analysisType) {
    case 'horizontal':
      return [
        `Analise Horizontal (${snapshot.period.label})`,
        `Receita: ${formatPercent(snapshot.growth.revenue)} | Despesa: ${formatPercent(snapshot.growth.expense)}`,
        `Resultado: ${formatPercent(snapshot.growth.profit)}`,
        'Leitura: acompanhe se a despesa cresce mais rápido que a receita.',
        'Ação: limitar crescimento de custo nas 2 categorias principais.'
      ].join('\n')
    case 'vertical':
      return [
        `Analise Vertical (${snapshot.period.label})`,
        `Despesa/Receita: ${formatPercent(expenseShareOfRevenue)}`,
        `Maior peso de custo: ${mainExpense ? `${mainExpense.category} (${formatCurrency(mainExpense.amount)})` : 'N/D'}`,
        'Leitura: foco no peso relativo das despesas dentro da receita.',
        'Acao: reduzir o maior centro de custo em percentual fixo.'
      ].join('\n')
    case 'liquidity':
      return [
        `Analise de Liquidez (${snapshot.period.label})`,
        `Saldo atual estimado: ${formatCurrency(snapshot.forecast.startingBalance)}`,
        `Saldo final projetado: ${formatCurrency(snapshot.forecast.estimatedEndingBalance)}`,
        `Pior ponto: ${worstPoint ? `${formatCurrency(worstPoint.balance)} (${worstPoint.date})` : 'N/D'}`,
        'Acao: garantir reserva para o pior ponto de caixa.'
      ].join('\n')
    case 'profitability':
      return [
        `Analise de Rentabilidade (${snapshot.period.label})`,
        `Lucro: ${formatCurrency(snapshot.totals.profit)}`,
        `Margem: ${formatPercent(snapshot.totals.margin)}`,
        `Crescimento do lucro: ${formatPercent(snapshot.growth.profit)}`,
        'Acao: elevar margem ajustando precificacao ou custo variavel.'
      ].join('\n')
    case 'debt':
      return [
        `Analise de Endividamento (proxy operacional)`,
        `Saídas previstas ${snapshot.forecast.days}d: ${formatCurrency(snapshot.forecast.estimatedExpense)}`,
        `Risco de caixa: ${riskLevel}`,
        'Limite: sem passivo formal, leitura baseada em comprometimento futuro.',
        'Acao: controlar novas obrigacoes ate reduzir risco.'
      ].join('\n')
    case 'break_even':
      return [
        `Analise de Ponto de Equilibrio (${snapshot.period.label})`,
        `Receita atual: ${formatCurrency(snapshot.totals.revenue)}`,
        `Despesa atual: ${formatCurrency(snapshot.totals.expense)}`,
        `Falta para empatar: ${formatCurrency(neededToBreakEven)}`,
        'Acao: atacar lacuna de receita ou cortar custo fixo.'
      ].join('\n')
    case 'cash_flow':
      return [
        `Analise de Fluxo de Caixa (${snapshot.period.label})`,
        `Saldo inicial: ${formatCurrency(snapshot.forecast.startingBalance)}`,
        `Entradas previstas: ${formatCurrency(snapshot.forecast.estimatedRevenue)}`,
        `Saídas previstas: ${formatCurrency(snapshot.forecast.estimatedExpense)}`,
        `Saldo final: ${formatCurrency(snapshot.forecast.estimatedEndingBalance)}`
      ].join('\n')
    case 'benchmarking':
      return [
        `Analise de Benchmarking interno (${snapshot.period.label})`,
        `Receita vs período anterior: ${formatPercent(snapshot.growth.revenue)}`,
        `Despesa vs período anterior: ${formatPercent(snapshot.growth.expense)}`,
        `Lucro vs período anterior: ${formatPercent(snapshot.growth.profit)}`,
        'Leitura: comparativo interno por período, sem base externa de mercado.'
      ].join('\n')
    case 'credit_5c':
      return [
        `Analise 5C de Credito (sinal interno)`,
        `Risco geral: ${riskLevel}`,
        `Alertas: ${summarizeAlertsInline(snapshot)}`,
        'Limite: faltam dados de carteira e inadimplencia para score completo.',
        'Acao: endurecer criterio de prazo enquanto risco estiver alto.'
      ].join('\n')
    case 'fpa':
      return [
        `FP&A (${snapshot.period.label})`,
        `Meta 1: manter despesa abaixo de ${formatCurrency(snapshot.totals.expense)}`,
        `Meta 2: levar saldo projetado para acima de ${formatCurrency(Math.max(0, snapshot.forecast.estimatedEndingBalance))}`,
        `Meta 3: revisar semanalmente ${mainExpense ? mainExpense.category : 'custos principais'}`,
        'Ação: operar em ciclos semanais com ajuste rápido.'
      ].join('\n')
    default:
      return buildExecutiveSummary(snapshot)
  }
}

const buildLocalReplyMessage = (question: string, snapshot: CfoFinancialSnapshot): string => {
  const input = normalize(question)
  const analysisType = detectAnalysisType(input)
  if (analysisType) {
    return buildAnalysisReply(analysisType, snapshot)
  }

  if (input.includes('previs') || input.includes('futuro') || input.includes('caixa')) {
    return buildForecastReply(snapshot)
  }

  if (input.includes('despesa') || input.includes('gasto') || input.includes('categoria')) {
    return buildCostReply(snapshot)
  }

  if (input.includes('alerta') || input.includes('risco')) {
    return buildAlertReply(snapshot)
  }

  return buildExecutiveSummary(snapshot)
}

const callRemoteAssistant = async (
  endpoint: string,
  payload: { question: string; snapshot: CfoFinancialSnapshot; analysisType?: CfoAnalysisType }
): Promise<string | null> => {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS)

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      return null
    }

    const responsePayload = (await response.json()) as { message?: string } | null
    if (!responsePayload?.message || typeof responsePayload.message !== 'string') {
      return null
    }

    return responsePayload.message.trim()
  } catch {
    return null
  } finally {
    window.clearTimeout(timeout)
  }
}

const askWithSnapshot = async (question: string, snapshot: CfoFinancialSnapshot, analysisType?: CfoAnalysisType): Promise<CfoAssistantReply> => {
  const endpoint = import.meta.env.VITE_CFO_AGENT_ENDPOINT?.trim()

  if (endpoint) {
    const remoteMessage = await callRemoteAssistant(endpoint, {
      question,
      snapshot,
      analysisType
    })
    if (remoteMessage) {
      return {
        source: 'remote',
        message: compactMessage(remoteMessage),
        snapshot
      }
    }
  }

  const localMessage = analysisType ? buildAnalysisReply(analysisType, snapshot) : buildLocalReplyMessage(question, snapshot)

  return {
    source: 'local',
    message: compactMessage(localMessage),
    snapshot
  }
}

export const cfoAssistantService = {
  getSnapshot: async (): Promise<CfoFinancialSnapshot> => cfoContextService.getFinancialSnapshot(),

  ask: async (question: string): Promise<CfoAssistantReply> => {
    const snapshot = await cfoContextService.getFinancialSnapshot()
    return askWithSnapshot(question, snapshot)
  },

  getExecutiveSummary: async (): Promise<CfoAssistantReply> => {
    const snapshot = await cfoContextService.getFinancialSnapshot()
    return askWithSnapshot('resumo executivo financeiro', snapshot)
  },

  getAnalysis: async (analysisType: CfoAnalysisType): Promise<CfoAssistantReply> => {
    const snapshot = await cfoContextService.getFinancialSnapshot()
    return askWithSnapshot(`analise ${analysisType}`, snapshot, analysisType)
  }
}
