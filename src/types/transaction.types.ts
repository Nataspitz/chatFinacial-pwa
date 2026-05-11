export type TransactionType = 'entrada' | 'saida'
export type PaymentMethod = 'credito' | 'debito' | 'pix' | 'dinheiro'

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
}
