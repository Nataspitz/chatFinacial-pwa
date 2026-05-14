import type { AssistantIntent } from '../types'
import { hasAny, includesWholeWord, normalizeText } from './normalizeText'
import { intentRules, balanceKeywords, summaryKeywords } from '../vocabulary/actions.vocabulary'

export interface IntentDetectionResult {
  intent: AssistantIntent
  confidence: number
  matchedTerms: string[]
}

const addScore = (
  scoreMap: Map<AssistantIntent, number>,
  termsMap: Map<AssistantIntent, string[]>,
  intent: AssistantIntent,
  points: number,
  matched: string[]
): void => {
  scoreMap.set(intent, (scoreMap.get(intent) ?? 0) + points)
  termsMap.set(intent, [...(termsMap.get(intent) ?? []), ...matched])
}

const normalizeConfidence = (score: number): number => {
  if (score <= 0) return 0
  if (score >= 10) return 1
  return Number((score / 10).toFixed(2))
}

export const detectIntentDetailed = (message: string): IntentDetectionResult => {
  const text = normalizeText(message)
  if (!text) return { intent: 'unknown', confidence: 0, matchedTerms: [] }

  const scoreMap = new Map<AssistantIntent, number>()
  const termsMap = new Map<AssistantIntent, string[]>()

  for (const [intent, rule] of Object.entries(intentRules) as Array<[AssistantIntent, (typeof intentRules)[keyof typeof intentRules]]>) {
    if (intent === 'unknown') continue

    const keywordMatches = rule.keywords.filter((keyword) => includesWholeWord(text, keyword) || text.includes(keyword))
    if (keywordMatches.length > 0) {
      addScore(scoreMap, termsMap, intent, keywordMatches.length * rule.weight, keywordMatches)
    }

    if (rule.domainWords?.length) {
      const domainMatches = rule.domainWords.filter((word) => includesWholeWord(text, word))
      if (domainMatches.length > 0) {
        addScore(scoreMap, termsMap, intent, domainMatches.length * Math.max(1, Math.floor(rule.weight / 2)), domainMatches)
      }
    }
  }

  if (hasAny(text, summaryKeywords)) addScore(scoreMap, termsMap, 'analyze_transactions', 5, ['summary'])
  if (hasAny(text, balanceKeywords)) addScore(scoreMap, termsMap, 'show_balance', 7, ['balance'])
  if (text.includes('quanto gastei')) addScore(scoreMap, termsMap, 'analyze_transactions', 7, ['quanto gastei'])
  if (text.includes('quanto recebi')) addScore(scoreMap, termsMap, 'analyze_transactions', 7, ['quanto recebi'])

  const hasMoneyValue = /\br\$\s*\d|\b\d+(?:[.,]\d{1,2})?\s*(?:reais|real)\b|\b(gastei|paguei|recebi|ganhei|entrou)\b/.test(text)
  if (hasMoneyValue) addScore(scoreMap, termsMap, 'create_transaction', 5, ['money'])

  const ordering = [...scoreMap.entries()].sort((a, b) => b[1] - a[1])
  if (ordering.length === 0) return { intent: 'unknown', confidence: 0.2, matchedTerms: [] }

  const [bestIntent, bestScore] = ordering[0]
  const secondScore = ordering[1]?.[1] ?? 0
  const confidence = normalizeConfidence(bestScore - secondScore + 3)
  const hasFinanceDomainWord = /\b(transacoes?|gastos?|despesas?|entradas?|receitas?|movimentacoes?|lancamentos?)\b/.test(text)

  if (bestIntent === 'analyze_transactions') {
    if (hasAny(text, balanceKeywords)) {
      return { intent: 'show_balance', confidence, matchedTerms: termsMap.get(bestIntent) ?? [] }
    }

    if (hasAny(text, summaryKeywords) || text.includes('analisar')) {
      return { intent: 'show_summary', confidence, matchedTerms: termsMap.get(bestIntent) ?? [] }
    }
  }

  if (bestIntent === 'create_transaction' && hasMoneyValue) {
    return { intent: bestIntent, confidence: Math.max(confidence, 0.75), matchedTerms: termsMap.get(bestIntent) ?? [] }
  }

  if (bestIntent === 'list_transactions' && confidence < 0.45) {
    return { intent: 'unknown', confidence, matchedTerms: termsMap.get(bestIntent) ?? [] }
  }

  if (bestIntent === 'list_transactions' && !hasFinanceDomainWord) {
    return { intent: 'unknown', confidence: Math.min(confidence, 0.3), matchedTerms: termsMap.get(bestIntent) ?? [] }
  }

  return {
    intent: confidence < 0.35 ? 'unknown' : bestIntent,
    confidence,
    matchedTerms: termsMap.get(bestIntent) ?? []
  }
}

export const detectIntent = (message: string): AssistantIntent => detectIntentDetailed(message).intent
