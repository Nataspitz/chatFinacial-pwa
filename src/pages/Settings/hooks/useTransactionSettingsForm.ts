import { useEffect, useState } from 'react'
import { transactionSettingsService } from '../../../services/transaction-settings.service'
import {
  DEFAULT_TRANSACTION_SETTINGS,
  type TransactionSettings
} from '../../../types/transaction-settings.types'
import type { SettingsSection } from '../settings.types'

export const useTransactionSettingsForm = (activeSection: SettingsSection) => {
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [isLoadingSettings, setIsLoadingSettings] = useState(false)
  const [showAdvancedMode, setShowAdvancedMode] = useState(false)
  const [settingsFeedback, setSettingsFeedback] = useState('')
  const [settingsDraft, setSettingsDraft] = useState<TransactionSettings>(DEFAULT_TRANSACTION_SETTINGS)

  useEffect(() => {
    if (activeSection !== 'transactions') return

    setSettingsFeedback('')
    setIsLoadingSettings(true)
    void transactionSettingsService
      .getSettings()
      .then(setSettingsDraft)
      .catch(() => setSettingsFeedback('Não foi possível carregar as configurações de transações.'))
      .finally(() => setIsLoadingSettings(false))
  }, [activeSection])

  const handleSaveTransactionSettings = async (): Promise<void> => {
    setIsSavingSettings(true)
    setSettingsFeedback('')
    try {
      setSettingsDraft(await transactionSettingsService.saveSettings(settingsDraft))
      setSettingsFeedback('Configurações salvas com sucesso.')
    } catch {
      setSettingsFeedback('Não foi possível salvar as configurações.')
    } finally {
      setIsSavingSettings(false)
    }
  }

  const handleRestoreSettingsDefaults = (): void => {
    setSettingsDraft(DEFAULT_TRANSACTION_SETTINGS)
    setSettingsFeedback('Padrões restaurados localmente. Clique em Salvar para aplicar.')
  }

  return {
    isSavingSettings,
    isLoadingSettings,
    showAdvancedMode,
    setShowAdvancedMode,
    settingsFeedback,
    settingsDraft,
    setSettingsDraft,
    handleSaveTransactionSettings,
    handleRestoreSettingsDefaults
  }
}
