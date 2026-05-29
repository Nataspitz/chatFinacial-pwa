export type GoalStatus = 'active' | 'completed' | 'deleted'
export type GoalPlanningType = 'goal' | 'reserve' | 'bill_provision'
export type GoalAllocationType = 'fixed' | 'percentage'

export interface Goal {
  id: string
  title: string
  targetAmount: number
  planningType?: GoalPlanningType
  reservedAmount?: number
  countsAsReserved?: boolean
  allocationType?: GoalAllocationType
  allocationValue?: number
  linkedCategories?: string[]
  status: GoalStatus
  isSystem: boolean
  systemKey: string | null
  createdAt?: string
  updatedAt?: string
}
