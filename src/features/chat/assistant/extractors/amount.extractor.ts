import { normalizeText } from '../core/normalizeText'

const moneyPattern = /\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?/g

const parseMoney = (raw: string): number | null => {
  const value = raw.trim()
  if (!value) return null

  const normalized = value.includes(',')
    ? value.replace(/\./g, '').replace(',', '.')
    : value.match(/^\d{1,3}(\.\d{3})+$/)
      ? value.replace(/\./g, '')
      : value
  const amount = Number(normalized)
  if (!Number.isFinite(amount) || amount <= 0) return null
  return amount
}

const looksLikeYear = (value: number): boolean =>
  Number.isInteger(value) && value >= 1900 && value <= 2100

export const extractAmount = (message: string): number | null => {
  const text = normalizeText(message)

  const explicit = text.match(/r\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/)
  if (explicit?.[1]) return parseMoney(explicit[1])

  const withCurrencyWord = text.match(/(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:reais|real)\b/)
  if (withCurrencyWord?.[1]) return parseMoney(withCurrencyWord[1])

  const actionProximity = text.match(
    /\b(?:gastei|paguei|recebi|ganhei|entrou|comprei|registrar|adicionar|valor|por)\b[^0-9]{0,15}(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/
  )
  if (actionProximity?.[1]) {
    const amount = parseMoney(actionProximity[1])
    return amount !== null && !looksLikeYear(amount) ? amount : null
  }

  const numbers = text.match(moneyPattern) ?? []
  for (const raw of numbers) {
    const amount = parseMoney(raw)
    if (amount !== null && !looksLikeYear(amount)) return amount
  }

  return null
}
