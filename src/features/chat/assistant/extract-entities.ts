import type { AssistantEntities, AssistantIntent } from './types'
import { extractSlots } from './core/extractSlots'

export const extractEntities = (
  message: string,
  intent: AssistantIntent,
  referenceDate = new Date()
): AssistantEntities => extractSlots(message, intent, referenceDate)
