import type { Transaction } from '../../../types/transaction.types'

export type AssistantIntent =
  | 'list_transactions'
  | 'create_transaction'
  | 'show_balance'
  | 'show_summary'
  | 'unknown'

export type AssistantTransactionType = 'income' | 'expense'

export interface AssistantPeriod {
  start: string
  end: string
  label?: string
}

export interface AssistantEntities {
  period?: AssistantPeriod
  amount?: number
  type?: AssistantTransactionType
  description?: string
  date?: string
  categoryId?: string | null
  categoryHint?: string | null
}

export type MissingSlot = 'period' | 'amount' | 'type' | 'description' | 'date'

export interface TransactionDraft {
  type: AssistantTransactionType
  amount: number
  description: string
  date: string
  categoryId?: string | null
  categoryHint?: string | null
}

export interface AssistantChatSessionState {
  userId: string
  pendingIntent: AssistantIntent | null
  slots: AssistantEntities
  missingSlots: MissingSlot[]
  draft?: TransactionDraft | null
  updatedAt: string
}

export interface SummaryCategoryTotal {
  category: string
  incomeTotal: number
  expenseTotal: number
  balance: number
  transactionCount: number
}

export type AssistantResponse =
  | {
      type: 'text'
      message: string
    }
  | {
      type: 'question'
      message: string
      missingSlot?: MissingSlot
    }
  | {
      type: 'transactions_list'
      message: string
      data: Transaction[]
      period?: AssistantPeriod
    }
  | {
      type: 'transaction_draft'
      message: string
      draft: TransactionDraft
    }
  | {
      type: 'summary'
      message: string
      data: {
        incomeTotal: number
        expenseTotal: number
        balance: number
        transactionCount: number
        byCategory?: SummaryCategoryTotal[]
      }
      period?: AssistantPeriod
    }
  | {
      type: 'balance'
      message: string
      data: {
        incomeTotal: number
        expenseTotal: number
        balance: number
      }
      period?: AssistantPeriod
    }

export interface HandleChatMessageParams {
  userId: string
  message: string
  session: AssistantChatSessionState | null
  referenceDate?: Date
}

export interface HandleChatMessageResult {
  response: AssistantResponse
  session: AssistantChatSessionState | null
}
