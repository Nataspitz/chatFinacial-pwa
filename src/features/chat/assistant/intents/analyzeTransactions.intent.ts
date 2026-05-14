import type { AssistantEntities, AssistantResponse } from '../types'
import { executeIntent } from '../actions/executeAssistantAction'

export const handleAnalyzeTransactionsIntent = async (
  userId: string,
  intent: 'show_summary' | 'show_balance' | 'analyze_transactions',
  entities: AssistantEntities
): Promise<AssistantResponse> =>
  executeIntent(userId, intent === 'analyze_transactions' ? 'show_summary' : intent, entities)

