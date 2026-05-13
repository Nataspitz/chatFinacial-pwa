export const removeDiacritics = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export const normalizeSpaces = (value: string): string => value.replace(/\s+/g, ' ').trim()

export const normalizeText = (message: string): string =>
  normalizeSpaces(removeDiacritics(message.toLowerCase()))

export const hasAny = (text: string, keywords: string[]): boolean =>
  keywords.some((keyword) => text.includes(normalizeText(keyword)))

export const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
