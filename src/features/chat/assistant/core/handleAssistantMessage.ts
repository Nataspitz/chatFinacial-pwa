import { createTransactionFromDraft, executeIntent } from '../actions/executeAssistantAction'
import { buildSession, clearPendingSession, mergeSlots, readSession, updatePendingSession } from '../context/assistantContext.store'
import { handleGreetingIntent } from '../intents/greeting.intent'
import { handleHelpIntent } from '../intents/help.intent'
import { handleUnknownIntent } from '../intents/unknown.intent'
import type {
  AssistantChatSessionState,
  AssistantEntities,
  AssistantIntent,
  AssistantPeriod,
  AssistantResponse,
  HandleChatMessageParams,
  HandleChatMessageResult
} from '../types'
import { detectIntentDetailed } from './detectIntent'
import { extractSlots } from './extractSlots'
import { confirmDraftResponse } from './generateResponse'
import { normalizeText } from './normalizeText'
import { askForMissingSlot, getMissingSlots } from './resolveMissingSlots'

const CANCEL_WORDS = ['cancelar', 'cancela', 'deixa pra la', 'esquece', 'parar', 'deixa', 'nao quero mais']
const CONFIRM_WORDS = ['sim', 'confirmar', 'confirma', 'pode criar', 'isso', 'ok', 'confirmo']
const HELLO_WORDS = ['oi', 'ola', 'bom dia', 'boa tarde', 'boa noite']

const isCommand = (message: string, commands: string[]): boolean => {
  const text = normalizeText(message)
  return commands.some((command) => text === command || text.startsWith(`${command} `))
}

const hasListFilter = (slots: AssistantEntities): boolean =>
  Boolean(
    slots.period ||
      slots.type ||
      slots.categoryHint ||
      slots.description ||
      slots.paymentMethod ||
      slots.minAmount ||
      slots.maxAmount
  )

const monthPeriod = (referenceDate: Date): AssistantPeriod => {
  const year = referenceDate.getFullYear()
  const month = String(referenceDate.getMonth() + 1).padStart(2, '0')
  const start = `${year}-${month}-01`
  const endDate = new Date(year, referenceDate.getMonth() + 1, 0).getDate()
  const end = `${year}-${month}-${String(endDate).padStart(2, '0')}`
  return { start, end, label: 'este mês' }
}

const buildContextSession = (
  userId: string,
  base: AssistantChatSessionState | null,
  intent: AssistantIntent,
  filters: AssistantEntities,
  count?: number
): AssistantChatSessionState =>
  buildSession(userId, {
    ...(base ?? undefined),
    pendingIntent: null,
    pendingSlot: null,
    slots: {},
    missingSlots: [],
    draft: null,
    pendingAction: null,
    lastIntent: intent,
    lastFilters: filters,
    lastResult: filters.period ? { count, period: filters.period } : { count }
  })

const buildQuestion = (
  userId: string,
  intent: AssistantIntent,
  slots: AssistantEntities,
  message: string,
  missingSlots: AssistantChatSessionState['missingSlots']
): HandleChatMessageResult => ({
  response: {
    type: 'question',
    message,
    missingSlot: missingSlots[0],
    quickActions:
      missingSlots[0] === 'period'
        ? [
            { label: 'Este mês', value: 'este mes' },
            { label: 'Mês passado', value: 'mes passado' }
          ]
        : undefined
  },
  session: updatePendingSession(userId, intent, slots, missingSlots)
})

const shouldUseContext = (message: string): boolean => {
  const text = normalizeText(message)
  return (
    text.startsWith('so as') ||
    text.startsWith('só as') ||
    /^dia\s+\d{1,2}\b/.test(text) ||
    text.startsWith('e do dia') ||
    text.startsWith('do dia') ||
    text.startsWith('e de') ||
    text.startsWith('e so') ||
    text.includes('desse periodo') ||
    text.includes('deste periodo')
  )
}

const keepContext = (intent: AssistantIntent): boolean =>
  intent === 'list_transactions' || intent === 'show_summary' || intent === 'show_balance'

export const handleAssistantMessage = async ({
  userId,
  message,
  session,
  referenceDate = new Date()
}: HandleChatMessageParams): Promise<HandleChatMessageResult> => {
  const text = normalizeText(message)
  const currentSession = readSession(session, userId)

  if (!text) {
    return {
      response: { type: 'text', message: 'Digite uma mensagem para continuar.' },
      session: currentSession
    }
  }

  if (currentSession?.draft) {
    if (isCommand(text, CONFIRM_WORDS)) {
      const response = await createTransactionFromDraft(userId, currentSession.draft)
      const nextSession = clearPendingSession(currentSession, userId)
      return {
        response,
        session: buildSession(userId, {
          ...(nextSession ?? undefined),
          lastIntent: 'create_transaction',
          lastFilters: currentSession.slots
        })
      }
    }

    if (isCommand(text, CANCEL_WORDS)) {
      return {
        response: { type: 'text', message: 'Ação cancelada.' },
        session: clearPendingSession(currentSession, userId)
      }
    }

    return {
      response: confirmDraftResponse(),
      session: currentSession
    }
  }

  if (isCommand(text, CANCEL_WORDS)) {
    return {
      response: { type: 'text', message: 'Ação cancelada.' },
      session: clearPendingSession(currentSession, userId)
    }
  }

  if (isCommand(text, HELLO_WORDS)) {
    return { response: handleGreetingIntent(), session: currentSession }
  }

  if (currentSession?.pendingIntent) {
    const mergedSlots = mergeSlots(
      currentSession.slots,
      extractSlots(message, currentSession.pendingIntent, referenceDate)
    )
    const missingSlots = getMissingSlots(currentSession.pendingIntent, mergedSlots)

    if (missingSlots.length > 0) {
      return buildQuestion(
        userId,
        currentSession.pendingIntent,
        mergedSlots,
        askForMissingSlot(missingSlots[0], currentSession.pendingIntent),
        missingSlots
      )
    }

    const response = await executeIntent(userId, currentSession.pendingIntent, mergedSlots)
    if (response.type === 'transaction_draft') {
      return {
        response,
        session: buildSession(userId, {
          ...currentSession,
          pendingIntent: 'create_transaction',
          pendingAction: 'create_draft',
          slots: mergedSlots,
          missingSlots: [],
          draft: response.draft
        })
      }
    }

    return {
      response,
      session: keepContext(currentSession.pendingIntent)
        ? buildContextSession(
            userId,
            currentSession,
            currentSession.pendingIntent,
            mergedSlots,
            response.type === 'transactions_list' ? response.data.length : undefined
          )
        : clearPendingSession(currentSession, userId)
    }
  }

  const detected = detectIntentDetailed(message)
  let intent = detected.intent
  let slots = extractSlots(message, intent, referenceDate)

  if (intent === 'unknown' && shouldUseContext(message) && currentSession?.lastIntent && currentSession.lastFilters) {
    intent = currentSession.lastIntent
    slots = mergeSlots(currentSession.lastFilters, extractSlots(message, intent, referenceDate))
  }

  if (intent === 'help') {
    return { response: handleHelpIntent(), session: currentSession }
  }

  if (intent === 'confirmation') {
    return {
      response: {
        type: 'text',
        message: 'Não há nenhuma ação pendente para confirmar agora.',
        quickActions: [{ label: 'Criar transação', value: 'criar uma transacao' }]
      },
      session: currentSession
    }
  }

  if (intent === 'cancellation') {
    return {
      response: { type: 'text', message: 'Tudo certo. Nenhuma ação pendente foi alterada.' },
      session: currentSession
    }
  }

  if (intent === 'unknown') {
    return { response: handleUnknownIntent(), session: currentSession }
  }

  if (intent === 'show_summary' || intent === 'show_balance' || intent === 'analyze_transactions') {
    if (!hasListFilter(slots)) {
      slots = { ...slots, period: monthPeriod(referenceDate) }
    }
  }

  if (intent === 'list_transactions' && !hasListFilter(slots)) {
    return {
      response: {
        type: 'question',
        message: 'Você quer listar todas as transações ou prefere filtrar por período, categoria ou tipo?',
        quickActions: [
          { label: 'Listar todas', value: 'listar todas' },
          { label: 'Este mês', value: 'listar transacoes deste mes' }
        ]
      },
      session: updatePendingSession(userId, intent, slots, [])
    }
  }

  const missingSlots = getMissingSlots(intent, slots)
  if (missingSlots.length > 0) {
    return buildQuestion(userId, intent, slots, askForMissingSlot(missingSlots[0], intent), missingSlots)
  }

  const response = await executeIntent(userId, intent, slots)
  if (response.type === 'transaction_draft') {
    return {
      response,
      session: buildSession(userId, {
        ...currentSession,
        pendingIntent: 'create_transaction',
        pendingAction: 'create_draft',
        slots,
        missingSlots: [],
        draft: response.draft
      })
    }
  }

  return {
    response,
    session: keepContext(intent)
      ? buildContextSession(
          userId,
          currentSession,
          intent,
          slots,
          response.type === 'transactions_list' ? response.data.length : undefined
        )
      : currentSession
  }
}
