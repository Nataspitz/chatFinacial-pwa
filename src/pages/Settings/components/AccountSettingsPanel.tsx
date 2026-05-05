import type { FormEvent } from 'react'
import { FormField } from '../../../components/molecules/FormField/FormField'
import { Button, ButtonLoading, Input } from '../../../components/ui'
import type { AccountSettingsDraft } from '../settings.types'
import styles from '../Settings.module.css'

interface AccountSettingsPanelProps {
  userLabel: string
  userEmail: string
  draft: AccountSettingsDraft
  isSaving: boolean
  feedback: string
  feedbackTone: 'success' | 'error'
  onDraftChange: (draft: AccountSettingsDraft) => void
  onSubmit: () => void
  onSignOut: () => void
}

export const AccountSettingsPanel = ({
  userLabel,
  userEmail,
  draft,
  isSaving,
  feedback,
  feedbackTone,
  onDraftChange,
  onSubmit,
  onSignOut
}: AccountSettingsPanelProps): JSX.Element => {
  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <>
      <div className={styles.userMeta}>
        <strong>{userLabel}</strong>
        <span className={styles.muted}>{userEmail}</span>
      </div>

      <form className={styles.accountForm} onSubmit={handleSubmit}>
        <div className={styles.gridFields}>
          <FormField label="Nome completo">
            <Input
              type="text"
              value={draft.fullName}
              onChange={(event) => onDraftChange({ ...draft, fullName: event.target.value })}
              placeholder="Seu nome"
              disabled={isSaving}
            />
          </FormField>

          <FormField label="Telefone">
            <Input
              type="tel"
              value={draft.phone}
              onChange={(event) => onDraftChange({ ...draft, phone: event.target.value })}
              placeholder="(00) 00000-0000"
              disabled={isSaving}
            />
          </FormField>
        </div>

        <div className={styles.gridFields}>
          <FormField label="Empresa">
            <Input
              type="text"
              value={draft.companyName}
              onChange={(event) => onDraftChange({ ...draft, companyName: event.target.value })}
              placeholder="Nome da empresa"
              disabled={isSaving}
            />
          </FormField>

          <FormField label="Moeda preferida">
            <Input
              type="text"
              maxLength={3}
              value={draft.preferredCurrency}
              onChange={(event) => onDraftChange({ ...draft, preferredCurrency: event.target.value })}
              placeholder="BRL"
              disabled={isSaving}
            />
          </FormField>
        </div>

        {feedback ? (
          <p className={feedbackTone === 'success' ? styles.feedbackSuccess : styles.feedbackError}>
            {feedback}
          </p>
        ) : null}

        <div className={styles.actionsRow}>
          <ButtonLoading type="submit" loading={isSaving}>
            Salvar dados da conta
          </ButtonLoading>
        </div>
      </form>

      <Button type="button" variant="danger" className={styles.dangerAction} onClick={onSignOut}>
        Sair
      </Button>
    </>
  )
}
