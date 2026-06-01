import { useCallback, useEffect, useMemo, useState } from 'react'
import { financialAuditService } from '../../../services/financial-audit.service'
import type { FinancialAudit } from '../../../types/financial-audit.types'
import type { AuditSliceCardItem } from '../auditoria.utils'
import {
  buildAuditHistory,
  getPendingAuditActionRows,
  mapAuditSlices,
  mapUpcomingMandatorySlices
} from '../auditoria.utils'

export const useAuditoriaData = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [certificateFeedback, setCertificateFeedback] = useState('')
  const [certificateFeedbackTone, setCertificateFeedbackTone] = useState<'success' | 'error'>('success')
  const [uploadingCertificateKey, setUploadingCertificateKey] = useState<string | null>(null)
  const [activeAudits, setActiveAudits] = useState<FinancialAudit[]>([])
  const [historyAudits, setHistoryAudits] = useState<FinancialAudit[]>([])

  const activeMonth = useMemo(() => financialAuditService.getActiveMonth(), [])
  const mandatoryMonth = financialAuditService.mandatoryStartMonth
  const isActiveMonthMandatory = financialAuditService.isMonthMandatory(activeMonth)

  const loadAudits = useCallback(async (): Promise<void> => {
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
  }, [activeMonth, isActiveMonthMandatory])

  useEffect(() => {
    void loadAudits()
  }, [loadAudits])

  const handleUploadCertificate = async (item: AuditSliceCardItem, file: File): Promise<void> => {
    setCertificateFeedback('')
    setCertificateFeedbackTone('success')
    setUploadingCertificateKey(item.key)

    try {
      await financialAuditService.confirmAuditSliceWithCertificate(
        {
          monthRef: item.monthRef,
          auditSlice: item.auditSlice
        },
        file
      )
      setCertificateFeedback('Certificado enviado e auditoria confirmada.')
      setCertificateFeedbackTone('success')
      await loadAudits()
    } catch (uploadError) {
      const message = uploadError instanceof Error && uploadError.message ? uploadError.message : 'Certificado recusado. Verifique o arquivo JSON e tente novamente.'
      setCertificateFeedbackTone('error')
      setCertificateFeedback(message)
    } finally {
      setUploadingCertificateKey(null)
    }
  }

  const activeSlices = useMemo(
    () => (
      isActiveMonthMandatory
        ? mapAuditSlices(getPendingAuditActionRows([...historyAudits, ...activeAudits]))
        : []
    ),
    [activeAudits, historyAudits, isActiveMonthMandatory]
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
    certificateFeedback,
    certificateFeedbackTone,
    uploadingCertificateKey,
    activeSlices,
    upcomingMandatorySlices,
    historyByMonth,
    handleUploadCertificate
  }
}
