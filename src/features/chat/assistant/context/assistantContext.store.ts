import type { AssistantChatSessionState, AssistantEntities, AssistantIntent, MissingSlot } from '../types'

const SESSION_TTL_MS = 1000 * 60 * 30

const nowIso = (): string => new Date().toISOString()

const isExpired = (updatedAt?: string): boolean => {
  if (!updatedAt) return true
  const updated = new Date(updatedAt).getTime()
  if (!Number.isFinite(updated)) return true
  return Date.now() - updated > SESSION_TTL_MS
}

export const buildSession = (
  userId: string,
  patch: Partial<AssistantChatSessionState>
): AssistantChatSessionState => ({
  userId,
  pendingIntent: patch.pendingIntent ?? null,
  pendingSlot: patch.pendingSlot ?? null,
  slots: patch.slots ?? {},
  missingSlots: patch.missingSlots ?? [],
  lastIntent: patch.lastIntent ?? null,
  lastFilters: patch.lastFilters ?? null,
  lastResult: patch.lastResult ?? null,
  pendingAction: patch.pendingAction ?? null,
  draft: patch.draft ?? null,
  updatedAt: nowIso()
})

export const readSession = (
  session: AssistantChatSessionState | null | undefined,
  userId: string
): AssistantChatSessionState | null => {
  if (!session) return null
  if (session.userId !== userId) return null
  if (isExpired(session.updatedAt)) return null
  return session
}

export const mergeSlots = (base: AssistantEntities, next: AssistantEntities): AssistantEntities => {
  const merged: AssistantEntities = { ...base }
  for (const [key, value] of Object.entries(next) as Array<[keyof AssistantEntities, AssistantEntities[keyof AssistantEntities]]>) {
    if (value === undefined || value === null || value === '') continue
    merged[key] = value
  }
  return merged
}

export const updatePendingSession = (
  userId: string,
  intent: AssistantIntent,
  slots: AssistantEntities,
  missingSlots: MissingSlot[],
  base?: AssistantChatSessionState | null
): AssistantChatSessionState =>
  buildSession(userId, {
    ...base,
    pendingIntent: intent,
    pendingSlot: missingSlots[0] ?? null,
    slots,
    missingSlots
  })

export const clearPendingSession = (
  session: AssistantChatSessionState | null | undefined,
  userId: string
): AssistantChatSessionState | null => {
  if (!session) return null
  return buildSession(userId, {
    ...session,
    pendingIntent: null,
    pendingSlot: null,
    slots: {},
    missingSlots: [],
    pendingAction: null,
    draft: null
  })
}

