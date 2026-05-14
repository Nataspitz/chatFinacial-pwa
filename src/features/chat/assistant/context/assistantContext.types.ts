import type { AssistantChatSessionState, AssistantEntities, AssistantIntent, MissingSlot } from '../types'

export interface AssistantContextState {
  currentIntent?: AssistantIntent | null
  pendingSlot?: MissingSlot | null
  slots: AssistantEntities
  lastIntent?: AssistantIntent | null
  lastFilters?: AssistantEntities | null
  lastResult?: AssistantChatSessionState['lastResult'] | null
}

