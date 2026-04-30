import { describe, expect, it } from 'vitest'
import {
  FINANCIAL_AUDIT_LOCK_MESSAGE,
  assertFinancialPeriodUnlocked,
  getFinancialAuditLockCutoffDate,
  hasLockedFinancialPeriod,
  isFinancialPeriodLocked
} from '../../../src/services/financial-audit-lock'

const aprilReferenceDate = new Date(2026, 3, 26)

describe('financial audit lock helpers', () => {
  it('usa o primeiro dia do mes atual como limite de edicao', () => {
    expect(getFinancialAuditLockCutoffDate(aprilReferenceDate)).toBe('2026-04-01')
  })

  it('bloqueia transacoes anteriores ao mes atual', () => {
    expect(isFinancialPeriodLocked('2026-03-31', aprilReferenceDate)).toBe(true)
    expect(isFinancialPeriodLocked('2026-04-01', aprilReferenceDate)).toBe(false)
    expect(isFinancialPeriodLocked('2026-05-10', aprilReferenceDate)).toBe(false)
  })

  it('detecta lotes com alguma data fechada', () => {
    expect(hasLockedFinancialPeriod(['2026-04-10', '2026-03-20'], aprilReferenceDate)).toBe(true)
    expect(hasLockedFinancialPeriod(['2026-04-10', '2026-04-20'], aprilReferenceDate)).toBe(false)
  })

  it('lanca mensagem padrao para datas fechadas', () => {
    expect(() => assertFinancialPeriodUnlocked(['2026-03-31'], aprilReferenceDate)).toThrow(
      FINANCIAL_AUDIT_LOCK_MESSAGE
    )
  })
})
