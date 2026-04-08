import { useEffect, useState } from 'react'
import { Button, ButtonLoading, ModalBase } from '../../../../components/ui'
import { businessService, type BusinessSettings } from '../../../../services/business.service'
import styles from './CompanySettingsModal.module.css'

interface CompanySettingsModalProps {
  open: boolean
  initialSettings: BusinessSettings | null
  onClose: () => void
  onSaved: (settings: BusinessSettings) => void
}

export const CompanySettingsModal = ({ open, initialSettings, onClose, onSaved }: CompanySettingsModalProps): JSX.Element => {
  const [investmentBaseAmount, setInvestmentBaseAmount] = useState('')
  const [noInitialInvestment, setNoInitialInvestment] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    if (!open) return

    setInvestmentBaseAmount(
      initialSettings?.investment_base_amount !== null && initialSettings?.investment_base_amount !== undefined
        ? String(initialSettings.investment_base_amount)
        : ''
    )
    setNoInitialInvestment(Boolean(initialSettings?.no_initial_investment))
    setFeedback('')
  }, [open, initialSettings])

  const handleSave = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    const parsedValue = investmentBaseAmount.trim() === '' ? null : Number(investmentBaseAmount.replace(',', '.'))

    if (!noInitialInvestment && (parsedValue === null || !Number.isFinite(parsedValue) || parsedValue <= 0)) {
      setFeedback('Informe um investimento inicial maior que zero ou marque que nao houve investimento inicial.')
      return
    }

    setIsSaving(true)
    setFeedback('')

    try {
      const updated = await businessService.updateBusinessSettings({
        investment_base_amount: noInitialInvestment ? null : parsedValue,
        no_initial_investment: noInitialInvestment
      })
      onSaved(updated)
      onClose()
    } catch {
      setFeedback('Nao foi possivel salvar as configuracoes agora.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ModalBase
      open={open}
      title="Configurar investimento inicial"
      onClose={() => {
        if (isSaving) return
        onClose()
      }}
    >
      <form className={styles.form} onSubmit={(event) => void handleSave(event)}>
        <label className={styles.field}>
          <span>Investimento inicial (base do ROI)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={investmentBaseAmount}
            onChange={(event) => setInvestmentBaseAmount(event.target.value)}
            placeholder="0.00"
            disabled={noInitialInvestment}
          />
        </label>

        <label className={styles.checkField}>
          <input
            type="checkbox"
            checked={noInitialInvestment}
            onChange={(event) => setNoInitialInvestment(event.target.checked)}
          />
          <span>Nao houve investimento inicial</span>
        </label>

        {feedback ? <p className={styles.feedback}>{feedback}</p> : null}

        <div className={styles.actions}>
          <Button type="button" variant="ghost" disabled={isSaving} onClick={onClose}>
            Cancelar
          </Button>
          <ButtonLoading type="submit" loading={isSaving}>
            Salvar
          </ButtonLoading>
        </div>
      </form>
    </ModalBase>
  )
}
