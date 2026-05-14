import type { AssistantResponse } from '../types'
import { unknownResponse } from '../core/generateResponse'

export const handleUnknownIntent = (): AssistantResponse => unknownResponse()

