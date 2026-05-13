import { detectIntent } from './detect-intent'
import { createTransactionFromDraft, executeIntent } from './execute-intent'
import { extractEntities } from './extract-entities'
import { askForMissingSlot, getMissingSlots } from './slot-filling'
import { normalizeText } from './normalize-text'
import type { AssistantChatSessionState, AssistantEntities, AssistantResponse, HandleChatMessageParams, HandleChatMessageResult } from './types'

const CANCEL_WORDS = ['cancelar', 'cancela', 'deixa pra la', 'esquece', 'parar', 'nao quero mais']
const CONFIRM_WORDS = ['sim', 'confirmar', 'confirma', 'pode criar', 'criar', 'ok']

const isAnyCommand = (message: string, commands: string[]): boolean => {
  const text = normalizeText(message)
  return commands.some((command) => text === command || text.includes(command))
}

const mergeEntities = (base: AssistantEntities, next: AssistantEntities): AssistantEntities => {
  const merged = { ...base }

  Object.entries(next).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      Object.assign(merged, { [key]: value })
    }
  })

  return merged
}

const buildSession = (
  userId: string,
  session: Partial<AssistantChatSessionState>
): AssistantChatSessionState => ({
  userId,
  pendingIntent: session.pendingIntent ?? null,
  slots: session.slots ?? {},
  missingSlots: session.missingSlots ?? [],
  draft: session.draft ?? null,
  updatedAt: new Date().toISOString()
})

const questionResult = (
  userId: string,
  response: AssistantResponse,
  session: Partial<AssistantChatSessionState>
): HandleChatMessageResult => ({
  response,
  session: buildSession(userId, session)
})

const clearResult = (response: AssistantResponse): HandleChatMessageResult => ({
  response,
  session: null
})

export const handleChatMessage = async ({
  userId,
  message,
  session,
  referenceDate = new Date()
}: HandleChatMessageParams): Promise<HandleChatMessageResult> => {
  const text = normalizeText(message)

  if (!text) {
    return clearResult({ type: 'text', message: 'Digite uma mensagem para continuar.' })
  }

  if (isAnyCommand(text, CANCEL_WORDS)) {
    return clearResult({ type: 'text', message: 'Ação cancelada.' })
  }

  if (session?.draft) {
    if (isAnyCommand(text, CONFIRM_WORDS)) {
      try {
        return clearResult(await createTransactionFromDraft(userId, session.draft))
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'Erro inesperado.'
        return clearResult({ type: 'text', message: `Não foi possível criar a transação. Detalhe: ${detail}` })
      }
    }

    return questionResult(
      userId,
      {
        type: 'question',
        message: 'Você quer confirmar ou cancelar essa transação?'
      },
      session
    )
  }

  const pendingIntent = session?.pendingIntent
  if (pendingIntent) {
    const nextEntities = extractEntities(message, pendingIntent, referenceDate)
    const slots = mergeEntities(session.slots, nextEntities)
    const missingSlots = getMissingSlots(pendingIntent, slots)

    if (missingSlots.length > 0) {
      const missingSlot = missingSlots[0]
      return questionResult(
        userId,
        {
          type: 'question',
          message: askForMissingSlot(missingSlot, pendingIntent),
          missingSlot
        },
        { pendingIntent, slots, missingSlots }
      )
    }

    try {
      const response = await executeIntent(userId, pendingIntent, slots)
      if (response.type === 'transaction_draft') {
        return questionResult(userId, response, {
          pendingIntent,
          slots,
          missingSlots: [],
          draft: response.draft
        })
      }
      return clearResult(response)
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Erro inesperado.'
      return clearResult({ type: 'text', message: `Não consegui executar a ação. Detalhe: ${detail}` })
    }
  }

  const intent = detectIntent(message)
  if (intent === 'unknown') {
    return clearResult({
      type: 'text',
      message:
        "Não entendi o que você quer fazer. Tente algo como: 'listar transações de março de 2026', 'gastei 50 no mercado ontem' ou 'resumo desse mês'."
    })
  }

  const entities = extractEntities(message, intent, referenceDate)
  const missingSlots = getMissingSlots(intent, entities)
  if (missingSlots.length > 0) {
    const missingSlot = missingSlots[0]
    return questionResult(
      userId,
      {
        type: 'question',
        message: askForMissingSlot(missingSlot, intent),
        missingSlot
      },
      { pendingIntent: intent, slots: entities, missingSlots }
    )
  }

  try {
    const response = await executeIntent(userId, intent, entities)
    if (response.type === 'transaction_draft') {
      return questionResult(userId, response, {
        pendingIntent: intent,
        slots: entities,
        missingSlots: [],
        draft: response.draft
      })
    }
    return clearResult(response)
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Erro inesperado.'
    return clearResult({ type: 'text', message: `Não consegui executar a ação. Detalhe: ${detail}` })
  }
}
