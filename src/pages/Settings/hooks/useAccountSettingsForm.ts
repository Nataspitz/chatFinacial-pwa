import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabase'
import type { AccountSettingsDraft, SettingsSection } from '../settings.types'
import { toInitialAccountDraft } from '../settings.constants'

export const useAccountSettingsForm = (activeSection: SettingsSection, user: User | null) => {
  const [accountFeedback, setAccountFeedback] = useState('')
  const [accountFeedbackTone, setAccountFeedbackTone] = useState<'success' | 'error'>('success')
  const [accountDraft, setAccountDraft] = useState<AccountSettingsDraft>(() => toInitialAccountDraft(user))
  const [isSavingAccount, setIsSavingAccount] = useState(false)

  useEffect(() => {
    if (activeSection !== 'account') return
    setAccountFeedback('')
    setAccountDraft(toInitialAccountDraft(user))
  }, [activeSection, user])

  const handleSaveAccountSettings = async (): Promise<void> => {
    if (!user) {
      setAccountFeedbackTone('error')
      setAccountFeedback('Não foi possível identificar o usuário autenticado.')
      return
    }

    const normalizedCurrency = accountDraft.preferredCurrency.trim().toUpperCase()
    if (normalizedCurrency.length !== 3) {
      setAccountFeedbackTone('error')
      setAccountFeedback('Informe uma moeda com 3 letras (ex.: BRL).')
      return
    }

    setIsSavingAccount(true)
    setAccountFeedback('')
    const metadataPayload = {
      ...(user.user_metadata ?? {}),
      full_name: accountDraft.fullName.trim(),
      phone: accountDraft.phone.trim(),
      company_name: accountDraft.companyName.trim(),
      preferred_currency: normalizedCurrency
    }

    const { error } = await supabase.auth.updateUser({ data: metadataPayload })
    if (error) {
      setAccountFeedbackTone('error')
      setAccountFeedback(error.message)
      setIsSavingAccount(false)
      return
    }

    setAccountDraft({
      fullName: metadataPayload.full_name,
      phone: metadataPayload.phone,
      companyName: metadataPayload.company_name,
      preferredCurrency: metadataPayload.preferred_currency
    })
    setAccountFeedbackTone('success')
    setAccountFeedback('Configurações da conta atualizadas com sucesso.')
    setIsSavingAccount(false)
  }

  return {
    accountFeedback,
    accountFeedbackTone,
    accountDraft,
    setAccountDraft,
    isSavingAccount,
    handleSaveAccountSettings
  }
}
