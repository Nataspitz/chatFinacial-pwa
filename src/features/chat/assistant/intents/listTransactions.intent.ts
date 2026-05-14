import type { AssistantEntities, AssistantResponse } from '../types'
import { executeIntent } from '../actions/executeAssistantAction'

export const handleListTransactionsIntent = async (
  userId: string,
  entities: AssistantEntities
): Promise<AssistantResponse> => executeIntent(userId, 'list_transactions', entities)

