export type TransactionType = 'entrada' | 'saida'
export type PaymentMethod = 'credito' | 'debito' | 'pix' | 'dinheiro'
export type TransactionStatus = 'active' | 'confirmed' | 'scheduled' | 'refunded' | 'canceled' | string
export type RefundScope = 'single' | 'future' | 'group'

export interface Transaction {
  id: string
  type: TransactionType
  category: string
  amount: number
  description: string
  date: string
  createdAt?: string
  isConfirmed: boolean
  confirmedAt?: string | null
  isMonthlyCost: boolean
  paymentMethod: PaymentMethod
  installmentGroupId: string | null
  installmentNumber: number
  installmentCount: number
  totalAmount: number
  isInstallment: boolean
  monthlyEndDate?: string | null
  monthlyCostStartDate?: string
  status?: TransactionStatus
  refundedAt?: string | null
  refundReason?: string | null
  refundScope?: RefundScope | null
  canceledAt?: string | null
  cancelReason?: string | null
  ignoredInReports?: boolean
  reimbursedAt?: string | null
  reimbursementResponsible?: string | null
  reimbursementNotes?: string | null
  deletedAt?: string | null
}
