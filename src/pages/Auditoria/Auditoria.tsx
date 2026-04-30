import { useEffect, useMemo, useState } from 'react'
import { FiCalendar, FiClock, FiExternalLink, FiShield, FiSlash } from 'react-icons/fi'
import { PageIntro } from '../../components/molecules/PageIntro/PageIntro'
import { PageTemplate } from '../../components/templates/PageTemplate/PageTemplate'
import { financialAuditService } from '../../services/financial-audit.service'
import type { FinancialAudit } from '../../types/financial-audit.types'
import styles from './Auditoria.module.css'

interface SlicePlan {
  auditSlice: 1 | 2 | 3
  periodStart: string
  periodEnd: string
  unlockAt: string
}

type HistoryStateTone = 'pending' | 'confirmed' | 'partial' | 'skipped'

interface HistoryMonthItem {
  monthRef: string
  tone: HistoryStateTone
  label: string
  detail: string
  confirmedCount: number
  totalCount: number
}

const APRIL_2026 = '2026-04-01'
const AUDITOR_AGENT_URL = 'https://chatgpt.com/g/g-69ee3a17ba28819189e965fe55a2e163-chatfinancial-auditor'

const normalizeDate = (value: string): string => value.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? value

const formatDate = (value: string): string => {
  const normalized = normalizeDate(value)
  const [year, month, day] = normalized.split('-').map(Number)
  const local = new Date(year, month - 1, day)
  return new Intl.DateTimeFormat('pt-BR').format(local)
}

const formatMonthLabel = (monthRef: string): string => {
  const normalized = normalizeDate(monthRef)
  const [year, month] = normalized.split('-').map(Number)
  const local = new Date(year, month - 1, 1)
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(local)
}

const buildSlicesForMonth = (monthRef: string): SlicePlan[] => {
  const normalized = normalizeDate(monthRef)
  const [year, month] = normalized.split('-').map(Number)
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const date = (day: number): string =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  return [
    {
      auditSlice: 1,
      periodStart: date(1),
      periodEnd: date(10),
      unlockAt: date(10)
    },
    {
      auditSlice: 2,
      periodStart: date(11),
      periodEnd: date(20),
      unlockAt: date(20)
    },
    {
      auditSlice: 3,
      periodStart: date(21),
      periodEnd: date(lastDay.getDate()),
      unlockAt: date(lastDay.getDate())
    }
  ]
}

const toneLabelMap: Record<HistoryStateTone, string> = {
  confirmed: 'Concluida',
  partial: 'Parcial',
  pending: 'Pendente',
  skipped: 'Pulado'
}

export const Auditoria = (): JSX.Element => {
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
        setError('Nao foi possivel carregar a visao de auditoria.')
      } finally {
        setIsLoading(false)
      }
    })()
  }, [activeMonth, isActiveMonthMandatory])

  const activeSlices = useMemo(() => {
    if (!isActiveMonthMandatory) {
      return []
    }

    return activeAudits
      .slice()
      .sort((a, b) => a.auditSlice - b.auditSlice)
      .map((item) => ({
        key: `${item.monthRef}-${item.auditSlice}`,
        sliceLabel: `${item.auditSlice}/3`,
        periodLabel: `${formatDate(item.periodStart)} ate ${formatDate(item.periodEnd)}`,
        unlockLabel: formatDate(item.unlockAt),
        statusLabel: item.status === 'confirmed' ? 'Confirmada' : 'Pendente',
        tone: item.status === 'confirmed' ? styles.confirmed : styles.pending
      }))
  }, [activeAudits, isActiveMonthMandatory])

  const upcomingMandatorySlices = useMemo(() => {
    if (isActiveMonthMandatory) {
      return []
    }

    return buildSlicesForMonth(mandatoryMonth).map((slice) => ({
      key: `${mandatoryMonth}-${slice.auditSlice}`,
      sliceLabel: `${slice.auditSlice}/3`,
      periodLabel: `${formatDate(slice.periodStart)} ate ${formatDate(slice.periodEnd)}`,
      unlockLabel: formatDate(slice.unlockAt),
      statusLabel: 'Obrigatoria',
      tone: styles.pending
    }))
  }, [isActiveMonthMandatory, mandatoryMonth])

  const historyByMonth = useMemo<HistoryMonthItem[]>(() => {
    const groups = new Map<string, FinancialAudit[]>()
    historyAudits.forEach((audit) => {
      const key = normalizeDate(audit.monthRef)
      const current = groups.get(key) ?? []
      current.push(audit)
      groups.set(key, current)
    })

    if (!groups.has(APRIL_2026)) {
      groups.set(APRIL_2026, [])
    }

    return Array.from(groups.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([monthRef, rows]) => {
        if (monthRef === APRIL_2026 && rows.length === 0) {
          return {
            monthRef,
            tone: 'skipped',
            label: toneLabelMap.skipped,
            detail: 'Mes inicial pulado por regra de implantacao.',
            confirmedCount: 0,
            totalCount: 0
          }
        }

        const totalCount = rows.length
        const confirmedCount = rows.filter((item) => item.status === 'confirmed').length

        if (confirmedCount === 0) {
          return {
            monthRef,
            tone: 'pending',
            label: toneLabelMap.pending,
            detail: 'Sem faixas confirmadas.',
            confirmedCount,
            totalCount
          }
        }

        if (confirmedCount < totalCount) {
          return {
            monthRef,
            tone: 'partial',
            label: toneLabelMap.partial,
            detail: `${confirmedCount} de ${totalCount} faixas confirmadas.`,
            confirmedCount,
            totalCount
          }
        }

        return {
          monthRef,
          tone: 'confirmed',
          label: toneLabelMap.confirmed,
          detail: 'Todas as faixas confirmadas.',
          confirmedCount,
          totalCount
        }
      })
  }, [historyAudits])

  return (
    <PageTemplate className={styles.page}>
      <PageIntro
        title="Auditoria financeira"
        description="Controle das 3 auditorias mensais, com status ativo e historico de meses auditados."
        action={
          <a
            className={styles.auditLinkButton}
            href={AUDITOR_AGENT_URL}
            target="_blank"
            rel="noreferrer noopener"
          >
            <FiExternalLink aria-hidden />
            <span>Fazer auditoria</span>
          </a>
        }
      />

      <section className={styles.notice}>
        <FiShield aria-hidden />
        <div>
          <strong>Regra atual</strong>
          <p>Abril/2026 esta pulado. A partir de maio/2026 as auditorias mensais sao obrigatorias.</p>
        </div>
      </section>

      {isLoading ? <p className={styles.stateMessage}>Carregando auditorias...</p> : null}
      {!isLoading && error ? <p className={styles.errorMessage}>{error}</p> : null}

      {!isLoading && !error ? (
        <>
          <section className={styles.section}>
            <header className={styles.sectionHeader}>
              <h2>Auditorias ativas</h2>
              <span>{isActiveMonthMandatory ? formatMonthLabel(activeMonth) : formatMonthLabel(mandatoryMonth)}</span>
            </header>

            {isActiveMonthMandatory ? (
              <div className={styles.cardGrid}>
                {activeSlices.map((item) => (
                  <article key={item.key} className={styles.auditCard}>
                    <div className={styles.cardTop}>
                      <strong>{item.sliceLabel}</strong>
                      <span className={`${styles.badge} ${item.tone}`.trim()}>{item.statusLabel}</span>
                    </div>
                    <p className={styles.metaRow}>
                      <FiCalendar aria-hidden />
                      <span>{item.periodLabel}</span>
                    </p>
                    <p className={styles.metaRow}>
                      <FiClock aria-hidden />
                      <span>Liberacao: {item.unlockLabel}</span>
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.preMandatoryWrap}>
                <article className={`${styles.auditCard} ${styles.skippedCard}`.trim()}>
                  <div className={styles.cardTop}>
                    <strong>Abril 2026</strong>
                    <span className={`${styles.badge} ${styles.skipped}`.trim()}>Pulado</span>
                  </div>
                  <p className={styles.metaRow}>
                    <FiSlash aria-hidden />
                    <span>Mes de transicao, sem obrigatoriedade de auditoria.</span>
                  </p>
                </article>

                <div className={styles.cardGrid}>
                  {upcomingMandatorySlices.map((item) => (
                    <article key={item.key} className={styles.auditCard}>
                      <div className={styles.cardTop}>
                        <strong>{item.sliceLabel}</strong>
                        <span className={`${styles.badge} ${item.tone}`.trim()}>{item.statusLabel}</span>
                      </div>
                      <p className={styles.metaRow}>
                        <FiCalendar aria-hidden />
                        <span>{item.periodLabel}</span>
                      </p>
                      <p className={styles.metaRow}>
                        <FiClock aria-hidden />
                        <span>Liberacao: {item.unlockLabel}</span>
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className={styles.section}>
            <header className={styles.sectionHeader}>
              <h2>Historico de auditorias</h2>
              <span>{historyByMonth.length} meses</span>
            </header>

            {historyByMonth.length === 0 ? (
              <p className={styles.stateMessage}>Nenhuma auditoria registrada ainda.</p>
            ) : (
              <div className={styles.historyList}>
                {historyByMonth.map((item) => (
                  <article key={item.monthRef} className={styles.historyItem}>
                    <div className={styles.historyMain}>
                      <strong>{formatMonthLabel(item.monthRef)}</strong>
                      <p>{item.detail}</p>
                    </div>
                    <div className={styles.historySide}>
                      <span className={`${styles.badge} ${styles[item.tone]}`.trim()}>{item.label}</span>
                      {item.totalCount > 0 ? (
                        <small>{item.confirmedCount}/{item.totalCount}</small>
                      ) : (
                        <small>--</small>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </PageTemplate>
  )
}
