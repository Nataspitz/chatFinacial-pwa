import { useEffect, useMemo, useState } from 'react'
import { financialAuditService } from '../../../services/financial-audit.service'
import type { FinancialAudit } from '../../../types/financial-audit.types'
import {
  buildAuditHistory,
  mapAuditSlices,
  mapUpcomingMandatorySlices
} from '../auditoria.utils'

export const useAuditoriaData = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeAudits, setActiveAudits] = useState<FinancialAudit[]>([])
  const [historyAudits, setHistoryAudits] = useState<FinancialAudit[]>([])

  const activeMonth = useMemo(() => financialAuditService.getActiveMonth(), [])
  const mandatoryMonth = financialAuditService.mandatoryStartMonth
  const isActiveMonthMandatory = financialAuditService.isMonthMandatory(activeMonth)

  useEffect(() => {
    void (async () => {
      setIsLoading(true)
      setError('')

      try {
        const activePromise = isActiveMonthMandatory
          ? financialAuditService.ensureAuditsForMonth(activeMonth)
          : Promise.resolve([])

        const [activeRows, historyRows] = await Promise.all([activePromise, financialAuditService.getHistory()])
        setActiveAudits(activeRows)
        setHistoryAudits(historyRows)
      } catch {
        setError('Não foi possível carregar a visão de auditoria.')
      } finally {
        setIsLoading(false)
      }
    })()
  }, [activeMonth, isActiveMonthMandatory])

  const activeSlices = useMemo(
    () => (isActiveMonthMandatory ? mapAuditSlices(activeAudits) : []),
    [activeAudits, isActiveMonthMandatory]
  )

  const upcomingMandatorySlices = useMemo(
    () => (isActiveMonthMandatory ? [] : mapUpcomingMandatorySlices(mandatoryMonth)),
    [isActiveMonthMandatory, mandatoryMonth]
  )

  const historyByMonth = useMemo(() => buildAuditHistory(historyAudits), [historyAudits])

  return {
    activeMonth,
    mandatoryMonth,
    isActiveMonthMandatory,
    isLoading,
    error,
    activeSlices,
    upcomingMandatorySlices,
    historyByMonth
  }
}
