export const pad2 = (value: number): string => String(value).padStart(2, '0')

export const localDateToDateOnly = (date: Date): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`

export const startOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1)

export const endOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth() + 1, 0)

export const startOfWeek = (date: Date): Date => {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  next.setDate(next.getDate() - next.getDay())
  return next
}

export const endOfWeek = (date: Date): Date => {
  const next = startOfWeek(date)
  next.setDate(next.getDate() + 6)
  return next
}

export const addDays = (date: Date, amount: number): Date => {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  next.setDate(next.getDate() + amount)
  return next
}

export const addMonths = (date: Date, amount: number): Date =>
  new Date(date.getFullYear(), date.getMonth() + amount, date.getDate())
