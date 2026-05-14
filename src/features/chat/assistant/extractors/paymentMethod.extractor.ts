import type { AssistantPaymentMethod } from '../types'
import { hasAny, normalizeText } from '../core/normalizeText'
import { paymentMethodVocabulary } from '../vocabulary/paymentMethods.vocabulary'

export const extractPaymentMethod = (message: string): AssistantPaymentMethod | null => {
  const text = normalizeText(message)
  const methods = Object.entries(paymentMethodVocabulary) as Array<[AssistantPaymentMethod, string[]]>

  for (const [method, aliases] of methods) {
    if (hasAny(text, aliases)) return method
  }

  return null
}

