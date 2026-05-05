/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Settings } from '../../../src/pages/Settings/Settings'
import { financeService } from '../../../src/services/finance.service'
import { transactionSettingsService } from '../../../src/services/transaction-settings.service'
import { DEFAULT_TRANSACTION_SETTINGS } from '../../../src/types/transaction-settings.types'
import { customTransactionSettingsFixture } from '../mocks/settings-fixtures'

vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user-settings-1',
      email: 'nataspitz81@gmail.com',
      user_metadata: {
        full_name: 'Nata Spitz'
      }
    },
    isAuthenticated: true,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined)
  })
}))

vi.mock('../../../src/services/finance.service', () => ({
  financeService: {
    getTransactions: vi.fn(),
    getCategoryItems: vi.fn()
  }
}))

vi.mock('../../../src/services/backup.service', () => ({
  backupService: {
    buildBackup: vi.fn(),
    downloadBackup: vi.fn(),
    restoreBackup: vi.fn()
  }
}))

vi.mock('../../../src/services/transaction-settings.service', () => ({
  transactionSettingsService: {
    getSettings: vi.fn(),
    saveSettings: vi.fn()
  }
}))

describe('Settings - transactions section integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(financeService.getTransactions).mockResolvedValue([])
    vi.mocked(financeService.getCategoryItems).mockResolvedValue([])
    vi.mocked(transactionSettingsService.getSettings).mockResolvedValue(DEFAULT_TRANSACTION_SETTINGS)
    vi.mocked(transactionSettingsService.saveSettings).mockImplementation(async (input) => input)
  })

  it('carrega defaults de configuracao ao abrir a secao de transacoes', async () => {
    render(<Settings />)

    await waitFor(() => {
      expect(transactionSettingsService.getSettings).toHaveBeenCalled()
    })

    expect(screen.getByLabelText('Pagamento padrão (entrada)')).toHaveValue('pix')
    expect(screen.getByLabelText('Pagamento padrão (saída)')).toHaveValue('pix')
    expect(screen.getByLabelText('Entrada nasce confirmada por padrão')).toBeChecked()
    expect(screen.getByLabelText('Saída nasce confirmada por padrão')).toBeChecked()
    expect(screen.getByLabelText('Saída nasce como custo mensal por padrão')).not.toBeChecked()
  })

  it('salva configuracoes chamando o service com o draft atualizado', async () => {
    const user = userEvent.setup()
    render(<Settings />)

    await waitFor(() => {
      expect(transactionSettingsService.getSettings).toHaveBeenCalled()
    })

    await user.selectOptions(screen.getByLabelText('Pagamento padrão (saída)'), 'credito')
    await user.click(screen.getByLabelText('Saída nasce como custo mensal por padrão'))
    await user.click(screen.getByRole('button', { name: 'Salvar configurações' }))

    await waitFor(() => {
      expect(transactionSettingsService.saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultPaymentMethodSaida: 'credito',
          defaultMonthlyCostSaida: true
        })
      )
    })
    expect(await screen.findByText('Configurações salvas com sucesso.')).toBeInTheDocument()
  })

  it('restaura padroes localmente e atualiza os campos do formulario', async () => {
    const user = userEvent.setup()
    vi.mocked(transactionSettingsService.getSettings).mockResolvedValue(customTransactionSettingsFixture)

    render(<Settings />)

    await waitFor(() => {
      expect(screen.getByLabelText('Pagamento padrão (entrada)')).toHaveValue('credito')
    })

    await user.click(screen.getByRole('button', { name: 'Restaurar padrões' }))

    expect(screen.getByLabelText('Pagamento padrão (entrada)')).toHaveValue('pix')
    expect(screen.getByLabelText('Pagamento padrão (saída)')).toHaveValue('pix')
    expect(screen.getByLabelText('Entrada nasce confirmada por padrão')).toBeChecked()
    expect(screen.getByLabelText('Saída nasce confirmada por padrão')).toBeChecked()
    expect(screen.getByLabelText('Saída nasce como custo mensal por padrão')).not.toBeChecked()
    expect(screen.getByText('Padrões restaurados localmente. Clique em Salvar para aplicar.')).toBeInTheDocument()
  })
})
