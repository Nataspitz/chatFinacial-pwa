import type { Transaction } from '../../../types/transaction.types'

export type AssistantIntent =
  | 'greeting'
  | 'list_transactions'
  | 'create_transaction'
  | 'analyze_transactions'
  | 'show_balance'
  | 'show_summary'
  | 'help'
  | 'confirmation'
  | 'cancellation'
  | 'unknown'

export type AssistantTransactionType = 'income' | 'expense'
export type AssistantPaymentMethod = 'pix' | 'dinheiro' | 'debito' | 'credito'

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
  paymentMethod?: AssistantPaymentMethod
  minAmount?: number
  maxAmount?: number
  categoryId?: string | null
  categoryHint?: string | null
}

export type MissingSlot = 'period' | 'amount' | 'type' | 'description' | 'date' | 'paymentMethod'

export interface TransactionDraft {
  type: AssistantTransactionType
  amount: number
  description: string
  date: string
  paymentMethod?: AssistantPaymentMethod
  categoryId?: string | null
  categoryHint?: string | null
}

export interface AssistantChatSessionState {
  userId: string
  pendingIntent: AssistantIntent | null
  pendingSlot?: MissingSlot | null
  slots: AssistantEntities
  missingSlots: MissingSlot[]
  lastIntent?: AssistantIntent | null
  lastFilters?: AssistantEntities | null
  lastResult?: {
    count?: number
    period?: AssistantPeriod
  } | null
  pendingAction?: 'create_draft' | null
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
      quickActions?: AssistantQuickAction[]
    }
  | {
      type: 'question'
      message: string
      missingSlot?: MissingSlot
      quickActions?: AssistantQuickAction[]
    }
  | {
      type: 'transactions_list'
      message: string
      data: Transaction[]
      period?: AssistantPeriod
      quickActions?: AssistantQuickAction[]
    }
  | {
      type: 'transaction_draft'
      message: string
      draft: TransactionDraft
      quickActions?: AssistantQuickAction[]
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
      quickActions?: AssistantQuickAction[]
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
      quickActions?: AssistantQuickAction[]
    }

export interface AssistantQuickAction {
  label: string
  value: string
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
