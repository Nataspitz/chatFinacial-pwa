import { useEffect, useState } from 'react'
import { FiFilter } from 'react-icons/fi'
import { Button, ModalBase } from '../../../../components/ui'
import type { DashboardViewMode } from '../../types'
import styles from './DashboardFilters.module.css'

interface DashboardFiltersProps {
  selectedYear: number
  selectedMonth: number
  mode: DashboardViewMode
  years: number[]
  onYearChange: (value: number) => void
  onMonthChange: (value: number) => void
  onModeChange: (value: DashboardViewMode) => void
}

const MONTH_OPTIONS = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Fev' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Abr' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Ago' },
  { value: 9, label: 'Set' },
  { value: 10, label: 'Out' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dez' }
]

export const DashboardFilters = ({
  selectedYear,
  selectedMonth,
  mode,
  years,
  onYearChange,
  onMonthChange,
  onModeChange
}: DashboardFiltersProps): JSX.Element => {
  const [isOpen, setIsOpen] = useState(false)
  const [draftYear, setDraftYear] = useState(selectedYear)
  const [draftMonth, setDraftMonth] = useState(selectedMonth)
  const [draftMode, setDraftMode] = useState<DashboardViewMode>(mode)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setDraftYear(selectedYear)
    setDraftMonth(selectedMonth)
    setDraftMode(mode)
  }, [isOpen, mode, selectedMonth, selectedYear])

  const handleApplyFilters = (): void => {
    onYearChange(draftYear)
    onMonthChange(draftMonth)
    onModeChange(draftMode)
    setIsOpen(false)
  }

  return (
    <>
      <section className={styles.filters} aria-label="Filtros da dashboard">
        <button
          type="button"
          className={`${styles.filterIconButton} ${isOpen ? styles.filterIconButtonActive : ''}`.trim()}
          aria-label="Abrir filtros da dashboard"
          onClick={() => setIsOpen(true)}
        >
          <FiFilter />
        </button>
      </section>

      <ModalBase
        open={isOpen}
        title="Filtros da dashboard"
        onClose={() => setIsOpen(false)}
      >
        <form
          className={styles.filterModalForm}
          onSubmit={(event) => {
            event.preventDefault()
            handleApplyFilters()
          }}
        >
          <div className={styles.fieldsGrid}>
            <label className={styles.field}>
              <span>Ano</span>
              <select value={draftYear} onChange={(event) => setDraftYear(Number(event.target.value))}>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Mes</span>
              <select
                value={draftMonth}
                disabled={draftMode === 'annual'}
                onChange={(event) => setDraftMonth(Number(event.target.value))}
              >
                {MONTH_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.modeToggle} role="group" aria-label="Modo de visualizacao">
            <button
              type="button"
              className={draftMode === 'monthly' ? `${styles.modeButton} ${styles.active}` : styles.modeButton}
              onClick={() => setDraftMode('monthly')}
            >
              Visao mensal
            </button>
            <button
              type="button"
              className={draftMode === 'annual' ? `${styles.modeButton} ${styles.active}` : styles.modeButton}
              onClick={() => setDraftMode('annual')}
            >
              Visao anual
            </button>
          </div>

          <div className={styles.modalActions}>
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Aplicar filtros
            </Button>
          </div>
        </form>
      </ModalBase>
    </>
  )
}
