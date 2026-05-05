import { useEffect, useMemo, useState } from 'react'
import { PageTemplate } from '../../components/templates/PageTemplate/PageTemplate'
import { useAuth } from '../../contexts/AuthContext'
import { AccountSettingsPanel } from './components/AccountSettingsPanel'
import { AppearanceSettingsPanel } from './components/AppearanceSettingsPanel'
import { SettingsNavigation } from './components/SettingsNavigation'
import { TransactionSettingsPanel } from './components/TransactionSettingsPanel'
import { TrashModal } from './components/TrashModal'
import { useAccountSettingsForm } from './hooks/useAccountSettingsForm'
import { useSettingsBackup } from './hooks/useSettingsBackup'
import { useSettingsTrash } from './hooks/useSettingsTrash'
import { useTransactionSettingsForm } from './hooks/useTransactionSettingsForm'
import { paymentMethodOptions, settingsSections } from './settings.constants'
import type { SettingsSection } from './settings.types'
import styles from './Settings.module.css'

export const Settings = (): JSX.Element => {
  const { user, signOut } = useAuth()
  const [activeSection, setActiveSection] = useState<SettingsSection>('transactions')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (
    document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
  ))
  const backup = useSettingsBackup()
  const trash = useSettingsTrash()
  const transactions = useTransactionSettingsForm(activeSection)
  const account = useAccountSettingsForm(activeSection, user)
  const fullName = typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : ''
  const userLabel = fullName || user?.email || 'Usuário'

  useEffect(() => {
    if (activeSection === 'transactions') {
      void backup.loadBackupData().catch(() => undefined)
    }
  }, [activeSection])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem('theme', theme)
  }, [theme])

  const sectionTitle = useMemo(() => {
    if (activeSection === 'transactions') return 'Configurações de transações'
    if (activeSection === 'appearance') return 'Configurações de aparência'
    return 'Configurações da conta'
  }, [activeSection])

  const sectionDescription = useMemo(() => {
    if (activeSection === 'transactions') return 'Gerencie backup e restauração dos seus dados financeiros.'
    if (activeSection === 'appearance') return 'Escolha o tema visual do aplicativo.'
    return 'Atualize dados da conta e preferências de perfil.'
  }, [activeSection])

  return (
    <PageTemplate className={styles.page}>
      <input
        ref={backup.backupInputRef}
        type="file"
        accept="application/json,.json"
        multiple
        hidden
        onChange={(event) => void backup.handleImportBackupFile(event)}
        {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
      />

      <header className={styles.header}>
        <h1 className={styles.title}>Configurações</h1>
        <p className={styles.subtitle}>Centralize preferências da conta e manutenção dos seus dados.</p>
      </header>

      <section className={styles.layout}>
        <SettingsNavigation sections={settingsSections} activeSection={activeSection} onChange={setActiveSection} />

        <article className={styles.content}>
          <h2 className={styles.sectionTitle}>{sectionTitle}</h2>
          <p className={styles.sectionDescription}>{sectionDescription}</p>

          {activeSection === 'transactions' ? (
            <TransactionSettingsPanel
              backupFeedback={backup.backupFeedback}
              settingsFeedback={transactions.settingsFeedback}
              isLoadingData={backup.isLoadingData}
              isImportingBackup={backup.isImportingBackup}
              isLoadingSettings={transactions.isLoadingSettings}
              isSavingSettings={transactions.isSavingSettings}
              showAdvancedMode={transactions.showAdvancedMode}
              settingsDraft={transactions.settingsDraft}
              paymentMethodOptions={paymentMethodOptions}
              setSettingsDraft={transactions.setSettingsDraft}
              onExportBackup={() => void backup.handleExportBackup()}
              onImportBackup={backup.handleImportBackupClick}
              onOpenTrash={trash.handleOpenTrashModal}
              onToggleAdvancedMode={() => transactions.setShowAdvancedMode((prev) => !prev)}
              onRestoreDefaults={transactions.handleRestoreSettingsDefaults}
              onSaveSettings={() => void transactions.handleSaveTransactionSettings()}
            />
          ) : null}

          {activeSection === 'appearance' ? <AppearanceSettingsPanel theme={theme} onThemeChange={setTheme} /> : null}

          {activeSection === 'account' ? (
            <AccountSettingsPanel
              userLabel={userLabel}
              userEmail={user?.email ?? 'E-mail não informado'}
              draft={account.accountDraft}
              isSaving={account.isSavingAccount}
              feedback={account.accountFeedback}
              feedbackTone={account.accountFeedbackTone}
              onDraftChange={account.setAccountDraft}
              onSubmit={() => void account.handleSaveAccountSettings()}
              onSignOut={() => void signOut()}
            />
          ) : null}
        </article>
      </section>

      <TrashModal
        open={trash.isTrashModalOpen}
        deletedTransactions={trash.deletedTransactions}
        selectedDeletedIds={trash.selectedDeletedIds}
        isLoadingTrash={trash.isLoadingTrash}
        isRestoringTrash={trash.isRestoringTrash}
        isClearingTrash={trash.isClearingTrash}
        feedback={trash.trashFeedback}
        onClose={() => {
          trash.setIsTrashModalOpen(false)
          trash.setTrashFeedback('')
        }}
        onToggleDeleted={trash.handleToggleDeleted}
        onToggleAllDeleted={trash.handleToggleAllDeleted}
        onRestoreDeleted={() => void trash.handleRestoreDeleted()}
        onPurgeDeleted={() => void trash.handlePurgeDeleted()}
      />
    </PageTemplate>
  )
}
