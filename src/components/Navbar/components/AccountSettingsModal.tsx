import { useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Button, ButtonLoading, ModalBase } from '../../ui'
import { supabase } from '../../../lib/supabase'
import { toInitialForm, type AccountSettingsForm } from './account-settings.utils'
import styles from './AccountSettingsModal.module.css'

interface AccountSettingsModalProps {
  open: boolean
  user: User | null
  onClose: () => void
}

export const AccountSettingsModal = ({ open, user, onClose }: AccountSettingsModalProps): JSX.Element => {
  const [form, setForm] = useState<AccountSettingsForm>(() => toInitialForm(user))
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<string>('')
  const [feedbackTone, setFeedbackTone] = useState<'success' | 'error'>('success')

  useEffect(() => {
    if (!open) return
    setForm(toInitialForm(user))
    setFeedback('')
  }, [open, user])

  const normalizedCurrency = useMemo(() => form.preferredCurrency.trim().toUpperCase(), [form.preferredCurrency])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    if (!user) {
      setFeedbackTone('error')
      setFeedback('Nao foi possivel identificar o usuario.')
      return
    }

    if (normalizedCurrency.length !== 3) {
      setFeedbackTone('error')
      setFeedback('Informe uma moeda com 3 letras (ex.: BRL).')
      return
    }

    setIsSaving(true)
    setFeedback('')

    const payload = {
      ...(user.user_metadata ?? {}),
      full_name: form.fullName.trim(),
      phone: form.phone.trim(),
      company_name: form.companyName.trim(),
      preferred_currency: normalizedCurrency
    }

    const { error } = await supabase.auth.updateUser({ data: payload })

    if (error) {
      setFeedbackTone('error')
      setFeedback(error.message)
      setIsSaving(false)
      return
    }

    setFeedbackTone('success')
    setFeedback('Configuracoes atualizadas com sucesso.')
    setIsSaving(false)
  }

  return (
    <ModalBase
      open={open}
      title="Configuracoes da conta"
      onClose={() => {
        if (isSaving) return
        onClose()
      }}
    >
      <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
        <p className={styles.description}>Atualize os dados principais da conta da empresa.</p>

        <label className={styles.field}>
          <span>Nome completo</span>
          <input
            type="text"
            value={form.fullName}
            onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
            placeholder="Seu nome"
          />
        </label>

        <label className={styles.field}>
          <span>Telefone</span>
          <input
            type="tel"
            value={form.phone}
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            placeholder="(00) 00000-0000"
          />
        </label>

        <label className={styles.field}>
          <span>Empresa</span>
          <input
            type="text"
            value={form.companyName}
            onChange={(event) => setForm((prev) => ({ ...prev, companyName: event.target.value }))}
            placeholder="Nome da empresa"
          />
        </label>

        <label className={styles.field}>
          <span>Moeda preferida</span>
          <input
            type="text"
            maxLength={3}
            value={form.preferredCurrency}
            onChange={(event) => setForm((prev) => ({ ...prev, preferredCurrency: event.target.value }))}
            placeholder="BRL"
          />
        </label>

        {feedback ? (
          <p className={feedbackTone === 'success' ? styles.feedbackSuccess : styles.feedbackError}>{feedback}</p>
        ) : null}

        <div className={styles.actions}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
            Fechar
          </Button>
          <ButtonLoading type="submit" loading={isSaving}>
            Salvar dados
          </ButtonLoading>
        </div>
      </form>
    </ModalBase>
  )
}
