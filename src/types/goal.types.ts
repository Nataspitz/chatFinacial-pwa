export type GoalStatus = 'active' | 'completed' | 'deleted'

export interface Goal {
  id: string
  title: string
  targetAmount: number
  status: GoalStatus
  isSystem: boolean
  systemKey: string | null
  createdAt?: string
  updatedAt?: string
}

