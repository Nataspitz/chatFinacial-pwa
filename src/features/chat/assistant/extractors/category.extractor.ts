import { normalizeText } from '../core/normalizeText'
import { categoryVocabulary } from '../vocabulary/categories.vocabulary'

const levenshtein = (a: string, b: string): number => {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i += 1) dp[i][0] = i
  for (let j = 0; j <= n; j += 1) dp[0][j] = j

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }

  return dp[m][n]
}

export const extractCategory = (message: string): string | null => {
  const text = normalizeText(message)
  if (!text) return null

  for (const item of categoryVocabulary) {
    if (item.aliases.some((alias) => text.includes(alias))) {
      return item.name
    }
  }

  const tokens = text.split(' ').filter((token) => token.length > 3)
  let best: { score: number; name: string } | null = null

  for (const token of tokens) {
    for (const item of categoryVocabulary) {
      for (const alias of item.aliases) {
        const score = levenshtein(token, alias)
        if (score <= 1 && (!best || score < best.score)) {
          best = { score, name: item.name }
        }
      }
    }
  }

  return best?.name ?? null
}

export const toCategoryHint = (category: string | null): string | null => {
  if (!category) return null

  const labels: Record<string, string> = {
    alimentacao: 'Alimentação',
    manutencao: 'Manutenção',
    moradia: 'Moradia',
    renda: 'Renda',
    reserva: 'Reserva',
    internet: 'Internet',
    mercado: 'Mercado',
    energia: 'Energia',
    agua: 'Água',
    limpeza: 'Limpeza',
    transporte: 'Transporte'
  }

  return labels[category] ?? category
}
