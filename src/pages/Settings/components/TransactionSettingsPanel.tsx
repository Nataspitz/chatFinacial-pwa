import type { Dispatch, SetStateAction } from 'react'
import { SelectField } from '../../../components/molecules/SelectField/SelectField'
import { Button, ButtonLoading } from '../../../components/ui'
import type { PaymentMethod } from '../../../types/transaction.types'
import type { TransactionSettings } from '../../../types/transaction-settings.types'
import styles from '../Settings.module.css'

interface TransactionSettingsPanelProps {
  backupFeedback: string
  settingsFeedback: string
  isLoadingData: boolean
  isImportingBackup: boolean
  isLoadingSettings: boolean
  isSavingSettings: boolean
  showAdvancedMode: boolean
  settingsDraft: TransactionSettings
  paymentMethodOptions: Array<{ value: PaymentMethod; label: string }>
  setSettingsDraft: Dispatch<SetStateAction<TransactionSettings>>
  onExportBackup: () => void
  onImportBackup: () => void
  onOpenTrash: () => void
  onToggleAdvancedMode: () => void
  onRestoreDefaults: () => void
  onSaveSettings: () => void
}

export const TransactionSettingsPanel = ({
  backupFeedback,
  settingsFeedback,
  isLoadingData,
  isImportingBackup,
  isLoadingSettings,
  isSavingSettings,
  showAdvancedMode,
  settingsDraft,
  paymentMethodOptions,
  setSettingsDraft,
  onExportBackup,
  onImportBackup,
  onOpenTrash,
  onToggleAdvancedMode,
  onRestoreDefaults,
  onSaveSettings
}: TransactionSettingsPanelProps): JSX.Element => (
  <>
    <div className={styles.actionsRow}>
      <Button type="button" variant="ghost" onClick={onExportBackup} disabled={isLoadingData || isImportingBackup}>
        Baixar backup
      </Button>
      <Button type="button" variant="ghost" onClick={onOpenTrash} disabled={isLoadingData || isImportingBackup}>
        Ver apagados
      </Button>
      <ButtonLoading
        type="button"
        variant="secondary"
        loading={isImportingBackup}
        disabled={isLoadingData}
        onClick={onImportBackup}
      >
        Restaurar pasta de backup
      </ButtonLoading>
    </div>
    {backupFeedback ? <p className={styles.feedback}>{backupFeedback}</p> : null}

    <div className={styles.settingsBlock}>
      <h3 className={styles.blockTitle}>Padrões básicos</h3>
      <div className={styles.gridFields}>
        <SelectField
          label="Pagamento padrão (entrada)"
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
        </SelectField>

        <SelectField
          label="Pagamento padrão (saída)"
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
        </SelectField>
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
        <span>Entrada nasce confirmada por padrão</span>
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
        <span>Saída nasce confirmada por padrão</span>
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
        <span>Saída nasce como custo mensal por padrão</span>
      </label>
    </div>

    <div className={styles.settingsBlock}>
      <Button
        type="button"
        variant="ghost"
        onClick={onToggleAdvancedMode}
        disabled={isLoadingSettings || isSavingSettings}
      >
        {showAdvancedMode ? 'Ocultar modo avançado' : 'Mostrar modo avançado'}
      </Button>

      {showAdvancedMode ? (
        <div className={styles.advancedBox}>
          <h3 className={styles.blockTitle}>Regras avançadas</h3>
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
            <span>Ativar bloqueio de consistência (parcelas, custo mensal e formatos)</span>
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
            <span>Permitir crédito com 1 parcela (sem parcelamento)</span>
          </label>
        </div>
      ) : null}
    </div>

    <div className={styles.actionsRow}>
      <Button
        type="button"
        variant="ghost"
        disabled={isLoadingSettings || isSavingSettings}
        onClick={onRestoreDefaults}
      >
        Restaurar padrões
      </Button>
      <ButtonLoading
        type="button"
        variant="primary"
        loading={isSavingSettings}
        disabled={isLoadingSettings}
        onClick={onSaveSettings}
      >
        Salvar configurações
      </ButtonLoading>
    </div>
    {settingsFeedback ? <p className={styles.feedback}>{settingsFeedback}</p> : null}
  </>
)
