import { normalizeText } from './normalize-text'

const CONNECTOR_PATTERN = /\b(no|na|nos|nas|de|do|da|dos|das|com|em|para|por)\b/g
const MONEY_PATTERN = /\br\$\s*\d+(?:[.,]\d{1,2})?|\b\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?\s*(?:reais|real)?\b/g
const DATE_WORDS_PATTERN = /\b(hoje|ontem|amanha|amanhã|esse mes|este mes|mes atual|mes passado|mes que vem|essa semana|esta semana|semana passada|esse ano|este ano|ano passado)\b/g
const COMMAND_WORDS_PATTERN =
  /\b(quero|queria|listar|mostrar|ver|transacoes|transacao|lancamentos|lancamento|gastei|gasto|gastos|paguei|pagamento|comprei|compra|recebi|ganhei|ganho|entrou|entrada|entradas|registrar|adicionar|despesa|despesas|saida|saidas|valor)\b/g

const DESCRIPTION_ACCENTS: Record<string, string> = {
  agua: 'água',
  alimentacao: 'alimentação',
  almoco: 'almoço',
  onibus: 'ônibus',
  salario: 'salário'
}

const restoreKnownAccents = (value: string): string => DESCRIPTION_ACCENTS[value] ?? value

const cleanDescription = (value: string): string | null => {
  const cleaned = normalizeText(value)
    .replace(MONEY_PATTERN, ' ')
    .replace(DATE_WORDS_PATTERN, ' ')
    .replace(COMMAND_WORDS_PATTERN, ' ')
    .replace(CONNECTOR_PATTERN, ' ')
    .replace(/\b(dia|mes|ano)\b/g, ' ')
    .replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, ' ')
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned || cleaned.length < 2) {
    return null
  }

  return restoreKnownAccents(cleaned)
}

export const extractDescription = (message: string): string | null => {
  const text = normalizeText(message)

  const targetedPatterns = [
    /\b(?:no|na|nos|nas|com|de|do|da|dos|das)\s+([a-z0-9\sç]+?)\s*(?:hoje|ontem|por|r\$|\d|$)/,
    /\bcomprei\s+([a-z0-9\sç]+?)\s+por\b/,
    /\b(?:gastei|paguei|recebi|ganhei|registrar|adicionar)\b.+?\b(?:no|na|com|de|do|da)\s+([a-z0-9\sç]+)$/
  ]

  for (const pattern of targetedPatterns) {
    const match = text.match(pattern)
    const candidate = match?.[1] ? cleanDescription(match[1]) : null
    if (candidate) {
      return candidate
    }
  }

  return cleanDescription(message)
}

export const extractCategoryHint = (message: string): string | null => {
  const text = normalizeText(message)

  if (/\b(mercado|supermercado|ifood|restaurante|almoco|lanche|pizza)\b/.test(text)) return 'Alimentação'
  if (/\b(uber|99|onibus|metro|gasolina|transporte)\b/.test(text)) return 'Transporte'
  if (/\b(aluguel|condominio|moradia)\b/.test(text)) return 'Moradia'
  if (/\b(internet|luz|energia|agua|conta|contas)\b/.test(text)) return 'Contas'
  if (/\b(salario|freela|renda|pagamento recebido|pix recebido)\b/.test(text)) return 'Renda'

  return null
}
