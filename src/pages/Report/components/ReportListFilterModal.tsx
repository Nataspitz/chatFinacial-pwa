import type { Dispatch, SetStateAction } from 'react'
import { Button, ModalBase } from '../../../components/ui'
import { MONTH_LABELS, type CombinedFilterDraftState, type ListFilterState } from './report-page.types'
import styles from '../Report.module.css'

interface ReportListFilterModalProps {
  open: boolean
  draft: CombinedFilterDraftState
  yearOptions: string[]
  dayOptions: string[]
  amountRangeMax: number
  formatCurrency: (value: number) => string
  setDraft: Dispatch<SetStateAction<CombinedFilterDraftState>>
  onClose: () => void
  onApply: () => void
  onClear: () => void
}

export const ReportListFilterModal = ({
  open,
  draft,
  yearOptions,
  dayOptions,
  amountRangeMax,
  formatCurrency,
  setDraft,
  onClose,
  onApply,
  onClear
}: ReportListFilterModalProps): JSX.Element => (
  <ModalBase open={open} title="Filtros" onClose={onClose}>
    <form
      className={styles.listFilterForm}
      onSubmit={(event) => {
        event.preventDefault()
        onApply()
      }}
    >
      <div className={styles.listFilterAmountGrid}>
        <label className={styles.createField}>
          <span>Ano</span>
          <select
            value={draft.selectedYear}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, selectedYear: event.target.value, selectedDay: 'all' }))
            }
          >
            <option value="all">Todos os anos</option>
            {yearOptions
              .filter((year) => year !== 'all')
              .map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
          </select>
        </label>

        <label className={styles.createField}>
          <span>Mês</span>
          <select
            value={draft.selectedMonth}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, selectedMonth: event.target.value, selectedDay: 'all' }))
            }
          >
            {Object.entries(MONTH_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.createField}>
          <span>Dia</span>
          <select value={draft.selectedDay} onChange={(event) => setDraft((prev) => ({ ...prev, selectedDay: event.target.value }))}>
            <option value="all">Todos os dias</option>
            {dayOptions
              .filter((day) => day !== 'all')
              .map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
          </select>
        </label>
      </div>

      <label className={styles.createField}>
        <span>Tipo de operação</span>
        <select
          value={draft.operationType}
          onChange={(event) =>
            setDraft((prev) => ({
              ...prev,
              operationType: event.target.value as ListFilterState['operationType']
            }))
          }
        >
          <option value="all">Todos</option>
          <option value="entrada">Entrada</option>
          <option value="saida">Saída</option>
        </select>
      </label>

      <div className={styles.valueRangeField}>
        <div className={styles.valueRangeHeader}>
          <span>Faixa de valor</span>
          <strong>
            {formatCurrency(0)} até{' '}
            {formatCurrency(draft.maxAmountLimit.trim() === '' ? amountRangeMax : Number(draft.maxAmountLimit))}
          </strong>
        </div>
        <input
          type="range"
          min="0"
          max={String(amountRangeMax)}
          step="10"
          value={draft.maxAmountLimit.trim() === '' ? String(amountRangeMax) : draft.maxAmountLimit}
          onChange={(event) => setDraft((prev) => ({ ...prev, maxAmountLimit: event.target.value }))}
        />
        <div className={styles.valueRangeScale}>
          <span>{formatCurrency(0)}</span>
          <span>{formatCurrency(amountRangeMax)}</span>
        </div>
      </div>

      <div className={styles.createActions}>
        <Button type="button" variant="ghost" onClick={onClear}>
          Limpar
        </Button>
        <Button type="submit">Aplicar filtros</Button>
      </div>
    </form>
  </ModalBase>
)
