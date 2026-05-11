import type { Dispatch, SetStateAction } from 'react'
import { Button, ButtonLoading, ModalBase } from '../../../components/ui'
import { MONTH_LABELS, type ExportFormState } from './report-page.types'
import styles from '../Report.module.css'

interface ExportReportModalProps {
  open: boolean
  form: ExportFormState
  yearOptions: string[]
  dayOptions: string[]
  totalEntries: number
  totalOutcomes: number
  resultBalance: number
  feedback: string
  isExporting: boolean
  formatCurrency: (value: number) => string
  setForm: Dispatch<SetStateAction<ExportFormState>>
  onClose: () => void
  onSubmit: () => void
}

export const ExportReportModal = ({
  open,
  form,
  yearOptions,
  dayOptions,
  totalEntries,
  totalOutcomes,
  resultBalance,
  feedback,
  isExporting,
  formatCurrency,
  setForm,
  onClose,
  onSubmit
}: ExportReportModalProps): JSX.Element => (
  <ModalBase open={open} title="Exportar relatório" onClose={onClose}>
    <form
      className={styles.exportForm}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <label className={styles.createField}>
        <span>Nome do arquivo</span>
        <input
          type="text"
          value={form.fileName}
          onChange={(event) => setForm((prev) => ({ ...prev, fileName: event.target.value }))}
          placeholder="relatorio-financeiro"
        />
      </label>

      <label className={styles.createField}>
        <span>Período de exportação</span>
        <select
          value={form.periodType}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, periodType: event.target.value as ExportFormState['periodType'] }))
          }
        >
          <option value="year">Ano</option>
          <option value="month">Mês</option>
          <option value="monthRange">Período do mês</option>
          <option value="day">Dia</option>
        </select>
      </label>

      <div className={styles.exportPeriodGrid}>
        <label className={styles.createField}>
          <span>Ano</span>
          <select value={form.year} onChange={(event) => setForm((prev) => ({ ...prev, year: event.target.value }))}>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>

        {form.periodType !== 'year' ? (
          <label className={styles.createField}>
            <span>Mês</span>
            <select value={form.month} onChange={(event) => setForm((prev) => ({ ...prev, month: event.target.value }))}>
              {Object.entries(MONTH_LABELS)
                .filter(([value]) => value !== 'all')
                .map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
            </select>
          </label>
        ) : null}

        {form.periodType === 'day' ? (
          <label className={styles.createField}>
            <span>Dia</span>
            <select value={form.day} onChange={(event) => setForm((prev) => ({ ...prev, day: event.target.value }))}>
              {dayOptions.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {form.periodType === 'monthRange' ? (
          <>
            <label className={styles.createField}>
              <span>Dia inicial</span>
              <select value={form.startDay} onChange={(event) => setForm((prev) => ({ ...prev, startDay: event.target.value }))}>
                {dayOptions.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.createField}>
              <span>Dia final</span>
              <select value={form.endDay} onChange={(event) => setForm((prev) => ({ ...prev, endDay: event.target.value }))}>
                {dayOptions.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}
      </div>

      <div className={styles.exportPreview}>
        <p><strong>Entradas:</strong> {formatCurrency(totalEntries)}</p>
        <p><strong>Saídas:</strong> {formatCurrency(totalOutcomes)}</p>
        <p><strong>Resultado:</strong> {formatCurrency(resultBalance)}</p>
      </div>

      {feedback ? <p className={styles.createFeedback}>{feedback}</p> : null}

      <div className={styles.createActions}>
        <Button type="button" variant="ghost" onClick={onClose} disabled={isExporting}>
          Cancelar
        </Button>
        <ButtonLoading type="submit" loading={isExporting}>
          Gerar PDF
        </ButtonLoading>
      </div>
    </form>
  </ModalBase>
)
