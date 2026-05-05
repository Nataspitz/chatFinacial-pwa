import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Settings } from '../../../src/pages/Settings/Settings'
import { DEFAULT_TRANSACTION_SETTINGS } from '../../../src/types/transaction-settings.types'
import { createAuthContextMock } from '../../auth/mocks/auth-context.mock'
import { customSettingsMock } from '../mocks/settings.mock'

const useAuthMock = vi.fn()
const getTransactionsMock = vi.fn()
const getCategoryItemsMock = vi.fn()
const getSettingsMock = vi.fn()
const saveSettingsMock = vi.fn()
const getBusinessSettingsMock = vi.fn()
const updateUserMock = vi.fn()

vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock()
}))

vi.mock('../../../src/services/finance.service', () => ({
  financeService: {
    getTransactions: () => getTransactionsMock(),
    getCategoryItems: (type: 'entrada' | 'saida') => getCategoryItemsMock(type)
  }
}))

vi.mock('../../../src/services/backup.service', () => ({
  backupService: {
    buildBackup: vi.fn(() => ({})),
    downloadBackup: vi.fn(() => 'backup.json'),
    restoreBackup: vi.fn(async () => ({ importedTransactions: 0 }))
  }
}))

vi.mock('../../../src/services/transaction-settings.service', () => ({
  transactionSettingsService: {
    getSettings: () => getSettingsMock(),
    saveSettings: (input: unknown) => saveSettingsMock(input)
  }
}))

vi.mock('../../../src/services/business.service', () => ({
  businessService: {
    getBusinessSettings: () => getBusinessSettingsMock()
  }
}))

vi.mock('../../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      updateUser: (payload: unknown) => updateUserMock(payload)
    }
  }
}))

describe('Settings integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getTransactionsMock.mockResolvedValue([])
    getCategoryItemsMock.mockResolvedValue([])
    getSettingsMock.mockResolvedValue(DEFAULT_TRANSACTION_SETTINGS)
    getBusinessSettingsMock.mockResolvedValue({
      company_id: 'user-settings-1',
      investment_base_amount: 1000,
      no_initial_investment: false,
      account_balance_base_amount: 0,
      account_balance_base_date: '2026-04-17',
      account_balance_locked_at: null,
      created_at: '2026-04-17T00:00:00.000Z',
      updated_at: '2026-04-17T00:00:00.000Z'
    })
    updateUserMock.mockResolvedValue({ error: null })
  })

  it('carrega configuracoes de transacoes ao abrir a secao', async () => {
    useAuthMock.mockReturnValue(
      createAuthContextMock({
        user: { id: 'user-1', email: 'natas@test.com', user_metadata: { full_name: 'Nata' } } as never
      })
    )
    getSettingsMock.mockResolvedValue(customSettingsMock)

    render(<Settings />)

    await waitFor(() => {
      expect(screen.getByLabelText('Pagamento padrão (entrada)')).toHaveValue('credito')
    })

    expect(screen.getByLabelText('Pagamento padrão (saída)')).toHaveValue('debito')
    expect(screen.getByText('Configurações de transações')).toBeInTheDocument()
  })

  it('restaura padroes e salva no servico', async () => {
    useAuthMock.mockReturnValue(createAuthContextMock())
    getSettingsMock.mockResolvedValue(customSettingsMock)
    saveSettingsMock.mockResolvedValue(DEFAULT_TRANSACTION_SETTINGS)

    render(<Settings />)

    await waitFor(() => {
      expect(screen.getByLabelText('Pagamento padrão (entrada)')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Restaurar padrões' }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar configurações' }))

    await waitFor(() => {
      expect(saveSettingsMock).toHaveBeenCalledWith(DEFAULT_TRANSACTION_SETTINGS)
    })

    expect(await screen.findByText('Configurações salvas com sucesso.')).toBeInTheDocument()
  })

  it('executa logout na secao de conta', async () => {
    const signOut = vi.fn(async () => undefined)
    useAuthMock.mockReturnValue(
      createAuthContextMock({
        user: { id: 'user-2', email: 'conta@test.com' } as never,
        signOut
      })
    )
    render(<Settings />)

    fireEvent.click(screen.getByRole('button', { name: 'Conta' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }))

    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1))
  })

  it('salva dados da conta na secao conta', async () => {
    useAuthMock.mockReturnValue(
      createAuthContextMock({
        user: {
          id: 'user-3',
          email: 'conta@test.com',
          user_metadata: {
            full_name: 'Nata',
            phone: '',
            company_name: '',
            preferred_currency: 'BRL'
          }
        } as never
      })
    )

    render(<Settings />)

    fireEvent.click(screen.getByRole('button', { name: 'Conta' }))

    await waitFor(() => {
      expect(screen.getByLabelText('Empresa')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'Minha Empresa' } })
    fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: '(11) 99999-0000' } })
    fireEvent.change(screen.getByLabelText('Moeda preferida'), { target: { value: 'usd' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar dados da conta' }))

    expect(updateUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          company_name: 'Minha Empresa',
          preferred_currency: 'USD'
        })
      })
    )
    expect(await screen.findByText('Configurações da conta atualizadas com sucesso.')).toBeInTheDocument()
  })
})
