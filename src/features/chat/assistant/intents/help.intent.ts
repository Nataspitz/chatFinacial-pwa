import type { AssistantResponse } from '../types'
import { helpResponse } from '../core/generateResponse'

export const handleHelpIntent = (): AssistantResponse => helpResponse()

