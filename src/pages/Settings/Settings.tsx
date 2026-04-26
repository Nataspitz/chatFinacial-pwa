import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Button, ButtonLoading, ModalBase } from '../../components/ui'
import { PageTemplate } from '../../components/templates/PageTemplate/PageTemplate'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { backupService } from '../../services/backup.service'
import { businessService } from '../../services/business.service'
import { financeService, type CategoryItem } from '../../services/finance.service'
import { goalsService } from '../../services/goals.service'
import { transactionSettingsService } from '../../services/transaction-settings.service'
import type { Goal } from '../../types/goal.types'
import {
  DEFAULT_TRANSACTION_SETTINGS,
  type TransactionSettings
} from '../../types/transaction-settings.types'
import type { BackupBusinessSettings } from '../../types/backup.types'
import type { PaymentMethod } from '../../types/transaction.types'
import type { Transaction } from '../../types/transaction.types'
import styles from './Settings.module.css'

type SettingsSection = 'transactions' | 'appearance' | 'account'

const sections: Array<{ id: SettingsSection; label: string }> = [
  { id: 'transactions', label: 'Transacoes' },
  { id: 'appearance', label: 'Aparencia' },
  { id: 'account', label: 'Conta' }
]

interface BackupSnapshot {
  transactions: Transaction[]
  categories: CategoryItem[]
  goals: Goal[]
}

interface LoadBackupDataOptions {
  clearFeedback?: boolean
}

interface AccountSettingsDraft {
  fullName: string
  phone: string
  companyName: string
  preferredCurrency: string
}

const toInitialAccountDraft = (user: { user_metadata?: Record<string, unknown> } | null): AccountSettingsDraft => {
  const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>

  return {
    fullName: typeof metadata.full_name === 'string' ? metadata.full_name : '',
    phone: typeof metadata.phone === 'string' ? metadata.phone : '',
    companyName: typeof metadata.company_name === 'string' ? metadata.company_name : '',
    preferredCurrency: typeof metadata.preferred_currency === 'string' ? metadata.preferred_currency : 'BRL'
  }
}

export const Settings = (): JSX.Element => {
  const { user, signOut } = useAuth()
  const backupInputRef = useRef<HTMLInputElement | null>(null)
  const [activeSection, setActiveSection] = useState<SettingsSection>('transactions')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const currentTheme = document.documentElement.getAttribute('data-theme')
    return currentTheme === 'dark' ? 'dark' : 'light'
  })
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [isImportingBackup, setIsImportingBackup] = useState(false)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [isLoadingSettings, setIsLoadingSettings] = useState(false)
  const [showAdvancedMode, setShowAdvancedMode] = useState(false)
  const [backupFeedback, setBackupFeedback] = useState('')
  const [settingsFeedback, setSettingsFeedback] = useState('')
  const [accountFeedback, setAccountFeedback] = useState('')
  const [accountFeedbackTone, setAccountFeedbackTone] = useState<'success' | 'error'>('success')
  const [settingsDraft, setSettingsDraft] = useState<TransactionSettings>(
    DEFAULT_TRANSACTION_SETTINGS
  )
  const [accountDraft, setAccountDraft] = useState<AccountSettingsDraft>(() => toInitialAccountDraft(user))
  const [isSavingAccount, setIsSavingAccount] = useState(false)
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false)
  const [deletedTransactions, setDeletedTransactions] = useState<Transaction[]>([])
  const [selectedDeletedIds, setSelectedDeletedIds] = useState<string[]>([])
  const [isLoadingTrash, setIsLoadingTrash] = useState(false)
  const [isRestoringTrash, setIsRestoringTrash] = useState(false)
  const [isClearingTrash, setIsClearingTrash] = useState(false)
  const [trashFeedback, setTrashFeedback] = useState('')

  const fullName = typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : ''
  const userLabel = fullName || user?.email || 'Usuario'

  const loadBackupData = async (options: LoadBackupDataOptions = {}): Promise<BackupSnapshot> => {
    const { clearFeedback = true } = options
    setIsLoadingData(true)
    if (clearFeedback) {
      setBackupFeedback('')
    }

    try {
      const [loadedTransactions, entradaCategories, saidaCategories, loadedGoals] = await Promise.all([
        financeService.getTransactions(),
        financeService.getCategoryItems('entrada'),
        financeService.getCategoryItems('saida'),
        goalsService.getGoals()
      ])
      const loadedCategories = [...entradaCategories, ...saidaCategories]
      return {
        transactions: loadedTransactions,
        categories: loadedCategories,
        goals: loadedGoals
      }
    } catch {
      setBackupFeedback('Nao foi possivel carregar os dados para backup.')
      throw new Error('Nao foi possivel carregar os dados para backup.')
    } finally {
      setIsLoadingData(false)
    }
  }

  useEffect(() => {
    if (activeSection !== 'transactions') {
      return
    }

    void loadBackupData().catch(() => undefined)
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
    if (activeSection !== 'account') {
      return
    }

    setAccountFeedback('')
    setAccountDraft(toInitialAccountDraft(user))
  }, [activeSection, user])

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
    return 'Atualize dados da conta e preferencias de perfil.'
  }, [activeSection])

  const handleExportBackup = async (): Promise<void> => {
    setBackupFeedback('')

    try {
      const [snapshot, userTransactionSettings, userBusinessSettings] = await Promise.all([
        loadBackupData({ clearFeedback: false }),
        transactionSettingsService.getSettings().catch(() => DEFAULT_TRANSACTION_SETTINGS),
        businessService.getBusinessSettings().catch(() => null)
      ])

      const serializedBusinessSettings: BackupBusinessSettings | undefined = userBusinessSettings
        ? {
            investmentBaseAmount: userBusinessSettings.investment_base_amount,
            noInitialInvestment: userBusinessSettings.no_initial_investment,
            accountBalanceBaseAmount: userBusinessSettings.account_balance_base_amount,
            accountBalanceBaseDate: userBusinessSettings.account_balance_base_date,
            accountBalanceLockedAt: userBusinessSettings.account_balance_locked_at
          }
        : undefined

      const payload = backupService.buildBackup({
        categories: snapshot.categories,
        transactions: snapshot.transactions,
        goals: snapshot.goals,
        transactionSettings: userTransactionSettings,
        businessSettings: serializedBusinessSettings
      })

      const folderName = await backupService.downloadBackupFolder(payload)
      const usedFolderApi = typeof window.showDirectoryPicker === 'function'
      setBackupFeedback(
        usedFolderApi
          ? `Backup salvo na pasta ${folderName}.`
          : `Seu navegador nao permitiu criar uma pasta diretamente. Os arquivos do backup foram baixados separadamente com o prefixo ${folderName}.`
      )
    } catch {
      setBackupFeedback('Nao foi possivel baixar o backup.')
    }
  }

  const handleImportBackupClick = (): void => {
    setBackupFeedback('')
    backupInputRef.current?.click()
  }

  const handleImportBackupFile = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''

    if (files.length === 0) {
      return
    }

    setIsImportingBackup(true)
    setBackupFeedback('')

    try {
      const {
        importedTransactions,
        restoredGoals = 0,
        restoredTransactionSettings = false,
        restoredBusinessSettings = false,
        warnings = []
      } = await backupService.restoreBackupFolder(files)

      const feedbackParts = [`Backup restaurado. ${importedTransactions} transacoes novas foram importadas.`]
      if (restoredGoals > 0) {
        feedbackParts.push(`${restoredGoals} metas foram restauradas.`)
      }
      if (restoredTransactionSettings) {
        feedbackParts.push('Configuracoes de transacoes foram restauradas.')
      }
      if (restoredBusinessSettings) {
        feedbackParts.push('Configuracoes de saldo inicial foram restauradas.')
      }
      if (warnings.length > 0) {
        feedbackParts.push(`Avisos: ${warnings.join(' ')}`)
      }

      setBackupFeedback(feedbackParts.join(' '))
      await loadBackupData({ clearFeedback: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel restaurar o backup.'
      setBackupFeedback(message)
    } finally {
      setIsImportingBackup(false)
    }
  }

  const loadDeletedTransactions = async (): Promise<void> => {
    setIsLoadingTrash(true)
    try {
      const deleted = await financeService.getDeletedTransactions()
      setDeletedTransactions(deleted)
    } catch {
      setTrashFeedback('Nao foi possivel carregar a lixeira.')
    } finally {
      setIsLoadingTrash(false)
    }
  }

  const handleOpenTrashModal = (): void => {
    setTrashFeedback('')
    setSelectedDeletedIds([])
    setIsTrashModalOpen(true)
    void loadDeletedTransactions()
  }

  const handleToggleDeleted = (id: string): void => {
    setSelectedDeletedIds((prev) => (
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    ))
  }

  const handleToggleAllDeleted = (): void => {
    setSelectedDeletedIds((prev) => (
      prev.length === deletedTransactions.length ? [] : deletedTransactions.map((item) => item.id)
    ))
  }

  const handleRestoreDeleted = async (): Promise<void> => {
    setIsRestoringTrash(true)
    setTrashFeedback('')
    try {
      const restoredCount = selectedDeletedIds.length > 0
        ? await financeService.restoreDeletedTransactionsByIds(selectedDeletedIds)
        : await financeService.restoreDeletedTransactions()
      setSelectedDeletedIds([])
      await loadDeletedTransactions()
      setTrashFeedback(
        restoredCount > 0
          ? `${restoredCount} transacoes foram recuperadas.`
          : 'Nenhuma transacao para recuperar.'
      )
    } catch {
      setTrashFeedback('Nao foi possivel recuperar os itens selecionados.')
    } finally {
      setIsRestoringTrash(false)
    }
  }

  const handlePurgeDeleted = async (): Promise<void> => {
    setIsClearingTrash(true)
    setTrashFeedback('')
    try {
      const deletedCount = await financeService.purgeDeletedTransactions()
      setSelectedDeletedIds([])
      await loadDeletedTransactions()
      setTrashFeedback(
        deletedCount > 0
          ? `${deletedCount} transacoes foram removidas definitivamente.`
          : 'Nenhuma transacao para limpar.'
      )
    } catch {
      setTrashFeedback('Nao foi possivel limpar a lixeira.')
    } finally {
      setIsClearingTrash(false)
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

  const handleSaveAccountSettings = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    if (!user) {
      setAccountFeedbackTone('error')
      setAccountFeedback('Nao foi possivel identificar o usuario autenticado.')
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

    setAccountDraft((prev) => ({
      ...prev,
      fullName: metadataPayload.full_name,
      phone: metadataPayload.phone,
      companyName: metadataPayload.company_name,
      preferredCurrency: metadataPayload.preferred_currency
    }))
    setAccountFeedbackTone('success')
    setAccountFeedback('Configuracoes da conta atualizadas com sucesso.')
    setIsSavingAccount(false)
  }

  return (
    <PageTemplate className={styles.page}>
      <input
        ref={backupInputRef}
        type="file"
        accept="application/json,.json"
        multiple
        hidden
        onChange={(event) => void handleImportBackupFile(event)}
        {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
      />

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
                <Button type="button" variant="ghost" onClick={handleOpenTrashModal} disabled={isLoadingData || isImportingBackup}>
                  Ver apagados
                </Button>
                <ButtonLoading
                  type="button"
                  variant="secondary"
                  loading={isImportingBackup}
                  disabled={isLoadingData}
                  onClick={handleImportBackupClick}
                >
                  Restaurar pasta de backup
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
              <form className={styles.accountForm} onSubmit={(event) => void handleSaveAccountSettings(event)}>
                <div className={styles.gridFields}>
                  <label className={styles.field}>
                    <span>Nome completo</span>
                    <input
                      type="text"
                      value={accountDraft.fullName}
                      onChange={(event) =>
                        setAccountDraft((prev) => ({
                          ...prev,
                          fullName: event.target.value
                        }))
                      }
                      placeholder="Seu nome"
                      disabled={isSavingAccount}
                    />
                  </label>

                  <label className={styles.field}>
                    <span>Telefone</span>
                    <input
                      type="tel"
                      value={accountDraft.phone}
                      onChange={(event) =>
                        setAccountDraft((prev) => ({
                          ...prev,
                          phone: event.target.value
                        }))
                      }
                      placeholder="(00) 00000-0000"
                      disabled={isSavingAccount}
                    />
                  </label>
                </div>

                <div className={styles.gridFields}>
                  <label className={styles.field}>
                    <span>Empresa</span>
                    <input
                      type="text"
                      value={accountDraft.companyName}
                      onChange={(event) =>
                        setAccountDraft((prev) => ({
                          ...prev,
                          companyName: event.target.value
                        }))
                      }
                      placeholder="Nome da empresa"
                      disabled={isSavingAccount}
                    />
                  </label>

                  <label className={styles.field}>
                    <span>Moeda preferida</span>
                    <input
                      type="text"
                      maxLength={3}
                      value={accountDraft.preferredCurrency}
                      onChange={(event) =>
                        setAccountDraft((prev) => ({
                          ...prev,
                          preferredCurrency: event.target.value
                        }))
                      }
                      placeholder="BRL"
                      disabled={isSavingAccount}
                    />
                  </label>
                </div>

                {accountFeedback ? (
                  <p className={accountFeedbackTone === 'success' ? styles.feedbackSuccess : styles.feedbackError}>
                    {accountFeedback}
                  </p>
                ) : null}

                <div className={styles.actionsRow}>
                  <ButtonLoading type="submit" loading={isSavingAccount}>
                    Salvar dados da conta
                  </ButtonLoading>
                </div>
              </form>
              <Button type="button" variant="danger" className={styles.dangerAction} onClick={() => void signOut()}>
                Sair
              </Button>
            </>
          ) : null}
        </article>
      </section>

      <ModalBase
        open={isTrashModalOpen}
        title="Lixeira de transacoes"
        onClose={() => {
          if (isLoadingTrash || isRestoringTrash || isClearingTrash) return
          setIsTrashModalOpen(false)
          setTrashFeedback('')
        }}
      >
        <div className={styles.trashModalContent}>
          {isLoadingTrash ? (
            <p className={styles.trashStateCenter}>Carregando itens apagados...</p>
          ) : deletedTransactions.length === 0 ? (
            <p className={styles.trashStateCenter}>Nenhum apagado.</p>
          ) : (
            <>
              <label className={styles.checkField}>
                <input
                  type="checkbox"
                  checked={selectedDeletedIds.length > 0 && selectedDeletedIds.length === deletedTransactions.length}
                  onChange={handleToggleAllDeleted}
                  disabled={isRestoringTrash || isClearingTrash}
                />
                <span>Selecionar todos</span>
              </label>

              <div className={styles.trashList}>
                {deletedTransactions.map((item) => (
                  <label key={item.id} className={styles.trashRow}>
                    <input
                      type="checkbox"
                      checked={selectedDeletedIds.includes(item.id)}
                      onChange={() => handleToggleDeleted(item.id)}
                      disabled={isRestoringTrash || isClearingTrash}
                    />
                    <div className={styles.trashRowBody}>
                      <strong>{item.category}</strong>
                      <span>{item.description}</span>
                    </div>
                    <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}</strong>
                  </label>
                ))}
              </div>
            </>
          )}

          {trashFeedback ? <p className={styles.feedback}>{trashFeedback}</p> : null}

          <div className={styles.actionsRow}>
            <Button type="button" variant="ghost" onClick={() => setIsTrashModalOpen(false)} disabled={isRestoringTrash || isClearingTrash}>
              Fechar
            </Button>
            <ButtonLoading
              type="button"
              variant="secondary"
              loading={isRestoringTrash}
              disabled={isClearingTrash || deletedTransactions.length === 0}
              onClick={() => void handleRestoreDeleted()}
            >
              {selectedDeletedIds.length > 0 ? 'Recuperar selecionados' : 'Recuperar tudo'}
            </ButtonLoading>
            <ButtonLoading
              type="button"
              variant="danger"
              loading={isClearingTrash}
              disabled={isRestoringTrash || deletedTransactions.length === 0}
              onClick={() => void handlePurgeDeleted()}
            >
              Limpar lixeira
            </ButtonLoading>
          </div>
        </div>
      </ModalBase>
    </PageTemplate>
  )
}
