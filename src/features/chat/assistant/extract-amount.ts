import { normalizeText } from './normalize-text'

const parseMoney = (raw: string): number | null => {
  const value = raw.trim()
  if (!value) return null

  const hasComma = value.includes(',')
  const hasDot = value.includes('.')
  const normalized = hasComma
    ? value.replace(/\./g, '').replace(',', '.')
    : hasDot && /^\d{1,3}(\.\d{3})+$/.test(value)
      ? value.replace(/\./g, '')
      : value
  const amount = Number(normalized)

  return Number.isFinite(amount) && amount > 0 ? amount : null
}

export const extractAmount = (message: string): number | null => {
  const text = normalizeText(message)
  const standalone = text.match(/^\s*(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[,.]\d{1,2})?)\s*(?:reais|real)?\s*$/)

  if (standalone?.[1]) {
    const amount = parseMoney(standalone[1])
    const looksLikeYear = amount !== null && Number.isInteger(amount) && amount >= 1900 && amount <= 2100
    return amount !== null && !looksLikeYear ? amount : null
  }

  const explicit = text.match(/(?:r\$\s*|valor\s+|por\s+)(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[,.]\d{1,2})?)/)
  if (explicit?.[1]) return parseMoney(explicit[1])

  const reais = text.match(/(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[,.]\d{1,2})?)\s*(?:reais|real)\b/)
  if (reais?.[1]) return parseMoney(reais[1])

  const creationVerb = text.match(/\b(?:gastei|paguei|recebi|ganhei|entrou|comprei|despesa|entrada)\b.{0,24}?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[,.]\d{1,2})?)/)
  if (creationVerb?.[1]) {
    const amount = parseMoney(creationVerb[1])
    if (amount !== null && amount < 10000) return amount
  }

  return null
}
