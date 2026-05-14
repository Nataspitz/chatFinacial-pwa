import { normalizeText } from '../core/normalizeText'

const CLEAN_PATTERNS = [
  /\br\$\s*\d+(?:[.,]\d{1,2})?\b/g,
  /\b\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?\s*(?:reais|real)\b/g,
  /\b\d+(?:[.,]\d{1,2})?\b/g,
  /\b(hoje|ontem|amanha|esse mes|este mes|mes passado|semana passada|dia \d{1,2})\b/g,
  /\b(gastei|paguei|recebi|ganhei|entrou|comprei|registrar|adicionar|criar|listar|mostrar|ver|analisar)\b/g
]

const CONNECTORS = /\b(com|de|do|da|dos|das|no|na|nos|nas|em|por|para)\b/g

const normalizeDescription = (value: string): string | null => {
  let next = normalizeText(value)
  for (const pattern of CLEAN_PATTERNS) {
    next = next.replace(pattern, ' ')
  }

  next = next.replace(CONNECTORS, ' ').replace(/\s+/g, ' ').trim()
  return next.length >= 2 ? next : null
}

export const extractDescription = (message: string): string | null => {
  const text = normalizeText(message)

  const specific = [
    /\b(?:com|de|do|da|no|na)\s+([a-z0-9\s]+?)(?:\s+(?:hoje|ontem|amanha)\b|$)/,
    /\bcomprei\s+([a-z0-9\s]+?)\s+por\b/,
    /\b(?:gastei|paguei|recebi|ganhei)\s+.+?\s+(?:com|de|do|da|no|na)\s+([a-z0-9\s]+)$/
  ]

  for (const pattern of specific) {
    const match = text.match(pattern)
    if (!match?.[1]) continue
    const cleaned = normalizeDescription(match[1])
    if (cleaned) return cleaned
  }

  return normalizeDescription(message)
}

