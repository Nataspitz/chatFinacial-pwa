import type { AssistantEntities, AssistantResponse } from '../types'
import { executeIntent } from './executeAssistantAction'

export const listTransactionsAction = async (
  userId: string,
  entities: AssistantEntities
): Promise<AssistantResponse> => executeIntent(userId, 'list_transactions', entities)

