import { afterEach, describe, expect, it } from 'vitest'
import {
  FINANCIAL_AUDIT_LOCK_MESSAGE,
  assertFinancialPeriodUnlocked,
  getFinancialAuditLockCutoffDate,
  hasLockedFinancialPeriod,
  isFinancialPeriodLocked,
  setFinancialAuditLockedPeriods
} from '../../../src/services/financial-audit-lock'

const aprilReferenceDate = new Date(2026, 3, 26)

describe('financial audit lock helpers', () => {
  afterEach(() => {
    setFinancialAuditLockedPeriods([])
  })

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

  it('bloqueia datas dentro de fatias de auditoria confirmadas', () => {
    setFinancialAuditLockedPeriods([{ startDate: '2026-05-01', endDate: '2026-05-10' }])

    expect(isFinancialPeriodLocked('2026-05-01', new Date(2026, 4, 11))).toBe(true)
    expect(isFinancialPeriodLocked('2026-05-10', new Date(2026, 4, 11))).toBe(true)
    expect(isFinancialPeriodLocked('2026-05-11', new Date(2026, 4, 11))).toBe(false)
  })

  it('mantem datas atuais e futuras liberadas depois da primeira fatia auditada', () => {
    setFinancialAuditLockedPeriods([{ startDate: '2026-05-01', endDate: '2026-05-10' }])

    expect(isFinancialPeriodLocked('2026-05-12', new Date(2026, 4, 12))).toBe(false)
    expect(isFinancialPeriodLocked('2026-05-25', new Date(2026, 4, 12))).toBe(false)
    expect(isFinancialPeriodLocked('2026-06-01', new Date(2026, 4, 12))).toBe(false)
  })

  it('avanca a data minima de criacao quando o inicio do mes atual ja foi auditado', () => {
    setFinancialAuditLockedPeriods([{ startDate: '2026-05-01', endDate: '2026-05-10' }])

    expect(getFinancialAuditLockCutoffDate(new Date(2026, 4, 11))).toBe('2026-05-11')
  })
})
