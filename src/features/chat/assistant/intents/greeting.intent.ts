import type { AssistantResponse } from '../types'
import { greetingResponse } from '../core/generateResponse'

export const handleGreetingIntent = (): AssistantResponse => greetingResponse()

