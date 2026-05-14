import type { AssistantEntities, AssistantIntent, AssistantResponse } from '../types'
import { executeIntent } from '../actions/executeAssistantAction'

export const handleCreateTransactionIntent = async (
  userId: string,
  intent: AssistantIntent,
  entities: AssistantEntities
): Promise<AssistantResponse> => executeIntent(userId, intent, entities)

