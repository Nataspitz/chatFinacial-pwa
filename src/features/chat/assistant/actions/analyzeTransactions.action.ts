import type { AssistantEntities, AssistantIntent, AssistantResponse } from '../types'
import { executeIntent } from './executeAssistantAction'

export const analyzeTransactionsAction = async (
  userId: string,
  intent: AssistantIntent,
  entities: AssistantEntities
): Promise<AssistantResponse> => {
  const resolvedIntent = intent === 'show_balance' ? 'show_balance' : 'show_summary'
  return executeIntent(userId, resolvedIntent, entities)
}

