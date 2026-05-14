import type { AssistantPaymentMethod } from '../types'

export const paymentMethodVocabulary: Record<AssistantPaymentMethod, string[]> = {
  pix: ['pix'],
  dinheiro: ['dinheiro', 'em especie'],
  debito: ['debito', 'cartao de debito'],
  credito: ['credito', 'cartao', 'cartao de credito']
}

