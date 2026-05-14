import type { AssistantEntities, AssistantResponse } from '../types'
import { executeIntent } from './executeAssistantAction'

export const createTransactionAction = async (
  userId: string,
  entities: AssistantEntities
): Promise<AssistantResponse> => executeIntent(userId, 'create_transaction', entities)

