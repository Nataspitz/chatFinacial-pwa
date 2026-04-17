import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Button, ButtonLoading } from '../../components/ui'
import { PageTemplate } from '../../components/templates/PageTemplate/PageTemplate'
import { useAuth } from '../../contexts/AuthContext'
import { backupService } from '../../services/backup.service'
import { financeService, type CategoryItem } from '../../services/finance.service'
import { transactionSettingsService } from '../../services/transaction-settings.service'
import {
  DEFAULT_TRANSACTION_SETTINGS,
  type TransactionSettings
} from '../../types/transaction-settings.types'
import type { PaymentMethod } from '../../types/transaction.types'
import type { Transaction } from '../../types/transaction.types'
import styles from './Settings.module.css'

type SettingsSection = 'transactions' | 'appearance' | 'account'

const sections: Array<{ id: SettingsSection; label: string }> = [
  { id: 'transactions', label: 'Transacoes' },
  { id: 'appearance', label: 'Aparencia' },
  { id: 'account', label: 'Conta' }
]

export const Settings = (): JSX.Element => {
  const { user, signOut } = useAuth()
  const backupInputRef = useRef<HTMLInputElement | null>(null)
  const [activeSection, setActiveSection] = useState<SettingsSection>('transactions')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const currentTheme = document.documentElement.getAttribute('data-theme')
    return currentTheme === 'dark' ? 'dark' : 'light'
  })
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [isImportingBackup, setIsImportingBackup] = useState(false)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [isLoadingSettings, setIsLoadingSettings] = useState(false)
  const [showAdvancedMode, setShowAdvancedMode] = useState(false)
  const [backupFeedback, setBackupFeedback] = useState('')
  const [settingsFeedback, setSettingsFeedback] = useState('')
  const [settingsDraft, setSettingsDraft] = useState<TransactionSettings>(
    DEFAULT_TRANSACTION_SETTINGS
  )

  const fullName = typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : ''
  const userLabel = fullName || user?.email || 'Usuario'

  const loadBackupData = async (): Promise<void> => {
    setIsLoadingData(true)
    setBackupFeedback('')
    try {
      const [loadedTransactions, entradaCategories, saidaCategories] = await Promise.all([
        financeService.getTransactions(),
        financeService.getCategoryItems('entrada'),
        financeService.getCategoryItems('saida')
      ])
      setTransactions(loadedTransactions)
      setCategories([...entradaCategories, ...saidaCategories])
    } catch {
      setBackupFeedback('Nao foi possivel carregar os dados para backup.')
    } finally {
      setIsLoadingData(false)
    }
  }

  useEffect(() => {
    if (activeSection !== 'transactions') {
      return
    }

    void loadBackupData()
    setSettingsFeedback('')
    setIsLoadingSettings(true)
    void transactionSettingsService
      .getSettings()
      .then((settings) => {
        setSettingsDraft(settings)
      })
      .catch(() => {
        setSettingsFeedback('Nao foi possivel carregar as configuracoes de transacoes.')
      })
      .finally(() => {
        setIsLoadingSettings(false)
      })
  }, [activeSection])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem('theme', theme)
  }, [theme])

  const sectionTitle = useMemo(() => {
    if (activeSection === 'transactions') return 'Configuracoes de transacoes'
    if (activeSection === 'appearance') return 'Configuracoes de aparencia'
    return 'Configuracoes da conta'
  }, [activeSection])

  const sectionDescription = useMemo(() => {
    if (activeSection === 'transactions') return 'Gerencie backup e restauracao dos seus dados financeiros.'
    if (activeSection === 'appearance') return 'Escolha o tema visual do aplicativo.'
    return 'Visualize os dados da conta e gerencie sua sessao.'
  }, [activeSection])

  const handleExportBackup = async (): Promise<void> => {
    if (transactions.length === 0) {
      await loadBackupData()
    }

    const payload = backupService.buildBackup(categories, transactions)
    const fileName = backupService.downloadBackup(payload)
    setBackupFeedback(`Backup baixado como ${fileName}.`)
  }

  const handleImportBackupClick = (): void => {
    setBackupFeedback('')
    backupInputRef.current?.click()
  }

  const handleImportBackupFile = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    setIsImportingBackup(true)
    setBackupFeedback('')

    try {
      const rawContent = await file.text()
      const { importedTransactions } = await backupService.restoreBackup(rawContent)
      setBackupFeedback(`Backup restaurado. ${importedTransactions} transacoes novas foram importadas.`)
      await loadBackupData()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel restaurar o backup.'
      setBackupFeedback(message)
    } finally {
      setIsImportingBackup(false)
    }
  }

  const paymentMethodOptions: Array<{ value: PaymentMethod; label: string }> = [
    { value: 'pix', label: 'Pix' },
    { value: 'debito', label: 'Debito' },
    { value: 'dinheiro', label: 'Dinheiro' },
    { value: 'credito', label: 'Credito' }
  ]

  const handleSaveTransactionSettings = async (): Promise<void> => {
    setIsSavingSettings(true)
    setSettingsFeedback('')
    try {
      const saved = await transactionSettingsService.saveSettings(settingsDraft)
      setSettingsDraft(saved)
      setSettingsFeedback('Configuracoes salvas com sucesso.')
    } catch {
      setSettingsFeedback('Nao foi possivel salvar as configuracoes.')
    } finally {
      setIsSavingSettings(false)
    }
  }

  const handleRestoreSettingsDefaults = async (): Promise<void> => {
    setSettingsDraft(DEFAULT_TRANSACTION_SETTINGS)
    setSettingsFeedback('Padroes restaurados localmente. Clique em Salvar para aplicar.')
  }

  return (
    <PageTemplate className={styles.page}>
      <input ref={backupInputRef} type="file" accept="application/json,.json" hidden onChange={(event) => void handleImportBackupFile(event)} />

      <header className={styles.header}>
        <h1 className={styles.title}>Configuracoes</h1>
        <p className={styles.subtitle}>Centralize preferencias da conta e manutencao dos seus dados.</p>
      </header>

      <section className={styles.layout}>
        <aside className={styles.menu}>
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              className={`${styles.menuButton} ${activeSection === section.id ? styles.menuButtonActive : ''}`.trim()}
              onClick={() => setActiveSection(section.id)}
            >
              {section.label}
            </button>
          ))}
        </aside>

        <div className={styles.mobileTabs}>
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              className={`${styles.mobileTab} ${activeSection === section.id ? styles.mobileTabActive : ''}`.trim()}
              onClick={() => setActiveSection(section.id)}
            >
              {section.label}
            </button>
          ))}
        </div>

        <article className={styles.content}>
          <h2 className={styles.sectionTitle}>{sectionTitle}</h2>
          <p className={styles.sectionDescription}>{sectionDescription}</p>

          {activeSection === 'transactions' ? (
            <>
              <div className={styles.actionsRow}>
                <Button type="button" variant="ghost" onClick={() => void handleExportBackup()} disabled={isLoadingData || isImportingBackup}>
                  Baixar backup
                </Button>
                <ButtonLoading
                  type="button"
                  variant="secondary"
                  loading={isImportingBackup}
                  disabled={isLoadingData}
                  onClick={handleImportBackupClick}
                >
                  Restaurar backup
                </ButtonLoading>
              </div>
              {backupFeedback ? <p className={styles.feedback}>{backupFeedback}</p> : null}

              <div className={styles.settingsBlock}>
                <h3 className={styles.blockTitle}>Defaults basicos</h3>
                <div className={styles.gridFields}>
                  <label className={styles.field}>
                    <span>Pagamento padrao (entrada)</span>
                    <select
                      value={settingsDraft.defaultPaymentMethodEntrada}
                      onChange={(event) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          defaultPaymentMethodEntrada: event.target.value as PaymentMethod
                        }))
                      }
                      disabled={isLoadingSettings || isSavingSettings}
                    >
                      {paymentMethodOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span>Pagamento padrao (saida)</span>
                    <select
                      value={settingsDraft.defaultPaymentMethodSaida}
                      onChange={(event) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          defaultPaymentMethodSaida: event.target.value as PaymentMethod
                        }))
                      }
                      disabled={isLoadingSettings || isSavingSettings}
                    >
                      {paymentMethodOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className={styles.checkField}>
                  <input
                    type="checkbox"
                    checked={settingsDraft.defaultConfirmedEntrada}
                    onChange={(event) =>
                      setSettingsDraft((prev) => ({
                        ...prev,
                        defaultConfirmedEntrada: event.target.checked
                      }))
                    }
                    disabled={isLoadingSettings || isSavingSettings}
                  />
                  <span>Entrada nasce confirmada por padrao</span>
                </label>

                <label className={styles.checkField}>
                  <input
                    type="checkbox"
                    checked={settingsDraft.defaultConfirmedSaida}
                    onChange={(event) =>
                      setSettingsDraft((prev) => ({
                        ...prev,
                        defaultConfirmedSaida: event.target.checked
                      }))
                    }
                    disabled={isLoadingSettings || isSavingSettings}
                  />
                  <span>Saida nasce confirmada por padrao</span>
                </label>

                <label className={styles.checkField}>
                  <input
                    type="checkbox"
                    checked={settingsDraft.defaultMonthlyCostSaida}
                    onChange={(event) =>
                      setSettingsDraft((prev) => ({
                        ...prev,
                        defaultMonthlyCostSaida: event.target.checked
                      }))
                    }
                    disabled={isLoadingSettings || isSavingSettings}
                  />
                  <span>Saida nasce como custo mensal por padrao</span>
                </label>
              </div>

              <div className={styles.settingsBlock}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAdvancedMode((prev) => !prev)}
                  disabled={isLoadingSettings || isSavingSettings}
                >
                  {showAdvancedMode ? 'Ocultar modo avancado' : 'Mostrar modo avancado'}
                </Button>

                {showAdvancedMode ? (
                  <div className={styles.advancedBox}>
                    <h3 className={styles.blockTitle}>Regras avancadas</h3>
                    <label className={styles.checkField}>
                      <input
                        type="checkbox"
                        checked={settingsDraft.enforceConsistency}
                        onChange={(event) =>
                          setSettingsDraft((prev) => ({
                            ...prev,
                            enforceConsistency: event.target.checked
                          }))
                        }
                        disabled={isLoadingSettings || isSavingSettings}
                      />
                      <span>Ativar bloqueio de consistencia (parcelas, custo mensal e formatos)</span>
                    </label>
                    <label className={styles.checkField}>
                      <input
                        type="checkbox"
                        checked={settingsDraft.allowCreditWithoutInstallments}
                        onChange={(event) =>
                          setSettingsDraft((prev) => ({
                            ...prev,
                            allowCreditWithoutInstallments: event.target.checked
                          }))
                        }
                        disabled={isLoadingSettings || isSavingSettings}
                      />
                      <span>Permitir credito com 1 parcela (sem parcelamento)</span>
                    </label>
                  </div>
                ) : null}
              </div>

              <div className={styles.actionsRow}>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isLoadingSettings || isSavingSettings}
                  onClick={handleRestoreSettingsDefaults}
                >
                  Restaurar padroes
                </Button>
                <ButtonLoading
                  type="button"
                  variant="primary"
                  loading={isSavingSettings}
                  disabled={isLoadingSettings}
                  onClick={() => void handleSaveTransactionSettings()}
                >
                  Salvar configuracoes
                </ButtonLoading>
              </div>
              {settingsFeedback ? <p className={styles.feedback}>{settingsFeedback}</p> : null}
            </>
          ) : null}

          {activeSection === 'appearance' ? (
            <div className={styles.themeOptions}>
              <Button
                type="button"
                variant={theme === 'light' ? 'primary' : 'ghost'}
                className={styles.themeButton}
                onClick={() => setTheme('light')}
              >
                Modo claro
              </Button>
              <Button
                type="button"
                variant={theme === 'dark' ? 'primary' : 'ghost'}
                className={styles.themeButton}
                onClick={() => setTheme('dark')}
              >
                Modo escuro
              </Button>
            </div>
          ) : null}

          {activeSection === 'account' ? (
            <>
              <div className={styles.userMeta}>
                <strong>{userLabel}</strong>
                <span className={styles.muted}>{user?.email ?? 'Email nao informado'}</span>
              </div>
              <Button type="button" variant="danger" className={styles.dangerAction} onClick={() => void signOut()}>
                Sair
              </Button>
            </>
          ) : null}
        </article>
      </section>
    </PageTemplate>
  )
}
