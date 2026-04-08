import type { TransactionType } from './transaction.types'

export type ChatMessageRole = 'user' | 'assistant'

export interface ChatQuickAction {
  id: string
  label: string
  value: string
}

export interface ChatMessage {
  id: string
  role: ChatMessageRole
  content: string
  createdAt: string
  actions?: ChatQuickAction[]
}

export type GuidedEntity = 'transacao' | 'categoria'
export type GuidedAction = 'criar' | 'editar' | 'remover' | 'listar' | 'resumo'

export type GuidedStep =
  | 'idle'
  | 'main_menu'
  | 'pick_entity'
  | 'pick_action'
  | 'pick_filter_scope'
  | 'pick_filter_year'
  | 'pick_filter_month'
  | 'pick_filter_day'
  | 'pick_list_type'
  | 'pick_transaction_type'
  | 'collect_transaction_amount'
  | 'collect_transaction_category'
  | 'collect_transaction_description'
  | 'pick_transaction_payment_method'
  | 'collect_transaction_installment_count'
  | 'pick_transaction_monthly_cost'
  | 'pick_transaction_date'
  | 'collect_transaction_custom_date'
  | 'pick_transaction_target'
  | 'pick_transaction_edit_field'
  | 'collect_transaction_edit_value'
  | 'pick_transaction_edit_payment_method'
  | 'collect_transaction_edit_installment_count'
  | 'pick_transaction_edit_monthly_cost'
  | 'confirm_transaction_delete'
  | 'pick_category_type'
  | 'collect_category_name'
  | 'pick_category_target'
  | 'collect_category_new_name'
  | 'confirm_category_delete'

export interface GuidedOptionItem {
  id: string
  label: string
  entity: 'transaction' | 'category'
  type?: TransactionType
}

export interface GuidedDraft {
  listType?: 'all' | 'entrada' | 'saida'
  periodScope?: 'all' | 'year' | 'month' | 'day'
  periodYear?: string
  periodMonth?: string
  periodDay?: string
  transactionType?: TransactionType
  amount?: number
  categoryName?: string
  description?: string
  paymentMethod?: 'credito' | 'debito' | 'pix' | 'dinheiro'
  installmentCount?: number
  isMonthlyCost?: boolean
  date?: string
  targetId?: string
  targetLabel?: string
  editField?: 'amount' | 'category' | 'description' | 'date' | 'paymentMethod' | 'isMonthlyCost' | 'isConfirmed'
}

export interface ChatSessionState {
  step: GuidedStep
  entity?: GuidedEntity
  action?: GuidedAction
  draft?: GuidedDraft
  options?: GuidedOptionItem[]
}

export interface ChatReply {
  content: string
  actions?: ChatQuickAction[]
  nextSession?: ChatSessionState
}
